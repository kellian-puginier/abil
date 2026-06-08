'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useConsultationStore } from '@/stores/consultation'
import { getNextConsultationStep } from '@/lib/consultation-config'

export function FeelingStep() {
  const router = useRouter()
  const store  = useConsultationStore()
  const [text, setText] = useState(store.feelingText)

  function handleNext() {
    if (!text.trim()) return
    store.patch({ feelingText: text })
    router.push(`/consultation-n2/${getNextConsultationStep('ressenti') ?? 'direction'}`)
  }

  return (
    <div className="flex flex-1 flex-col justify-center space-y-7">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Ton ressenti 💬</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Avant de parler stratégie : comment vis-tu cette situation, toi ?
          Il n'y a pas de réponse attendue — dis-le avec tes mots.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="feeling-text">
          Comment vis-tu cette situation ? Quel est ton ressenti général ?
        </Label>
        <Textarea
          id="feeling-text"
          placeholder="Exprime-toi librement…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={7}
          className="resize-none"
          autoFocus
        />
      </div>

      <Button size="lg" className="h-14 w-full text-base" onClick={handleNext} disabled={!text.trim()}>
        Suivant →
      </Button>
    </div>
  )
}
