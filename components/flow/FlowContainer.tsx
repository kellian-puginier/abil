'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ProgressBar } from './ProgressBar'
import { SaveButton } from './SaveButton'
import { useQuestionnaireStore } from '@/stores/questionnaire'
import { getActiveSteps, getStepIndex } from '@/lib/flow-config'

type Props = {
  stepId: string
  children: React.ReactNode
}

const variants = {
  enter: (dir: number) => ({ x: dir > 0 ? '60%' : '-60%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir: number) => ({ x: dir > 0 ? '-60%' : '60%', opacity: 0 }),
}

export function FlowContainer({ stepId, children }: Props) {
  const state = useQuestionnaireStore.getState()
  const activeSteps = getActiveSteps(state)
  const stepIndex  = getStepIndex(stepId, state)
  const total      = activeSteps.length
  const direction  = 1

  return (
    <div className="flex min-h-svh flex-col bg-background">

      {/* ── Header sticky avec progress ── */}
      <header className="sticky top-0 z-20 glass border-b">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          {/* Logo compact */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shadow-sm">
            🏸
          </div>

          {/* Progress */}
          <div className="flex flex-1 flex-col gap-0.5">
            <ProgressBar current={stepIndex + 1} total={total} />
            <p className="text-right text-[11px] font-medium text-muted-foreground">
              Étape {stepIndex + 1} / {total}
            </p>
          </div>

          <SaveButton />
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
