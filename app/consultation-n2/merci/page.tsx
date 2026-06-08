'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import confetti from 'canvas-confetti'
import { Button } from '@/components/ui/button'

export default function ConsultationMerciPage() {
  useEffect(() => {
    const end = Date.now() + 1500
    const frame = () => {
      confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#2563EB', '#F59E0B', '#fff'] })
      confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#2563EB', '#F59E0B', '#fff'] })
      if (Date.now() < end) requestAnimationFrame(frame)
    }
    frame()
  }, [])

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <div className="bg-abil-hero h-2 w-full" />

      <div className="flex flex-1 flex-col items-center justify-center px-5 py-12 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: 'spring', stiffness: 200 }}
          className="space-y-6"
        >
          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-primary shadow-xl shadow-primary/30 p-3">
            <Image
              src="/logo-abil-blanc.png"
              alt="ABIL"
              width={90}
              height={90}
              className="drop-shadow"
            />
          </div>

          <div className="space-y-2">
            <h1 className="font-display text-4xl text-foreground">Merci pour ta confiance 🙏</h1>
            <p className="text-lg text-muted-foreground">
              Ta voix vient d'être enregistrée — et elle compte vraiment.
            </p>
            <p className="text-sm text-muted-foreground/70 max-w-xs mx-auto">
              Le bureau prendra connaissance de tous les avis recueillis pour
              construire, ensemble, la décision la plus juste pour le club.
            </p>
          </div>

          <div className="rounded-2xl border-2 bg-primary/5 border-primary/20 px-6 py-4">
            <p className="text-sm font-semibold text-primary uppercase tracking-wide">
              On avance ensemble 💪
            </p>
          </div>

          <Button
            variant="outline"
            size="lg"
            className="w-full max-w-xs"
            onClick={() => window.location.href = '/'}
          >
            Retour à l'accueil
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
