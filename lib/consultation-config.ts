// Consultation N2 — parcours strictement linéaire, sans branches conditionnelles
// (contrairement au sondage principal, donc pas besoin d'un système de "conditions")

export const consultationSteps = [
  'accueil',
  'scenarios',
  'ressenti',
  'direction',
  'priorites',
  'arguments',
] as const

export type ConsultationStepId = (typeof consultationSteps)[number]

export const CONSULTATION_STEP_LABELS: Record<ConsultationStepId, string> = {
  accueil:   'Contexte',
  scenarios: 'Les deux scénarios',
  ressenti:  'Ton ressenti',
  direction: 'Ton avis',
  priorites: 'Tes priorités',
  arguments: 'Tes arguments',
}

export function getConsultationStepIndex(stepId: string): number {
  return consultationSteps.indexOf(stepId as ConsultationStepId)
}

export function getNextConsultationStep(stepId: string): string | null {
  const idx = getConsultationStepIndex(stepId)
  return idx >= 0 && idx < consultationSteps.length - 1 ? consultationSteps[idx + 1] : null
}

export function getPrevConsultationStep(stepId: string): string | null {
  const idx = getConsultationStepIndex(stepId)
  return idx > 0 ? consultationSteps[idx - 1] : null
}
