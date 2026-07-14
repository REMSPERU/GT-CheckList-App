import { supabase } from '@/lib/supabase';
import { DatabaseService } from '@/services/db';

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

interface ValidateChecklistScheduleParams {
  p_property_id: string;
  p_equipamento_id: string;
  p_submitted_at: string;
  p_equipo_id?: string;
}

class SupabaseChecklistScheduleService {
  async getScheduleByScope(
    propertyId: string,
    equipamentoId: string,
  ): Promise<ChecklistSchedule | null> {
    const { data, error } = await supabase
      .from('checklist_schedules')
      .select('*')
      .eq('property_id', propertyId)
      .eq('equipamento_id', equipamentoId)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data as ChecklistSchedule | null) ?? null;
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
    try {
      const params: ValidateChecklistScheduleParams = {
        p_property_id: propertyId,
        p_equipamento_id: equipamentoId,
        p_submitted_at: new Date().toISOString(),
      };

      if (equipoId) {
        params.p_equipo_id = equipoId;
      }

      const { data, error } = await supabase.rpc(
        'validate_checklist_schedule',
        params,
      );

      if (error) {
        throw error;
      }

      const firstRow = Array.isArray(data) ? data[0] : data;

      return {
        has_schedule: !!firstRow?.has_schedule,
        allowed: !!firstRow?.allowed,
        reason: firstRow?.reason || null,
        schedule_id: firstRow?.schedule_id || null,
        frequency: (firstRow?.frequency ||
          null) as ChecklistScheduleFrequency | null,
        occurrences_per_day:
          typeof firstRow?.occurrences_per_day === 'number'
            ? firstRow.occurrences_per_day
            : null,
        window_start: firstRow?.window_start || null,
        window_end: firstRow?.window_end || null,
        current_count:
          typeof firstRow?.current_count === 'number'
            ? firstRow.current_count
            : 0,
        period_start: firstRow?.period_start || null,
        period_end: firstRow?.period_end || null,
      };
    } catch (rpcError) {
      console.warn(
        '[SCHEDULE-SERVICE] Remote validation failed, falling back to local database validation:',
        rpcError,
      );

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
}

export const supabaseChecklistScheduleService =
  new SupabaseChecklistScheduleService();
