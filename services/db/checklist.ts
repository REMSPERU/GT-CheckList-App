import { dbPromise, ensureInitialized, withLock } from './connection';

export interface OfflineChecklistPhotoInput {
  questionId?: string | null;
  kind: 'general' | 'question';
  localUri: string;
}

export interface OfflineChecklistResponseInput {
  clientSubmissionId: string;
  buildingId: string;
  equipamentoId: string;
  equipoId: string;
  frequency: string;
  periodStart: string;
  periodEnd: string;
  userCreated: string;
  payload: unknown;
  photos: OfflineChecklistPhotoInput[];
}

export interface OfflineChecklistCount {
  equipo_id: string;
  synced_count: number;
  pending_count: number;
  conflict_count: number;
}

export interface ChecklistWorkingDayValidation {
  allowed: boolean;
  reason: string | null;
}

function getIsoDayOfWeek(dateString: string) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  const day = date.getUTCDay();

  return day === 0 ? 7 : day;
}

function parseWorkDays(value: unknown) {
  if (typeof value !== 'string') {
    return [1, 2, 3, 4, 5];
  }

  try {
    const parsed = JSON.parse(value);
    if (
      Array.isArray(parsed) &&
      parsed.every(item => Number.isInteger(item) && item >= 1 && item <= 7)
    ) {
      return parsed as number[];
    }
  } catch {
    // Use default weekdays when local data is malformed or not synced yet.
  }

  return [1, 2, 3, 4, 5];
}

export async function validateLocalChecklistWorkingDay(
  dateString: string,
): Promise<ChecklistWorkingDayValidation> {
  await ensureInitialized();

  return withLock(async () => {
    const db = await dbPromise;
    const exception = (await db.getFirstAsync(
      `SELECT is_working_day
       FROM local_checklist_workday_exceptions
       WHERE exception_date = ?
       LIMIT 1`,
      [dateString],
    )) as { is_working_day: number } | null;

    if (exception) {
      return {
        allowed: exception.is_working_day === 1,
        reason:
          exception.is_working_day === 1
            ? null
            : 'Hoy es un dia no laborable segun el calendario de checklist.',
      };
    }

    const config = (await db.getFirstAsync(
      `SELECT work_days
       FROM local_checklist_workday_config
       LIMIT 1`,
    )) as { work_days: string } | null;
    const workDays = parseWorkDays(config?.work_days);
    const allowed = workDays.includes(getIsoDayOfWeek(dateString));

    return {
      allowed,
      reason: allowed
        ? null
        : 'Hoy es un dia no laborable segun el calendario de checklist.',
    };
  });
}

