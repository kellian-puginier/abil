'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useQuestionnaireStore } from '@/stores/questionnaire'
import { getNextStep } from '@/lib/flow-config'
import { canAskMatchesPerDay } from '@/lib/eligibility'
import { createClient } from '@/lib/supabase/client'
import { buildUpsertPayload } from '@/lib/flow-save'
import { cn } from '@/lib/utils'
import type { Availability } from '@/lib/eligibility'

const PER_ENCOUNTER_OPTIONS = [
  { value: '1',           label: '1 match' },
  { value: '2',           label: '2 matchs' },
  { value: 'Peu importe', label: 'Peu importe' },
]

// Grille unifiée pour "par journée" : maxi 1-4 + mini 1-4 + peu importe
// Format stocké : "max:2" | "min:3" | "any"
const PER_DAY_OPTIONS = [
  { value: 'max:1', label: '1 match maxi' },
  { value: 'max:2', label: '2 matchs maxi' },
  { value: 'max:3', label: '3 matchs maxi' },
  { value: 'max:4', label: '4 matchs maxi' },
  { value: 'min:1', label: '1 match mini' },
  { value: 'min:2', label: '2 matchs mini' },
  { value: 'min:3', label: '3 matchs mini' },
  { value: 'min:4', label: '4 matchs mini' },
  { value: 'any',   label: 'Peu importe' },
]

export function decodeMatchesPerDay(raw: string): string {
  if (!raw || raw === 'any') return 'Peu importe'
  const [type, count] = raw.split(':')
  const n = parseInt(count)
  if (type === 'max') return `${n} match${n > 1 ? 's' : ''} maximum`
  if (type === 'min') return `${n} match${n > 1 ? 's' : ''} minimum`
  return raw
}

export function MatchFormatStep() {
  const router = useRouter()
  const store  = useQuestionnaireStore()

  const [perEncounter, setPerEncounter] = useState(store.matchesPerEncounter)
  const [perDay,       setPerDay]       = useState(store.matchesPerDay)

  const showPerDay = canAskMatchesPerDay(store.availability as Availability[])
  const canNext = !!perEncounter && (!showPerDay || !!perDay)

  async function handleNext() {
    if (!canNext) return
    store.patchResponse({ matchesPerEncounter: perEncounter, matchesPerDay: perDay } as any)
    store.setCurrentStep(7)
    const supabase = createClient()
    await supabase.from('responses').upsert(
      { ...buildUpsertPayload({ ...store, matchesPerEncounter: perEncounter, matchesPerDay: perDay }), current_step: 7 },
      { onConflict: 'player_id' }
    )
    router.push(`/flow/${getNextStep('match-format', store) ?? 'partners'}`)
  }

  return (
    <div className="flex flex-1 flex-col justify-center space-y-8">
      <h1 className="text-2xl font-bold">Format des matchs ⚡</h1>

      {/* Par rencontre */}
      <div className="space-y-3">
        <p className="font-medium">Lors d'une rencontre, je peux jouer :</p>
        <div className="grid grid-cols-3 gap-3">
          {PER_ENCOUNTER_OPTIONS.map(({ value, label }) => (
            <Tile key={value} label={label} selected={perEncounter === value} onClick={() => setPerEncounter(value)} />
          ))}
        </div>
      </div>

      {/* Par journée — grille unifiée maxi/mini */}
      {showPerDay && (
        <div className="space-y-3">
          <div>
            <p className="font-medium">Lors d'une journée complète <span className="text-sm font-normal text-muted-foreground">(R1 / R2 / Pré-Nationale)</span></p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choisis le nombre de matchs que tu veux jouer, et si c'est un maximum ou un minimum.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {PER_DAY_OPTIONS.map(({ value, label }) => {
              const isMax = value.startsWith('max:')
              const isMin = value.startsWith('min:')
              return (
                <Tile
                  key={value}
                  label={label}
                  selected={perDay === value}
                  onClick={() => setPerDay(value)}
                  accent={isMax ? 'blue' : isMin ? 'yellow' : 'neutral'}
                  wide={value === 'any'}
                />
              )
            })}
          </div>
          {/* Légende */}
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary inline-block" />Maxi = je joue au plus X matchs</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-secondary inline-block" />Mini = je joue au moins X matchs</span>
          </div>
        </div>
      )}

      <Button size="lg" className="h-14 w-full text-base" onClick={handleNext} disabled={!canNext}>
        Suivant →
      </Button>
    </div>
  )
}

function Tile({ label, selected, onClick, accent = 'neutral', wide = false }: {
  label: string
  selected: boolean
  onClick: () => void
  accent?: 'blue' | 'yellow' | 'neutral'
  wide?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-2xl border p-3 text-center text-sm transition-colors',
        wide && 'col-span-2',
        selected
          ? accent === 'yellow'
            ? 'border-secondary bg-secondary text-secondary-foreground font-semibold'
            : 'border-primary bg-primary text-primary-foreground font-semibold'
          : accent === 'blue'
            ? 'border-primary/20 bg-primary/5 hover:border-primary/40'
            : accent === 'yellow'
            ? 'border-secondary/30 bg-secondary/10 hover:border-secondary/50'
            : 'border-border bg-card hover:border-primary/30'
      )}
    >
      {label}
    </button>
  )
}
