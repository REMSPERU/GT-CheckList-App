import { supabase } from '@/lib/supabase';
import { UserRole } from '@/contexts/UserRoleContext';

export interface UserProfile {
  id: string;
  email: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  role: UserRole;
  is_active: boolean;
  id_company: string | null;
}

class SupabaseUserService {
  private tableName = 'users';

  /**
   * List all users with their profiles.
   */
  async listUsers(): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select(
        'id, email, username, first_name, last_name, role, is_active, id_company',
      );

    if (error) {
      console.error('Error fetching users:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Update the role of a specific user.
   * @param userId The ID of the user to update.
   * @param role The new role to assign.
   */
  async updateUserRole(
    userId: string,
    role: UserRole,
    companyId?: string | null,
  ): Promise<UserProfile> {
    const { data, error } = await supabase
      .from(this.tableName)
      .update({
        role,
        ...(role === 'PROVEEDOR' ? { id_company: companyId } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user role:', error);
      throw error;
    }

    return data;
  }
}

export const supabaseUserService = new SupabaseUserService();
