'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { ProgressBar } from './ProgressBar'
import { SaveButton } from './SaveButton'
import { useQuestionnaireStore } from '@/stores/questionnaire'
import { getActiveSteps, getStepIndex, getPrevStep } from '@/lib/flow-config'
import { STEP_LABELS } from '@/lib/flow-nav'
import { cn } from '@/lib/utils'

// Direction d'animation entre les pages (module-level pour survivre aux remounts)
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

export function FlowContainer({ stepId, children }: Props) {
  const router = useRouter()

  // currentStep en reactif (pour le menu) — sélecteur pour éviter les re-renders inutiles
  const currentStep = useQuestionnaireStore((s) => s.currentStep)

  // Snapshot statique pour les calculs de step (pas besoin de réactivité)
  const state        = useQuestionnaireStore.getState()
  const activeSteps  = getActiveSteps(state)
  const stepIndex    = getStepIndex(stepId, state)
  const total        = activeSteps.length
  const prevStepId   = getPrevStep(stepId, state)

  const [menuOpen,  setMenuOpen]  = useState(false)
  const [direction] = useState(() => _navDirection)
  const menuRef = useRef<HTMLDivElement>(null)

  // Avancer currentStep quand on visite une étape (pour le menu et la reprise)
  useEffect(() => {
    const s = useQuestionnaireStore.getState()
    if (stepIndex >= 0 && stepIndex > s.currentStep) {
      s.setCurrentStep(stepIndex)
    }
  }, [stepId, stepIndex])

  // Fermer le menu au clic extérieur
  useEffect(() => {
    if (!menuOpen) return
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuOpen])

  function navigateTo(targetId: string) {
    const s = useQuestionnaireStore.getState()
    const targetIdx = getStepIndex(targetId, s)
    _navDirection = targetIdx < stepIndex ? -1 : 1
    setMenuOpen(false)
    router.push(`/flow/${targetId}`)
  }

  function goBack() {
    if (prevStepId) {
      _navDirection = -1
      router.push(`/flow/${prevStepId}`)
    }
  }

  // Étapes accessibles = déjà visitées (index ≤ max atteint)
  const maxReached = Math.max(currentStep, stepIndex)

  return (
    <div className="flex min-h-svh flex-col bg-background">

      {/* ── Header sticky ── */}
      <header className="sticky top-0 z-20 glass border-b">
        <div className="mx-auto flex max-w-lg items-center gap-2 px-3 py-3">

          {/* Bouton retour */}
          {prevStepId && stepId !== 'identify' ? (
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

          {/* Barre de progression */}
          <div className="flex flex-1 flex-col gap-0.5">
            <ProgressBar current={stepIndex + 1} total={total} />
            <p className="text-right text-[11px] font-medium text-muted-foreground">
              {stepIndex + 1} / {total}
            </p>
          </div>

          {/* Bouton menu étapes */}
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors text-base',
                menuOpen
                  ? 'bg-primary text-white'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              )}
              aria-label="Toutes les étapes"
              title="Voir toutes les étapes"
            >
              ☰
            </button>

            {/* Dropdown menu */}
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-10 z-50 w-64 rounded-2xl border bg-card shadow-xl overflow-hidden"
                >
                  <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Mes étapes
                  </p>
                  <div className="max-h-72 overflow-y-auto pb-2">
                    {activeSteps.map((sid, idx) => {
                      const isCurrent    = sid === stepId
                      const isAccessible = idx <= maxReached
                      return (
                        <button
                          key={sid}
                          type="button"
                          onClick={() => isAccessible ? navigateTo(sid) : undefined}
                          className={cn(
                            'flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm transition-colors',
                            isCurrent
                              ? 'bg-primary/10 text-primary font-semibold'
                              : isAccessible
                              ? 'hover:bg-muted/50 text-foreground cursor-pointer'
                              : 'text-muted-foreground/35 cursor-default'
                          )}
                        >
                          <span className={cn(
                            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                            isCurrent    ? 'bg-primary text-white' :
                            isAccessible ? 'bg-muted text-muted-foreground' :
                                           'bg-muted/30 text-muted-foreground/30'
                          )}>
                            {idx + 1}
                          </span>
                          <span className="flex-1 truncate">{STEP_LABELS[sid] ?? sid}</span>
                          {isCurrent && (
                            <span className="text-[10px] text-primary shrink-0">◀</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
