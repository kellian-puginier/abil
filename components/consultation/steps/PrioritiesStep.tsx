'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useConsultationStore } from '@/stores/consultation'
import { getNextConsultationStep } from '@/lib/consultation-config'
import { cn } from '@/lib/utils'

const PRIORITY_TAGS = [
  { value: 'niveau',    label: 'Le niveau de jeu' },
  { value: 'plaisir',   label: 'Le plaisir de jouer' },
  { value: 'resultats', label: 'Les résultats' },
  { value: 'projet',    label: 'Le projet collectif' },
  { value: 'cohesion',  label: "L'ambiance et la cohésion" },
  { value: 'proximite', label: 'La proximité des déplacements' },
]

export function PrioritiesStep() {
  const router = useRouter()
  const store  = useConsultationStore()
  const [tags, setTags]             = useState<string[]>(store.priorities)
  const [tagsOther, setTagsOther]   = useState(store.prioritiesOtherText)
  const [rebuild, setRebuild]       = useState(store.rebuildInvolvementText)
  const [recruitment, setRecruitment] = useState(store.recruitmentOpinionText)

  function toggleTag(value: string) {
    setTags((prev) => (prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]))
  }

  function handleNext() {
    store.patch({
      priorities: tags,
      prioritiesOtherText: tagsOther,
      rebuildInvolvementText: rebuild,
      recruitmentOpinionText: recruitment,
    })
    router.push(`/consultation-n2/${getNextConsultationStep('priorites') ?? 'arguments'}`)
  }

  return (
    <div className="flex flex-1 flex-col space-y-7">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Ce qui compte pour toi 🎯</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Que ce soit pour rester en N2 ou repartir en N3, ces questions nous
          aident à comprendre ce qui te fait vibrer dans les interclubs.
        </p>
      </div>

      <div className="space-y-3">
        <Label>
          Qu'est-ce qui compte le plus pour toi dans ta pratique des interclubs ?{' '}
          <span className="text-muted-foreground font-normal">(facultatif, plusieurs choix possibles)</span>
        </Label>
        <div className="flex flex-wrap gap-2">
          {PRIORITY_TAGS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => toggleTag(value)}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                tags.includes(value)
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/40'
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <Input
          placeholder="Autre chose ? (facultatif)"
          value={tagsOther}
          onChange={(e) => setTagsOther(e.target.value)}
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="rebuild-involvement">
          Si on choisissait de construire un projet en N3, serais-tu partant·e
          pour t'y investir ? Comment ?{' '}
          <span className="text-muted-foreground font-normal">(facultatif)</span>
        </Label>
        <Textarea
          id="rebuild-involvement"
          placeholder="Ton ressenti, tes idées, ton niveau d'envie…"
          value={rebuild}
          onChange={(e) => setRebuild(e.target.value)}
          rows={4}
          className="resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="recruitment-opinion">
          Et si on renforçait l'équipe par du recrutement extérieur pour viser
          le maintien en N2 (un budget conséquent) — qu'en penses-tu ? Investir
          pour se maintenir, ou construire avec les forces du club ?{' '}
          <span className="text-muted-foreground font-normal">(facultatif)</span>
        </Label>
        <Textarea
          id="recruitment-opinion"
          placeholder="Ton avis, sans filtre…"
          value={recruitment}
          onChange={(e) => setRecruitment(e.target.value)}
          rows={4}
          className="resize-none"
        />
      </div>

      <Button size="lg" className="h-14 w-full text-base" onClick={handleNext}>
        Suivant →
      </Button>
    </div>
  )
}
