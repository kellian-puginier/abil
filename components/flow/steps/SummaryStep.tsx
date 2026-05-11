'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { Button } from '@/components/ui/button'
import { useQuestionnaireStore } from '@/stores/questionnaire'
import { createClient } from '@/lib/supabase/client'
import { buildUpsertPayload } from '@/lib/flow-save'
import type { Team, IcDate } from '@/lib/supabase/types'

const DAY_LABELS: Record<string, string> = {
  saturday: 'Samedi', sunday: 'Dimanche', weekday: 'Semaine',
}

export function SummaryStep() {
  const router = useRouter()
  const store = useQuestionnaireStore()
  const [teams, setTeams] = useState<Team[]>([])
  const [icDates, setIcDates] = useState<IcDate[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('teams').select('*').order('level_order'),
      supabase.from('ic_dates').select('*').order('date'),
    ]).then(([{ data: t }, { data: d }]) => {
      setTeams((t as Team[]) ?? [])
      setIcDates((d as IcDate[]) ?? [])
    })
  }, [])

  async function handleValidate() {
    setSubmitting(true)
    const supabase = createClient()
    await supabase.from('responses').upsert(
      { ...buildUpsertPayload(store), completed: true },
      { onConflict: 'player_id' }
    )
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.5 }, colors: ['#2D7A4F', '#F5E642', '#fff'] })
    setTimeout(() => router.push('/merci'), 600)
  }

  const teamsMap = Object.fromEntries(teams.map((t) => [t.code, t]))
  const datesMap  = Object.fromEntries(icDates.map((d) => [d.id, d]))
  const unavailDates = store.unavailableDates.map((id) => datesMap[id]).filter(Boolean)

  const tableauLabels: Record<string, string> = {
    simple: 'Simple', double: 'Double', mixte: 'Mixte',
  }
  const availLabels: Record<string, string> = {
    weekday: '🌙 Soirée semaine',
    saturday: '📅 Samedi',
    sunday: '📅 Dimanche',
    anytime: '⏰ Tout le temps',
  }

  function SectionCard({ title, children, onEdit, stepId }: {
    title: string; children: React.ReactNode; onEdit: () => void; stepId: string
  }) {
    return (
      <div className="rounded-2xl border bg-card p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="font-semibold">{title}</p>
          <button
            type="button"
            onClick={onEdit}
            className="text-xs text-primary underline underline-offset-4"
          >
            Modifier
          </button>
        </div>
        <div className="text-sm text-muted-foreground">{children}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Récap de ton sondage ✅</h1>
        <p className="text-sm text-muted-foreground">Vérifie et valide.</p>
      </div>

      <SectionCard title="Licence" onEdit={() => router.push('/flow/license')} stepId="license">
        {store.stayingLicensed ? '✅ Je reste à l\'ABIL' : '❌ Pas de renouvellement'}
      </SectionCard>

      {store.stayingLicensed && (
        <>
          <SectionCard title="Interclubs" onEdit={() => router.push('/flow/ic-engagement')} stepId="ic-engagement">
            {store.doingInterclubs ? '🔥 Je fais les IC' : '⏭ Pas les IC cette année'}
          </SectionCard>

          {store.doingInterclubs && (
            <>
              <SectionCard title="Tableaux" onEdit={() => router.push('/flow/tableau-ranking')} stepId="tableau-ranking">
                {store.tableauRanking.map((t, i) => `${i + 1}. ${tableauLabels[t]}`).join(' — ')}
              </SectionCard>

              <SectionCard title="Disponibilités" onEdit={() => router.push('/flow/availability')} stepId="availability">
                {store.availability.map((a) => availLabels[a] ?? a).join(', ')}
              </SectionCard>

              <SectionCard title="Format matchs" onEdit={() => router.push('/flow/match-format')} stepId="match-format">
                <p>Par rencontre : {store.matchesPerEncounter || '—'}</p>
                {store.matchesPerDay && <p>Par journée : {store.matchesPerDay}</p>}
              </SectionCard>

              <SectionCard title="Équipes souhaitées" onEdit={() => router.push('/flow/teams')} stepId="teams">
                {store.preferredTeams.includes('any')
                  ? '✨ Là où on a besoin de moi'
                  : store.preferredTeams.map((code) => {
                      const t = teamsMap[code]
                      return t ? `${t.code} — ${t.label}` : code
                    }).join(', ') || '—'
                }
              </SectionCard>

              {unavailDates.length > 0 && (
                <SectionCard title="Empêchements" onEdit={() => router.push('/flow/calendar')} stepId="calendar">
                  {unavailDates.map((d) => (
                    <p key={d.id}>{new Date(d.date).toLocaleDateString('fr-FR')}</p>
                  ))}
                </SectionCard>
              )}
            </>
          )}
        </>
      )}

      <motion.div whileTap={{ scale: 0.97 }}>
        <Button
          size="lg"
          className="h-14 w-full text-base"
          onClick={handleValidate}
          disabled={submitting}
        >
          {submitting ? 'Envoi…' : '✅ Valider mon sondage'}
        </Button>
      </motion.div>
    </div>
  )
}
