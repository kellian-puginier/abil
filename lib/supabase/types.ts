// Types générés manuellement en attendant supabase gen types
// Mettre à jour avec `npx supabase gen types typescript --project-id <id>`

export type Gender = 'H' | 'F'

export type Player = {
  id: string
  first_name: string
  last_name: string
  email: string
  gender: Gender
  ranking_simple: string | null
  ranking_double: string | null
  ranking_mixte: string | null
  previous_teams: string[]   // équipes IC saison(s) précédente(s)
  is_new: boolean
  created_at: string
}

export type PlayerStats = {
  player_id: string
  matches_simple: number
  matches_double: number
  matches_mixte: number
  partners: string[]
  notes: string | null
}

export type Team = {
  code: string
  label: string
  level_order: number
  play_days: string[] // 'saturday' | 'sunday' | 'weekday'
}

export type IcDate = {
  id: string
  date: string // ISO date
  team_codes: string[]
  label: string | null
}

export type BmAssignments = {
  // Préparé pour V1.1 — structure libre pour l'instant
  [teamCode: string]: {
    roster: string[]   // player IDs
    lineup: Record<string, string> // poste → player ID
  }
}

export type Response = {
  id: string
  player_id: string
  client_token: string | null

  season_feedback: string | null

  staying_licensed: boolean | null
  reason_leaving_club: string | null

  doing_interclubs: boolean | null
  reason_no_ic: string | null

  tableau_ranking: string[] | null       // ['simple','double','mixte']
  availability: string[] | null          // ['weekday','saturday','sunday','anytime']
  matches_per_encounter: string | null
  matches_per_day: string | null
  double_partners: string[] | null       // player UUIDs
  mixte_partners: string[] | null
  preferred_teams: string[] | null       // team codes ou ['any']
  unavailable_dates: string[] | null     // ic_date UUIDs
  date_comments: Record<string, string> | null

  did_bm: boolean
  bm_assignments: BmAssignments | null

  completed: boolean
  current_step: number
  last_resumed_at: string | null
  created_at: string
  updated_at: string
}

// Joueur avec ses stats (jointure côté client)
export type PlayerWithStats = Player & {
  stats: PlayerStats | null
}
