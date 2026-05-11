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
    // Affiché seulement si le joueur renouvelle sa licence
    condition: (s) => s.stayingLicensed === true,
  },
  {
    id: 'tableau-ranking',
    condition: (s) => s.stayingLicensed === true && s.doingInterclubs === true,
  },
  {
    id: 'availability',
    condition: (s) => s.stayingLicensed === true && s.doingInterclubs === true,
  },
  {
    id: 'match-format',
    condition: (s) => s.stayingLicensed === true && s.doingInterclubs === true,
  },
  {
    id: 'partners',
    condition: (s) =>
      s.stayingLicensed === true &&
      s.doingInterclubs === true &&
      // Affiché si double ou mixte est dans le top 2 du classement tableaux
      (s.tableauRanking?.indexOf('double') ?? 3) < 2 ||
      (s.tableauRanking?.indexOf('mixte') ?? 3) < 2,
  },
  {
    id: 'teams',
    condition: (s) => s.stayingLicensed === true && s.doingInterclubs === true,
  },
  {
    id: 'badminton-manager',
    // Placeholder V1 — toujours affiché si IC oui
    condition: (s) => s.stayingLicensed === true && s.doingInterclubs === true,
  },
  {
    id: 'calendar',
    condition: (s) => s.stayingLicensed === true && s.doingInterclubs === true,
  },
  {
    id: 'summary',
    condition: () => true,
  },
]

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
