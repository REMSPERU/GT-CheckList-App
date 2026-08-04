import { supabase } from '@/lib/supabase';
import { DatabaseService } from '@/services/db';
import NetInfo from '@react-native-community/netinfo';

export type ChecklistScheduleFrequency =
  | 'DIARIA'
  | 'INTERDIARIA'
  | 'SEMANAL'
  | 'QUINCENAL'
  | 'MENSUAL';

export interface ChecklistSchedule {
  id: string;
  property_id: string;
  equipamento_id: string;
  equipo_id: string | null;
  frequency: ChecklistScheduleFrequency;
  occurrences_per_day: number;
  execution_range_days: number;
  window_start: string;
  window_end: string;
  timezone: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  work_days: number[] | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChecklistScheduleUpsertInput {
  propertyId: string;
  equipamentoId: string;
  frequency: ChecklistScheduleFrequency;
  occurrencesPerDay: number;
  executionRangeDays?: number;
  windowStart: string;
  windowEnd: string;
  timezone?: string;
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean;
  workDays?: number[] | null;
  userId: string;
}

export interface ChecklistScheduleValidation {
  has_schedule: boolean;
  allowed: boolean;
  reason: string | null;
  schedule_id: string | null;
  frequency: ChecklistScheduleFrequency | null;
  occurrences_per_day: number | null;
  window_start: string | null;
  window_end: string | null;
  current_count: number;
  period_start: string | null;
  period_end: string | null;
}
class SupabaseChecklistScheduleService {
  async getScheduleByScope(
    propertyId: string,
    equipamentoId: string,
  ): Promise<ChecklistSchedule | null> {
    // 100% Offline-First: Read from local SQLite mirror table first
    const localSchedule =
      await DatabaseService.getLocalChecklistScheduleByScope(
        propertyId,
        equipamentoId,
      );

    if (localSchedule) {
      return localSchedule as ChecklistSchedule;
    }

    // Fallback to Supabase only if not in local DB and online
    try {
      const netInfo = await NetInfo.fetch().catch(() => ({
        isConnected: true,
      }));
      if (netInfo.isConnected === false) {
        return null;
      }

      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      const queryPromise = supabase
        .from('checklist_schedules')
        .select('*')
        .eq('property_id', propertyId)
        .eq('equipamento_id', equipamentoId)
        .limit(1)
        .maybeSingle();

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('Remote getScheduleByScope timeout (2s limit)'));
        }, 2000);
      });

      const { data, error } = await Promise.race([
        queryPromise,
        timeoutPromise,
      ]).finally(() => {
        if (timeoutId) clearTimeout(timeoutId);
      });

      if (error) {
        throw error;
      }

      return (data as ChecklistSchedule | null) ?? null;
    } catch {
      return null;
    }
  }

  async upsertSchedule(
    input: ChecklistScheduleUpsertInput,
  ): Promise<ChecklistSchedule> {
    const payload = {
      property_id: input.propertyId,
      equipamento_id: input.equipamentoId,
      frequency: input.frequency,
      occurrences_per_day: input.occurrencesPerDay,
      execution_range_days: input.executionRangeDays ?? 1,
      window_start: input.windowStart,
      window_end: input.windowEnd,
      timezone: input.timezone || 'America/Lima',
      start_date: input.startDate ?? null,
      end_date: input.endDate ?? null,
      is_active: input.isActive ?? true,
      work_days: input.workDays ?? null,
      created_by: input.userId,
      updated_by: input.userId,
    };

    const { data, error } = await supabase
      .from('checklist_schedules')
      .upsert(payload, { onConflict: 'property_id,equipamento_id' })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return data as ChecklistSchedule;
  }

  async validateChecklistSubmission(
    propertyId: string,
    equipamentoId: string,
    equipoId?: string,
  ): Promise<ChecklistScheduleValidation> {
    // 100% Offline-First: Always validate against local SQLite mirror first (instant < 5ms)
    const localResult = await DatabaseService.validateLocalChecklistSchedule(
      propertyId,
      equipamentoId,
      equipoId || null,
    );

    return {
      has_schedule: localResult.has_schedule,
      allowed: localResult.allowed,
      reason: localResult.reason,
      schedule_id: localResult.schedule_id,
      frequency: localResult.frequency as ChecklistScheduleFrequency | null,
      occurrences_per_day: localResult.occurrences_per_day,
      window_start: localResult.window_start,
      window_end: localResult.window_end,
      current_count: localResult.current_count,
      period_start: localResult.period_start,
      period_end: localResult.period_end,
    };
  }
}

export const supabaseChecklistScheduleService =
  new SupabaseChecklistScheduleService();
