'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ConsultationGatePage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true)
    setError('')

    const res = await fetch('/api/consultation-n2/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.trim() }),
    })

    if (res.ok) {
      router.push('/consultation-n2/accueil')
      router.refresh()
    } else {
      setError("Code incorrect — vérifie le message qui t'a été transmis.")
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">

      {/* ── Hero gradient ── */}
      <div className="bg-abil-hero relative overflow-hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-white/5" />

        <div className="relative mx-auto flex max-w-lg flex-col items-center px-6 py-14 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10"
          >
            <Lock className="h-7 w-7 text-white" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="font-display mt-4 text-3xl text-white sm:text-4xl"
          >
            Consultation N2<br />Saison 2026 – 2027
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="mt-3 max-w-xs text-base text-white/80"
          >
            Un espace réservé pour donner ton avis sur l'avenir de l'équipe première.
          </motion.p>
        </div>
      </div>

      {/* ── Formulaire code d'accès ── */}
      <div className="mx-auto w-full max-w-sm flex-1 px-5 py-8">
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="space-y-4 rounded-2xl border-2 bg-card p-5 shadow-sm"
        >
          <div className="space-y-2">
            <Label htmlFor="access-code">Code d'accès</Label>
            <p className="text-xs text-muted-foreground">
              Ce code t'a été transmis par le bureau. Il garantit que cet espace
              reste réservé aux personnes concernées par cette consultation.
            </p>
            <Input
              id="access-code"
              type="text"
              placeholder="Code reçu par message"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
              className="h-12 text-base"
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <Button
            size="lg"
            className="h-14 w-full text-base font-semibold shadow-md"
            disabled={loading || !code.trim()}
          >
            {loading ? 'Vérification…' : 'Accéder à la consultation →'}
          </Button>
        </motion.form>
      </div>
    </div>
  )
}
