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
import { hasIcDownstreamData, IC_DETAIL_RESET } from '@/lib/flow-nav'

type Choice = 'yes' | 'no' | 'no-warn' | 'unsure' | null

export function IcEngagementStep() {
  const router = useRouter()
  const store  = useQuestionnaireStore()

  const initial: Choice =
    store.doingInterclubs === true  ? 'yes'
    : store.doingInterclubs === false ? 'no'
    : store.icUnsure                   ? 'unsure'
    : null

  const [choice, setChoice] = useState<Choice>(initial)
  const [reason, setReason] = useState(store.reasonNoIc)

  async function handleYes() {
    store.patchResponse({ doingInterclubs: true, icUnsure: false, reasonNoIc: '' } as any)
    setChoice('yes')
    confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0, y: 0.65 }, colors: ['#2563EB', '#F59E0B'] })
    confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1, y: 0.65 }, colors: ['#2563EB', '#F59E0B'] })
    await save({ doingInterclubs: true, icUnsure: false, reasonNoIc: '' })
    const next = getNextStep('ic-engagement', { ...store, doingInterclubs: true, icUnsure: false })
    setTimeout(() => router.push(`/flow/${next ?? 'tableau-ranking'}`), 1500)
  }

  function handleNo() {
    // Si le joueur a déjà rempli des infos IC détaillées, on l'avertit
    if (hasIcDownstreamData(store)) {
      setChoice('no-warn')
    } else {
      store.patchResponse({ doingInterclubs: false, icUnsure: false } as any)
      setChoice('no')
    }
  }

  function confirmNoWithReset() {
    // Confirme le changement critique : efface les étapes IC détaillées
    store.patchResponse({ doingInterclubs: false, icUnsure: false, ...IC_DETAIL_RESET } as any)
    setChoice('no')
  }

  async function handleUnsure() {
    store.patchResponse({ doingInterclubs: null, icUnsure: true } as any)
    setChoice('unsure')
  }

  async function handleSendNo() {
    store.patchResponse({ reasonNoIc: reason } as any)
    await save({ doingInterclubs: false, icUnsure: false, reasonNoIc: reason, completed: true })
    router.push('/merci')
  }

  async function handleContinueUnsure() {
    if (!reason.trim()) return
    store.patchResponse({ icUnsure: true, doingInterclubs: null, reasonNoIc: reason } as any)
    await save({ doingInterclubs: null, icUnsure: true, reasonNoIc: reason })
    const next = getNextStep('ic-engagement', { ...store, doingInterclubs: null, icUnsure: true })
    router.push(`/flow/${next ?? 'tableau-ranking'}`)
  }

  async function save(patch: Record<string, unknown>) {
    const supabase = createClient()
    await supabase.from('responses').upsert(
      { ...buildUpsertPayload({ ...store, ...patch } as any), current_step: Math.max(store.currentStep, 4) },
      { onConflict: 'player_id' }
    )
  }

  return (
    <div className="flex flex-1 flex-col justify-center space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Interclubs 🔥</h1>
        <p className="text-muted-foreground">Tu comptes faire les interclubs la saison prochaine ?</p>
      </div>

      <AnimatePresence mode="wait">

        {/* Choix initial */}
        {choice === null && (
          <motion.div key="choices" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <Button size="lg" className="h-14 w-full text-base" onClick={handleYes}>
              Oui, j'y vais 🔥
            </Button>
            <Button size="lg" variant="outline" className="h-14 w-full text-base" onClick={handleUnsure}>
              Je ne sais pas encore 🤔
            </Button>
            <Button size="lg" variant="outline" className="h-14 w-full text-base border-destructive/30 text-destructive hover:bg-destructive/5" onClick={handleNo}>
              Non, pas cette année
            </Button>
          </motion.div>
        )}

        {/* Confirmation "Oui" */}
        {choice === 'yes' && (
          <motion.div key="yes-msg" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl border bg-primary/5 p-6 text-center">
            <p className="text-lg font-bold text-primary">💪 Trop bien !</p>
            <p className="mt-1 text-muted-foreground">On compte sur toi pour porter l'ABIL au plus haut !</p>
          </motion.div>
        )}

        {/* Avertissement changement critique */}
        {choice === 'no-warn' && (
          <motion.div key="no-warn" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="rounded-xl border-2 border-destructive/30 bg-destructive/5 p-4 space-y-2">
              <p className="font-semibold text-destructive">⚠️ Attention</p>
              <p className="text-sm text-muted-foreground">
                Tu as déjà rempli des informations pour les interclubs (charte, tableaux,
                disponibilités…). En confirmant que tu ne fais pas les IC, <strong>toutes ces
                réponses seront effacées</strong>.
              </p>
            </div>
            <Button
              size="lg"
              variant="destructive"
              className="h-14 w-full text-base"
              onClick={confirmNoWithReset}
            >
              Confirmer — je ne fais pas les IC
            </Button>
            <button
              type="button"
              onClick={() => setChoice(null)}
              className="w-full text-sm text-muted-foreground underline underline-offset-4"
            >
              ← Annuler
            </button>
          </motion.div>
        )}

        {/* Incertain */}
        {choice === 'unsure' && (
          <motion.div key="unsure-form" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4 space-y-2">
              <p className="text-sm font-semibold text-primary">⚠️ Réponds quand même, c'est super important !</p>
              <p className="text-sm text-muted-foreground">
                La commission interclubs a besoin des réponses de tous les joueurs le plus tôt possible pour constituer les équipes et engager le bon nombre d'équipes auprès de la fédération.
                Même si tu n'es pas sûr(e), continue le questionnaire avec tes projections actuelles.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason-unsure-ic">Qu'est-ce qui te fait douter ? <span className="text-destructive">*</span></Label>
              <Textarea
                id="reason-unsure-ic"
                placeholder="Ex : emploi du temps incertain, blessure en cours, contraintes familiales…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
            <Button size="lg" className="h-14 w-full text-base" onClick={handleContinueUnsure} disabled={!reason.trim()}>
              Continuer le sondage →
            </Button>
            <button type="button" onClick={() => setChoice(null)} className="w-full text-sm text-muted-foreground underline underline-offset-4">← Revenir</button>
          </motion.div>
        )}

        {/* Formulaire "Non" */}
        {choice === 'no' && (
          <motion.div key="no-form" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason-no-ic">Dis-nous ce qui fait que tu ne souhaites pas faire les IC :</Label>
              <Textarea
                id="reason-no-ic"
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
