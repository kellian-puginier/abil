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

export function LicenseStep() {
  const router = useRouter()
  const store = useQuestionnaireStore()
  const [choice, setChoice] = useState<boolean | null>(store.stayingLicensed)
  const [reason, setReason] = useState(store.reasonLeavingClub)
  const [showConfetti, setShowConfetti] = useState(false)

  async function handleYes() {
    store.patchResponse({ stayingLicensed: true, reasonLeavingClub: '' } as any)
    setChoice(true)
    setShowConfetti(true)

    // Burst de confettis centré
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#2D7A4F', '#F5E642', '#ffffff'],
    })

    setTimeout(async () => {
      store.setCurrentStep(3)
      const supabase = createClient()
      await supabase.from('responses').upsert(
        { ...buildUpsertPayload({ ...store, stayingLicensed: true }), current_step: 3 },
        { onConflict: 'player_id' }
      )
      const next = getNextStep('license', { ...store, stayingLicensed: true })
      router.push(`/flow/${next ?? 'ic-engagement'}`)
    }, 1400)
  }

  async function handleNo() {
    store.patchResponse({ stayingLicensed: false } as any)
    setChoice(false)
  }

  async function handleSendAndFinish() {
    store.patchResponse({ reasonLeavingClub: reason } as any)
    const supabase = createClient()
    await supabase.from('responses').upsert(
      {
        ...buildUpsertPayload({ ...store, stayingLicensed: false, reasonLeavingClub: reason }),
        completed: true,
        current_step: 3,
      },
      { onConflict: 'player_id' }
    )
    router.push('/merci')
  }

  return (
    <div className="flex flex-1 flex-col justify-center space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Ta licence 🎽</h1>
        <p className="text-muted-foreground">
          Tu comptes te réinscrire à l'ABIL pour 2025-2026 ?
        </p>
      </div>

      <AnimatePresence mode="wait">
        {choice === null && (
          <motion.div
            key="choices"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <Button
              size="lg"
              className="h-14 w-full text-base"
              onClick={handleYes}
            >
              Oui, je reste 💚
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-14 w-full text-base"
              onClick={handleNo}
            >
              Non, je ne renouvelle pas
            </Button>
          </motion.div>
        )}

        {choice === true && showConfetti && (
          <motion.div
            key="confetti-msg"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border bg-primary/5 p-6 text-center"
          >
            <p className="text-lg font-bold text-primary">🎉 Super !</p>
            <p className="mt-1 text-muted-foreground">
              On est super fiers de te garder dans la famille ABIL !
            </p>
          </motion.div>
        )}

        {choice === false && (
          <motion.div
            key="no-form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="reason-leave">
                Si tu veux nous dire pourquoi{' '}
                <span className="text-muted-foreground font-normal">(pour qu'on s'améliore)</span>
              </Label>
              <Textarea
                id="reason-leave"
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