export async function saveOfflineChecklistResponse(
  input: OfflineChecklistResponseInput,
) {
  await ensureInitialized();

  return withLock(async () => {
    const db = await dbPromise;
    let localId = 0;

    console.log(
      '[DEBUG] saveOfflineChecklistResponse db before tx:',
      db,
      typeof db,
    );
    await db.withTransactionAsync(async () => {
      console.log(
        '[DEBUG] saveOfflineChecklistResponse db inside tx:',
        db,
        typeof db,
      );
      const result = await db.runAsync(
        `INSERT INTO offline_checklist_responses (
          client_submission_id,
          building_id,
          equipamento_id,
          equipo_id,
          frequency,
          period_start,
          period_end,
          user_created,
          payload_json,
          status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          input.clientSubmissionId,
          input.buildingId,
          input.equipamentoId,
          input.equipoId,
          input.frequency,
          input.periodStart,
          input.periodEnd,
          input.userCreated,
          JSON.stringify(input.payload),
        ],
      );

      localId = result.lastInsertRowId;

      for (const photo of input.photos) {
        await db.runAsync(
          `INSERT INTO offline_checklist_photos (
            checklist_local_id,
            question_id,
            kind,
            local_uri,
            status
          ) VALUES (?, ?, ?, ?, 'pending')`,
          [localId, photo.questionId ?? null, photo.kind, photo.localUri],
        );
      }
    });

    return localId;
  });
}

export async function getPendingChecklistResponses() {
  await ensureInitialized();

  return withLock(async () => {
    const db = await dbPromise;
    return await db.getAllAsync(
      `SELECT *
       FROM offline_checklist_responses
       WHERE status IN ('pending', 'syncing', 'error')
       ORDER BY created_at ASC`,
    );
  });
}

export async function updateOfflineChecklistResponseStatus(
  localId: number,
  status: 'pending' | 'syncing' | 'synced' | 'error' | 'conflict',
  errorMessage?: string | null,
) {
  await ensureInitialized();

  return withLock(async () => {
    const db = await dbPromise;
    await db.runAsync(
      `UPDATE offline_checklist_responses
       SET status = ?, error_message = ?, synced_at = CASE WHEN ? = 'synced' THEN CURRENT_TIMESTAMP ELSE synced_at END
       WHERE local_id = ?`,
      [status, errorMessage ?? null, status, localId],
    );
  });
}

export async function getChecklistPhotosByLocalId(localId: number) {
  await ensureInitialized();

  return withLock(async () => {
    const db = await dbPromise;
    return await db.getAllAsync(
      `SELECT *
       FROM offline_checklist_photos
       WHERE checklist_local_id = ?
       ORDER BY id ASC`,
      [localId],
    );
  });
}

export async function updateOfflineChecklistPhotoStatus(
  id: number,
  status: 'pending' | 'syncing' | 'synced' | 'error',
  remote?: { bucket: string; path: string; publicUrl: string } | null,
  errorMessage?: string | null,
) {
  await ensureInitialized();

  return withLock(async () => {
    const db = await dbPromise;
    await db.runAsync(
      `UPDATE offline_checklist_photos
       SET status = ?,
           remote_bucket = ?,
           remote_path = ?,
           remote_public_url = ?,
           error_message = ?
       WHERE id = ?`,
      [
        status,
        remote?.bucket ?? null,
        remote?.path ?? null,
        remote?.publicUrl ?? null,
        errorMessage ?? null,
        id,
      ],
    );
  });
}

export async function getChecklistCountsByEquipo(
  buildingId: string,
  equipamentoId: string,
  frequency: string,
  periodStart: string,
): Promise<OfflineChecklistCount[]> {
  await ensureInitialized();

  return withLock(async () => {
    const db = await dbPromise;
    return (await db.getAllAsync(
      `SELECT
         equipo_id,
         SUM(CASE WHEN status = 'synced' THEN 1 ELSE 0 END) AS synced_count,
         SUM(CASE WHEN status IN ('pending', 'syncing', 'error') THEN 1 ELSE 0 END) AS pending_count,
         SUM(CASE WHEN status = 'conflict' THEN 1 ELSE 0 END) AS conflict_count
       FROM offline_checklist_responses
       WHERE building_id = ?
         AND equipamento_id = ?
         AND frequency = ?
         AND period_start = ?
       GROUP BY equipo_id`,
      [buildingId, equipamentoId, frequency, periodStart],
    )) as OfflineChecklistCount[];
  });
}

export interface ChecklistScheduleValidation {
  has_schedule: boolean;
  allowed: boolean;
  reason: string | null;
  schedule_id: string | null;
  frequency: string | null;
  occurrences_per_day: number | null;
  window_start: string | null;
  window_end: string | null;
  current_count: number;
  period_start: string | null;
  period_end: string | null;
}

interface LocalChecklistScheduleRow {
  id: string;
  equipo_id: string | null;
  property_id: string;
  equipamento_id: string;
  frequency: string;
  occurrences_per_day: number;
  window_start: string;
  window_end: string;
  timezone: string;
  start_date: string;
  end_date: string | null;
  is_active: number;
  execution_range_days: number;
  created_at: string | null;
  updated_at: string | null;
}

export async function validateLocalChecklistSchedule(
  propertyId: string,
  equipamentoId: string,
  equipoId?: string | null,
  submittedAt: string = new Date().toISOString(),
): Promise<ChecklistScheduleValidation> {
  await ensureInitialized();

  return withLock(async () => {
    const db = await dbPromise;

    if (!propertyId || !equipamentoId) {
      return {
        has_schedule: false,
        allowed: true,
        reason: null,
        schedule_id: null,
        frequency: null,
        occurrences_per_day: null,
        window_start: null,
        window_end: null,
        current_count: 0,
        period_start: null,
        period_end: null,
      };
    }

    // Get the active schedule for this scope
    const schedule = (await db.getFirstAsync(
      `SELECT * FROM local_checklist_schedules
       WHERE property_id = ?
         AND equipamento_id = ?
         AND is_active = 1
       LIMIT 1`,
      [propertyId, equipamentoId],
    )) as LocalChecklistScheduleRow | null;

    if (!schedule) {
      return {
        has_schedule: false,
        allowed: true,
        reason: null,
        schedule_id: null,
        frequency: null,
        occurrences_per_day: null,
        window_start: null,
        window_end: null,
        current_count: 0,
        period_start: null,
        period_end: null,
      };
    }

    // Calculate local date and time in the schedule's timezone
    const tz = schedule.timezone || 'America/Lima';
    const submittedDate = new Date(submittedAt);

    const tzParts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(submittedDate);

    const getVal = (type: string) =>
      tzParts.find(p => p.type === type)?.value || '';
    const year = getVal('year');
    const month = getVal('month');
    const day = getVal('day');
    let hour = getVal('hour');
    const minute = getVal('minute');
    const second = getVal('second');

    if (hour === '24') hour = '00';

    const localDateString = `${year}-${month}-${day}`;
    const localTimeString = `${hour}:${minute}:${second}`;
    const anchorDateString = schedule.start_date;

    // 1. Working day calendar validation
    const workdayVal = await validateLocalChecklistWorkingDay(localDateString);
    if (!workdayVal.allowed) {
      return {
        has_schedule: true,
        allowed: false,
        reason:
          workdayVal.reason ||
          'Hoy es un dia no laborable segun el calendario de checklist.',
        schedule_id: schedule.id,
        frequency: schedule.frequency,
        occurrences_per_day: schedule.occurrences_per_day,
        window_start: schedule.window_start,
        window_end: schedule.window_end,
        current_count: 0,
        period_start: null,
        period_end: null,
      };
    }

    // 2. Schedule range validation
    if (localDateString < anchorDateString) {
      return {
        has_schedule: true,
        allowed: false,
        reason: 'La programacion aun no inicia.',
        schedule_id: schedule.id,
        frequency: schedule.frequency,
        occurrences_per_day: schedule.occurrences_per_day,
        window_start: schedule.window_start,
        window_end: schedule.window_end,
        current_count: 0,
        period_start: null,
        period_end: null,
      };
    }

    if (schedule.end_date && localDateString > schedule.end_date) {
      return {
        has_schedule: true,
        allowed: false,
        reason: 'La programacion ya vencio.',
        schedule_id: schedule.id,
        frequency: schedule.frequency,
        occurrences_per_day: schedule.occurrences_per_day,
        window_start: schedule.window_start,
        window_end: schedule.window_end,
        current_count: 0,
        period_start: null,
        period_end: null,
      };
    }

    // 3. Daily time window validation
    const padTime = (t: string) => (t.length === 5 ? `${t}:00` : t);
    const windowStartPad = padTime(schedule.window_start);
    const windowEndPad = padTime(schedule.window_end);

    if (localTimeString < windowStartPad || localTimeString > windowEndPad) {
      return {
        has_schedule: true,
        allowed: false,
        reason: 'El checklist esta fuera del rango horario permitido.',
        schedule_id: schedule.id,
        frequency: schedule.frequency,
        occurrences_per_day: schedule.occurrences_per_day,
        window_start: schedule.window_start,
        window_end: schedule.window_end,
        current_count: 0,
        period_start: null,
        period_end: null,
      };
    }

    // 4. Frequency validation and period calculation
    let isFrequencyDay = true;
    let effectiveStartDate = localDateString;
    let effectiveEndDate = localDateString;
    const executionRangeDays = schedule.execution_range_days ?? 1;

    if (schedule.frequency === 'DIARIA') {
      effectiveStartDate = localDateString;
      effectiveEndDate = localDateString;
    } else if (
      schedule.frequency === 'INTERDIARIA' ||
      schedule.frequency === 'SEMANAL' ||
      schedule.frequency === 'QUINCENAL'
    ) {
      const modValue =
        schedule.frequency === 'INTERDIARIA'
          ? 2
          : schedule.frequency === 'SEMANAL'
            ? 7
            : 15;

      const daysFromAnchor = getDaysBetween(localDateString, anchorDateString);
      isFrequencyDay =
        ((daysFromAnchor % modValue) + modValue) % modValue <
        executionRangeDays;

      const startOffset = Math.floor(daysFromAnchor / modValue) * modValue;
      effectiveStartDate = addDays(anchorDateString, startOffset);
      effectiveEndDate = addDays(effectiveStartDate, executionRangeDays - 1);
    } else if (schedule.frequency === 'MENSUAL') {
      const prevMonthRef = addMonths(localDateString, -1);
      const currMonthRef = localDateString;
      const nextMonthRef = addMonths(localDateString, 1);

      const targets = [
        getChecklistTargetDateForMonth(anchorDateString, prevMonthRef),
        getChecklistTargetDateForMonth(anchorDateString, currMonthRef),
        getChecklistTargetDateForMonth(anchorDateString, nextMonthRef),
      ];

      targets.sort((a, b) => b.localeCompare(a));

      let foundTarget: string | null = null;
      for (const targetDate of targets) {
        if (targetDate >= anchorDateString) {
          const targetEnd = addDays(targetDate, executionRangeDays - 1);
          if (localDateString >= targetDate && localDateString <= targetEnd) {
            foundTarget = targetDate;
            break;
          }
        }
      }

      if (foundTarget) {
        isFrequencyDay = true;
        effectiveStartDate = foundTarget;
        effectiveEndDate = addDays(foundTarget, executionRangeDays - 1);
      } else {
        isFrequencyDay = false;
      }
    }

    if (!isFrequencyDay) {
      return {
        has_schedule: true,
        allowed: false,
        reason: 'Hoy no corresponde por frecuencia o rango de ejecucion.',
        schedule_id: schedule.id,
        frequency: schedule.frequency,
        occurrences_per_day: schedule.occurrences_per_day,
        window_start: schedule.window_start,
        window_end: schedule.window_end,
        current_count: 0,
        period_start: null,
        period_end: null,
      };
    }

    // 5. Query occurrences count in SQLite
    let currentCount = 0;
    if (equipoId) {
      const countRes = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count
         FROM offline_checklist_responses
         WHERE status IN ('pending', 'syncing', 'synced', 'error')
           AND equipo_id = ?
           AND period_start = ?`,
        [equipoId, effectiveStartDate],
      );
      currentCount = countRes?.count || 0;
    } else {
      const countRes = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count
         FROM offline_checklist_responses
         WHERE status IN ('pending', 'syncing', 'synced', 'error')
           AND building_id = ?
           AND equipamento_id = ?
           AND period_start = ?`,
        [propertyId, equipamentoId, effectiveStartDate],
      );
      currentCount = countRes?.count || 0;
    }

    if (currentCount >= schedule.occurrences_per_day) {
      return {
        has_schedule: true,
        allowed: false,
        reason: 'Se alcanzo el maximo de checklist permitidos para este rango.',
        schedule_id: schedule.id,
        frequency: schedule.frequency,
        occurrences_per_day: schedule.occurrences_per_day,
        window_start: schedule.window_start,
        window_end: schedule.window_end,
        current_count: currentCount,
        period_start: effectiveStartDate,
        period_end: effectiveEndDate,
      };
    }

    return {
      has_schedule: true,
      allowed: true,
      reason: null,
      schedule_id: schedule.id,
      frequency: schedule.frequency,
      occurrences_per_day: schedule.occurrences_per_day,
      window_start: schedule.window_start,
      window_end: schedule.window_end,
      current_count: currentCount,
      period_start: effectiveStartDate,
      period_end: effectiveEndDate,
    };
  });
}

function getDaysBetween(dateStr1: string, dateStr2: string): number {
  const d1 = new Date(`${dateStr1}T00:00:00.000Z`);
  const d2 = new Date(`${dateStr2}T00:00:00.000Z`);
  const diffTime = d1.getTime() - d2.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);

  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addMonths(dateStr: string, months: number): string {
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + months);

  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getChecklistTargetDateForMonth(
  anchorDateStr: string,
  referenceDateStr: string,
): string {
  const anchorDate = new Date(`${anchorDateStr}T00:00:00.000Z`);
  const referenceDate = new Date(`${referenceDateStr}T00:00:00.000Z`);

  const anchorDay = anchorDate.getUTCDate();
  const refYear = referenceDate.getUTCFullYear();
  const refMonth = referenceDate.getUTCMonth();

  const lastDayOfRefMonth = new Date(
    Date.UTC(refYear, refMonth + 1, 0),
  ).getUTCDate();
  const targetDay = Math.min(anchorDay, lastDayOfRefMonth);

  const targetYearStr = String(refYear);
  const targetMonthStr = String(refMonth + 1).padStart(2, '0');
  const targetDayStr = String(targetDay).padStart(2, '0');

  return `${targetYearStr}-${targetMonthStr}-${targetDayStr}`;
}
