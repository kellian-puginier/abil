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
  {
    value: 'titulaire',
    label: 'Titulaire',
    desc: "M'investir et être présent(e) toute l'année",
    emoji: '🏆',
  },
  {
    value: 'remplacant',
    label: 'Remplaçant(e)',
    desc: 'Pouvoir dépanner en cas de besoin',
    emoji: '🔄',
  },
  {
    value: 'peu_importe',
    label: 'Peu importe',
    desc: 'En fonction des besoins des équipes',
    emoji: '✨',
  },
]

export function IcRoleStep() {
  const router = useRouter()
  const store  = useQuestionnaireStore()
  const [choice, setChoice] = useState(store.icRole)

  async function handleNext() {
    if (!choice) return
    store.patchResponse({ icRole: choice } as any)
    const supabase = createClient()
    await supabase.from('responses').upsert(
      { ...buildUpsertPayload({ ...store, icRole: choice }), current_step: store.currentStep + 1 },
      { onConflict: 'player_id' }
    )
    router.push(`/flow/${getNextStep('ic-role', store) ?? 'tableau-ranking'}`)
  }

  return (
    <div className="flex flex-1 flex-col justify-center space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Ton rôle en IC 🎯</h1>
        <p className="text-muted-foreground">
          Dans une équipe d'interclubs, tu veux…
        </p>
      </div>

      <div className="space-y-3">
        {OPTIONS.map(({ value, label, desc, emoji }) => (
          <button
            key={value}
            type="button"
            onClick={() => setChoice(value)}
            className={cn(
              'flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-colors',
              choice === value
                ? 'border-primary bg-primary/5'
                : 'border-border bg-card hover:border-primary/40'
            )}
          >
            <span className="text-2xl">{emoji}</span>
            <div className="flex-1">
              <p className={cn('font-semibold', choice === value && 'text-primary')}>{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            {choice === value && <span className="text-primary">✓</span>}
          </button>
        ))}
      </div>

      <Button size="lg" className="h-14 w-full text-base" onClick={handleNext} disabled={!choice}>
        Suivant →
      </Button>
    </div>
  )
}
