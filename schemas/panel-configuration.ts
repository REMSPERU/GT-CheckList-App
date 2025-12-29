import { z } from "zod";

export const PanelTypeSchema = z.enum(["adosado", "empotrado"]);
export const PhaseTypeSchema = z.enum(["mono_2w", "tri_3w", "tri_4w"]);
export const CableTypeSchema = z.enum(["libre_halogeno", "no_libre_halogeno"]);
export const ExtraComponentTypeSchema = z.enum([
  "contactores",
  "relays",
  "ventiladores",
  "termostato",
  "medidores",
  "timers",
]);

export const DefaultCircuitSchema = z.object({
  phaseITM: PhaseTypeSchema,
  amperajeITM: z.string().min(1, "Campo requerido"),
  diameter: z.string().min(1, "Campo requerido"),
  cableType: CableTypeSchema,
  hasID: z.boolean(),
  phaseID: PhaseTypeSchema.optional(),
  amperajeID: z.string().optional(),
  diameterID: z.string().optional(),
  cableTypeID: CableTypeSchema.optional(),
  supply: z.string().optional(),
});

export const ITGCircuitDataSchema = z.object({
  cnPrefix: z.string().min(1, "Prefijo requerido"),
  circuitsCount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Debe ser mayor a 0",
  }),
  circuits: z.array(DefaultCircuitSchema),
});

export const ExtraComponentSchema = z.object({
  id: z.string(),
  description: z.string(),
});

export const PanelConfigurationSchema = z.object({
  // Step 1
  panelName: z.string().optional(),
  panelType: PanelTypeSchema,
  voltage: z.string().min(1, "Voltaje es requerido"),
  phase: PhaseTypeSchema,

  // Step 2
  itgCount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Debe haber al menos 1 IT-G",
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

export type PanelConfigurationFormValues = z.infer<typeof PanelConfigurationSchema>;
