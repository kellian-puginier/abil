'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useQuestionnaireStore } from '@/stores/questionnaire'
import { getNextStep } from '@/lib/flow-config'
import { createClient } from '@/lib/supabase/client'
import { buildUpsertPayload } from '@/lib/flow-save'

const TABLEAU_ITEMS = [
  { id: 'simple', label: 'Simple', emoji: '🏸' },
  { id: 'double', label: 'Double', emoji: '👥' },
  { id: 'mixte',  label: 'Mixte',  emoji: '🔀' },
]

export function TableauRankingStep() {
  const router = useRouter()
  const store = useQuestionnaireStore()
  const initialOrder = store.tableauRanking.length === 3
    ? store.tableauRanking
    : ['simple', 'double', 'mixte']
  const [items, setItems] = useState(initialOrder)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setItems((prev) => {
        const oldIndex = prev.indexOf(active.id as string)
        const newIndex = prev.indexOf(over.id as string)
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
  }

  async function handleNext() {
    store.patchResponse({ tableauRanking: items } as any)
    store.setCurrentStep(5)
    const supabase = createClient()
    await supabase.from('responses').upsert(
      { ...buildUpsertPayload({ ...store, tableauRanking: items }), current_step: 5 },
      { onConflict: 'player_id' }
    )
    const next = getNextStep('tableau-ranking', { ...store, tableauRanking: items })
    router.push(`/flow/${next ?? 'availability'}`)
  }

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="flex flex-1 flex-col justify-center space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Tes tableaux préférés 🎯</h1>
        <p className="text-muted-foreground">
          Classe-les du plus aimé au moins aimé — glisse ou tape.
        </p>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {items.map((id, idx) => {
              const item = TABLEAU_ITEMS.find((t) => t.id === id)!
              return <SortableItem key={id} id={id} label={item.label} emoji={item.emoji} rank={medals[idx]} />
            })}
          </div>
        </SortableContext>
      </DndContext>

      <Button size="lg" className="h-14 w-full text-base" onClick={handleNext}>
        Suivant →
      </Button>
    </div>
  )
}

function SortableItem({ id, label, emoji, rank }: { id: string; label: string; emoji: string; rank: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-sm select-none"
    >
      <button
        {...attributes}
        {...listeners}
        aria-label="Déplacer"
        className="touch-none text-muted-foreground"
      >
        <GripVertical size={20} />
      </button>
      <span className="text-2xl">{rank}</span>
      <span className="text-xl">{emoji}</span>
      <span className="text-base font-semibold">{label}</span>
    </div>
  )
}
