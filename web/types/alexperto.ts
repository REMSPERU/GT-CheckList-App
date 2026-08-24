export const ALEXPERTO_SPECIALTY_CODES = [
  'AA',
  'VM',
  'SCI',
  'TE',
  'GE',
  'BOM',
  'SSC',
  'SEE',
  'TTA',
  'ASC',
] as const;

export type AlexpertoSpecialtyCode = string;

export const ALEXPERTO_INTERNAL_STATUSES = [
  'PENDIENTE_REVISION',
  'OBSERVADO',
  'CULMINADO',
  'VALIDADO',
] as const;

export type AlexpertoInternalStatus =
  (typeof ALEXPERTO_INTERNAL_STATUSES)[number];

export const ALEXPERTO_AUDITOR_DISPATCH_STATUSES = [
  'PENDIENTE_ENVIO',
  'ENVIADO',
  'RETIRADO',
] as const;

export type AlexpertoAuditorDispatchStatus =
  (typeof ALEXPERTO_AUDITOR_DISPATCH_STATUSES)[number];

export interface AlexpertoQuoteHistoryItem {
  previousStatus: AlexpertoInternalStatus | null;
  newStatus: AlexpertoInternalStatus;
  auditorComment: string | null;
  paulComment: string | null;
  createdAt: string;
  createdBy: { id: string; name: string | null } | null;
}

export interface AlexpertoRequestHistoryItem {
  previousStatus: AlexpertoInternalStatus | null;
  newStatus: AlexpertoInternalStatus;
  createdAt: string;
  createdBy: { id: string; name: string | null } | null;
}

export interface AlexpertoQuoteListItem {
  externalQuoteId: string;
  code: string;
  createdAt: string;
  property: { id: string; name: string; gemaPropertyId: string };
  specialty: { name: string; code: AlexpertoSpecialtyCode };
  service: string | null;
  serviceCode: string | null;
  amount: string | null;
  externalStatus: string | null;
  delayDays: number;
  internalStatus: AlexpertoInternalStatus;
  internalComment: string | null;
  auditorComment: string | null;
  paulComment: string | null;
  history: AlexpertoQuoteHistoryItem[];
  responsible: { id: string; name: string | null } | null;
  creationUserType: string | null;
  providerName: string | null;
  requesterName: string | null;
  auditorDispatchStatus: AlexpertoAuditorDispatchStatus;
}

export interface AlexpertoQuoteListResponse {
  page: number;
  pageSize: number;
  total: number;
  items: AlexpertoQuoteListItem[];
  specialties: { value: string; label: string }[];
  queriedAt: string;
}

export interface AlexpertoRequestListItem {
  externalRequestId: string;
  code: string;
  createdAt: string;
  startTime: string | null;
  property: { id: string; name: string; gemaPropertyId: string };
  specialty: {
    name: string;
    code: AlexpertoSpecialtyCode | 'OTHER';
  } | null;
  description: string | null;
  requestType: string | null;
  externalStatus: string | null;
  quoteCount: number;
  attachmentCount: number;
  internalStatus: AlexpertoInternalStatus;
  history: AlexpertoRequestHistoryItem[];
}

export interface AlexpertoRequestListResponse {
  page: number;
  pageSize: number;
  total: number;
  items: AlexpertoRequestListItem[];
  summary: {
    externalStatuses: Record<string, number>;
    gemaStatuses: Record<string, number>;
  };
  queriedAt: string;
}

export interface AlexpertoRequestDocument {
  id: string;
  name: string;
  typeName: string;
  source: 'REQUEST' | 'QUOTE' | 'PROPOSAL';
  mimeType: string | null;
  size: number | null;
  createdAt: string;
}

export const TECHNICAL_CRITICALITIES = ['ALTA', 'MEDIA', 'BAJA'] as const;

export type TechnicalCriticality = (typeof TECHNICAL_CRITICALITIES)[number];

export interface TechnicalFinding {
  id: string;
  criticality: TechnicalCriticality;
  title: string;
  equipment: string | null;
  location: string | null;
  page: number;
  evidence: string;
  impact: string;
  recommendation: string;
}

export interface TechnicalReportSummary {
  executiveSummary: string;
  importantHighlights: string[];
  findings: TechnicalFinding[];
  limitations: string[];
}

export type TechnicalReportSummaryStatus =
  'NOT_ANALYZED' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type TechnicalReportProcessingStage =
  'EXTRACTING' | 'ANALYZING' | 'CONSOLIDATING' | null;

export interface TechnicalReportSummaryResponse {
  status: TechnicalReportSummaryStatus;
  summary: TechnicalReportSummary | null;
  model: string | null;
  analyzedAt: string | null;
  errorMessage: string | null;
  processingStage: TechnicalReportProcessingStage;
}

export interface AlexpertoQuoteAuditItem {
  id: string;
  code: string;
  propertyName: string;
  specialty: string;
  subSpecialty: string;
  externalStatus: string;
  gemaStatus: AlexpertoInternalStatus;
  amount: string | null;
  createdAt: string;
  provider: string | null;
  creationUserType: string | null;
  requester: string | null;
  description: string | null;
  serviceCode: string | null;
  auditorComment: string | null;
  paulComment: string | null;
  history: AlexpertoQuoteHistoryItem[];
  auditorDispatchStatus: AlexpertoAuditorDispatchStatus;
}

export interface AlexpertoQuoteDocument {
  id: string;
  name: string;
  mimeType: string | null;
  size: number | null;
  createdAt: string;
  source: 'QUOTE' | 'PROPOSAL';
}
