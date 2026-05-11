'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useQuestionnaireStore } from '@/stores/questionnaire'
import { getNextStep } from '@/lib/flow-config'
import { filterTeamsByAvailability } from '@/lib/eligibility'
import { createClient } from '@/lib/supabase/client'
import { buildUpsertPayload } from '@/lib/flow-save'
import { cn } from '@/lib/utils'
import type { Team } from '@/lib/supabase/types'
import type { Availability } from '@/lib/eligibility'

const DAY_LABELS: Record<string, string> = {
  saturday: 'Samedi',
  sunday:   'Dimanche',
  weekday:  'Semaine',
}

export function TeamsStep() {
  const router = useRouter()
  const store = useQuestionnaireStore()
  const [teams, setTeams] = useState<Team[]>([])
  const [selected, setSelected] = useState<string[]>(store.preferredTeams)

  useEffect(() => {
    createClient()
      .from('teams')
      .select('*')
      .order('level_order')
      .then(({ data }) => setTeams((data as Team[]) ?? []))
  }, [])

  const teamsWithEligibility = filterTeamsByAvailability(teams, store.availability as Availability[])

  function toggle(code: string) {
    if (code === 'any') {
      setSelected((prev) => (prev.includes('any') ? [] : ['any']))
      return
    }
    setSelected((prev) => {
      const withoutAny = prev.filter((s) => s !== 'any')
      return withoutAny.includes(code)
        ? withoutAny.filter((s) => s !== code)
        : [...withoutAny, code]
    })
  }

  async function handleNext() {
    if (selected.length === 0) return
    store.patchResponse({ preferredTeams: selected } as any)
    store.setCurrentStep(9)
    const supabase = createClient()
    await supabase.from('responses').upsert(
      { ...buildUpsertPayload({ ...store, preferredTeams: selected }), current_step: 9 },
      { onConflict: 'player_id' }
    )
    const next = getNextStep('teams', store)
    router.push(`/flow/${next ?? 'badminton-manager'}`)
  }

  return (
    <div className="flex flex-1 flex-col justify-center space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Quelle(s) équipe(s) ? 🏆</h1>
        <p className="text-muted-foreground">Je me vois dans l'équipe…</p>
      </div>

      <div className="space-y-2">
        {teamsWithEligibility.map(({ team, eligible }) => {
          const days = team.play_days.map((d) => DAY_LABELS[d] ?? d).join(' / ')
          const isSelected = selected.includes(team.code) && !selected.includes('any')

          return (
            <div key={team.code} className="relative">
              <button
                type="button"
                disabled={!eligible}
                onClick={() => eligible && toggle(team.code)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-colors',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : eligible
                    ? 'border-border bg-card hover:border-primary/40'
                    : 'cursor-not-allowed border-border bg-muted/50 opacity-50'
                )}
                title={!eligible ? 'Indisponible vu tes créneaux' : undefined}
              >
                <span
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  )}
                >
                  {team.code}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{team.label}</p>
                  <p className="text-xs text-muted-foreground">{days}</p>
                </div>
                {isSelected && <span className="text-primary font-bold">✓</span>}
                {!eligible && (
                  <span className="text-xs text-muted-foreground">Créneau incompatible</span>
                )}
              </button>
            </div>
          )
        })}

        {/* Option "peu importe" */}
        <button
          type="button"
          onClick={() => toggle('any')}
          className={cn(
            'flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-colors',
            selected.includes('any')
              ? 'border-primary bg-primary/5'
              : 'border-border bg-card hover:border-primary/40'
          )}
        >
          <span className="text-2xl">✨</span>
          <span className="font-medium">Peu importe, là où on a besoin de moi !</span>
          {selected.includes('any') && <span className="ml-auto text-primary font-bold">✓</span>}
        </button>
      </div>

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
