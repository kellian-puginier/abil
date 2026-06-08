'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { getNextConsultationStep } from '@/lib/consultation-config'

// Présentation strictement équilibrée des deux options — même structure,
// même longueur, pas de superlatif qui ferait pencher d'un côté.
const SCENARIOS = [
  {
    title: 'Rester en N2',
    emoji: '🛡️',
    points: [
      {
        label: 'Ce que ça permet',
        text: "Conserver le meilleur niveau affiché par le club, son image, et certaines subventions liées à ce niveau de compétition.",
      },
      {
        label: 'Ce que ça demande',
        text: "Une saison sportivement exigeante : déplacements plus lourds, frais plus élevés, adversaires relevés. Une piste serait de renforcer l'effectif par du recrutement extérieur — ce qui suppose un budget conséquent.",
      },
    ],
  },
  {
    title: 'Descendre en N3',
    emoji: '🌱',
    points: [
      {
        label: 'Ce que ça permet',
        text: "Construire un projet ambitieux avec une équipe parmi les meilleures du championnat, viser le haut de tableau voire les playoffs, et donner un cap clair pour attirer des joueuses, des joueurs et des partenaires sur un projet de remontée à 1-3 saisons.",
      },
      {
        label: 'Ce que ça demande',
        text: "Assumer ce choix de reconstruction, et le temps et l'investissement collectif qu'un projet de remontée demande.",
      },
    ],
  },
]

export function ScenariosStep() {
  const router = useRouter()

  function handleNext() {
    router.push(`/consultation-n2/${getNextConsultationStep('scenarios') ?? 'ressenti'}`)
  }

  return (
    <div className="flex flex-1 flex-col space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Deux chemins possibles 🧭</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Voici les deux options sur la table, présentées à parts égales —
          chacune a ses forces et ses exigences. Aucune n'est "la bonne
          réponse" : c'est justement pour ça qu'on a besoin de ton éclairage.
          Prends le temps de les lire avant de donner ton avis.
        </p>
      </div>

      <div className="space-y-4">
        {SCENARIOS.map((s) => (
          <div key={s.title} className="space-y-3 rounded-2xl border-2 bg-card p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <span className="text-xl">{s.emoji}</span> {s.title}
            </h2>
            {s.points.map((p) => (
              <div key={p.label} className="space-y-0.5">
                <p className="text-xs font-bold uppercase tracking-wide text-primary">{p.label}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{p.text}</p>
              </div>
            ))}
          </div>
        ))}
      </div>

      <Button size="lg" className="h-14 w-full text-base" onClick={handleNext}>
        J'ai pris connaissance des deux options →
      </Button>
    </div>
  )
}
