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

  // Étape 3 : licence  (null = incertain)
  stayingLicensed: boolean | null
  licensedUnsure: boolean        // true si "je ne sais pas encore"
  reasonLeavingClub: string      // raison du départ OU raison du doute

  // Étape 4 : IC  (null = incertain)
  doingInterclubs: boolean | null
  icUnsure: boolean              // true si "je ne sais pas encore"
  reasonNoIc: string             // raison du refus OU raison du doute

  // Étape 5 : tableaux
  tableauRanking: string[]   // ['simple','double','mixte'] ordonnés

  // Étape 6 : disponibilités
  availability: string[]     // 'weekday' | 'saturday' | 'sunday' | 'anytime'

  // Étape 7 : format matchs
  matchesPerEncounter: string
  matchesPerDay: string

  // Charte du joueur
  charterConsent: boolean | null

  // Capitaine + rôle IC
  wantsCaptain: string        // 'yes' | 'no' | 'if_needed'
  icRole: string              // 'titulaire' | 'remplacant' | 'peu_importe'

  // Étape 8 : partenaires
  doublePartners: string[]
  mixtePartners: string[]

  // Étape 9 : équipes
  preferredTeams: string[]

  // T-shirt
  tshirtHas: string[]         // ['bleu'] | ['jaune'] | ['les_deux'] | ['none']
  tshirtModel: string         // 'homme' | 'femme'
  tshirtSize: string          // 'XS'..'3XL'

  // Formations
  formationsInterest: string[]

  // Stage de reprise + Cohésion
  stageAvailability: Record<string, string>  // { event_id: 'yes'|'no'|'uncertain' }
  cohesionText: string
  cohesionDate: string

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
  licensedUnsure: false,
  reasonLeavingClub: '',
  doingInterclubs: null,
  icUnsure: false,
  reasonNoIc: '',
  charterConsent: null,
  wantsCaptain: '',
  icRole: '',
  tableauRanking: [],
  availability: [],
  matchesPerEncounter: '',
  matchesPerDay: '',
  doublePartners: [],
  mixtePartners: [],
  preferredTeams: [],
  tshirtHas: [],
  tshirtModel: '',
  tshirtSize: '',
  formationsInterest: [],
  stageAvailability: {},
  cohesionText: '',
  cohesionDate: '',
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
          licensedUnsure: response.staying_licensed === null && !!response.reason_leaving_club,
          reasonLeavingClub: response.reason_leaving_club ?? '',
          doingInterclubs: response.doing_interclubs,
          icUnsure: response.doing_interclubs === null && !!response.reason_no_ic,
          reasonNoIc: response.reason_no_ic ?? '',
          charterConsent: response.charter_consent,
          wantsCaptain: response.wants_captain ?? '',
          icRole: response.ic_role ?? '',
          tableauRanking: response.tableau_ranking ?? [],
          availability: response.availability ?? [],
          matchesPerEncounter: response.matches_per_encounter ?? '',
          matchesPerDay: response.matches_per_day ?? '',
          doublePartners: response.double_partners ?? [],
          mixtePartners: response.mixte_partners ?? [],
          preferredTeams: response.preferred_teams ?? [],
          tshirtHas: response.tshirt_has ?? [],
          tshirtModel: response.tshirt_model ?? '',
          tshirtSize: response.tshirt_size ?? '',
          formationsInterest: response.formations_interest ?? [],
          stageAvailability: (response.stage_availability as Record<string, string>) ?? {},
          cohesionText: response.cohesion_text ?? '',
          cohesionDate: response.cohesion_date ?? '',
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
