'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useQuestionnaireStore } from '@/stores/questionnaire'
import { getNextStep } from '@/lib/flow-config'
import { createClient } from '@/lib/supabase/client'
import { buildUpsertPayload } from '@/lib/flow-save'
import { cn } from '@/lib/utils'

const FORMATIONS = [
  {
    value: 'table',
    label: 'Gestionnaire de compétitions',
    desc: 'Table de marque et gestion de Badnet',
    emoji: '🖥️',
    exclusive: false,
  },
  {
    value: 'arbitrage',
    label: "Formation d'arbitrage",
    desc: 'Au bord du terrain : respect des règles et comptage des points',
    emoji: '🏸',
    exclusive: false,
  },
  {
    value: 'ja',
    label: 'Formation Juge Arbitre',
    desc: 'Gestion des joueurs, règlements et tableaux lors des compétitions',
    emoji: '⚖️',
    exclusive: false,
  },
  {
    value: 'jamais',
    label: 'Jamais de la vie !',
    desc: "Je préfère me concentrer sur le jeu",
    emoji: '🙅',
    exclusive: true,
  },
]

export function FormationsStep() {
  const router = useRouter()
  const store  = useQuestionnaireStore()
  const [selected, setSelected] = useState<string[]>(store.formationsInterest)

  function toggle(value: string, exclusive: boolean) {
    if (exclusive) {
      setSelected((prev) => prev.includes(value) ? [] : [value])
    } else {
      setSelected((prev) => {
        const withoutExclusive = prev.filter((v) => !FORMATIONS.find((f) => f.value === v)?.exclusive)
        return withoutExclusive.includes(value)
          ? withoutExclusive.filter((v) => v !== value)
          : [...withoutExclusive, value]
      })
    }
  }

  async function handleNext() {
    if (selected.length === 0) return
    store.patchResponse({ formationsInterest: selected } as any)
    const supabase = createClient()
    await supabase.from('responses').upsert(
      { ...buildUpsertPayload({ ...store, formationsInterest: selected }), current_step: store.currentStep + 1 },
      { onConflict: 'player_id' }
    )
    router.push(`/flow/${getNextStep('formations', store) ?? 'badminton-manager'}`)
  }

  return (
    <div className="flex flex-1 flex-col justify-center space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Formations 🎓</h1>
        <p className="text-muted-foreground">
          Pour assurer la pérennité des équipes, nous avons besoin d'arbitres et de JA.
        </p>
        <p className="text-sm text-muted-foreground">
          Es-tu intéressé(e) par ce type de formation ?
        </p>
      </div>

      <div className="space-y-3">
        {FORMATIONS.map(({ value, label, desc, emoji, exclusive }) => (
          <button
            key={value}
            type="button"
            onClick={() => toggle(value, exclusive)}
            className={cn(
              'flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-colors',
              selected.includes(value)
                ? exclusive
                  ? 'border-destructive/40 bg-destructive/5'
                  : 'border-primary bg-primary/5'
                : 'border-border bg-card hover:border-primary/40'
            )}
          >
            <span className="text-2xl mt-0.5">{emoji}</span>
            <div className="flex-1">
              <p className={cn(
                'font-semibold text-sm',
                selected.includes(value) && (exclusive ? 'text-destructive' : 'text-primary')
              )}>
                {label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </div>
            {selected.includes(value) && (
              <span className={exclusive ? 'text-destructive' : 'text-primary'}>✓</span>
            )}
          </button>
        ))}
      </div>

      <Button size="lg" className="h-14 w-full text-base" onClick={handleNext} disabled={selected.length === 0}>
        Suivant →
      </Button>
    </div>
  )
}
