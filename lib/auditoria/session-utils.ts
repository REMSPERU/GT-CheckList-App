import type { AuditAnswer } from '@/types/auditoria';

export function createEmptyAuditAnswer(): AuditAnswer {
  return {
    isApplicable: true,
    status: null,
    observation: '',
    photoUris: [],
  };
}

export function parseLegacyAuditQuestion(questionText: string) {
  const match = questionText.match(/^\s*\[([^\]]+)\]\s*(.+)$/);

  if (!match) {
    return {
      sectionName: null,
      cleanQuestionText: questionText,
    };
  }

  return {
    sectionName: match[1].trim(),
    cleanQuestionText: match[2].trim(),
  };
}
