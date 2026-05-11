/**
 * Définition du flow questionnaire comme tableau de steps.
 * Ajouter/supprimer un step ici suffit — le routeur dynamique
 * [step]/page.tsx se base sur cet array.
 *
 * En V1.1 : remplacer le composant BadmintonManagerStep par l'implémentation complète
 * sans modifier ce fichier ni le routing.
 */

import type { QuestionnaireState } from '@/stores/questionnaire'

export type StepConfig = {
  id: string
  /** Condition pour afficher ce step (basée sur l'état actuel du store). */
  condition: (state: QuestionnaireState) => boolean
}

export const flowSteps: StepConfig[] = [
  {
    id: 'identify',
    condition: () => true,
  },
  {
    id: 'season-recap',
    condition: () => true,
  },
  {
    id: 'license',
    condition: () => true,
  },
  {
    id: 'ic-engagement',
    // Affiché si le joueur renouvelle OU s'il est incertain sur sa licence
    condition: (s) => s.stayingLicensed === true || s.licensedUnsure === true,
  },
  {
    id: 'tableau-ranking',
    condition: (s) => wantsIc(s),
  },
  {
    id: 'availability',
    condition: (s) => wantsIc(s),
  },
  {
    id: 'match-format',
    condition: (s) => wantsIc(s),
  },
  {
    id: 'partners',
    condition: (s) =>
      wantsIc(s) &&
      ((s.tableauRanking?.indexOf('double') ?? 3) < 2 ||
       (s.tableauRanking?.indexOf('mixte') ?? 3) < 2),
  },
  {
    id: 'teams',
    condition: (s) => wantsIc(s),
  },
  {
    id: 'badminton-manager',
    condition: (s) => wantsIc(s),
  },
  {
    id: 'calendar',
    condition: (s) => wantsIc(s),
  },
  {
    id: 'summary',
    condition: () => true,
  },
]

/** Vrai si le joueur fait les IC (oui ou incertain). */
function wantsIc(s: QuestionnaireState): boolean {
  const wantsLicense = s.stayingLicensed === true || s.licensedUnsure === true
  const wantsIcStep  = s.doingInterclubs === true || s.icUnsure === true
  return wantsLicense && wantsIcStep
}

/** Retourne les IDs des steps actifs pour un état donné. */
export function getActiveSteps(state: QuestionnaireState): string[] {
  return flowSteps.filter((s) => s.condition(state)).map((s) => s.id)
}

/** Index (0-based) du step dans la liste des steps actifs. */
export function getStepIndex(stepId: string, state: QuestionnaireState): number {
  return getActiveSteps(state).indexOf(stepId)
}

/** Step suivant à partir de l'ID courant. */
export function getNextStep(stepId: string, state: QuestionnaireState): string | null {
  const active = getActiveSteps(state)
  const idx = active.indexOf(stepId)
  return idx >= 0 && idx < active.length - 1 ? active[idx + 1] : null
}

/** Step précédent. */
export function getPrevStep(stepId: string, state: QuestionnaireState): string | null {
  const active = getActiveSteps(state)
  const idx = active.indexOf(stepId)
  return idx > 0 ? active[idx - 1] : null
}
