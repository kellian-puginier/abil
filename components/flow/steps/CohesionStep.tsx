'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useQuestionnaireStore } from '@/stores/questionnaire'
import { getNextStep } from '@/lib/flow-config'
import { createClient } from '@/lib/supabase/client'
import { buildUpsertPayload } from '@/lib/flow-save'

export function CohesionStep() {
  const router  = useRouter()
  const store   = useQuestionnaireStore()
  const [text,  setText]  = useState(store.cohesionText)
  const [date,  setDate]  = useState(store.cohesionDate)

  async function handleNext() {
    store.patchResponse({ cohesionText: text, cohesionDate: date } as any)
    const supabase = createClient()
    await supabase.from('responses').upsert(
      { ...buildUpsertPayload({ ...store, cohesionText: text, cohesionDate: date }), current_step: store.currentStep + 1 },
      { onConflict: 'player_id' }
    )
    router.push(`/flow/${getNextStep('cohesion', store) ?? 'summary'}`)
  }

  return (
    <div className="flex flex-1 flex-col justify-center space-y-7">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Soirée / journée de cohésion 🎉</h1>
        <p className="text-muted-foreground text-sm">
          On aimerait organiser un moment de cohésion entre les équipes.
          Donne-nous ton avis pour qu'on choisisse le meilleur moment !
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cohesion-date">
          Quand serais-tu disponible ?{' '}
          <span className="text-muted-foreground font-normal">(facultatif)</span>
        </Label>
        <Input
          id="cohesion-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-12"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cohesion-text">
          Sous quelle forme tu imagines cet événement ?{' '}
          <span className="text-muted-foreground font-normal">(facultatif)</span>
        </Label>
        <Textarea
          id="cohesion-text"
          placeholder="Ex : repas convivial après un entraînement, sortie karting, tournoi interne…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          className="resize-none"
        />
      </div>

      <Button size="lg" className="h-14 w-full text-base" onClick={handleNext}>
        Suivant →
      </Button>
    </div>
  )
}
