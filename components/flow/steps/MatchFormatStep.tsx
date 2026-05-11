'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useQuestionnaireStore } from '@/stores/questionnaire'
import { getNextStep, getActiveSteps } from '@/lib/flow-config'
import { canAskMatchesPerDay } from '@/lib/eligibility'
import { createClient } from '@/lib/supabase/client'
import { buildUpsertPayload } from '@/lib/flow-save'
import { cn } from '@/lib/utils'
import type { Availability } from '@/lib/eligibility'

const PER_ENCOUNTER = ['1', '2', 'Peu importe']
const PER_DAY = ['1', '2', '3', '4', 'Peu importe']

export function MatchFormatStep() {
  const router = useRouter()
  const store = useQuestionnaireStore()
  const [perEncounter, setPerEncounter] = useState(store.matchesPerEncounter)
  const [perDay, setPerDay] = useState(store.matchesPerDay)

  const showPerDay = canAskMatchesPerDay(store.availability as Availability[])

  async function handleNext() {
    if (!perEncounter) return
    if (showPerDay && !perDay) return

    store.patchResponse({ matchesPerEncounter: perEncounter, matchesPerDay: perDay } as any)
    store.setCurrentStep(7)
    const supabase = createClient()
    await supabase.from('responses').upsert(
      { ...buildUpsertPayload({ ...store, matchesPerEncounter: perEncounter, matchesPerDay: perDay }), current_step: 7 },
      { onConflict: 'player_id' }
    )
    const next = getNextStep('match-format', store)
    router.push(`/flow/${next ?? 'partners'}`)
  }

  return (
    <div className="flex flex-1 flex-col justify-center space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Format des matchs ⚡</h1>
      </div>

      <div className="space-y-4">
        <p className="font-medium">Lors d'une rencontre, je peux jouer :</p>
        <div className="grid grid-cols-3 gap-3">
          {PER_ENCOUNTER.map((v) => (
            <RadioTile
              key={v}
              label={v === 'Peu importe' ? 'Peu importe' : `${v} match${v === '2' ? 's' : ''}`}
              selected={perEncounter === v}
              onClick={() => setPerEncounter(v)}
            />
          ))}
        </div>
      </div>

      {showPerDay && (
        <div className="space-y-4">
          <p className="font-medium text-sm text-muted-foreground">
            Et lors d'une journée complète (R1 / R2 / Pré-Nationale), je peux jouer :
          </p>
          <div className="grid grid-cols-3 gap-3">
            {PER_DAY.map((v) => (
              <RadioTile
                key={v}
                label={v === 'Peu importe' ? 'Peu importe' : `${v} match${parseInt(v) > 1 ? 's' : ''}`}
                selected={perDay === v}
                onClick={() => setPerDay(v)}
              />
            ))}
          </div>
        </div>
      )}

      <Button
        size="lg"
        className="h-14 w-full text-base"
        onClick={handleNext}
        disabled={!perEncounter || (showPerDay && !perDay)}
      >
        Suivant →
      </Button>
    </div>
  )
}

function RadioTile({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-2xl border p-3 text-center text-sm transition-colors',
        selected
          ? 'border-primary bg-primary text-primary-foreground font-semibold'
          : 'border-border bg-card hover:border-primary/40'
      )}
    >
      {label}
    </button>
  )
}
