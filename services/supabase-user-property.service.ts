import { supabase } from '@/lib/supabase';

export interface AuditorUser {
  id: string;
  email: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
}

export interface UserPropertyAssignment {
  property_id: string;
  property_role: string | null;
  expires_at: string | null;
  assigned_at: string | null;
  assignment_reason: string | null;
}

class SupabaseUserPropertyService {
  /**
   * Lista auditores activos para asignar inmuebles.
   */
  async listAuditors(): Promise<AuditorUser[]> {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, username, first_name, last_name')
      .eq('role', 'AUDITOR')
      .eq('is_active', true)
      .order('first_name', { ascending: true });

    if (error) {
      console.error('Error fetching auditors:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Lista asignaciones de user_properties para un usuario.
   */
  async getAssignmentsForUser(
    userId: string,
  ): Promise<UserPropertyAssignment[]> {
    const { data, error } = await supabase
      .from('user_properties')
      .select(
        'property_id, property_role, expires_at, assigned_at, assignment_reason',
      )
      .eq('user_id', userId)
      .order('assigned_at', { ascending: false });

    if (error) {
      console.error('Error fetching user_properties assignments:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Asigna un auditor a un inmueble usando la función segura de BD.
   */
  async assignAuditorToProperty(input: {
    auditorId: string;
    propertyId: string;
    assignmentReason?: string | null;
    expiresAt?: string | null;
  }): Promise<void> {
    const { error } = await supabase.rpc('assign_auditor_to_property', {
      p_auditor_id: input.auditorId,
      p_property_id: input.propertyId,
      p_assignment_reason: input.assignmentReason ?? null,
      p_expires_at: input.expiresAt ?? null,
    });

    if (error) {
      console.error('Error assigning auditor to property:', error);
      throw error;
    }
  }
}

export const supabaseUserPropertyService = new SupabaseUserPropertyService();
