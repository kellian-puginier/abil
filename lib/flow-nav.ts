import type { QuestionnaireState } from '@/stores/questionnaire'

/** Libellés lisibles pour chaque étape du flow. */
export const STEP_LABELS: Record<string, string> = {
  'identify':          '👤 Identification',
  'season-recap':      '📊 Bilan de saison',
  'license':           '🎽 Licence',
  'ic-engagement':     '🔥 Interclubs',
  'charter':           '⚖️ Charte du joueur',
  'captain':           '⚓ Capitaine',
  'ic-role':           '🎯 Rôle en IC',
  'tableau-ranking':   '🏸 Tableaux préférés',
  'availability':      '📅 Disponibilités',
  'partners':          '💙 Partenaires',
  'teams':             '🏆 Équipes souhaitées',
  'tshirt':            '👕 T-shirt',
  'formations':        '🎓 Formations',
  'badminton-manager': '🎮 Badminton Manager',
  'calendar':          '📆 Calendrier IC',
  'stage-reprise':     '🏕️ Stage de reprise',
  'cohesion':          '🎉 Cohésion',
  'summary':           '✅ Récapitulatif',
}

/**
 * Retourne true si le joueur a déjà rempli des données IC détaillées
 * (charte → cohésion). Déclenche une alerte si une réponse critique change.
 */
export function hasIcDownstreamData(s: QuestionnaireState): boolean {
  return !!(
    s.charterConsent !== null ||
    s.wantsCaptain ||
    s.icRole ||
    s.tableauRanking.length > 0 ||
    s.availability.length > 0 ||
    s.preferredTeams.length > 0 ||
    s.tshirtHas.length > 0 ||
    s.formationsInterest.length > 0 ||
    s.didBm ||
    s.unavailableDates.length > 0 ||
    Object.keys(s.stageAvailability).length > 0 ||
    s.cohesionDate ||
    s.cohesionText
  )
}

/** Patch effaçant toutes les données IC détaillées (charte → cohésion). */
export const IC_DETAIL_RESET = {
  charterConsent: null as null,
  wantsCaptain: '',
  icRole: '',
  tableauRanking: [] as string[],
  availability: [] as string[],
  doublePartners: [] as string[],
  mixtePartners: [] as string[],
  preferredTeams: [] as string[],
  tshirtHas: [] as string[],
  tshirtModel: '',
  tshirtSize: '',
  formationsInterest: [] as string[],
  bmAssignments: null as null,
  didBm: false,
  unavailableDates: [] as string[],
  dateComments: {} as Record<string, string>,
  stageAvailability: {} as Record<string, string>,
  cohesionDate: '',
  cohesionText: '',
}

/** Patch effaçant l'engagement IC + toutes les données IC détaillées. */
export const IC_ALL_RESET = {
  ...IC_DETAIL_RESET,
  doingInterclubs: null as null,
  icUnsure: false,
  reasonNoIc: '',
}
