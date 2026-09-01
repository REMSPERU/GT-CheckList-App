import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProgressProject, ProgressViewer } from '@/types/progress';

const projectSelect =
  '*, assigned_viewer:progress_viewers(id, display_name, is_active), stages:progress_project_stages(*)';
export async function listProgressProjects(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('progress_projects')
    .select(projectSelect)
    .order('sequence_number');
  if (error) throw error;
  return (data ?? []) as ProgressProject[];
}
export async function getProgressProject(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from('progress_projects')
    .select(projectSelect)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as ProgressProject;
}
export async function listProgressViewers(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('progress_viewers')
    .select('*')
    .order('display_name');
  if (error) throw error;
  return (data ?? []) as ProgressViewer[];
}
export async function createProgressViewer(
  supabase: SupabaseClient,
  displayName: string,
) {
  const { data, error } = await supabase
    .from('progress_viewers')
    .insert({
      display_name: displayName,
      public_token:
        crypto.randomUUID().replaceAll('-', '') +
        crypto.randomUUID().replaceAll('-', ''),
    })
    .select()
    .single();
  if (error) throw error;
  return data as ProgressViewer;
}
export async function updateProgressViewer(
  supabase: SupabaseClient,
  id: string,
  input: { display_name?: string; is_active?: boolean; regenerate?: boolean },
) {
  const patch = {
    ...(input.display_name === undefined
      ? {}
      : { display_name: input.display_name }),
    ...(input.is_active === undefined ? {} : { is_active: input.is_active }),
    ...(input.regenerate
      ? {
          public_token:
            crypto.randomUUID().replaceAll('-', '') +
            crypto.randomUUID().replaceAll('-', ''),
        }
      : {}),
  };
  const { data, error } = await supabase
    .from('progress_viewers')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as ProgressViewer;
}
export async function createProgressProject(
  supabase: SupabaseClient,
  input: Record<string, unknown>,
  userId: string,
) {
  const { data, error } = await supabase
    .from('progress_projects')
    .insert({ ...input, created_by: userId, updated_by: userId })
    .select('id')
    .single();
  if (error) throw error;
  const stages = (await import('@/types/progress')).PROGRESS_STAGES.map(
    ([stage_key, stage_label, stage_group], index) => ({
      project_id: data.id,
      stage_key,
      stage_label,
      stage_group,
      position: index + 1,
      updated_by: userId,
    }),
  );
  const result = await supabase.from('progress_project_stages').insert(stages);
  if (result.error) throw result.error;
  return getProgressProject(supabase, data.id);
}
export async function updateProgressProject(
  supabase: SupabaseClient,
  id: string,
  input: Record<string, unknown>,
  userId: string,
) {
  const { error } = await supabase
    .from('progress_projects')
    .update({ ...input, updated_by: userId })
    .eq('id', id);
  if (error) throw error;
  return getProgressProject(supabase, id);
}

export async function deleteProgressProject(
  supabase: SupabaseClient,
  id: string,
) {
  const { error } = await supabase
    .from('progress_projects')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
export async function updateProgressStages(
  supabase: SupabaseClient,
  id: string,
  stages: { id: string; is_completed: boolean }[],
  userId: string,
) {
  for (const stage of stages) {
    const { error } = await supabase
      .from('progress_project_stages')
      .update({ is_completed: stage.is_completed, updated_by: userId })
      .eq('id', stage.id)
      .eq('project_id', id);
    if (error) throw error;
  }
  return getProgressProject(supabase, id);
}

export async function deleteProgressViewer(
  supabase: SupabaseClient,
  id: string,
) {
  const { error } = await supabase
    .from('progress_viewers')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
