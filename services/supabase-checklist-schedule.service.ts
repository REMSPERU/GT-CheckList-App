import { supabase } from '@/lib/supabase';

export type ChecklistScheduleFrequency =
  | 'DIARIA'
  | 'INTERDIARIA'
  | 'SEMANAL'
  | 'MENSUAL';

export interface ChecklistSchedule {
  id: string;
  property_id: string;
  equipamento_id: string;
  equipo_id: string | null;
  frequency: ChecklistScheduleFrequency;
  occurrences_per_day: number;
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
  ): Promise<ChecklistScheduleValidation> {
    const { data, error } = await supabase.rpc('validate_checklist_schedule', {
      p_property_id: propertyId,
      p_equipamento_id: equipamentoId,
      p_submitted_at: new Date().toISOString(),
    });

    if (error) {
      throw error;
    }

    const firstRow = Array.isArray(data) ? data[0] : data;

    return {
      has_schedule: !!firstRow?.has_schedule,
      allowed: !!firstRow?.allowed,
      reason: firstRow?.reason || null,
      schedule_id: firstRow?.schedule_id || null,
      frequency: firstRow?.frequency || null,
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
    };
  }
}

export const supabaseChecklistScheduleService =
  new SupabaseChecklistScheduleService();
