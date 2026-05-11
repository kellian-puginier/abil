/**
 * Règles de composition Badminton Manager — V1.1
 *
 * Structure d'une rencontre :
 *   SH1, SH2  — Simple Homme  (1 joueur chacun, H)
 *   SD1, SD2  — Simple Dame   (1 joueuse chacune, F)
 *   DH        — Double Homme  (2 joueurs, H+H)
 *   DD        — Double Dame   (2 joueuses, F+F)
 *   DMx1, DMx2 — Double Mixte (1H + 1F chacun)
 */

import type { Player } from './supabase/types'
import type { TeamCode } from './eligibility'

// ── Types ──────────────────────────────────────────────────────────────────

export type SingleSlot  = string | null                // player ID
export type DoubleSlot  = [string, string] | null      // [playerA, playerB]

export type Lineup = {
  SH1:  SingleSlot
  SH2:  SingleSlot
  SD1:  SingleSlot
  SD2:  SingleSlot
  DH:   DoubleSlot
  DD:   DoubleSlot
  DMx1: DoubleSlot   // [homme, femme]
  DMx2: DoubleSlot
}

export type TeamAssignment = {
  roster:      string[]   // player IDs dans l'effectif
  lineup:      Lineup
  substitutes: string[]   // remplaçants (optionnel)
}

export type BmAssignments = {
  [teamCode: string]: TeamAssignment
}

export type ValidationResult = {
  valid: boolean
  errors: string[]
}

export const EMPTY_LINEUP: Lineup = {
  SH1: null, SH2: null, SD1: null, SD2: null,
  DH: null, DD: null, DMx1: null, DMx2: null,
}

// Postes et leurs contraintes de genre
export const SLOT_CONFIG = [
  { key: 'SH1',  label: 'Simple H 1', gender: 'H' as const, type: 'single' as const },
  { key: 'SH2',  label: 'Simple H 2', gender: 'H' as const, type: 'single' as const },
  { key: 'SD1',  label: 'Simple F 1', gender: 'F' as const, type: 'single' as const },
  { key: 'SD2',  label: 'Simple F 2', gender: 'F' as const, type: 'single' as const },
  { key: 'DH',   label: 'Double H',   gender: 'H' as const, type: 'double' as const },
  { key: 'DD',   label: 'Double F',   gender: 'F' as const, type: 'double' as const },
  { key: 'DMx1', label: 'Mixte 1',    gender: 'X' as const, type: 'mixed'  as const },
  { key: 'DMx2', label: 'Mixte 2',    gender: 'X' as const, type: 'mixed'  as const },
] as const

export type SlotKey = typeof SLOT_CONFIG[number]['key']

// ── Helpers ────────────────────────────────────────────────────────────────

/** Compte les apparitions de chaque joueur dans la compo. */
export function countAppearances(lineup: Lineup): Map<string, number> {
  const counts = new Map<string, number>()
  const add = (id: string | null) => {
    if (!id) return
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  add(lineup.SH1); add(lineup.SH2); add(lineup.SD1); add(lineup.SD2)
  lineup.DH?.forEach(add);  lineup.DD?.forEach(add)
  lineup.DMx1?.forEach(add); lineup.DMx2?.forEach(add)
  return counts
}

/** IDs de tous les joueurs déjà placés dans au moins une équipe. */
export function getAssignedPlayerIds(assignments: BmAssignments): Set<string> {
  const ids = new Set<string>()
  for (const { roster } of Object.values(assignments)) {
    roster.forEach((id) => ids.add(id))
  }
  return ids
}

// ── Règles métier ──────────────────────────────────────────────────────────

/**
 * Valide qu'un effectif contient le minimum requis : 4H + 4F.
 */
export function validateRoster(roster: Player[], _teamCode: TeamCode): ValidationResult {
  const errors: string[] = []
  const men   = roster.filter((p) => p.gender === 'H')
  const women = roster.filter((p) => p.gender === 'F')
  if (men.length < 4)   errors.push(`Il faut au moins 4 joueurs H (actuellement ${men.length})`)
  if (women.length < 4) errors.push(`Il faut au moins 4 joueuses F (actuellement ${women.length})`)
  return { valid: errors.length === 0, errors }
}

/**
 * Valide la compo type :
 *  - un joueur apparaît au maximum 2 fois
 *  - contraintes de genre par poste respectées
 */
export function validateLineup(lineup: Lineup, rosterMap: Map<string, Player>): ValidationResult {
  const errors: string[] = []
  const counts = countAppearances(lineup)

  // Max 2 apparitions par joueur
  for (const [id, count] of counts) {
    if (count > 2) {
      const p = rosterMap.get(id)
      const name = p ? `${p.first_name} ${p.last_name}` : id
      errors.push(`${name} apparaît ${count} fois (max 2)`)
    }
  }

  // Genre par poste
  const checkGender = (id: string | null, expected: 'H' | 'F', slot: string) => {
    if (!id) return
    const p = rosterMap.get(id)
    if (p && p.gender !== expected) {
      errors.push(`Poste ${slot} : ${p.first_name} ${p.last_name} doit être ${expected === 'H' ? 'un homme' : 'une femme'}`)
    }
  }

  checkGender(lineup.SH1, 'H', 'SH1')
  checkGender(lineup.SH2, 'H', 'SH2')
  checkGender(lineup.SD1, 'F', 'SD1')
  checkGender(lineup.SD2, 'F', 'SD2')
  lineup.DH?.forEach((id, i)  => checkGender(id, 'H', `DH[${i}]`))
  lineup.DD?.forEach((id, i)  => checkGender(id, 'F', `DD[${i}]`))
  // Mixte : [0] = H, [1] = F
  if (lineup.DMx1) { checkGender(lineup.DMx1[0], 'H', 'DMx1[H]'); checkGender(lineup.DMx1[1], 'F', 'DMx1[F]') }
  if (lineup.DMx2) { checkGender(lineup.DMx2[0], 'H', 'DMx2[H]'); checkGender(lineup.DMx2[1], 'F', 'DMx2[F]') }

  // Un joueur ne peut pas faire SH1 ET SH2 (deux simples distincts)
  if (lineup.SH1 && lineup.SH2 && lineup.SH1 === lineup.SH2)
    errors.push('SH1 et SH2 doivent être deux joueurs différents')
  if (lineup.SD1 && lineup.SD2 && lineup.SD1 === lineup.SD2)
    errors.push('SD1 et SD2 doivent être deux joueuses différentes')

  // Pour le mixte : pas le même joueur en DMx1 ET DMx2
  if (lineup.DMx1 && lineup.DMx2) {
    if (lineup.DMx1[0] && lineup.DMx1[0] === lineup.DMx2[0])
      errors.push('DMx1 et DMx2 : le joueur H doit être différent dans chaque mixte')
    if (lineup.DMx1[1] && lineup.DMx1[1] === lineup.DMx2[1])
      errors.push('DMx1 et DMx2 : la joueuse F doit être différente dans chaque mixte')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Retourne les joueurs disponibles pour une équipe donnée.
 * Exclut les joueurs déjà dans le roster d'une autre équipe.
 */
export function getAvailablePlayersForTeam(
  allPlayers: Player[],
  alreadyAssigned: Set<string>,
  _teamCode: TeamCode
): Player[] {
  return allPlayers.filter((p) => !alreadyAssigned.has(p.id))
}
