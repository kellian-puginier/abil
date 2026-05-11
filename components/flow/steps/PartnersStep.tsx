'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { PlayerSearch } from '@/components/player/PlayerSearch'
import { useQuestionnaireStore } from '@/stores/questionnaire'
import { getNextStep } from '@/lib/flow-config'
import { createClient } from '@/lib/supabase/client'
import { buildUpsertPayload } from '@/lib/flow-save'
import type { Player } from '@/lib/supabase/types'

export function PartnersStep() {
  const router = useRouter()
  const store = useQuestionnaireStore()
  const [players, setPlayers] = useState<Player[]>([])
  const [doublePart, setDoublePart] = useState<string[]>(store.doublePartners)
  const [mixtePart, setMixtePart] = useState<string[]>(store.mixtePartners)

  const ranking = store.tableauRanking
  const askDouble = ranking.indexOf('double') < 2
  const askMixte  = ranking.indexOf('mixte') < 2
  const playerGender = store.player?.gender ?? 'H'
  const oppositeGender = playerGender === 'H' ? 'F' : 'H'

  useEffect(() => {
    createClient()
      .from('players')
      .select('*')
      .then(({ data }) => setPlayers((data as Player[]) ?? []))
  }, [])

  async function handleNext() {
    store.patchResponse({ doublePartners: doublePart, mixtePartners: mixtePart } as any)
    store.setCurrentStep(8)
    const supabase = createClient()
    await supabase.from('responses').upsert(
      { ...buildUpsertPayload({ ...store, doublePartners: doublePart, mixtePartners: mixtePart }), current_step: 8 },
      { onConflict: 'player_id' }
    )
    const next = getNextStep('partners', store)
    router.push(`/flow/${next ?? 'teams'}`)
  }

  return (
    <div className="flex flex-1 flex-col justify-center space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Partenaires de cœur 💙</h1>
        <p className="text-muted-foreground">Ces champs sont facultatifs.</p>
      </div>

      {askDouble && (
        <div className="space-y-3">
          <p className="font-medium">En double, tu adores jouer avec :</p>
          <PlayerSearch
            players={players.filter((p) => p.id !== store.player?.id)}
            selected={doublePart}
            onChange={setDoublePart}
            filterGender={playerGender}
            rankingField="ranking_double"
            maxSelect={3}
            placeholder="Rechercher un partenaire de double…"
          />
        </div>
      )}

      {askMixte && (
        <div className="space-y-3">
          <p className="font-medium">En mixte, tes partenaires de cœur :</p>
          <PlayerSearch
            players={players.filter((p) => p.id !== store.player?.id)}
            selected={mixtePart}
            onChange={setMixtePart}
            filterGender={oppositeGender}
            rankingField="ranking_mixte"
            maxSelect={3}
            placeholder="Rechercher un(e) partenaire de mixte…"
          />
        </div>
      )}

      <Button size="lg" className="h-14 w-full text-base" onClick={handleNext}>
        Suivant →
      </Button>
    </div>
  )
}
