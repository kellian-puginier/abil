'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { ProgressBar } from '@/components/flow/ProgressBar'
import { useConsultationStore } from '@/stores/consultation'
import {
  consultationSteps,
  getConsultationStepIndex,
  getPrevConsultationStep,
} from '@/lib/consultation-config'

// Direction d'animation entre écrans (module-level pour survivre aux remounts)
let _navDirection = 1

type Props = {
  stepId: string
  children: React.ReactNode
}

const variants = {
  enter:  (dir: number) => ({ x: dir > 0 ? '60%' : '-60%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (dir: number) => ({ x: dir > 0 ? '-60%' : '60%', opacity: 0 }),
}

// Version allégée de FlowContainer : parcours strictement linéaire,
// donc pas de menu d'étapes — juste retour + barre de progression.
export function ConsultationContainer({ stepId, children }: Props) {
  const router = useRouter()
  const setCurrentStep = useConsultationStore((s) => s.setCurrentStep)

  const stepIndex  = getConsultationStepIndex(stepId)
  const total      = consultationSteps.length
  const prevStepId = getPrevConsultationStep(stepId)

  const [direction] = useState(() => _navDirection)

  useEffect(() => {
    if (stepIndex >= 0) setCurrentStep(stepIndex)
  }, [stepIndex, setCurrentStep])

  function goBack() {
    if (prevStepId) {
      _navDirection = -1
      router.push(`/consultation-n2/${prevStepId}`)
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">

      {/* ── Header sticky ── */}
      <header className="sticky top-0 z-20 glass border-b">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-3 py-3">
          {prevStepId ? (
            <button
              type="button"
              onClick={goBack}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
              aria-label="Étape précédente"
              title="Étape précédente"
            >
              <span className="text-base leading-none">←</span>
            </button>
          ) : (
            <div className="h-8 w-8 shrink-0" />
          )}

          <div className="flex flex-1 flex-col gap-0.5">
            <ProgressBar current={stepIndex + 1} total={total} />
            <p className="text-right text-[11px] font-medium text-muted-foreground">
              {stepIndex + 1} / {total}
            </p>
          </div>

          {/* Espace symétrique au bouton retour, pour centrer la barre */}
          <div className="h-8 w-8 shrink-0" />
        </div>
      </header>

      {/* ── Contenu animé ── */}
      <main className="flex flex-1 flex-col">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={stepId}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 py-7"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
