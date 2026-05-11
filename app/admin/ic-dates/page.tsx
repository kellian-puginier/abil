'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import type { IcDate, Team } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

export default function AdminIcDatesPage() {
  const [dates, setDates] = useState<IcDate[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [date, setDate] = useState('')
  const [label, setLabel] = useState('')
  const [selectedTeams, setSelectedTeams] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  async function load() {
    const supabase = createClient()
    const [{ data: d }, { data: t }] = await Promise.all([
      supabase.from('ic_dates').select('*').order('date'),
      supabase.from('teams').select('*').order('level_order'),
    ])
    setDates((d as IcDate[]) ?? [])
    setTeams((t as Team[]) ?? [])
  }

  useEffect(() => { load() }, [])

  function toggleTeam(code: string) {
    setSelectedTeams((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    )
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!date || selectedTeams.length === 0) return
    setSaving(true)
    await createClient().from('ic_dates').insert({
      date,
      team_codes: selectedTeams,
      label: label.trim() || null,
    })
    setDate('')
    setLabel('')
    setSelectedTeams([])
    setSaving(false)
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette date ?')) return
    await createClient().from('ic_dates').delete().eq('id', id)
    load()
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Dates Interclubs</h1>

      {/* Ajout */}
      <form onSubmit={handleAdd} className="rounded-2xl border bg-card p-6 space-y-4 max-w-lg">
        <h2 className="font-semibold">Ajouter une date</h2>
        <div className="space-y-2">
          <Label htmlFor="ic-date">Date</Label>
          <Input id="ic-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Équipes concernées</Label>
          <div className="flex flex-wrap gap-2">
            {teams.map((t) => (
              <button
                key={t.code}
                type="button"
                onClick={() => toggleTeam(t.code)}
                className={cn(
                  'rounded-full border px-3 py-1 text-sm transition-colors',
                  selectedTeams.includes(t.code)
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border hover:border-primary/40'
                )}
              >
                {t.code}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ic-label">Label (facultatif)</Label>
          <Input
            id="ic-label"
            placeholder="ex: Journée poule R1"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={saving || !date || selectedTeams.length === 0}>
          {saving ? 'Ajout…' : 'Ajouter'}
        </Button>
      </form>

      {/* Liste */}
      <div className="overflow-auto rounded-2xl border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              {['Date', 'Équipes', 'Label', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dates.map((d) => (
              <tr key={d.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">
                  {new Date(d.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3">{d.team_codes.join(', ')}</td>
                <td className="px-4 py-3 text-muted-foreground">{d.label ?? '—'}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => handleDelete(d.id)}
                    className="text-xs text-destructive hover:underline"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
