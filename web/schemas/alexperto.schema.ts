import { z } from 'zod';

import {
  ALEXPERTO_INTERNAL_STATUSES,
  ALEXPERTO_SPECIALTY_CODES,
  TECHNICAL_CRITICALITIES,
} from '@/types/alexperto';

export const alexpertoQuoteFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  montoMinimo: z.coerce.number().min(0).default(0),
  especialidades: z.array(z.string().trim().min(1).max(200)).default([]),
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
  fechaDesde: z.string().date().optional(),
  fechaHasta: z.string().date().optional(),
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

export const alexpertoQuoteDispatchSchema = z.object({
  dispatchStatus: z.enum(['ENVIADO', 'RETIRADO']),
});

export type AlexpertoAuditAction = z.infer<typeof alexpertoAuditActionSchema>;

export const alexpertoRequestAuditActionSchema = z.object({
  status: z.enum(ALEXPERTO_INTERNAL_STATUSES),
  recordHistory: z.boolean().default(true),
});

export const technicalFindingSchema = z.object({
  id: z.string().trim().min(1).max(100),
  criticality: z.enum(TECHNICAL_CRITICALITIES),
  title: z.string().trim().min(1).max(300),
  equipment: z.string().trim().min(1).max(300).nullable(),
  location: z.string().trim().min(1).max(300).nullable(),
  page: z.number().int().min(1),
  evidence: z.string().trim().min(1).max(1_500),
  impact: z.string().trim().min(1).max(1_000),
  recommendation: z.string().trim().min(1).max(1_000),
});

const technicalReportStructuredSummarySchema = z.object({
  executiveSummary: z.string().trim().min(1).max(3_000),
  importantHighlights: z.array(z.string().trim().min(1).max(500)).max(10),
  findings: z.array(technicalFindingSchema).max(10),
  limitations: z.array(z.string().trim().min(1).max(500)).max(10),
});

const technicalReportTextSummarySchema = z.object({
  markdown: z.string().trim().min(1).max(20_000),
});

export const technicalReportSummarySchema = z.union([
  technicalReportStructuredSummarySchema,
  technicalReportTextSummarySchema,
]);

export type TechnicalReportSummaryInput = z.infer<
  typeof technicalReportSummarySchema
>;
