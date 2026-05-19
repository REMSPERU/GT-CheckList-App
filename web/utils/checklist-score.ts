import type {
  AdminChecklistAnswerItem,
  AdminChecklistResponseRow,
} from '@/types/admin';

export interface ChecklistWeightedScore {
  earned: number;
  lost: number;
  total: number;
  percent: number;
}

export function getAnswerWeight(answer: AdminChecklistAnswerItem): number {
  return parseWeight(answer.ponderado);
}

export function getChecklistWeightedScore(
  response: AdminChecklistResponseRow,
): ChecklistWeightedScore {
  const total = response.answers.reduce(
    (sum, answer) => sum + getAnswerWeight(answer),
    0,
  );
  const earned = response.answers.reduce(
    (sum, answer) => sum + (answer.status_ok ? getAnswerWeight(answer) : 0),
    0,
  );

  return {
    total,
    earned,
    lost: total - earned,
    percent: total > 0 ? (earned / total) * 100 : 0,
  };
}

export function formatWeight(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function parseWeight(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
