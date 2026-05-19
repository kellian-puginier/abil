'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useQuestionnaireStore } from '@/stores/questionnaire'
import { getNextStep } from '@/lib/flow-config'
import { createClient } from '@/lib/supabase/client'
import { buildUpsertPayload } from '@/lib/flow-save'
import { cn } from '@/lib/utils'

const HAS_OPTIONS = [
  { value: 'bleu',     label: 'Le maillot bleu 🔵',           desc: 'Maillot technique (bleu foncé/rayures)',  color: 'bg-blue-700 text-white' },
  { value: 'jaune',    label: 'Le maillot jaune 🟡',          desc: 'Maillot technique (jaune)',               color: 'bg-yellow-400 text-gray-900' },
  { value: 'bleu_uni', label: 'Le maillot pour tous 🔵',      desc: 'Maillot bleu uni',                        color: 'bg-blue-500 text-white' },
  { value: 'none',     label: 'Non, aucun',                    desc: 'Je n\'en ai pas encore',                  color: '' },
]

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL']

export function TshirtStep() {
  const router = useRouter()
  const store  = useQuestionnaireStore()

  const [selected, setSelected] = useState<string[]>(store.tshirtHas ?? [])
  const [model,    setModel]    = useState(store.tshirtModel)
  const [size,     setSize]     = useState(store.tshirtSize)

  const canNext = selected.length > 0 && !!model && !!size

  function toggleOption(value: string) {
    if (value === 'none') {
      setSelected(['none'])
      return
    }
    setSelected((prev) => {
      const without = prev.filter((v) => v !== 'none')
      return without.includes(value)
        ? without.filter((v) => v !== value)
        : [...without, value]
    })
  }

  async function handleNext() {
    if (!canNext) return
    const patch = { tshirtHas: selected, tshirtModel: model, tshirtSize: size }
    store.patchResponse(patch as any)
    const supabase = createClient()
    await supabase.from('responses').upsert(
      { ...buildUpsertPayload({ ...store, ...patch }), current_step: store.currentStep + 1 },
      { onConflict: 'player_id' }
    )
    router.push(`/flow/${getNextStep('tshirt', store) ?? 'formations'}`)
  }

  return (
    <div className="flex flex-1 flex-col justify-center space-y-7">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">T-shirt du club 👕</h1>
      </div>

      {/* Question 1 : as-tu déjà un maillot ? (multi-select) */}
      <div className="space-y-3">
        <p className="font-medium">
          As-tu déjà un ou plusieurs maillots du club ?
          <span className="ml-1 text-xs font-normal text-muted-foreground">(plusieurs choix possibles)</span>
        </p>
        <div className="flex flex-col gap-2">
          {HAS_OPTIONS.map(({ value, label, desc, color }) => {
            const active = selected.includes(value)
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggleOption(value)}
                className={cn(
                  'rounded-2xl border-2 p-3 text-sm font-medium transition-all text-left flex items-center gap-3',
                  active
                    ? 'border-primary ring-2 ring-primary/30 ' + (color || 'bg-primary/5 text-primary')
                    : 'border-border bg-card hover:border-primary/40'
                )}
              >
                <span className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors',
                  active ? 'border-primary bg-primary text-white' : 'border-muted-foreground/40'
                )}>
                  {active && <span className="text-xs leading-none">✓</span>}
                </span>
                <span>
                  <span className="block">{label}</span>
                  <span className="block text-xs font-normal text-muted-foreground">{desc}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Question 2 : taille (toujours posée, utile pour futures commandes) */}
      <div className="space-y-4">
        <p className="font-medium">
          Quelle est ta taille ?
          <span className="ml-1 text-xs font-normal text-muted-foreground">(utile pour les futures commandes)</span>
        </p>

        {/* Modèle */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Coupe</p>
          <div className="grid grid-cols-2 gap-2">
            {[{ value: 'homme', label: 'Coupe homme' }, { value: 'femme', label: 'Coupe femme' }].map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setModel(value)}
                className={cn(
                  'rounded-2xl border-2 p-3 text-sm font-medium transition-colors',
                  model === value
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border bg-card hover:border-primary/40'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Taille */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Taille</p>
          <div className="flex flex-wrap gap-2">
            {SIZES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                className={cn(
                  'rounded-xl border-2 px-4 py-2 text-sm font-semibold transition-colors',
                  size === s
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card hover:border-primary/40'
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Button size="lg" className="h-14 w-full text-base" onClick={handleNext} disabled={!canNext}>
        Suivant →
      </Button>
    </div>
  )
}
