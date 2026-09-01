'use client';
import { useCallback, useEffect, useState } from 'react';
import { fetchWithAuth } from '@/services/auth/auth.service';
import type { ProgressProject, ProgressViewer } from '@/types/progress';
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetchWithAuth(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? 'Solicitud fallida');
  return body as T;
}
export function useAdminProgress() {
  const [projects, setProjects] = useState<ProgressProject[]>([]);
  const [viewers, setViewers] = useState<ProgressViewer[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [p, v] = await Promise.all([
        request<{ projects: ProgressProject[] }>(
          '/api/admin/progress/projects',
        ),
        request<{ viewers: ProgressViewer[] }>('/api/admin/progress/viewers'),
      ]);
      setProjects(p.projects);
      setViewers(v.viewers);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const saveProject = async (input: Partial<ProgressProject>) => {
    const result = await request<{ project: ProgressProject }>(
      '/api/admin/progress/projects',
      {
        method: 'POST',
        body: JSON.stringify({
          sequence_number: input.sequence_number,
          name: input.name,
          project_type: input.project_type,
          assigned_viewer_id: input.assigned_viewer_id || null,
          manager_name: input.manager_name || null,
          observations: input.observations || null,
          current_status: input.current_status || 'PLANIFICACION',
          is_active: input.is_active ?? true,
        }),
      },
    );
    setProjects(items =>
      [...items, result.project].sort(
        (a, b) => a.sequence_number - b.sequence_number,
      ),
    );
    return result.project;
  };
  const updateProject = async (id: string, input: Partial<ProgressProject>) => {
    const result = await request<{ project: ProgressProject }>(
      `/api/admin/progress/projects/${id}`,
      { method: 'PATCH', body: JSON.stringify(input) },
    );
    setProjects(items =>
      items.map(item => (item.id === id ? result.project : item)),
    );
    return result.project;
  };
  const updateStages = async (
    project: ProgressProject,
    stages: ProgressProject['stages'],
  ) => {
    const result = await request<{ project: ProgressProject }>(
      `/api/admin/progress/projects/${project.id}/stages`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          stages: (stages ?? []).map(stage => ({
            id: stage.id,
            is_completed: stage.is_completed,
          })),
        }),
      },
    );
    setProjects(items =>
      items.map(item => (item.id === project.id ? result.project : item)),
    );
  };
  const createViewer = async (display_name: string) => {
    const result = await request<{ viewer: ProgressViewer }>(
      '/api/admin/progress/viewers',
      { method: 'POST', body: JSON.stringify({ display_name }) },
    );
    setViewers(items =>
      [...items, result.viewer].sort((a, b) =>
        a.display_name.localeCompare(b.display_name),
      ),
    );
    return result.viewer;
  };
  const updateViewer = async (
    id: string,
    input: { is_active?: boolean; regenerate?: boolean },
  ) => {
    const result = await request<{ viewer: ProgressViewer }>(
      `/api/admin/progress/viewers/${id}`,
      { method: 'PATCH', body: JSON.stringify(input) },
    );
    setViewers(items =>
      items.map(item => (item.id === id ? result.viewer : item)),
    );
  };
  return {
    projects,
    viewers,
    isLoading,
    error,
    saveProject,
    updateProject,
    updateStages,
    createViewer,
    updateViewer,
  };
}
