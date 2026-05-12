import type { QuestionnaireState } from '@/stores/questionnaire'

export type StepConfig = {
  id: string
  condition: (state: QuestionnaireState) => boolean
}

/** Vrai si le joueur veut faire les IC (oui ou incertain). */
function wantsIc(s: QuestionnaireState): boolean {
  const wantsLicense = s.stayingLicensed === true || s.licensedUnsure === true
  const wantsIcStep  = s.doingInterclubs === true || s.icUnsure === true
  return wantsLicense && wantsIcStep
}

/** Vrai si le joueur a sélectionné au moins une équipe Nationale ou Régionale. */
function hasNatRegTeam(s: QuestionnaireState): boolean {
  if (!wantsIc(s)) return false
  if (s.preferredTeams.includes('any')) return true
  return s.preferredTeams.some((c) => ['N2', 'PN', 'R1', 'R2'].includes(c))
}

export const flowSteps: StepConfig[] = [
  { id: 'identify',          condition: () => true },
  { id: 'season-recap',      condition: () => true },
  { id: 'license',           condition: () => true },
  { id: 'ic-engagement',     condition: (s) => s.stayingLicensed === true || s.licensedUnsure === true },

  // Charte — bloquante, doit être signée pour continuer
  { id: 'charter',           condition: (s) => wantsIc(s) },

  // Capitaine et rôle dans l'équipe
  { id: 'captain',           condition: (s) => wantsIc(s) },
  { id: 'ic-role',           condition: (s) => wantsIc(s) },

  // Classement tableaux + disponibilités (match-format supprimé)
  { id: 'tableau-ranking',   condition: (s) => wantsIc(s) },
  { id: 'availability',      condition: (s) => wantsIc(s) },

  // Partenaires (si double/mixte dans le top 2)
  {
    id: 'partners',
    condition: (s) =>
      wantsIc(s) &&
      ((s.tableauRanking?.indexOf('double') ?? 3) < 2 ||
       (s.tableauRanking?.indexOf('mixte') ?? 3) < 2),
  },

  // Équipes souhaitées
  { id: 'teams',             condition: (s) => wantsIc(s) },

  // T-shirt + formations (avant BM)
  { id: 'tshirt',            condition: (s) => wantsIc(s) },
  { id: 'formations',        condition: (s) => wantsIc(s) },

  // Badminton Manager
  { id: 'badminton-manager', condition: (s) => wantsIc(s) },

  // Calendrier IC
  { id: 'calendar',          condition: (s) => wantsIc(s) },

  // Stage de reprise (seulement N2/PN/R1/R2)
  { id: 'stage-reprise',     condition: (s) => hasNatRegTeam(s) },

  // Cohésion (tous les joueurs IC)
  { id: 'cohesion',          condition: (s) => wantsIc(s) },

  { id: 'summary',           condition: () => true },
]

export function getActiveSteps(state: QuestionnaireState): string[] {
  return flowSteps.filter((s) => s.condition(state)).map((s) => s.id)
}

export function getStepIndex(stepId: string, state: QuestionnaireState): number {
  return getActiveSteps(state).indexOf(stepId)
}

export function getNextStep(stepId: string, state: QuestionnaireState): string | null {
  const active = getActiveSteps(state)
  const idx = active.indexOf(stepId)
  return idx >= 0 && idx < active.length - 1 ? active[idx + 1] : null
}

export function getPrevStep(stepId: string, state: QuestionnaireState): string | null {
  const active = getActiveSteps(state)
  const idx = active.indexOf(stepId)
  return idx > 0 ? active[idx - 1] : null
}
