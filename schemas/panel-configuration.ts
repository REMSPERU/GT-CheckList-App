import { z } from 'zod';

export const PanelTypeSchema = z.enum([
  'adosado',
  'empotrado',
  'autosoportado',
]);
export const PhaseTypeSchema = z.enum([
  'unipolar',
  'mono_2w',
  'tri_3w',
  'tri_4w',
]);
export const CableTypeSchema = z.enum(['libre_halogeno', 'no_libre_halogeno']);
export const ExtraComponentTypeSchema = z.enum([
  'contactores',
  'relays',
  'ventiladores',
  'termostato',
  'medidores',
  'timers',
]);
export const InterruptorTypeSchema = z.enum(['itm', 'id']);

// Esquema para ITM hijo dentro de un ID
export const SubITMSchema = z.object({
  phaseITM: PhaseTypeSchema,
  amperajeITM: z.string().min(1, 'Amperaje requerido'),
  diameter: z.string().min(1, 'Diámetro requerido'),
  cableType: CableTypeSchema.optional(),
  supply: z.string().optional(),
});

export const DefaultCircuitSchema = z.object({
  interruptorType: InterruptorTypeSchema,

  // Campos del interruptor principal (ITM o ID)
  phase: PhaseTypeSchema,
  amperaje: z.string().min(1, 'Amperaje requerido'),
  diameter: z.string().min(1, 'Diámetro requerido'),
  cableType: CableTypeSchema.optional(),
  supply: z.string().optional(),

  // Para ITM: toggle de ID opcional
  hasID: z.boolean(),
  phaseID: PhaseTypeSchema.optional(),
  amperajeID: z.string().optional(),
  diameterID: z.string().optional(),
  cableTypeID: CableTypeSchema.optional(),

  // Para ID: ITMs hijos (1-3)
  subITMsCount: z.string().optional(),
  subITMs: z.array(SubITMSchema).optional(),
});

export const ITGCircuitDataSchema = z.object({
  cnPrefix: z.string().min(1, 'Prefijo requerido'),
  circuitsCount: z.string().refine(val => !isNaN(Number(val)), {
    message: 'Debe ser un numero',
  }),
  circuits: z.array(DefaultCircuitSchema),
  // IT-G specific fields (required)
  amperajeITG: z.string().min(1, 'Amperaje es requerido'),
  diameterITG: z.string().min(1, 'Diámetro es requerido'),
  cableTypeITG: CableTypeSchema,
});

export const ExtraComponentSchema = z.object({
  id: z.string(),
  description: z.string(),
});

export const PanelConfigurationSchema = z.object({
  // Step 1
  panelName: z.string().optional(),
  panelType: PanelTypeSchema,
  voltage: z.string().min(1, 'Voltaje es requerido'),
  phase: PhaseTypeSchema,

  // Step 2
  itgCount: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, {
    message: 'Debe haber al menos 1 IT-G',
  }),
  itgDescriptions: z.array(z.string()),

  // Step 3
  itgCircuits: z.array(ITGCircuitDataSchema),

  // Step 4
  enabledComponents: z.array(ExtraComponentTypeSchema),
  extraComponents: z.object({
    contactores: z.array(ExtraComponentSchema),
    relays: z.array(ExtraComponentSchema),
    ventiladores: z.array(ExtraComponentSchema),
    termostato: z.array(ExtraComponentSchema),
    medidores: z.array(ExtraComponentSchema),
    timers: z.array(ExtraComponentSchema),
  }),

  // Step 5
  extraConditions: z.object({
    mandilProteccion: z.boolean(),
    puertaMandilAterrados: z.boolean(),
    barraTierra: z.boolean(),
    terminalesElectricos: z.boolean(),
    mangasTermoContraibles: z.boolean(),
    diagramaUnifilarDirectorio: z.boolean(),
  }),
});

export type PanelConfigurationFormValues = z.infer<
  typeof PanelConfigurationSchema
>;
