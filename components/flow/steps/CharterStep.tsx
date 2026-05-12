'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useQuestionnaireStore } from '@/stores/questionnaire'
import { getNextStep } from '@/lib/flow-config'
import { createClient } from '@/lib/supabase/client'
import { buildUpsertPayload } from '@/lib/flow-save'
import { cn } from '@/lib/utils'
import type { CharterArticle } from '@/lib/supabase/types'

export function CharterStep() {
  const router = useRouter()
  const store  = useQuestionnaireStore()

  const [articles, setArticles] = useState<CharterArticle[]>([])
  const [loading,  setLoading]  = useState(true)
  const [consent,  setConsent]  = useState(store.charterConsent ?? false)
  const [refused,  setRefused]  = useState(false)

  useEffect(() => {
    createClient()
      .from('charter_articles')
      .select('*')
      .order('order_num')
      .returns<CharterArticle[]>()
      .then(({ data }) => {
        setArticles(data ?? [])
        setLoading(false)
      })
  }, [])

  async function handleConsent() {
    store.patchResponse({ charterConsent: true } as any)
    const supabase = createClient()
    await supabase.from('responses').upsert(
      { ...buildUpsertPayload({ ...store, charterConsent: true }), current_step: store.currentStep + 1 },
      { onConflict: 'player_id' }
    )
    router.push(`/flow/${getNextStep('charter', store) ?? 'captain'}`)
  }

  function handleRefuse() {
    setRefused(true)
    setConsent(false)
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground text-sm">Chargement de la charte…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col space-y-5">
      <div className="space-y-1">
        <h1 className="font-display text-3xl">Charte du joueur d'Interclubs ⚖️</h1>
        <p className="text-sm text-muted-foreground">
          Merci de lire attentivement ces articles avant de continuer.
        </p>
      </div>

      {articles.length === 0 ? (
        <div className="rounded-2xl border bg-muted/40 p-5 text-center text-sm text-muted-foreground">
          La charte n'a pas encore été rédigée par l'admin.
        </div>
      ) : (
        <div className="space-y-3 overflow-y-auto max-h-[50vh] pr-1">
          {articles.map((article, i) => (
            <div key={article.id} className="rounded-2xl border bg-card p-4 space-y-2">
              <p className="font-semibold text-primary text-sm">
                Article {i + 1} — {article.title}
              </p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {article.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Avertissement si refus */}
      {refused && (
        <div className="rounded-2xl border-2 border-destructive/30 bg-destructive/5 p-4 space-y-2">
          <p className="font-semibold text-destructive text-sm">⚠️ Consentement requis</p>
          <p className="text-sm text-muted-foreground">
            Sans consentir à la Charte du joueur d'Interclubs, tu ne pourras pas
            participer aux équipes IC cette saison.
          </p>
          <p className="text-sm text-muted-foreground">
            Tu peux revenir en arrière pour modifier ta participation aux IC, ou
            relire la charte et donner ton consentement.
          </p>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm font-medium text-primary underline underline-offset-4"
          >
            ← Revenir en arrière
          </button>
        </div>
      )}

      {/* Checkbox de consentement */}
      <button
        type="button"
        onClick={() => { setConsent((v) => !v); setRefused(false) }}
        className={cn(
          'flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-colors',
          consent
            ? 'border-primary bg-primary/5'
            : 'border-border bg-card hover:border-primary/30'
        )}
      >
        <span className={cn(
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors',
          consent ? 'border-primary bg-primary text-white' : 'border-border'
        )}>
          {consent && '✓'}
        </span>
        <span className="text-sm">
          J'ai lu et j'accepte la Charte du joueur d'Interclubs ABIL.
        </span>
      </button>

      <div className="flex flex-col gap-3">
        <Button
          size="lg"
          className="h-14 w-full text-base"
          onClick={handleConsent}
          disabled={!consent || articles.length === 0}
        >
          J'accepte la charte et je continue →
        </Button>
        {!refused && (
          <button
            type="button"
            onClick={handleRefuse}
            className="text-sm text-muted-foreground underline underline-offset-4"
          >
            Je refuse la charte
          </button>
        )}
      </div>
    </div>
  )
}
