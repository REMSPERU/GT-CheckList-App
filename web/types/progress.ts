export type ProgressStatus =
  | 'PLANIFICACION'
  | 'EN_CURSO'
  | 'PAUSADO'
  | 'RETRASADO'
  | 'COMPLETADO';
export interface ProgressViewer {
  id: string;
  display_name: string;
  public_token: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
export interface ProgressStage {
  id: string;
  project_id: string;
  stage_key: string;
  stage_label: string;
  stage_group: string;
  position: number;
  is_completed: boolean;
  updated_at: string;
}
export interface ProgressProject {
  id: string;
  sequence_number: number;
  name: string;
  project_type: string;
  property_id: string | null;
  assigned_viewer_id: string | null;
  manager_name: string | null;
  observations: string | null;
  current_progress: number;
  current_status: ProgressStatus;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  assigned_viewer?: Pick<
    ProgressViewer,
    'id' | 'display_name' | 'is_active'
  > | null;
  stages?: ProgressStage[];
}
export interface PublicProgressProject {
  sequence_number: number;
  name: string;
  project_type: string;
  manager_name: string | null;
  observations: string | null;
  current_progress: number;
  current_status: ProgressStatus;
  updated_at: string;
  stages: Pick<
    ProgressStage,
    'stage_key' | 'stage_label' | 'stage_group' | 'position' | 'is_completed'
  >[];
}
export interface PublicProgressResponse {
  viewer: { display_name: string };
  projects: PublicProgressProject[];
}
export const PROGRESS_STAGES = [
  ['proyecto_identificado', 'Proyecto identificado', 'GESTION_TECNICA'],
  ['bases_alcances', 'Bases / alcances elaborado', 'GESTION_TECNICA'],
  ['invitacion_enviada', 'Invitación enviada', 'GESTION_TECNICA'],
  ['visita_tecnica', 'Visita técnica realizada', 'GESTION_TECNICA'],
  ['propuestas_recibidas', 'Propuestas recibidas', 'GESTION_TECNICA'],
  ['evaluacion_tecnica', 'Evaluación técnica', 'GESTION_TECNICA'],
  ['evaluacion_economica', 'Evaluación económica', 'GESTION_TECNICA'],
  ['adjudicacion', 'Adjudicación', 'GESTION_TECNICA'],
  ['contrato_firmado', 'Contrato firmado', 'ADMINISTRACION'],
  ['implementacion', 'Implementación realizada', 'ADMINISTRACION'],
] as const;
