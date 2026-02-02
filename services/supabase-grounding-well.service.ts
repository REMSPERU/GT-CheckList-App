import { supabase } from '../lib/supabase';

export class SupabaseGroundingWellService {
  async saveChecklistResponse(
    panelId: string,
    maintenanceId: string | null,
    checklistData: any,
    userId: string
  ) {
    const { data, error } = await supabase
      .from('maintenance_response')
      .insert([
        {
          id_mantenimiento: maintenanceId,
          id_equipo: panelId,
          user_created: userId, // This needs to be passed in
          detail_maintenance: {
            type: 'grounding_well_checklist',
            ...checklistData,
          },
        },
      ]);

    if (error) {
      console.error('Error saving grounding well checklist response:', error);
      throw error;
    }

    return data;
  }
}

export const supabaseGroundingWellService = new SupabaseGroundingWellService();
