/**
 * Règles de composition d'équipe pour Badminton Manager (V1.1).
 * Ce fichier est un scaffold : les stubs ci-dessous sont commentés
 * avec la spec complète. Implémenter en V1.1 sans toucher au flow.
 *
 * Structure d'une rencontre IC :
 *   2 × Simple Homme  (SH1, SH2)
 *   2 × Simple Dame   (SD1, SD2)
 *   1 × Double Homme  (DH)
 *   1 × Double Dame   (DD)
 *   2 × Double Mixte  (DMx1, DMx2)
 *   → 8 matchs total
 */

import type { Player } from './supabase/types'
import type { TeamCode } from './eligibility'

export type Lineup = {
  SH1: string | null   // player ID
  SH2: string | null
  SD1: string | null
  SD2: string | null
  DH:  [string, string] | null   // [playerA, playerB]
  DD:  [string, string] | null
  DMx1: [string, string] | null  // [homme, femme]
  DMx2: [string, string] | null
}

export type ValidationResult = {
  valid: boolean
  errors: string[]
}

/**
 * V1.1 — Valide qu'un effectif a le minimum requis : 4H + 4F.
 */
export function validateRoster(
  _roster: Player[],
  _teamCode: TeamCode
): ValidationResult {
  // TODO V1.1 :
  // const men   = roster.filter(p => p.gender === 'H')
  // const women = roster.filter(p => p.gender === 'F')
  // if (men.length < 4) errors.push('Il faut au moins 4 joueurs H')
  // if (women.length < 4) errors.push('Il faut au moins 4 joueuses F')
  return { valid: false, errors: ['Non implémenté en V1'] }
}

/**
 * V1.1 — Valide la compo type :
 *   - un joueur apparaît au maximum 2 fois
 *   - contraintes de genre par poste respectées
 */
export function validateLineup(_lineup: Lineup): ValidationResult {
  // TODO V1.1
  return { valid: false, errors: ['Non implémenté en V1'] }
}

/**
 * V1.1 — Retourne les joueurs disponibles pour une équipe donnée,
 * en excluant ceux déjà assignés à d'autres équipes.
 */
export function getAvailablePlayersForTeam(
  _allPlayers: Player[],
  _alreadyAssigned: Set<string>,
  _teamCode: TeamCode
): Player[] {
  // TODO V1.1
  return []
}
