import { z } from 'zod';

import {
  ALEXPERTO_INTERNAL_STATUSES,
  ALEXPERTO_SPECIALTY_CODES,
} from '@/types/alexperto';

export const alexpertoQuoteFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  montoMinimo: z.coerce.number().min(0).default(0),
  especialidades: z.array(z.enum(ALEXPERTO_SPECIALTY_CODES)).default([]),
  estadoExterno: z.array(z.string().trim().min(1).max(80)).default([]),
  estadoInterno: z.array(z.enum(ALEXPERTO_INTERNAL_STATUSES)).default([]),
  creadoPor: z.array(z.enum(['PROVIDER', 'ADMINISTRATOR'])).default([]),
  inmuebles: z.array(z.string().trim().min(1).max(200)).default([]),
  search: z.string().trim().max(100).default(''),
  propertyId: z.string().uuid().optional(),
  sort: z.enum(['createdAt', 'amount', 'delayDays']).default('createdAt'),
  direction: z.enum(['asc', 'desc']).default('desc'),
});

export type AlexpertoQuoteFilters = z.infer<typeof alexpertoQuoteFiltersSchema>;

export const alexpertoRequestFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
  requestTypes: z.array(z.string().trim().min(1).max(80)).default([]),
  especialidades: z.array(z.enum(ALEXPERTO_SPECIALTY_CODES)).default([]),
  estadoExterno: z.array(z.string().trim().min(1).max(80)).default([]),
  estadoInterno: z.array(z.enum(ALEXPERTO_INTERNAL_STATUSES)).default([]),
  inmuebles: z.array(z.string().trim().min(1).max(200)).default([]),
  search: z.string().trim().max(100).default(''),
  propertyId: z.string().uuid().optional(),
  sort: z.enum(['startTime', 'createdAt']).default('startTime'),
  direction: z.enum(['asc', 'desc']).default('desc'),
});

export type AlexpertoRequestFilters = z.infer<
  typeof alexpertoRequestFiltersSchema
>;

export const alexpertoAuditActionSchema = z.object({
  status: z.enum(ALEXPERTO_INTERNAL_STATUSES),
  auditorComment: z.string().trim().max(2000).nullable().optional(),
  paulComment: z.string().trim().max(2000).nullable().optional(),
  recordHistory: z.boolean().default(true),
});

export type AlexpertoAuditAction = z.infer<typeof alexpertoAuditActionSchema>;
