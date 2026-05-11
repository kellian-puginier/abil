'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { useQuestionnaireStore } from '@/stores/questionnaire'
import { getNextStep } from '@/lib/flow-config'
import { buildUpsertPayload } from '@/lib/flow-save'
import type { Player, PlayerStats } from '@/lib/supabase/types'
import leven from 'fast-levenshtein'

export function IdentifyStep() {
  const router = useRouter()
  const store = useQuestionnaireStore()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Modale : plusieurs joueurs partagent le même email (ex. parent/enfants)
  const [emailMatches, setEmailMatches] = useState<Player[]>([])
  const [emailModalOpen, setEmailModalOpen] = useState(false)

  // Modale : joueur approchant (Levenshtein)
  const [fuzzyCandidate, setFuzzyCandidate] = useState<Player | null>(null)
  const [fuzzyModalOpen, setFuzzyModalOpen] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim() || !email.trim()) return
    setLoading(true)
    setError('')

    const supabase = createClient()
    const emailNorm = email.toLowerCase().trim()

    // Charger tous les joueurs une seule fois (< 500, tient en mémoire)
    const { data: allPlayers } = await supabase
      .from('players')
      .select('*')
      .returns<Player[]>()

    const pool = allPlayers ?? []

    // 1. Correspondance exacte nom + prénom
    const exactNameMatch = pool.find(
      (p) =>
        p.first_name.toLowerCase() === firstName.trim().toLowerCase() &&
        p.last_name.toLowerCase() === lastName.trim().toLowerCase()
    )
    if (exactNameMatch) {
      await continueWithPlayer(exactNameMatch, supabase)
      return
    }

    // 2. Plusieurs joueurs partagent cet email (cas parent/enfants)
    const byEmail = pool.filter((p) => p.email === emailNorm)
    if (byEmail.length > 1) {
      setEmailMatches(byEmail)
      setEmailModalOpen(true)
      setLoading(false)
      return
    }

    // 3. Un seul joueur avec cet email
    if (byEmail.length === 1) {
      await continueWithPlayer(byEmail[0], supabase)
      return
    }

    // 4. Aucun email match → chercher par ressemblance nom+prénom
    const input = `${firstName.trim()} ${lastName.trim()}`.toLowerCase()
    const best = pool
      .map((p) => ({
        player: p,
        dist: leven.get(input, `${p.first_name} ${p.last_name}`.toLowerCase()),
      }))
      .sort((a, b) => a.dist - b.dist)[0]

    if (best && best.dist < 3) {
      setFuzzyCandidate(best.player)
      setFuzzyModalOpen(true)
      setLoading(false)
      return
    }

    // 5. Aucun match
    setLoading(false)
    setError('introuvable')
  }

  async function continueWithPlayer(player: Player, supabaseClient?: ReturnType<typeof createClient>) {
    const supabase = supabaseClient ?? createClient()
    const { data: stats } = await supabase
      .from('player_stats')
      .select('*')
      .eq('player_id', player.id)
      .single<PlayerStats>()

    store.setPlayer(player, stats ?? null)

    const token = store.clientToken ?? crypto.randomUUID()
    store.patchResponse({ clientToken: token } as any)

    const payload = { ...buildUpsertPayload({ ...store, player, clientToken: token }), current_step: 1 }
    const { data: resp } = await supabase
      .from('responses')
      .upsert(payload, { onConflict: 'player_id' })
      .select('id')
      .single<{ id: string }>()

    if (resp) store.setResponseId(resp.id)
    store.setCurrentStep(1)

    const next = getNextStep('identify', store)
    router.push(`/flow/${next ?? 'season-recap'}`)
  }

  async function createNewPlayer() {
    const supabase = createClient()
    const { data: newPlayer } = await supabase
      .from('players')
      .insert({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.toLowerCase().trim(),
        gender: 'H',
        is_new: true,
      })
      .select()
      .single<Player>()

    if (newPlayer) await continueWithPlayer(newPlayer, supabase)
  }

  return (
    <div className="flex flex-1 flex-col justify-center space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Qui es-tu ? 👋</h1>
        <p className="text-muted-foreground">
          On va retrouver ton profil dans nos effectifs.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="first-name">Prénom</Label>
          <Input
            id="first-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Prénom"
            autoFocus
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last-name">Nom</Label>
          <Input
            id="last-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Nom"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="prenom.nom@mail.com"
            required
          />
        </div>

        {error === 'introuvable' && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
            <p className="text-sm font-medium">
              On ne te trouve pas dans nos effectifs 🤔
            </p>
            <div className="flex flex-col gap-2">
              <Button type="button" onClick={createNewPlayer} disabled={loading}>
                Je suis nouveau au club 🆕
              </Button>
              <a
                href="mailto:interclubs@abil-badminton.fr"
                className="text-center text-sm text-muted-foreground underline underline-offset-4"
              >
                Il y a un problème, contacter l'admin
              </a>
            </div>
          </div>
        )}

        {error && error !== 'introuvable' && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button
          type="submit"
          size="lg"
          className="h-14 w-full text-base"
          disabled={loading || !firstName.trim() || !lastName.trim() || !email.trim()}
        >
          {loading ? 'Recherche…' : 'Continuer →'}
        </Button>
      </form>

      {/* Modale : plusieurs profils sur le même email (parent/enfants) */}
      <Dialog open={emailModalOpen} onOpenChange={setEmailModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Quel profil es-tu ? 👨‍👧</DialogTitle>
            <DialogDescription>
              Plusieurs membres du club utilisent cet email. Sélectionne ton profil :
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-1">
            {emailMatches.map((p) => (
              <Button
                key={p.id}
                variant="outline"
                className="h-12 w-full justify-start gap-3"
                onClick={async () => {
                  setEmailModalOpen(false)
                  await continueWithPlayer(p)
                }}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {p.first_name[0]}{p.last_name[0]}
                </span>
                <span className="font-medium">{p.first_name} {p.last_name}</span>
              </Button>
            ))}
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => { setEmailModalOpen(false); setError('introuvable') }}
              className="text-sm text-muted-foreground underline underline-offset-4"
            >
              Mon profil n'est pas dans la liste
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modale : joueur approchant (Levenshtein) */}
      <Dialog open={fuzzyModalOpen} onOpenChange={setFuzzyModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>C'est toi ? 🤔</DialogTitle>
            <DialogDescription>
              On a trouvé un profil proche dans nos effectifs :
              <strong className="mt-1 block text-foreground">
                {fuzzyCandidate?.first_name} {fuzzyCandidate?.last_name}
              </strong>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              className="w-full"
              onClick={async () => {
                setFuzzyModalOpen(false)
                if (fuzzyCandidate) await continueWithPlayer(fuzzyCandidate)
              }}
            >
              Oui, c'est moi !
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => { setFuzzyModalOpen(false); setError('introuvable') }}
            >
              Non, je suis quelqu'un d'autre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
