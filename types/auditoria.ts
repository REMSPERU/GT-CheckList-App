export interface AuditAnswer {
  isApplicable: boolean;
  status: boolean | null;
  observation: string;
  photoUris: string[];
}

export interface AuditQuestion {
  id: string;
  question_text: string;
  section_id: string | null;
  section_name: string | null;
  section_order_index: number | null;
  equipment_name: string | null;
}

export type AnswerErrors = Record<
  string,
  { status?: string; observation?: string; photos?: string }
>;

export type ApplicableAnswerEntry = {
  question: AuditQuestion;
  answer: AuditAnswer & { status: boolean };
};

export interface StoredPhoto {
  bucket?: string;
  path?: string;
  local_uri?: string;
}

export interface StoredAuditAnswer {
  question_id: string;
  status: 'OK' | 'OBS';
  comment?: string | null;
  photos?: StoredPhoto[];
}

export interface StoredAuditPayload {
  version: number;
  answers: StoredAuditAnswer[];
}

export interface StoredSummary {
  total_questions?: number;
  total_applies?: number;
  total_not_applicable?: number;
  total_ok?: number;
  total_obs?: number;
  total_photos?: number;
}

export interface OfflineAuditSession {
  local_id: number;
  auditor_id: string;
  scheduled_for: string;
  started_at: string | null;
  submitted_at: string | null;
  audit_payload: string | null;
  summary: string | null;
  sync_status: 'pending' | 'syncing' | 'synced' | 'error';
  error_message: string | null;
  created_at: string;
}

export interface LocalUserRecord {
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
}
