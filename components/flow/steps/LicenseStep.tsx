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

type Choice = 'yes' | 'no' | 'unsure' | null

export function LicenseStep() {
  const router = useRouter()
  const store  = useQuestionnaireStore()

  const initial: Choice =
    store.stayingLicensed === true  ? 'yes'
    : store.stayingLicensed === false ? 'no'
    : store.licensedUnsure           ? 'unsure'
    : null

  const [choice, setChoice] = useState<Choice>(initial)
  const [reason, setReason] = useState(store.reasonLeavingClub)
  const [showConfetti, setShowConfetti] = useState(false)

  async function handleYes() {
    store.patchResponse({ stayingLicensed: true, licensedUnsure: false, reasonLeavingClub: '' } as any)
    setChoice('yes')
    setShowConfetti(true)
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, colors: ['#2563EB', '#F59E0B', '#ffffff'] })
    await save({ stayingLicensed: true, licensedUnsure: false, reasonLeavingClub: '' })
    const next = getNextStep('license', { ...store, stayingLicensed: true, licensedUnsure: false })
    setTimeout(() => router.push(`/flow/${next ?? 'ic-engagement'}`), 1400)
  }

  async function handleNo() {
    store.patchResponse({ stayingLicensed: false, licensedUnsure: false } as any)
    setChoice('no')
  }

  async function handleUnsure() {
    store.patchResponse({ stayingLicensed: null, licensedUnsure: true } as any)
    setChoice('unsure')
  }

  async function handleSendNo() {
    store.patchResponse({ reasonLeavingClub: reason } as any)
    await save({ stayingLicensed: false, licensedUnsure: false, reasonLeavingClub: reason, completed: true })
    router.push('/merci')
  }

  async function handleContinueUnsure() {
    if (!reason.trim()) return
    store.patchResponse({ licensedUnsure: true, stayingLicensed: null, reasonLeavingClub: reason } as any)
    await save({ stayingLicensed: null, licensedUnsure: true, reasonLeavingClub: reason })
    const next = getNextStep('license', { ...store, stayingLicensed: null, licensedUnsure: true })
    router.push(`/flow/${next ?? 'ic-engagement'}`)
  }

  async function save(patch: Record<string, unknown>) {
    const supabase = createClient()
    await supabase.from('responses').upsert(
      { ...buildUpsertPayload({ ...store, ...patch } as any), current_step: 3 },
      { onConflict: 'player_id' }
    )
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
          <motion.div key="choices" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <Button size="lg" className="h-14 w-full text-base" onClick={handleYes}>
              Oui, je reste 💚
            </Button>
            <Button size="lg" variant="outline" className="h-14 w-full text-base" onClick={handleUnsure}>
              Je ne sais pas encore 🤔
            </Button>
            <Button size="lg" variant="outline" className="h-14 w-full text-base border-destructive/30 text-destructive hover:bg-destructive/5" onClick={handleNo}>
              Non, je ne renouvelle pas
            </Button>
          </motion.div>
        )}

        {choice === 'yes' && showConfetti && (
          <motion.div key="yes-msg" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl border bg-primary/5 p-6 text-center">
            <p className="text-lg font-bold text-primary">🎉 Super !</p>
            <p className="mt-1 text-muted-foreground">On est super fiers de te garder dans la famille ABIL !</p>
          </motion.div>
        )}

        {choice === 'unsure' && (
          <motion.div key="unsure-form" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="rounded-xl border border-secondary/50 bg-secondary/20 p-4">
              <p className="text-sm font-medium">Pas de souci, prends le temps d'y réfléchir 😊</p>
              <p className="text-sm text-muted-foreground mt-1">
                Tu peux quand même remplir la suite pour nous donner tes projections IC — ça nous aide à préparer la saison.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason-unsure">Qu'est-ce qui te fait douter ? <span className="text-destructive">*</span></Label>
              <Textarea
                id="reason-unsure"
                placeholder="Ex : je ne sais pas si j'aurai le temps, je déménage peut-être…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
            <Button size="lg" className="h-14 w-full text-base" onClick={handleContinueUnsure} disabled={!reason.trim()}>
              Continuer le sondage →
            </Button>
            <button type="button" onClick={() => setChoice(null)} className="w-full text-sm text-muted-foreground underline underline-offset-4">
              ← Revenir
            </button>
          </motion.div>
        )}

        {choice === 'no' && (
          <motion.div key="no-form" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason-leave">Si tu veux nous dire pourquoi <span className="text-muted-foreground font-normal">(pour qu'on s'améliore)</span></Label>
              <Textarea
                id="reason-leave"
                placeholder="Ta raison…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
            <Button size="lg" className="h-14 w-full text-base" onClick={handleSendNo}>Envoyer</Button>
            <button type="button" onClick={() => setChoice(null)} className="w-full text-sm text-muted-foreground underline underline-offset-4">← Revenir</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
