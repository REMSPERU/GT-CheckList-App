export interface PreguntaEquipamento {
  id: string;
  equipamento_id: string;
  pregunta: string;
  orden: number;
  activa: boolean;
  created_at: string;
  updated_at: string;
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
