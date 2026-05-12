'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useQuestionnaireStore } from '@/stores/questionnaire'
import { getNextStep } from '@/lib/flow-config'
import { createClient } from '@/lib/supabase/client'
import { buildUpsertPayload } from '@/lib/flow-save'
import { cn } from '@/lib/utils'

const OPTIONS = [
  { value: 'yes',      label: 'Oui, je suis partant(e) !',    emoji: '🙋' },
  { value: 'if_needed', label: 'Si besoin, pourquoi pas',       emoji: '🤷' },
  { value: 'no',       label: 'Non, pas cette saison',          emoji: '🙅' },
]

export function CaptainStep() {
  const router = useRouter()
  const store  = useQuestionnaireStore()
  const [choice, setChoice] = useState(store.wantsCaptain)

  async function handleNext() {
    if (!choice) return
    store.patchResponse({ wantsCaptain: choice } as any)
    const supabase = createClient()
    await supabase.from('responses').upsert(
      { ...buildUpsertPayload({ ...store, wantsCaptain: choice }), current_step: store.currentStep + 1 },
      { onConflict: 'player_id' }
    )
    router.push(`/flow/${getNextStep('captain', store) ?? 'ic-role'}`)
  }

  return (
    <div className="flex flex-1 flex-col justify-center space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Capitaine d'équipe ⚓</h1>
        <p className="text-muted-foreground">
          Souhaites-tu devenir capitaine d'une équipe cette saison ?
        </p>
        <p className="text-xs text-muted-foreground bg-muted/50 rounded-xl px-3 py-2">
          Le capitaine est l'interlocuteur de l'équipe avec la commission IC : gestion des feuilles de match, communication avec les joueurs, coordination des déplacements.
        </p>
      </div>

      <div className="space-y-3">
        {OPTIONS.map(({ value, label, emoji }) => (
          <button
            key={value}
            type="button"
            onClick={() => setChoice(value)}
            className={cn(
              'flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-colors',
              choice === value
                ? 'border-primary bg-primary/5 font-medium text-primary'
                : 'border-border bg-card hover:border-primary/40'
            )}
          >
            <span className="text-2xl">{emoji}</span>
            <span className="text-base">{label}</span>
            {choice === value && <span className="ml-auto text-primary">✓</span>}
          </button>
        ))}
      </div>

      <Button size="lg" className="h-14 w-full text-base" onClick={handleNext} disabled={!choice}>
        Suivant →
      </Button>
    </div>
  )
}
