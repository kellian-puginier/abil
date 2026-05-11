'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useQuestionnaireStore } from '@/stores/questionnaire'
import { getNextStep } from '@/lib/flow-config'
import { createClient } from '@/lib/supabase/client'
import { buildUpsertPayload } from '@/lib/flow-save'

export function SeasonRecapStep() {
  const router = useRouter()
  const store = useQuestionnaireStore()
  const { player, playerStats } = store

  async function handleNext() {
    store.setCurrentStep(2)
    const supabase = createClient()
    await supabase.from('responses').upsert(
      { ...buildUpsertPayload(store), current_step: 2 },
      { onConflict: 'player_id' }
    )
    const next = getNextStep('season-recap', store)
    router.push(`/flow/${next ?? 'license'}`)
  }

  if (!player) return null

  const hasIc = player.previous_teams?.length > 0
  const isNew = player.is_new

  return (
    <div className="flex flex-1 flex-col justify-center space-y-6">
      <h1 className="text-2xl font-bold">Saison passée 🏸</h1>

      {/* Bilan conditionnel selon profil */}
      <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
        {isNew ? (
          <p className="text-base">
            Tu rejoins l'aventure ABIL — on a hâte de te voir porter nos couleurs{' '}
            <span className="text-primary font-bold">🟢⚫</span>
          </p>
        ) : hasIc ? (
          <>
            <p className="text-base">
              Cette saison, tu as porté nos couleurs en{' '}
              <strong className="text-primary">{player.previous_teams.join(' & ')}</strong> 🏸
            </p>
            {playerStats && (
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Simple" value={playerStats.matches_simple} />
                <StatCard label="Double" value={playerStats.matches_double} />
                <StatCard label="Mixte" value={playerStats.matches_mixte} />
              </div>
            )}
            {playerStats?.partners && playerStats.partners.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Partenaires : {playerStats.partners.join(', ')}
              </p>
            )}
          </>
        ) : (
          <p className="text-base">
            Cette saison, tu n'as pas été compté dans les effectifs interclubs.
            Pas de souci — on est ravis de te poser la question pour la saison prochaine 😉
          </p>
        )}
      </div>

      {/* Champ retour libre */}
      <div className="space-y-2">
        <Label htmlFor="feedback">
          Un petit mot sur ta saison passée ?{' '}
          <span className="text-muted-foreground font-normal">(facultatif)</span>
        </Label>
        <Textarea
          id="feedback"
          placeholder="Tes impressions, envies, remarques…"
          value={store.seasonFeedback}
          onChange={(e) => store.patchResponse({ seasonFeedback: e.target.value } as any)}
          rows={3}
          className="resize-none"
        />
      </div>

      <Button size="lg" className="h-14 w-full text-base" onClick={handleNext}>
        Suivant →
      </Button>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center rounded-xl bg-muted p-3 gap-1">
      <span className="text-2xl font-bold text-primary">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}
