'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useConsultationStore } from '@/stores/consultation'
import { getNextConsultationStep } from '@/lib/consultation-config'
import { cn } from '@/lib/utils'
import type { ConsultationDirection } from '@/lib/supabase/types'

const LEAN_OPTIONS: { value: ConsultationDirection; label: string }[] = [
  { value: 'n2',     label: 'Plutôt rester en N2' },
  { value: 'neutre', label: 'Sans avis tranché' },
  { value: 'n3',     label: 'Plutôt descendre en N3' },
]

export function DirectionStep() {
  const router = useRouter()
  const store  = useConsultationStore()
  const [lean, setLean] = useState<ConsultationDirection | null>(store.preferredDirection)
  const [text, setText] = useState(store.directionReasonText)

  function handleNext() {
    if (!text.trim()) return
    store.patch({ preferredDirection: lean, directionReasonText: text })
    router.push(`/consultation-n2/${getNextConsultationStep('direction') ?? 'priorites'}`)
  }

  return (
    <div className="flex flex-1 flex-col space-y-7">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Ton avis sur la direction 🧭</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Pas d'obligation de te positionner d'un côté ou de l'autre — ce qui
          nous intéresse avant tout, c'est ton raisonnement.
        </p>
      </div>

      <div className="space-y-3">
        <Label>
          Si tu devais pencher d'un côté…{' '}
          <span className="text-muted-foreground font-normal">(facultatif)</span>
        </Label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {LEAN_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setLean((prev) => (prev === value ? null : value))}
              className={cn(
                'rounded-xl border p-3 text-center text-sm font-medium transition-colors',
                lean === value
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border bg-card hover:border-primary/40'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="direction-reason">
          Selon toi, quelle direction a le plus de sens pour le club, et pourquoi ?
        </Label>
        <Textarea
          id="direction-reason"
          placeholder="C'est la question la plus importante pour nous : prends le temps qu'il te faut…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={7}
          className="resize-none"
        />
      </div>

      <Button size="lg" className="h-14 w-full text-base" onClick={handleNext} disabled={!text.trim()}>
        Suivant →
      </Button>
    </div>
  )
}
