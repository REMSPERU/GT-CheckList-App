export interface PreguntaEquipamento {
  id: string;
  equipamento_id: string;
  pregunta: string;
  orden: number;
  activa: boolean;
  ponderado?: number | string | null;
  weight_unit?: 'fraction';
  template_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ChecklistPropertyTemplate {
  id: string;
  property_id: string;
  equipamento_id: string;
  version: number;
  questions: { id: string; text: string; weight: number }[];
  created_at: string;
}

export interface ChecklistQuestionAnswer {
  preguntaId: string;
  status: boolean | null;
  observacion: string;
  photoUris: string[];
}

export interface ChecklistResponsePayload {
  equipamentoId: string;
  equipoId: string;
  respuestas: ChecklistQuestionAnswer[];
  observacionGeneral?: string;
  createdAt: string;
}
