'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useQuestionnaireStore } from '@/stores/questionnaire'
import { getNextStep } from '@/lib/flow-config'
import { createClient } from '@/lib/supabase/client'
import { buildUpsertPayload } from '@/lib/flow-save'

export function IcEngagementStep() {
  const router = useRouter()
  const store = useQuestionnaireStore()
  const [choice, setChoice] = useState<boolean | null>(store.doingInterclubs)
  const [reason, setReason] = useState(store.reasonNoIc)

  async function handleYes() {
    store.patchResponse({ doingInterclubs: true, reasonNoIc: '' } as any)
    setChoice(true)

    // Confettis plus festifs (double burst)
    confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0, y: 0.65 }, colors: ['#2D7A4F', '#F5E642'] })
    confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1, y: 0.65 }, colors: ['#2D7A4F', '#F5E642'] })

    setTimeout(async () => {
      store.setCurrentStep(4)
      const supabase = createClient()
      await supabase.from('responses').upsert(
        { ...buildUpsertPayload({ ...store, doingInterclubs: true }), current_step: 4 },
        { onConflict: 'player_id' }
      )
      const next = getNextStep('ic-engagement', { ...store, doingInterclubs: true })
      router.push(`/flow/${next ?? 'tableau-ranking'}`)
    }, 1500)
  }

  async function handleNo() {
    store.patchResponse({ doingInterclubs: false } as any)
    setChoice(false)
  }

  async function handleSendAndFinish() {
    store.patchResponse({ reasonNoIc: reason } as any)
    const supabase = createClient()
    await supabase.from('responses').upsert(
      {
        ...buildUpsertPayload({ ...store, doingInterclubs: false, reasonNoIc: reason }),
        completed: true,
        current_step: 4,
      },
      { onConflict: 'player_id' }
    )
    router.push('/merci')
  }

  return (
    <div className="flex flex-1 flex-col justify-center space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Interclubs 🔥</h1>
        <p className="text-muted-foreground">
          Tu comptes faire les interclubs la saison prochaine ?
        </p>
      </div>

      <AnimatePresence mode="wait">
        {choice === null && (
          <motion.div key="choices" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <Button size="lg" className="h-14 w-full text-base" onClick={handleYes}>
              Oui, j'y vais 🔥
            </Button>
            <Button size="lg" variant="outline" className="h-14 w-full text-base" onClick={handleNo}>
              Non, pas cette année
            </Button>
          </motion.div>
        )}

        {choice === true && (
          <motion.div
            key="yes-msg"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border bg-primary/5 p-6 text-center"
          >
            <p className="text-lg font-bold text-primary">💪 Trop bien !</p>
            <p className="mt-1 text-muted-foreground">
              On compte sur toi pour porter l'ABIL au plus haut !
            </p>
          </motion.div>
        )}

        {choice === false && (
          <motion.div key="no-form" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason-no-ic">
                Dis-nous ce qui fait que tu ne souhaites pas faire les IC :
              </Label>
              <Textarea
                id="reason-no-ic"
                placeholder="Ta raison…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
            <Button size="lg" className="h-14 w-full text-base" onClick={handleSendAndFinish}>
              Envoyer
            </Button>
            <button
              type="button"
              onClick={() => setChoice(null)}
              className="w-full text-sm text-muted-foreground underline underline-offset-4"
            >
              ← Revenir
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
