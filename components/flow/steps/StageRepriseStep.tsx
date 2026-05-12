'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useQuestionnaireStore } from '@/stores/questionnaire'
import { getNextStep } from '@/lib/flow-config'
import { createClient } from '@/lib/supabase/client'
import { buildUpsertPayload } from '@/lib/flow-save'
import { cn } from '@/lib/utils'
import type { IcEvent } from '@/lib/supabase/types'

const AVAIL_OPTIONS = [
  { value: 'yes',       label: 'Disponible ✅',         cls: 'border-primary/40 bg-primary/5 text-primary' },
  { value: 'no',        label: 'Indisponible ❌',        cls: 'border-destructive/40 bg-destructive/5 text-destructive' },
  { value: 'uncertain', label: 'Incertain(e) 🤔',       cls: 'border-secondary/60 bg-secondary/20 text-secondary-foreground' },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

export function StageRepriseStep() {
  const router = useRouter()
  const store  = useQuestionnaireStore()

  const [events, setEvents] = useState<IcEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [availability, setAvailability] = useState<Record<string, string>>(store.stageAvailability)

  const preferredTeams = store.preferredTeams
  const isAny = preferredTeams.includes('any')
  const targetTeams = ['N2', 'PN', 'R1', 'R2']

  useEffect(() => {
    createClient()
      .from('ic_events')
      .select('*')
      .order('date')
      .then(({ data }) => {
        const all = (data as IcEvent[]) ?? []
        // Filtrer par équipes N/R du joueur
        const filtered = isAny
          ? all.filter((e) => e.team_codes.some((c) => targetTeams.includes(c)))
          : all.filter((e) => e.team_codes.some((c) => preferredTeams.includes(c) && targetTeams.includes(c)))
        setEvents(filtered)
        setLoading(false)
      })
  }, [])

  function setAvail(eventId: string, value: string) {
    setAvailability((prev) => ({ ...prev, [eventId]: value }))
  }

  const allAnswered = events.every((e) => !!availability[e.id])

  async function handleNext() {
    store.patchResponse({ stageAvailability: availability } as any)
    const supabase = createClient()
    await supabase.from('responses').upsert(
      { ...buildUpsertPayload({ ...store, stageAvailability: availability }), current_step: store.currentStep + 1 },
      { onConflict: 'player_id' }
    )
    router.push(`/flow/${getNextStep('stage-reprise', store) ?? 'cohesion'}`)
  }

  if (loading) {
    return <div className="flex flex-1 items-center justify-center"><p className="text-muted-foreground text-sm">Chargement…</p></div>
  }

  return (
    <div className="flex flex-1 flex-col space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Stage de reprise 🏕️</h1>
        <p className="text-sm text-muted-foreground">
          En tant que joueur d'équipe Nationale ou Régionale, indique ta disponibilité
          pour les événements de reprise prévus.
        </p>
      </div>

      {events.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 p-5 space-y-2 text-center">
          <p className="text-2xl">📅</p>
          <p className="font-semibold text-primary">Aucun stage planifié pour l'instant</p>
          <p className="text-sm text-muted-foreground">
            L'admin n'a pas encore créé d'événements de reprise. Continue le questionnaire !
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <div key={event.id} className="rounded-2xl border bg-card p-4 space-y-3">
              <div>
                <p className="font-semibold">{event.title}</p>
                <p className="text-xs text-muted-foreground capitalize">{formatDate(event.date)}</p>
                <p className="text-xs text-muted-foreground">{event.team_codes.join(', ')}</p>
                {event.description && (
                  <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {AVAIL_OPTIONS.map(({ value, label, cls }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAvail(event.id, value)}
                    className={cn(
                      'rounded-xl border-2 p-2 text-xs font-medium transition-colors text-center',
                      availability[event.id] === value ? cls : 'border-border bg-card hover:border-primary/30'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Button
        size="lg"
        className="h-14 w-full text-base"
        onClick={handleNext}
        disabled={events.length > 0 && !allAnswered}
      >
        Suivant →
      </Button>
    </div>
  )
}
