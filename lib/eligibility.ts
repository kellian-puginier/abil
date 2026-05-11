/**
 * Règles d'éligibilité aux équipes IC selon les disponibilités du joueur.
 * Toutes ces fonctions sont pures (pas d'I/O) → facilement testables.
 */

import type { Player, Team } from './supabase/types'

export type TeamCode =
  | 'N2' | 'PN' | 'R1' | 'R2' | 'PR'
  | 'D1' | 'D2' | 'D3' | 'D4' | 'D5' | 'D6'

// Disponibilités possibles (valeurs stockées dans responses.availability)
export type Availability = 'weekday' | 'saturday' | 'sunday' | 'anytime'

/**
 * Retourne les équipes accessibles selon les créneaux disponibles.
 *
 * Créneaux réels des équipes ABIL :
 *   Samedi   → N2
 *   Dimanche → PN, R1, R2
 *   Semaine  → PR, D1, D2, D3, D4, D5, D6
 */
export function getEligibleTeamsForAvailability(availability: Availability[]): TeamCode[] {
  if (availability.includes('anytime')) {
    return ['N2', 'PN', 'R1', 'R2', 'PR', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6']
  }

  const hasSat     = availability.includes('saturday')
  const hasSun     = availability.includes('sunday')
  const hasWeekday = availability.includes('weekday')

  const eligible: TeamCode[] = []

  if (hasSat)     eligible.push('N2')
  if (hasSun)     eligible.push('PN', 'R1', 'R2')
  if (hasWeekday) eligible.push('PR', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6')

  return eligible
}

/**
 * L'écran "matchs par journée" n'est pertinent que si le joueur peut
 * potentiellement faire des équipes à journées complètes (R1, R2, PN).
 */
export function canAskMatchesPerDay(availability: Availability[]): boolean {
  const eligible = getEligibleTeamsForAvailability(availability)
  return eligible.some((c) => ['PN', 'R1', 'R2'].includes(c))
}

/**
 * Niveau simplifié du joueur basé sur son meilleur classement.
 * Classements FFBAD : NC, P, D, R, N1, N2, N3… (ordre croissant de niveau).
 * On considère N3+ et R comme "régional+".
 */
export function getPlayerLevel(player: Player): 'departemental' | 'regional_plus' {
  const regionalPattern = /^[NRnr]/
  const rankings = [
    player.ranking_simple,
    player.ranking_double,
    player.ranking_mixte,
  ].filter(Boolean) as string[]

  return rankings.some((r) => regionalPattern.test(r))
    ? 'regional_plus'
    : 'departemental'
}

/**
 * Équipes accessibles dans le module Badminton Manager selon le niveau du joueur.
 * Préparé pour V1.1 — non utilisé en V1.
 */
export function getBmAllowedTeams(
  playerLevel: 'departemental' | 'regional_plus'
): TeamCode[] {
  if (playerLevel === 'regional_plus') {
    return ['N2', 'PN', 'R1', 'R2', 'PR']
  }
  return ['PR', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6']
}

/**
 * Filtre les équipes d'une liste selon les disponibilités d'un joueur.
 * Utilisé pour pré-cocher / désactiver les cases à l'écran 9.
 */
export function filterTeamsByAvailability(
  teams: Team[],
  availability: Availability[]
): { team: Team; eligible: boolean }[] {
  const eligible = new Set(getEligibleTeamsForAvailability(availability))
  return teams.map((team) => ({
    team,
    eligible: eligible.has(team.code as TeamCode),
  }))
}
