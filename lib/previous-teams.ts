/**
 * Mapping des codes internes ABIL → noms d'équipes pour la saison passée.
 *
 * Les codes stockés dans `players.previous_teams` suivent la numérotation
 * interne du club (ABIL-1, ABIL-2…) qui change chaque saison selon les
 * montées/descentes. Ce fichier traduit ces codes en noms lisibles.
 *
 * ⚠️ À mettre à jour chaque saison une fois les résultats connus.
 * La saison visée par ce sondage est 2026-2027 ;
 * le mapping ci-dessous correspond à la saison PRÉCÉDENTE 2025-2026.
 */

export const PREV_TEAM_LABELS_2025_2026: Record<string, string> = {
  'ABIL-1':  'Nationale 2',
  'ABIL-2':  'Nationale 3',
  'ABIL-3':  'Pré-Nationale',
  'ABIL-4':  'Régionale 2',
  'ABIL-5':  'Pré-Régionale',
  'ABIL-6':  'Départementale 2',
  'ABIL-7':  'Départementale 3',
  'ABIL-8':  'Départementale 4',
  'ABIL-9':  'Départementale 5',
  'ABIL-10': 'Départementale 6',
}

/**
 * Résout un code interne (ex: "ABIL-6") en nom d'équipe lisible.
 * Si le code est inconnu, retourne le code brut tel quel.
 */
export function resolvePreviousTeam(code: string): string {
  return PREV_TEAM_LABELS_2025_2026[code] ?? code
}

/**
 * Résout un tableau de codes en noms lisibles.
 */
export function resolvePreviousTeams(codes: string[]): string[] {
  return codes.map(resolvePreviousTeam)
}
