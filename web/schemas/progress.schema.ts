import { z } from 'zod';
export const progressStatusSchema = z.enum([
  'PLANIFICACION',
  'EN_CURSO',
  'PAUSADO',
  'RETRASADO',
  'COMPLETADO',
]);
export const progressProjectSchema = z.object({
  sequence_number: z.coerce.number().int().positive(),
  name: z.string().trim().min(1),
  project_type: z.string().trim().min(1),
  assigned_viewer_id: z.string().uuid().nullable().optional(),
  manager_name: z.string().trim().nullable().optional(),
  observations: z.string().trim().nullable().optional(),
  current_status: progressStatusSchema.default('PLANIFICACION'),
  is_active: z.boolean().default(true),
});
export const progressStagesSchema = z.object({
  stages: z
    .array(z.object({ id: z.string().uuid(), is_completed: z.boolean() }))
    .min(1),
});
export const progressViewerSchema = z.object({
  display_name: z.string().trim().min(1),
});
