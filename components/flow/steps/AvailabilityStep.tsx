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
  { id: 'weekday',  label: 'Soirées en semaine', emoji: '🌙', exclusive: false },
  { id: 'saturday', label: 'Samedi (journée)',    emoji: '📅', exclusive: false },
  { id: 'sunday',   label: 'Dimanche (journée)',  emoji: '📅', exclusive: false },
  { id: 'anytime',  label: 'Tout le temps',       emoji: '⏰', exclusive: true },
  { id: 'none',     label: 'Aucune proposition',  emoji: '❌', exclusive: true },
]

export function AvailabilityStep() {
  const router = useRouter()
  const store = useQuestionnaireStore()
  const [selected, setSelected] = useState<string[]>(store.availability)
  const [noneWarning, setNoneWarning] = useState(false)

  function toggle(id: string) {
    const opt = OPTIONS.find((o) => o.id === id)!
    if (opt.exclusive) {
      // Exclusif : désélectionner tout le reste
      setSelected((prev) => (prev.includes(id) ? [] : [id]))
    } else {
      // Retirer les exclusifs si on coche une option normale
      setSelected((prev) => {
        const withoutExclusive = prev.filter((s) => !OPTIONS.find((o) => o.id === s)?.exclusive)
        return withoutExclusive.includes(id)
          ? withoutExclusive.filter((s) => s !== id)
          : [...withoutExclusive, id]
      })
    }
    setNoneWarning(false)
  }

  function handleNext() {
    if (selected.includes('none')) {
      setNoneWarning(true)
      return
    }
    if (selected.length === 0) return
    save(selected)
  }

  async function save(avail: string[]) {
    store.patchResponse({ availability: avail } as any)
    store.setCurrentStep(6)
    const supabase = createClient()
    await supabase.from('responses').upsert(
      { ...buildUpsertPayload({ ...store, availability: avail }), current_step: 6 },
      { onConflict: 'player_id' }
    )
    const next = getNextStep('availability', { ...store, availability: avail })
    router.push(`/flow/${next ?? 'match-format'}`)
  }

  async function handleCloseWithNone() {
    store.patchResponse({ availability: ['none'] } as any)
    const supabase = createClient()
    await supabase.from('responses').upsert(
      { ...buildUpsertPayload({ ...store, availability: ['none'] }), completed: true },
      { onConflict: 'player_id' }
    )
    router.push('/merci')
  }

  return (
    <div className="flex flex-1 flex-col justify-center space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Tes disponibilités 📅</h1>
        <p className="text-muted-foreground">
          Quelles sont tes disponibilités pour les rencontres IC ?
        </p>
      </div>

      <div className="space-y-3">
        {OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => toggle(opt.id)}
            className={cn(
              'flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-colors',
              selected.includes(opt.id)
                ? 'border-primary bg-primary/5 font-medium text-primary'
                : 'border-border bg-card hover:border-primary/40'
            )}
          >
            <span className="text-2xl">{opt.emoji}</span>
            <span className="text-base">{opt.label}</span>
            {selected.includes(opt.id) && (
              <span className="ml-auto text-primary">✓</span>
            )}
          </button>
        ))}
      </div>

      {/* Avertissement "aucune dispo" */}
      {noneWarning && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
          <p className="text-sm font-medium">
            Sans dispo le week-end ou en soirée, tu ne pourras pas faire d'interclubs.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => { setSelected([]); setNoneWarning(false) }}>
              Modifier mes dispos
            </Button>
            <Button variant="destructive" className="flex-1" onClick={handleCloseWithNone}>
              Clore le sondage
            </Button>
          </div>
        </div>
      )}

      <Button
        size="lg"
        className="h-14 w-full text-base"
        onClick={handleNext}
        disabled={selected.length === 0}
      >
        Suivant →
      </Button>
    </div>
  )
}
