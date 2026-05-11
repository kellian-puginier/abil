'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Player, PlayerStats, Response, BmAssignments } from '@/lib/supabase/types'

// État complet du questionnaire — mirrors la table `responses`
// + les infos joueur chargées une seule fois
export type QuestionnaireState = {
  // Joueur identifié
  player: Player | null
  playerStats: PlayerStats | null

  // Métadonnées flow
  currentStep: number
  responseId: string | null   // UUID de la ligne `responses` en DB
  clientToken: string | null  // UUID localStorage pour reprise auto

  // Étape 2 : bilan
  seasonFeedback: string

  // Étape 3 : licence
  stayingLicensed: boolean | null
  reasonLeavingClub: string

  // Étape 4 : IC
  doingInterclubs: boolean | null
  reasonNoIc: string

  // Étape 5 : tableaux
  tableauRanking: string[]   // ['simple','double','mixte'] ordonnés

  // Étape 6 : disponibilités
  availability: string[]     // 'weekday' | 'saturday' | 'sunday' | 'anytime'

  // Étape 7 : format matchs
  matchesPerEncounter: string
  matchesPerDay: string

  // Étape 8 : partenaires
  doublePartners: string[]   // player UUIDs
  mixtePartners: string[]

  // Étape 9 : équipes
  preferredTeams: string[]   // team codes ou ['any']

  // Étape 11 : calendrier
  unavailableDates: string[]             // ic_date UUIDs
  dateComments: Record<string, string>   // { icDateId: commentaire }

  // Badminton Manager (V1.1)
  didBm: boolean
  bmAssignments: BmAssignments | null

  // Actions
  setPlayer: (player: Player, stats: PlayerStats | null) => void
  setCurrentStep: (step: number) => void
  setResponseId: (id: string) => void
  patchResponse: (partial: Partial<ResponseFields>) => void
  hydrateFromDb: (response: Response, player: Player, stats: PlayerStats | null) => void
  reset: () => void
}

// Champs directement mappés depuis/vers la DB
type ResponseFields = Omit<
  QuestionnaireState,
  | 'player' | 'playerStats' | 'currentStep' | 'responseId' | 'clientToken'
  | 'setPlayer' | 'setCurrentStep' | 'setResponseId' | 'patchResponse'
  | 'hydrateFromDb' | 'reset'
>

const initialState = {
  player: null,
  playerStats: null,
  currentStep: 0,
  responseId: null,
  clientToken: null,
  seasonFeedback: '',
  stayingLicensed: null,
  reasonLeavingClub: '',
  doingInterclubs: null,
  reasonNoIc: '',
  tableauRanking: [],
  availability: [],
  matchesPerEncounter: '',
  matchesPerDay: '',
  doublePartners: [],
  mixtePartners: [],
  preferredTeams: [],
  unavailableDates: [],
  dateComments: {},
  didBm: false,
  bmAssignments: null,
}

export const useQuestionnaireStore = create<QuestionnaireState>()(
  persist(
    (set) => ({
      ...initialState,

      setPlayer: (player, stats) => set({ player, playerStats: stats }),

      setCurrentStep: (step) => set({ currentStep: step }),

      setResponseId: (id) => set({ responseId: id }),

      patchResponse: (partial) => set((state) => ({ ...state, ...partial })),

      hydrateFromDb: (response, player, stats) =>
        set({
          player,
          playerStats: stats,
          responseId: response.id,
          clientToken: response.client_token,
          currentStep: response.current_step,
          seasonFeedback: response.season_feedback ?? '',
          stayingLicensed: response.staying_licensed,
          reasonLeavingClub: response.reason_leaving_club ?? '',
          doingInterclubs: response.doing_interclubs,
          reasonNoIc: response.reason_no_ic ?? '',
          tableauRanking: response.tableau_ranking ?? [],
          availability: response.availability ?? [],
          matchesPerEncounter: response.matches_per_encounter ?? '',
          matchesPerDay: response.matches_per_day ?? '',
          doublePartners: response.double_partners ?? [],
          mixtePartners: response.mixte_partners ?? [],
          preferredTeams: response.preferred_teams ?? [],
          unavailableDates: response.unavailable_dates ?? [],
          dateComments: response.date_comments ?? {},
          didBm: response.did_bm,
          bmAssignments: response.bm_assignments,
        }),

      reset: () => set(initialState),
    }),
    {
      name: 'abil-questionnaire',
      // Ne persiste que le token et les données de reprise — pas le joueur complet
      partialize: (state) => ({
        clientToken: state.clientToken,
        responseId: state.responseId,
        currentStep: state.currentStep,
      }),
    }
  )
)
