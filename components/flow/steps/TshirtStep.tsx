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
  { value: 'bleu',     label: 'Oui, le bleu 🔵',        color: 'bg-blue-600 text-white' },
  { value: 'jaune',    label: 'Oui, le jaune 🟡',       color: 'bg-yellow-400 text-gray-900' },
  { value: 'les_deux', label: 'Oui, les deux 🔵🟡',     color: 'bg-primary/10 text-primary' },
  { value: 'none',     label: 'Non, aucun',              color: '' },
]

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL']

export function TshirtStep() {
  const router = useRouter()
  const store  = useQuestionnaireStore()

  const [has,   setHas]   = useState<string>(store.tshirtHas[0] ?? '')
  const [model, setModel] = useState(store.tshirtModel)
  const [size,  setSize]  = useState(store.tshirtSize)

  const canNext = !!has && !!model && !!size

  async function handleNext() {
    if (!canNext) return
    const patch = { tshirtHas: [has], tshirtModel: model, tshirtSize: size }
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

      {/* Question 1 : as-tu déjà un t-shirt ? */}
      <div className="space-y-3">
        <p className="font-medium">As-tu déjà un ou plusieurs t-shirts du club ?</p>
        <div className="grid grid-cols-2 gap-2">
          {HAS_OPTIONS.map(({ value, label, color }) => (
            <button
              key={value}
              type="button"
              onClick={() => setHas(value)}
              className={cn(
                'rounded-2xl border-2 p-3 text-sm font-medium transition-all text-center',
                has === value
                  ? 'border-primary ring-2 ring-primary/30 ' + (color || 'bg-primary/5 text-primary')
                  : 'border-border bg-card hover:border-primary/40',
                has === value && color
              )}
            >
              {label}
            </button>
          ))}
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
