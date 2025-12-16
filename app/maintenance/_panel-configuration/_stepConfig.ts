/**
 * Centralized step configuration for panel configuration wizard.
 * To add a new step:
 * 1. Add a new ID to STEP_IDS
 * 2. Add the ID to STEP_ORDER at the desired position
 * 3. Create the corresponding step component file
 */

export const STEP_IDS = {
    BASIC_INFO: 'basic-info',
    ITG_CONFIG: 'itg-config',
    CIRCUITS: 'circuits',
    EXTRA_COMPONENTS: 'extra-components',
    EXTRA_CONDITIONS: 'extra-conditions',
    REVIEW: 'review',
} as const;

export type StepId = (typeof STEP_IDS)[keyof typeof STEP_IDS];

/**
 * Defines the order of steps in the wizard.
 * Modify this array to reorder steps or insert new ones.
 */
export const STEP_ORDER: StepId[] = [
    STEP_IDS.BASIC_INFO,
    STEP_IDS.ITG_CONFIG,
    STEP_IDS.CIRCUITS,
    STEP_IDS.EXTRA_COMPONENTS,
    STEP_IDS.EXTRA_CONDITIONS,
    STEP_IDS.REVIEW,
];

/**
 * Get the index of a step in the order.
 */
export function getStepIndex(stepId: StepId): number {
    return STEP_ORDER.indexOf(stepId);
}

/**
 * Check if a step is the last step.
 */
export function isLastStep(stepId: StepId): boolean {
    return getStepIndex(stepId) === STEP_ORDER.length - 1;
}

/**
 * Check if a step is the first step.
 */
export function isFirstStep(stepId: StepId): boolean {
    return getStepIndex(stepId) === 0;
}
