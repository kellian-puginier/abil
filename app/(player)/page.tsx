'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { useQuestionnaireStore } from '@/stores/questionnaire'
import { getActiveSteps } from '@/lib/flow-config'
import type { Player, PlayerStats, Response } from '@/lib/supabase/types'

export default function AccueilPage() {
  const router = useRouter()
  const { hydrateFromDb, reset } = useQuestionnaireStore()
  const [showResume, setShowResume] = useState(false)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleResume() {
    if (!email.trim()) return
    setLoading(true)
    setError('')
    const supabase = createClient()

    const { data: player } = await supabase
      .from('players')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single<Player>()

    if (!player) {
      setError('Aucun sondage trouvé pour cet email.')
      setLoading(false)
      return
    }

    const [{ data: stats }, { data: response }] = await Promise.all([
      supabase.from('player_stats').select('*').eq('player_id', player.id).single<PlayerStats>(),
      supabase.from('responses').select('*').eq('player_id', player.id).single<Response>(),
    ])

    if (!response) {
      useQuestionnaireStore.getState().setPlayer(player, stats ?? null)
      router.push('/flow/identify')
      return
    }

    hydrateFromDb(response, player, stats ?? null)
    // Utilise le vrai flow config pour résoudre l'index → step ID
    const state = useQuestionnaireStore.getState()
    const activeStepIds = getActiveSteps(state)
    const targetStep = response.completed
      ? 'summary'
      : activeStepIds[response.current_step] ?? activeStepIds[activeStepIds.length - 2] ?? 'identify'
    router.push(`/flow/${targetStep}`)
  }

  function handleStart() {
    reset()
    router.push('/flow/identify')
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">

      {/* ── Hero gradient ── */}
      <div className="bg-abil-hero relative overflow-hidden">
        {/* Cercles décoratifs */}
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-white/5" />

        <div className="relative mx-auto flex max-w-lg flex-col items-center px-6 py-14 text-center">
          {/* Badge saison */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <span className="badge-yellow inline-block rounded-full px-4 py-1 text-xs font-bold uppercase tracking-widest">
              Saison 2026 – 2027
            </span>
          </motion.div>

          {/* Titre */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="font-display mt-4 text-4xl text-white sm:text-5xl"
          >
            Sondage<br />Interclubs
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="mt-3 text-base text-white/80"
          >
            Dis-nous tes projections pour la saison — 3 minutes chrono.
          </motion.p>

          {/* Logo ABIL */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6"
          >
            <Image
              src="/logo-abil-blanc.png"
              alt="ABIL — Bad In Lez"
              width={160}
              height={160}
              className="mx-auto drop-shadow-xl"
              priority
            />
          </motion.div>
        </div>
      </div>

      {/* ── Card actions ── */}
      <div className="mx-auto w-full max-w-sm flex-1 px-5 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="space-y-4"
        >
          {!showResume ? (
            <>
              <Button
                size="lg"
                className="h-14 w-full text-base font-semibold shadow-md"
                onClick={handleStart}
              >
                C'est parti !
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="h-14 w-full text-base font-medium border-2"
                onClick={() => setShowResume(true)}
              >
                Reprendre mon sondage
              </Button>

              <p className="text-center text-xs text-muted-foreground pt-2">
                Association Bad In Lez · 426 licenciés
              </p>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border-2 bg-card p-5 shadow-sm space-y-4"
            >
              <h2 className="font-display text-xl">Reprendre mon sondage</h2>
              <div className="space-y-2">
                <Label htmlFor="email-resume">Ton adresse email</Label>
                <Input
                  id="email-resume"
                  type="email"
                  placeholder="prenom.nom@mail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleResume()}
                  className="h-12 text-base"
                  autoFocus
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
              <Button
                size="lg"
                className="h-14 w-full text-base font-semibold"
                onClick={handleResume}
                disabled={loading || !email.trim()}
              >
                {loading ? 'Recherche…' : 'Reprendre →'}
              </Button>
              <button
                type="button"
                onClick={() => { setShowResume(false); setError('') }}
                className="w-full text-sm text-muted-foreground underline underline-offset-4"
              >
                ← Annuler
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

