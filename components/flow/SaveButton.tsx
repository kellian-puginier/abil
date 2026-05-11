'use client'

import { useState } from 'react'
import { BookmarkIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useQuestionnaireStore } from '@/stores/questionnaire'
import { createClient } from '@/lib/supabase/client'
import { buildUpsertPayload } from '@/lib/flow-save'

/**
 * Bouton "sauvegarder et reprendre plus tard" — visible sur chaque écran du flow.
 * Enregistre l'état courant dans Supabase et affiche une modale de confirmation.
 */
export function SaveButton() {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const store = useQuestionnaireStore()

  async function handleSave() {
    if (!store.player) return
    setSaving(true)
    const supabase = createClient()
    const payload = buildUpsertPayload(store)
    await supabase.from('responses').upsert(payload)
    setSaving(false)
    setOpen(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !store.player}
        aria-label="Sauvegarder et reprendre plus tard"
        className="flex h-11 w-11 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
      >
        <BookmarkIcon size={18} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>Sondage sauvegardé 🏸</DialogTitle>
            <DialogDescription className="mt-2 text-base">
              Tu pourras reprendre avec le même email sur ce lien.
              <br />
              À bientôt 👋
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => setOpen(false)} className="mt-2 w-full">
            Fermer
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}
