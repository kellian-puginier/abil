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

const PER_ENCOUNTER = ['1', '2', 'Peu importe']
const COUNTS = ['1', '2', '3', '4']

/**
 * Décode une valeur "max:2" / "min:3" / "any" pour l'affichage dans le récap.
 * Exporté pour être réutilisé dans SummaryStep.
 */
export function decodeMatchesPerDay(raw: string): string {
  if (!raw || raw === 'any') return 'Peu importe'
  const [type, count] = raw.split(':')
  if (type === 'max') return `Maximum ${count} match${parseInt(count) > 1 ? 's' : ''}`
  if (type === 'min') return `Minimum ${count} match${parseInt(count) > 1 ? 's' : ''}`
  return raw
}

export function MatchFormatStep() {
  const router = useRouter()
  const store  = useQuestionnaireStore()

  const [perEncounter, setPerEncounter] = useState(store.matchesPerEncounter)

  // Décoder l'état initial depuis "max:2" / "min:3" / "any"
  const parsedDay = parsePerDay(store.matchesPerDay)
  const [dayType,  setDayType]  = useState<'max' | 'min' | 'any'>(parsedDay.type)
  const [dayCount, setDayCount] = useState<string>(parsedDay.count)

  const showPerDay = canAskMatchesPerDay(store.availability as Availability[])

  // "any" n'a pas besoin d'un count
  const dayValid = dayType === 'any' || dayCount !== ''

  async function handleNext() {
    if (!perEncounter) return
    if (showPerDay && !dayValid) return

    const perDay = dayType === 'any' ? 'any' : `${dayType}:${dayCount}`

    store.patchResponse({ matchesPerEncounter: perEncounter, matchesPerDay: perDay } as any)
    store.setCurrentStep(7)
    const supabase = createClient()
    await supabase.from('responses').upsert(
      {
        ...buildUpsertPayload({ ...store, matchesPerEncounter: perEncounter, matchesPerDay: perDay }),
        current_step: 7,
      },
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

      {/* Matchs par rencontre */}
      <div className="space-y-3">
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

      {/* Matchs par journée (R1 / R2 / PN uniquement) */}
      {showPerDay && (
        <div className="space-y-3">
          <p className="font-medium">
            Lors d'une journée complète{' '}
            <span className="text-sm font-normal text-muted-foreground">
              (R1 / R2 / Pré-Nationale)
            </span>{' '}
            je souhaite jouer :
          </p>

          {/* Type : max / min / peu importe */}
          <div className="grid grid-cols-3 gap-2">
            {(['max', 'min', 'any'] as const).map((t) => (
              <RadioTile
                key={t}
                label={t === 'max' ? 'Au maximum' : t === 'min' ? 'Au minimum' : 'Peu importe'}
                selected={dayType === t}
                onClick={() => { setDayType(t); if (t === 'any') setDayCount('') }}
              />
            ))}
          </div>

          {/* Nombre : affiché uniquement si max ou min sélectionné */}
          {dayType !== 'any' && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {dayType === 'max' ? 'Maximum' : 'Minimum'} :
              </p>
              <div className="grid grid-cols-4 gap-2">
                {COUNTS.map((n) => (
                  <RadioTile
                    key={n}
                    label={`${n} match${parseInt(n) > 1 ? 's' : ''}`}
                    selected={dayCount === n}
                    onClick={() => setDayCount(n)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Button
        size="lg"
        className="h-14 w-full text-base"
        onClick={handleNext}
        disabled={!perEncounter || (showPerDay && !dayValid)}
      >
        Suivant →
      </Button>
    </div>
  )
}

function RadioTile({ label, selected, onClick }: {
  label: string
  selected: boolean
  onClick: () => void
}) {
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

function parsePerDay(raw: string): { type: 'max' | 'min' | 'any'; count: string } {
  if (!raw || raw === 'any' || raw === 'Peu importe') return { type: 'any', count: '' }
  const [type, count] = raw.split(':')
  if (type === 'max' || type === 'min') return { type, count: count ?? '' }
  // Anciens formats "1"/"2"/… → on suppose "max"
  return { type: 'max', count: raw }
}
