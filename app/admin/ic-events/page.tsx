'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import type { IcEvent, Team } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

export default function AdminIcEventsPage() {
  const [events,  setEvents]  = useState<IcEvent[]>([])
  const [teams,   setTeams]   = useState<Team[]>([])
  const [saving,  setSaving]  = useState(false)
  const [title,   setTitle]   = useState('')
  const [date,    setDate]    = useState('')
  const [desc,    setDesc]    = useState('')
  const [selTeams, setSelTeams] = useState<string[]>([])

  async function load() {
    const supabase = createClient()
    const [{ data: ev }, { data: tm }] = await Promise.all([
      supabase.from('ic_events').select('*').order('date'),
      supabase.from('teams').select('*').order('level_order'),
    ])
    setEvents((ev as IcEvent[]) ?? [])
    setTeams((tm as Team[]) ?? [])
  }

  useEffect(() => { load() }, [])

  function toggleTeam(code: string) {
    setSelTeams((prev) => prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code])
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !date || selTeams.length === 0) return
    setSaving(true)
    await createClient().from('ic_events').insert({
      title: title.trim(),
      date,
      team_codes: selTeams,
      description: desc.trim() || null,
    })
    setTitle(''); setDate(''); setDesc(''); setSelTeams([])
    setSaving(false)
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cet événement ?')) return
    await createClient().from('ic_events').delete().eq('id', id)
    load()
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Événements IC — Stages & disponibilités</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Les événements assignés à des équipes N/R s'afficheront aux joueurs concernés dans l'étape "Stage de reprise".
        </p>
      </div>

      {/* Formulaire ajout */}
      <form onSubmit={handleAdd} className="rounded-2xl border bg-card p-5 space-y-4 max-w-lg">
        <h2 className="font-semibold">Ajouter un événement</h2>

        <div className="space-y-1">
          <Label htmlFor="ev-title">Titre *</Label>
          <Input id="ev-title" placeholder="Ex : Stage de reprise N2/PN" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ev-date">Date *</Label>
          <Input id="ev-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ev-desc">Description (facultatif)</Label>
          <Input id="ev-desc" placeholder="Lieu, programme…" value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Équipes concernées *</Label>
          <div className="flex flex-wrap gap-2">
            {teams.map((t) => (
              <button
                key={t.code}
                type="button"
                onClick={() => toggleTeam(t.code)}
                className={cn(
                  'rounded-full border px-3 py-1 text-sm transition-colors',
                  selTeams.includes(t.code)
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border hover:border-primary/40'
                )}
              >
                {t.code}
              </button>
            ))}
          </div>
        </div>

        <Button type="submit" disabled={saving || !title.trim() || !date || selTeams.length === 0}>
          {saving ? 'Ajout…' : 'Ajouter'}
        </Button>
      </form>

      {/* Liste */}
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground rounded-xl border bg-muted/40 p-5 text-center">
          Aucun événement créé.
        </p>
      ) : (
        <div className="overflow-auto rounded-2xl border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                {['Événement', 'Date', 'Équipes', 'Description', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{ev.title}</td>
                  <td className="px-4 py-3 capitalize whitespace-nowrap">{formatDate(ev.date)}</td>
                  <td className="px-4 py-3">{ev.team_codes.join(', ')}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{ev.description ?? '—'}</td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => handleDelete(ev.id)} className="text-xs text-destructive hover:underline">
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
