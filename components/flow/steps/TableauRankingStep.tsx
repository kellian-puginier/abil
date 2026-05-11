'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useQuestionnaireStore } from '@/stores/questionnaire'
import { getNextStep } from '@/lib/flow-config'
import { createClient } from '@/lib/supabase/client'
import { buildUpsertPayload } from '@/lib/flow-save'
import { cn } from '@/lib/utils'

const TABLEAUX = [
  { id: 'simple', label: 'Simple', emoji: '🏸' },
  { id: 'double', label: 'Double', emoji: '👥' },
  { id: 'mixte',  label: 'Mixte',  emoji: '🔀' },
]
const MEDALS = ['🥇', '🥈', '🥉']

export function TableauRankingStep() {
  const router = useRouter()
  const store  = useQuestionnaireStore()

  const initial = store.tableauRanking.length === 3
    ? store.tableauRanking
    : ['simple', 'double', 'mixte']

  const [items,  setItems]  = useState(initial)
  const [useDnd, setUseDnd] = useState(true)
  // Podium démarre toujours vide pour forcer un choix conscient
  const [podium, setPodium] = useState<[string, string, string]>(['', '', ''])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setItems((prev) => {
        const oldIdx = prev.indexOf(active.id as string)
        const newIdx = prev.indexOf(over.id as string)
        return arrayMove(prev, oldIdx, newIdx)
      })
    }
  }

  // Podium fallback : les 3 sélects doivent être distincts
  const podiumValid = podium[0] && podium[1] && podium[2]
    && new Set(podium).size === 3

  function setPodiumAt(pos: 0 | 1 | 2, val: string) {
    setPodium((prev) => {
      const next: [string,string,string] = [...prev] as [string,string,string]
      next[pos] = val
      return next
    })
  }

  async function handleNext() {
    const ranking = useDnd ? items : Array.from(podium)
    store.patchResponse({ tableauRanking: ranking } as any)
    store.setCurrentStep(5)
    const supabase = createClient()
    await supabase.from('responses').upsert(
      { ...buildUpsertPayload({ ...store, tableauRanking: ranking }), current_step: 5 },
      { onConflict: 'player_id' }
    )
    const next = getNextStep('tableau-ranking', { ...store, tableauRanking: ranking })
    router.push(`/flow/${next ?? 'availability'}`)
  }

  const canNext = useDnd ? true : podiumValid

  return (
    <div className="flex flex-1 flex-col justify-center space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Tes tableaux préférés 🎯</h1>
        <p className="text-muted-foreground">
          {useDnd ? 'Glisse du plus aimé au moins aimé.' : 'Choisis ton classement dans les menus ci-dessous.'}
        </p>
      </div>

      {/* Bouton bascule mode */}
      <button
        type="button"
        onClick={() => {
          if (!useDnd) {
            // Retour au DnD : si le podium est complet on l'utilise,
            // sinon on repart de l'ordre par défaut pour éviter un crash
            const allFilled = podium.every(Boolean) && new Set(podium).size === 3
            setItems(allFilled ? Array.from(podium) : ['simple', 'double', 'mixte'])
          }
          setUseDnd((v) => !v)
        }}
        className="self-start rounded-full border border-primary/30 px-3 py-1 text-xs text-primary hover:bg-primary/5 transition-colors"
      >
        {useDnd ? '⚠️ Le glisser ne fonctionne pas ? Cliquer ici' : '↩ Revenir au glisser-déposer'}
      </button>

      {/* Mode drag & drop */}
      {useDnd && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {items.map((id, idx) => {
                const item = TABLEAUX.find((t) => t.id === id)!
                return <SortableItem key={id} id={id} label={item.label} emoji={item.emoji} rank={MEDALS[idx]} />
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Mode podium (fallback) */}
      {!useDnd && (
        <div className="space-y-4">
          {([0, 1, 2] as const).map((pos) => (
            <div key={pos} className="flex items-center gap-3">
              <span className="text-2xl w-8 text-center">{MEDALS[pos]}</span>
              <select
                value={podium[pos]}
                onChange={(e) => setPodiumAt(pos, e.target.value)}
                className="h-12 flex-1 rounded-2xl border-2 bg-white px-4 text-base focus:border-primary focus:outline-none"
              >
                <option value="">— Choisir un tableau —</option>
                {TABLEAUX.filter((t) =>
                  t.id === podium[pos] || !podium.includes(t.id)
                ).map((t) => (
                  <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      <Button
        size="lg"
        className="h-14 w-full text-base"
        onClick={handleNext}
        disabled={!canNext}
      >
        Suivant →
      </Button>
    </div>
  )
}

function SortableItem({ id, label, emoji, rank }: { id: string; label: string; emoji: string; rank: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-sm select-none"
    >
      <button {...attributes} {...listeners} aria-label="Déplacer" className="touch-none text-muted-foreground cursor-grab active:cursor-grabbing">
        <GripVertical size={20} />
      </button>
      <span className="text-2xl">{rank}</span>
      <span className="text-xl">{emoji}</span>
      <span className="text-base font-semibold">{label}</span>
    </div>
  )
}
