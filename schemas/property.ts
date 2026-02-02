import { z } from 'zod';

export const AddPropertySchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  code: z.string().min(1, 'El código es requerido'),
  description: z.string().optional(),
  address: z.string().min(5, 'La dirección debe tener al menos 5 caracteres'),
  city: z.string().min(2, 'La ciudad debe tener al menos 2 caracteres'),
  country: z.string().min(2, 'El país debe tener al menos 2 caracteres'),
  property_type: z
    .string()
    .min(2, 'El tipo de propiedad es requerido'),
  maintenance_priority: z
    .string()
    .min(2, 'La prioridad de mantenimiento es requerida'),
  is_active: z.boolean().default(true),
});

export type AddPropertyForm = z.infer<typeof AddPropertySchema>;
