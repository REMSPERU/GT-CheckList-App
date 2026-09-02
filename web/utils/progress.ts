import type { ProgressStage } from '@/types/progress';

type ProgressStageInput = Pick<ProgressStage, 'is_completed' | 'stage_group'>;

export interface ProgressBreakdown {
  technical: number;
  administration: number;
  final: number;
  technicalCompleted: number;
  administrationCompleted: number;
}

function percentage(completed: number, total: number) {
  return total === 0 ? 0 : Math.round((completed / total) * 100);
}

/** Calculates the two group scores and the weighted project score. */
export function getProgressBreakdown(
  stages: readonly ProgressStageInput[] | undefined,
  fallbackFinal = 0,
): ProgressBreakdown {
  const technicalStages = (stages ?? []).filter(
    stage => stage.stage_group === 'GESTION_TECNICA',
  );
  const administrationStages = (stages ?? []).filter(
    stage => stage.stage_group === 'ADMINISTRACION',
  );
  const technicalCompleted = technicalStages.filter(
    stage => stage.is_completed,
  ).length;
  const administrationCompleted = administrationStages.filter(
    stage => stage.is_completed,
  ).length;
  const technical = percentage(technicalCompleted, technicalStages.length);
  const administration = percentage(
    administrationCompleted,
    administrationStages.length,
  );

  return {
    technical,
    administration,
    final:
      technicalStages.length + administrationStages.length > 0
        ? Math.round(technical * 0.8 + administration * 0.2)
        : fallbackFinal,
    technicalCompleted,
    administrationCompleted,
  };
}
