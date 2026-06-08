'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useConsultationStore } from '@/stores/consultation'
import { createClient } from '@/lib/supabase/client'

// Durée de vie du cookie anti-doublon — une saison complète suffit largement
const SUBMITTED_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export function ArgumentsStep() {
  const router = useRouter()
  const store  = useConsultationStore()
  const [otherArgs, setOtherArgs]       = useState(store.otherArgumentsText)
  const [availability, setAvailability] = useState(store.availabilityAmbitionText)
  const [submitting, setSubmitting]     = useState(false)
  const [error, setError]               = useState('')

  async function handleSubmit() {
    setSubmitting(true)
    setError('')

    store.patch({ otherArgumentsText: otherArgs, availabilityAmbitionText: availability })
    const s = useConsultationStore.getState()

    const supabase = createClient()
    const { error: err } = await supabase.from('consultation_n2_responses').insert({
      is_anonymous: s.isAnonymous,
      respondent_name: s.isAnonymous ? null : (s.respondentName || null),
      team: (s.team || 'n2') as 'n2' | 'n3',
      feeling_text: s.feelingText || null,
      preferred_direction: s.preferredDirection,
      direction_reason_text: s.directionReasonText || null,
      priorities: s.priorities.length ? s.priorities : null,
      priorities_other_text: s.prioritiesOtherText || null,
      rebuild_involvement_text: s.rebuildInvolvementText || null,
      recruitment_opinion_text: s.recruitmentOpinionText || null,
      other_arguments_text: s.otherArgumentsText || null,
      availability_ambition_text: s.availabilityAmbitionText || null,
    })

    if (err) {
      setError("Un souci est survenu lors de l'envoi — réessaie dans un instant.")
      setSubmitting(false)
      return
    }

    // Empêche une seconde réponse depuis ce navigateur
    document.cookie = `consultation_n2_submitted=1; path=/; max-age=${SUBMITTED_COOKIE_MAX_AGE}`
    store.reset()
    router.push('/consultation-n2/merci')
  }

  return (
    <div className="flex flex-1 flex-col space-y-7">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Tes arguments libres 📝</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Dernière ligne droite. Si tu as des idées, des angles ou des envies
          qu'on n'aurait pas vus venir, c'est le moment de les partager.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="other-arguments">
          As-tu des arguments, idées ou angles que nous n'aurions pas envisagés ?{' '}
          <span className="text-muted-foreground font-normal">(facultatif)</span>
        </Label>
        <Textarea
          id="other-arguments"
          placeholder="Tout ce qui te semble utile à partager…"
          value={otherArgs}
          onChange={(e) => setOtherArgs(e.target.value)}
          rows={5}
          className="resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="availability-ambition">
          Quelle est ta disponibilité et ton ambition pour la saison prochaine ?{' '}
          <span className="text-muted-foreground font-normal">(facultatif)</span>
        </Label>
        <Textarea
          id="availability-ambition"
          placeholder="Ce que tu vises, ce que tu peux donner…"
          value={availability}
          onChange={(e) => setAvailability(e.target.value)}
          rows={5}
          className="resize-none"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button size="lg" className="h-14 w-full text-base" onClick={handleSubmit} disabled={submitting}>
        {submitting ? 'Envoi…' : 'Envoyer mes réponses →'}
      </Button>
    </div>
  )
}
