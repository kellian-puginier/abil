'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import type { CharterArticle } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

export default function AdminCharterPage() {
  const [articles, setArticles] = useState<CharterArticle[]>([])
  const [saving,   setSaving]   = useState(false)
  const [editId,   setEditId]   = useState<string | null>(null)
  const [editTitle,   setEditTitle]   = useState('')
  const [editContent, setEditContent] = useState('')
  const [newTitle,    setNewTitle]    = useState('')
  const [newContent,  setNewContent]  = useState('')

  async function load() {
    const { data } = await createClient()
      .from('charter_articles')
      .select('*')
      .order('order_num')
    setArticles((data as CharterArticle[]) ?? [])
  }

  useEffect(() => { load() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim() || !newContent.trim()) return
    setSaving(true)
    const maxOrder = articles.length > 0 ? Math.max(...articles.map((a) => a.order_num)) + 1 : 0
    await createClient().from('charter_articles').insert({
      title: newTitle.trim(),
      content: newContent.trim(),
      order_num: maxOrder,
    })
    setNewTitle('')
    setNewContent('')
    setSaving(false)
    load()
  }

  function startEdit(a: CharterArticle) {
    setEditId(a.id)
    setEditTitle(a.title)
    setEditContent(a.content)
  }

  async function saveEdit(id: string) {
    setSaving(true)
    await createClient().from('charter_articles').update({
      title: editTitle.trim(),
      content: editContent.trim(),
    }).eq('id', id)
    setEditId(null)
    setSaving(false)
    load()
  }

  async function moveArticle(id: string, direction: 'up' | 'down') {
    const idx = articles.findIndex((a) => a.id === id)
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === articles.length - 1) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    const supabase = createClient()
    await Promise.all([
      supabase.from('charter_articles').update({ order_num: articles[swapIdx].order_num }).eq('id', id),
      supabase.from('charter_articles').update({ order_num: articles[idx].order_num }).eq('id', articles[swapIdx].id),
    ])
    load()
  }

  async function deleteArticle(id: string) {
    if (!confirm('Supprimer cet article ?')) return
    await createClient().from('charter_articles').delete().eq('id', id)
    load()
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Charte du joueur d'Interclubs</h1>
      <p className="text-sm text-muted-foreground">
        Chaque article sera affiché aux joueurs dans l'ordre ci-dessous avant qu'ils puissent donner leur consentement.
      </p>

      {/* Articles existants */}
      <div className="space-y-4">
        {articles.map((article, i) => (
          <div key={article.id} className={cn('rounded-2xl border bg-card p-5 space-y-3', editId === article.id && 'border-primary/40 bg-primary/5')}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-primary uppercase tracking-wide">Article {i + 1}</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => moveArticle(article.id, 'up')}   disabled={i === 0}                    className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30">↑</button>
                <button type="button" onClick={() => moveArticle(article.id, 'down')} disabled={i === articles.length - 1}  className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30">↓</button>
                {editId !== article.id && (
                  <>
                    <button type="button" onClick={() => startEdit(article)} className="text-xs text-primary hover:underline">Modifier</button>
                    <button type="button" onClick={() => deleteArticle(article.id)} className="text-xs text-destructive hover:underline">Supprimer</button>
                  </>
                )}
              </div>
            </div>

            {editId === article.id ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Titre</Label>
                  <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Contenu</Label>
                  <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={6} className="resize-none" />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => saveEdit(article.id)} disabled={saving}>
                    {saving ? '…' : 'Sauvegarder'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditId(null)}>Annuler</Button>
                </div>
              </div>
            ) : (
              <>
                <p className="font-semibold">{article.title}</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed line-clamp-4">
                  {article.content}
                </p>
              </>
            )}
          </div>
        ))}

        {articles.length === 0 && (
          <p className="text-sm text-muted-foreground rounded-xl border bg-muted/40 p-5 text-center">
            Aucun article pour l'instant. Ajoute le premier ci-dessous.
          </p>
        )}
      </div>

      {/* Ajout d'un nouvel article */}
      <form onSubmit={handleAdd} className="rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 p-5 space-y-4">
        <h2 className="font-semibold text-primary">+ Ajouter un article</h2>
        <div className="space-y-2">
          <Label htmlFor="new-title">Titre de l'article</Label>
          <Input
            id="new-title"
            placeholder="Ex : Engagement de présence"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-content">Contenu</Label>
          <Textarea
            id="new-content"
            placeholder="Rédigez le texte de l'article…"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={6}
            className="resize-none"
            required
          />
        </div>
        <Button type="submit" disabled={saving || !newTitle.trim() || !newContent.trim()}>
          {saving ? 'Ajout…' : 'Ajouter cet article'}
        </Button>
      </form>
    </div>
  )
}
