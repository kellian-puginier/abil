'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { getNextStep } from '@/lib/flow-config'
import { useQuestionnaireStore } from '@/stores/questionnaire'
import { createClient } from '@/lib/supabase/client'
import { buildUpsertPayload } from '@/lib/flow-save'

/**
 * Placeholder V1 — Badminton Manager.
 * En V1.1 : remplacer le contenu de ce composant par l'implémentation complète.
 * Le routing ne changera pas.
 */
export function BadmintonManagerStep() {
  const router = useRouter()
  const store = useQuestionnaireStore()

  async function handleContinue() {
    store.setCurrentStep(10)
    const supabase = createClient()
    await supabase.from('responses').upsert(
      { ...buildUpsertPayload(store), current_step: 10 },
      { onConflict: 'player_id' }
    )
    const next = getNextStep('badminton-manager', store)
    router.push(`/flow/${next ?? 'calendar'}`)
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center space-y-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary text-4xl shadow-inner">
        🎮
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Badminton Manager</h1>
        <p className="text-muted-foreground">
          <span className="text-yellow-500 font-semibold">Bientôt disponible !</span>
        </p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Tu pourras bientôt proposer ta propre vision des équipes et des compositions.
          On t'enverra un mail quand ça sera dispo. 🏸
        </p>
      </div>
      <Button size="lg" className="h-14 w-full max-w-xs text-base" onClick={handleContinue}>
        Continuer →
      </Button>
    </div>
  )
}
