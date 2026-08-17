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

export type AlexpertoSpecialtyCode = (typeof ALEXPERTO_SPECIALTY_CODES)[number];

export const ALEXPERTO_INTERNAL_STATUSES = [
  'PENDIENTE_REVISION',
  'OBSERVADO',
  'CULMINADO',
  'VALIDADO',
] as const;

export type AlexpertoInternalStatus =
  (typeof ALEXPERTO_INTERNAL_STATUSES)[number];

export interface AlexpertoQuoteHistoryItem {
  previousStatus: AlexpertoInternalStatus | null;
  newStatus: AlexpertoInternalStatus;
  auditorComment: string | null;
  paulComment: string | null;
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
}

export interface AlexpertoQuoteListResponse {
  page: number;
  pageSize: number;
  total: number;
  items: AlexpertoQuoteListItem[];
  queriedAt: string;
}
