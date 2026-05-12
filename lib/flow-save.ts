import type { QuestionnaireState } from '@/stores/questionnaire'

export function buildUpsertPayload(store: QuestionnaireState) {
  return {
    ...(store.responseId ? { id: store.responseId } : {}),
    player_id: store.player!.id,
    client_token: store.clientToken,
    current_step: store.currentStep,
    last_resumed_at: new Date().toISOString(),

    season_feedback: store.seasonFeedback || null,

    staying_licensed: store.stayingLicensed,
    reason_leaving_club: store.reasonLeavingClub || null,

    doing_interclubs: store.doingInterclubs,
    reason_no_ic: store.reasonNoIc || null,

    charter_consent: store.charterConsent,
    wants_captain: store.wantsCaptain || null,
    ic_role: store.icRole || null,

    tableau_ranking: store.tableauRanking.length ? store.tableauRanking : null,
    availability: store.availability.length ? store.availability : null,
    matches_per_encounter: store.matchesPerEncounter || null,
    matches_per_day: store.matchesPerDay || null,
    double_partners: store.doublePartners.length ? store.doublePartners : null,
    mixte_partners: store.mixtePartners.length ? store.mixtePartners : null,
    preferred_teams: store.preferredTeams.length ? store.preferredTeams : null,
    unavailable_dates: store.unavailableDates.length ? store.unavailableDates : null,
    date_comments: Object.keys(store.dateComments).length ? store.dateComments : null,

    tshirt_has: store.tshirtHas.length ? store.tshirtHas : null,
    tshirt_model: store.tshirtModel || null,
    tshirt_size: store.tshirtSize || null,
    formations_interest: store.formationsInterest.length ? store.formationsInterest : null,
    stage_availability: Object.keys(store.stageAvailability).length ? store.stageAvailability : null,
    cohesion_text: store.cohesionText || null,
    cohesion_date: store.cohesionDate || null,

    did_bm: store.didBm,
    bm_assignments: store.bmAssignments,
  }
}
