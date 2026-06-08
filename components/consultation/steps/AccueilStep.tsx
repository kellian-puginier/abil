'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useConsultationStore } from '@/stores/consultation'
import { getNextConsultationStep } from '@/lib/consultation-config'
import { cn } from '@/lib/utils'

const TEAM_OPTIONS = [
  { value: 'n2',     label: 'Équipe N2',     desc: 'Tu évolues actuellement en Nationale 2' },
  { value: 'n3',     label: 'Équipe N3',     desc: 'Tu évolues actuellement en Nationale 3' },
  { value: 'bureau', label: 'Bureau / commission IC', desc: "Tu es membre du bureau ou de la commission interclubs" },
  { value: 'autre',  label: 'Autre',         desc: "Tu évolues dans une autre équipe du club" },
] as const

export function AccueilStep() {
  const router = useRouter()
  const store  = useConsultationStore()
  const [isAnonymous, setIsAnonymous] = useState(store.isAnonymous)
  const [name, setName] = useState(store.respondentName)
  const [team, setTeam] = useState(store.team)

  const canContinue = !!team && (isAnonymous || name.trim().length > 0)

  function handleNext() {
    if (!canContinue) return
    store.patch({
      isAnonymous,
      respondentName: isAnonymous ? '' : name.trim(),
      team,
    })
    router.push(`/consultation-n2/${getNextConsultationStep('accueil') ?? 'scenarios'}`)
  }

  return (
    <div className="flex flex-1 flex-col space-y-7">
      <div className="space-y-3">
        <span className="badge-yellow inline-block rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest">
          Consultation N2 · 2026-2027
        </span>
        <h1 className="text-2xl font-bold">On a besoin de ton avis 🤝</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          La saison vient de se terminer et ouvre une question importante pour
          le club : quel avenir pour notre équipe première ? Le club a obtenu
          un repêchage qui lui permet de choisir entre rester en Nationale 2
          ou redescendre en Nationale 3.
        </p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Ce choix se pose dans un contexte particulier : plusieurs joueuses
          qui portaient l'équipe cette saison ne seront pas là la saison
          prochaine, pour des raisons qui leur sont propres. Concrètement,
          cela veut dire que des joueuses de nos équipes inférieures vont être
          amenées à monter pour composer ce groupe. La question ne porte donc
          pas sur l'équipe telle qu'elle a existé cette année, mais sur le
          projet à construire avec ce nouveau collectif — et c'est précisément
          pour ça que ton regard compte.
        </p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          C'est un vrai choix d'avenir, et il n'est pas encore arrêté : ton avis
          et celui de tes coéquipières et coéquipiers vont compter pour
          construire la suite ensemble.
        </p>
        <p className="text-sm font-medium">
          Il n'y a pas de bonne ou de mauvaise réponse — on veut ta vision,
          honnête et sans filtre. Compte environ 10 minutes.
        </p>
      </div>

      {/* Confidentialité */}
      <div className="space-y-3 rounded-2xl border-2 bg-muted/30 p-4">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            Tes réponses restent <strong className="text-foreground">confidentielles</strong> :
            seul le bureau du club y aura accès, pour nourrir sa réflexion.
            Tu peux aussi choisir de répondre de façon anonyme — dans ce cas,
            nous n'enregistrons pas ton nom.
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="h-4 w-4 rounded border-2 border-border accent-primary"
          />
          <span className="text-sm font-medium">Je préfère répondre de façon anonyme</span>
        </label>

        {!isAnonymous && (
          <div className="space-y-2 pt-1">
            <Label htmlFor="respondent-name">Prénom et nom</Label>
            <Input
              id="respondent-name"
              placeholder="Ex : Camille Dupont"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12"
            />
          </div>
        )}
      </div>

      {/* Équipe de rattachement */}
      <div className="space-y-3">
        <Label>Cette saison, tu fais partie de quelle équipe ?</Label>
        <div className="space-y-2.5">
          {TEAM_OPTIONS.map(({ value, label, desc }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTeam(value)}
              className={cn(
                'flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-colors',
                team === value
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:border-primary/40'
              )}
            >
              <div className="flex-1">
                <p className={cn('font-semibold', team === value && 'text-primary')}>{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              {team === value && <span className="text-primary">✓</span>}
            </button>
          ))}
        </div>
      </div>

      <Button size="lg" className="h-14 w-full text-base" onClick={handleNext} disabled={!canContinue}>
        C'est parti →
      </Button>
    </div>
  )
}
