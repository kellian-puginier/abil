'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ConsultationTeam, ConsultationDirection } from '@/lib/supabase/types'

// Brouillon local de la consultation N2 — un seul envoi en base à la toute fin
// du parcours (pas de reprise par email comme le sondage principal : parcours
// court, et l'anonymat doit rester possible).
export type ConsultationData = {
  isAnonymous: boolean
  respondentName: string
  team: ConsultationTeam | ''

  feelingText: string

  preferredDirection: ConsultationDirection | null
  directionReasonText: string

  priorities: string[]
  prioritiesOtherText: string
  rebuildInvolvementText: string
  recruitmentOpinionText: string

  otherArgumentsText: string
  availabilityAmbitionText: string
}

export type ConsultationState = ConsultationData & {
  currentStep: number
  setCurrentStep: (step: number) => void
  patch: (partial: Partial<ConsultationData>) => void
  reset: () => void
}

const initialData: ConsultationData = {
  isAnonymous: false,
  respondentName: '',
  team: '',

  feelingText: '',

  preferredDirection: null,
  directionReasonText: '',

  priorities: [],
  prioritiesOtherText: '',
  rebuildInvolvementText: '',
  recruitmentOpinionText: '',

  otherArgumentsText: '',
  availabilityAmbitionText: '',
}

export const useConsultationStore = create<ConsultationState>()(
  persist(
    (set) => ({
      ...initialData,
      currentStep: 0,

      setCurrentStep: (step) => set({ currentStep: step }),
      patch: (partial) => set((state) => ({ ...state, ...partial })),
      reset: () => set({ ...initialData, currentStep: 0 }),
    }),
    {
      name: 'abil-consultation-n2',
    }
  )
)
