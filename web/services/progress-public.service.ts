import { createServiceRoleSupabaseClient } from '@/services/auth/server-auth.service';
import type { PublicProgressResponse } from '@/types/progress';
export async function getPublicProgress(
  token: string,
): Promise<PublicProgressResponse | null> {
  const supabase = createServiceRoleSupabaseClient();
  const { data: viewer } = await supabase
    .from('progress_viewers')
    .select('id, display_name, is_active')
    .eq('public_token', token)
    .maybeSingle();
  if (!viewer?.is_active) return null;
  const { data: projects, error } = await supabase
    .from('progress_projects')
    .select(
      'sequence_number, name, project_type, manager_name, observations, current_progress, current_status, updated_at, stages:progress_project_stages(stage_key, stage_label, stage_group, position, is_completed)',
    )
    .eq('assigned_viewer_id', viewer.id)
    .eq('is_active', true)
    .order('sequence_number');
  if (error) throw error;
  return {
    viewer: { display_name: viewer.display_name },
    projects: (projects ?? []) as PublicProgressResponse['projects'],
  };
}
