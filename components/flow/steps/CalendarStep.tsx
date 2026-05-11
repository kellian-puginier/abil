'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useQuestionnaireStore } from '@/stores/questionnaire'
import { getNextStep } from '@/lib/flow-config'
import { createClient } from '@/lib/supabase/client'
import { buildUpsertPayload } from '@/lib/flow-save'
import { cn } from '@/lib/utils'
import type { IcDate } from '@/lib/supabase/types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

export function CalendarStep() {
  const router = useRouter()
  const store = useQuestionnaireStore()
  const [dates, setDates] = useState<IcDate[]>([])
  const [unavailable, setUnavailable] = useState<string[]>(store.unavailableDates)
  const [comments, setComments] = useState<Record<string, string>>(store.dateComments)

  const preferredTeams = store.preferredTeams
  const isAny = preferredTeams.includes('any')

  useEffect(() => {
    const supabase = createClient()
    let query = supabase.from('ic_dates').select('*').order('date')

    // Filtrer par équipes compatibles si le joueur a une préférence précise
    // (Supabase doesn't support array overlap in this SDK version — fetch all and filter client-side)
    query.then(({ data }) => {
      const all = (data as IcDate[]) ?? []
      if (isAny) {
        setDates(all)
      } else {
        setDates(all.filter((d) =>
          d.team_codes.some((tc) => preferredTeams.includes(tc))
        ))
      }
    })
  }, [isAny, preferredTeams.join(',')])

  function toggleUnavailable(id: string) {
    setUnavailable((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    )
    // Retirer le commentaire si on re-coche disponible
    if (unavailable.includes(id)) {
      setComments((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    }
  }

  async function handleNext() {
    store.patchResponse({ unavailableDates: unavailable, dateComments: comments } as any)
    store.setCurrentStep(11)
    const supabase = createClient()
    await supabase.from('responses').upsert(
      { ...buildUpsertPayload({ ...store, unavailableDates: unavailable, dateComments: comments }), current_step: 11 },
      { onConflict: 'player_id' }
    )
    const next = getNextStep('calendar', store)
    router.push(`/flow/${next ?? 'summary'}`)
  }

  return (
    <div className="flex flex-1 flex-col space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Calendrier IC 📆</h1>
        <p className="text-sm text-muted-foreground">
          Si tu t'engages dans un effectif, tu es <strong>présent par défaut</strong>.
          Signale dès maintenant tes empêchements connus.
        </p>
      </div>

      {dates.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 p-5 space-y-2 text-center">
          <p className="text-2xl">📅</p>
          <p className="font-semibold text-primary">Calendrier en cours de construction</p>
          <p className="text-sm text-muted-foreground">
            Les dates des rencontres IC 2025-2026 n'ont pas encore été publiées — elles seront ajoutées par l'admin une fois les engagements confirmés auprès de la fédération.
          </p>
          <p className="text-sm text-muted-foreground">
            Cette section te permettra de signaler tes empêchements sur les dates connues. Passe à la suite pour terminer ton sondage !
          </p>
        </div>
      )}

      <div className="space-y-3">
        {dates.map((d) => {
          const isUnavail = unavailable.includes(d.id)
          return (
            <div
              key={d.id}
              className={cn(
                'rounded-2xl border bg-card p-4 space-y-2 transition-colors',
                isUnavail && 'border-destructive/40 bg-destructive/5'
              )}
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleUnavailable(d.id)}
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 transition-colors',
                    isUnavail
                      ? 'border-destructive bg-destructive text-white'
                      : 'border-border hover:border-destructive/50'
                  )}
                  aria-label={isUnavail ? 'Disponible' : 'J\'ai un empêchement'}
                >
                  {isUnavail && '✕'}
                </button>
                <div className="flex-1">
                  <p className="font-medium capitalize">{formatDate(d.date)}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.team_codes.join(', ')}{d.label ? ` — ${d.label}` : ''}
                  </p>
                </div>
              </div>

              {isUnavail && (
                <Input
                  placeholder="Pourquoi ? (facultatif)"
                  value={comments[d.id] ?? ''}
                  onChange={(e) => setComments((prev) => ({ ...prev, [d.id]: e.target.value }))}
                  className="h-9 text-sm"
                />
              )}
            </div>
          )
        })}
      </div>

      <Button size="lg" className="h-14 w-full text-base" onClick={handleNext}>
        Suivant →
      </Button>
    </div>
  )
}
