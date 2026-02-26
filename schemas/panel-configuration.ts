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
export const InterruptorTypeSchema = z.enum(['itm', 'id', 'reserva']);

// Esquema para ITM hijo dentro de un ITM (máx 30) o un ID (máx 3)
export const SubITMSchema = z.object({
  phaseITM: PhaseTypeSchema,
  amperajeITM: z.string().min(1, 'Amperaje requerido'),
  diameter: z.string().min(1, 'Diámetro requerido'),
  cableType: CableTypeSchema.optional(),
  supply: z.string().optional(),
});

// Límites de sub-ITMs por tipo de interruptor
export const SUB_ITMS_MAX_ITM = 30;
export const SUB_ITMS_MAX_ID = 3;

export const DefaultCircuitSchema = z
  .object({
    name: z.string().optional(),
    interruptorType: InterruptorTypeSchema,

    // Campos del interruptor principal (ITM o ID)
    phase: PhaseTypeSchema.optional(),
    amperaje: z.string().optional(),
    diameter: z.string().optional(),
    cableType: CableTypeSchema.optional(),
    supply: z.string().optional(),

    // Para ITM: toggle de ID opcional
    hasID: z.boolean().optional(),
    phaseID: PhaseTypeSchema.optional(),
    amperajeID: z.string().optional(),
    diameterID: z.string().optional(),
    cableTypeID: CableTypeSchema.optional(),

    // Sub-ITMs hijos (ITM: 0-30, ID: 1-3)
    hasSubITMs: z.boolean().optional(),
    subITMsCount: z.string().optional(),
    subITMs: z.array(SubITMSchema).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.interruptorType !== 'reserva') {
      if (!data.phase) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Fase requerida',
          path: ['phase'],
        });
      }
      if (!data.amperaje) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Amperaje requerido',
          path: ['amperaje'],
        });
      }
      if (!data.diameter) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Diámetro requerido',
          path: ['diameter'],
        });
      }
    }

    // Validar límite de sub-ITMs según tipo
    if (data.subITMs && data.subITMs.length > 0) {
      const max =
        data.interruptorType === 'itm' ? SUB_ITMS_MAX_ITM : SUB_ITMS_MAX_ID;
      if (data.subITMs.length > max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Máximo ${max} sub-ITMs para tipo ${data.interruptorType.toUpperCase()}`,
          path: ['subITMs'],
        });
      }
    }
  });

export const ITGCircuitDataSchema = z.object({
  cnPrefix: z.string().min(1, 'Prefijo requerido'),
  circuitsCount: z.string().refine(val => !isNaN(Number(val)), {
    message: 'Debe ser un numero',
  }),
  circuits: z.array(DefaultCircuitSchema),
  // IT-G specific fields (required)
  phaseITG: PhaseTypeSchema,
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

// ============================================================================
// DRAFT SCHEMA (permisivo)
// ============================================================================
// Esquema que solo valida la estructura/tipos sin reglas de negocio.
// Se usa para validar drafts guardados offline que pueden estar a medio llenar.
// Sin .min(), sin .refine(), sin .superRefine() — solo forma y tipos.

const SubITMDraftSchema = z.object({
  phaseITM: PhaseTypeSchema,
  amperajeITM: z.string(),
  diameter: z.string(),
  cableType: CableTypeSchema.optional(),
  supply: z.string().optional(),
});

const CircuitDraftSchema = z.object({
  name: z.string().optional(),
  interruptorType: InterruptorTypeSchema,
  phase: PhaseTypeSchema.optional(),
  amperaje: z.string().optional(),
  diameter: z.string().optional(),
  cableType: CableTypeSchema.optional(),
  supply: z.string().optional(),
  hasID: z.boolean().optional(),
  phaseID: PhaseTypeSchema.optional(),
  amperajeID: z.string().optional(),
  diameterID: z.string().optional(),
  cableTypeID: CableTypeSchema.optional(),
  hasSubITMs: z.boolean().optional(),
  subITMsCount: z.string().optional(),
  subITMs: z.array(SubITMDraftSchema).optional(),
});

const ITGCircuitDataDraftSchema = z.object({
  cnPrefix: z.string(),
  circuitsCount: z.string(),
  circuits: z.array(CircuitDraftSchema),
  phaseITG: PhaseTypeSchema.optional(),
  amperajeITG: z.string().optional(),
  diameterITG: z.string().optional(),
  cableTypeITG: CableTypeSchema.optional(),
});

const ExtraComponentDraftSchema = z.object({
  id: z.string(),
  description: z.string(),
});

export const PanelConfigurationDraftSchema = z.object({
  panelName: z.string().optional(),
  panelType: PanelTypeSchema,
  voltage: z.string(),
  phase: PhaseTypeSchema,

  itgCount: z.string(),
  itgDescriptions: z.array(z.string()),

  itgCircuits: z.array(ITGCircuitDataDraftSchema),

  enabledComponents: z.array(ExtraComponentTypeSchema),
  extraComponents: z.object({
    contactores: z.array(ExtraComponentDraftSchema),
    relays: z.array(ExtraComponentDraftSchema),
    ventiladores: z.array(ExtraComponentDraftSchema),
    termostato: z.array(ExtraComponentDraftSchema),
    medidores: z.array(ExtraComponentDraftSchema),
    timers: z.array(ExtraComponentDraftSchema),
  }),

  extraConditions: z.object({
    mandilProteccion: z.boolean(),
    puertaMandilAterrados: z.boolean(),
    barraTierra: z.boolean(),
    terminalesElectricos: z.boolean(),
    mangasTermoContraibles: z.boolean(),
    diagramaUnifilarDirectorio: z.boolean(),
  }),
});
