'use client'

import { useState, useEffect } from 'react'
import Papa from 'papaparse'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import type { Player } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

// Accepte H/M/Homme/homme/h → 'H', F/Femme/femme/f → 'F'
function normalizeGender(raw: string | undefined): 'H' | 'F' {
  const v = raw?.trim().toUpperCase() ?? ''
  if (['H', 'M', 'HOMME', 'MAN', 'MALE'].includes(v)) return 'H'
  if (['F', 'FEMME', 'WOMAN', 'FEMALE'].includes(v)) return 'F'
  return 'H'
}

type CsvRow = {
  first_name: string
  last_name: string
  email: string
  gender: string
  ranking_simple?: string
  ranking_double?: string
  ranking_mixte?: string
  previous_teams?: string   // séparés par ; dans le CSV
}

// Valeur éditable pour une cellule — string pour les champs texte
type EditValue = string

const EMPTY_PLAYER: Omit<Player, 'id' | 'created_at' | 'is_new'> = {
  first_name: '',
  last_name: '',
  email: '',
  gender: 'H',
  ranking_simple: null,
  ranking_double: null,
  ranking_mixte: null,
  previous_teams: [],
}

export default function AdminPlayersPage() {
  const [players, setPlayers]           = useState<Player[]>([])
  const [search, setSearch]             = useState('')
  const [preview, setPreview]           = useState<CsvRow[]>([])
  const [importing, setImporting]       = useState(false)
  const [importResult, setImportResult] = useState('')

  // Édition inline
  const [editId, setEditId]             = useState<string | null>(null)
  const [editValues, setEditValues]     = useState<Record<string, EditValue>>({})

  // Ajout manuel
  const [showAddForm, setShowAddForm]   = useState(false)
  const [newPlayer, setNewPlayer]       = useState({ ...EMPTY_PLAYER })
  const [saving, setSaving]             = useState(false)

  async function loadPlayers() {
    const { data } = await createClient().from('players').select('*').order('last_name')
    setPlayers((data as Player[]) ?? [])
  }

  useEffect(() => { loadPlayers() }, [])

  // ── Import CSV ──────────────────────────────────────────────────────────
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => setPreview(result.data),
    })
  }

  async function handleImport() {
    if (!preview.length) return
    setImporting(true)
    const seen = new Map<string, object>()
    for (const r of preview) {
      const key = `${r.first_name?.trim().toLowerCase()}|${r.last_name?.trim().toLowerCase()}`
      seen.set(key, {
        first_name: r.first_name?.trim(),
        last_name: r.last_name?.trim(),
        email: r.email?.toLowerCase().trim(),
        gender: normalizeGender(r.gender),
        ranking_simple: r.ranking_simple?.trim() || null,
        ranking_double: r.ranking_double?.trim() || null,
        ranking_mixte: r.ranking_mixte?.trim() || null,
        previous_teams: r.previous_teams
          ? r.previous_teams.split(';').map((t) => t.trim()).filter(Boolean)
          : [],
        is_new: false,
      })
    }
    const rows = Array.from(seen.values())
    const { error } = await createClient()
      .from('players')
      .upsert(rows, { onConflict: 'first_name,last_name' })
    setImporting(false)
    setPreview([])
    setImportResult(error ? `Erreur : ${error.message}` : `✅ ${rows.length} joueurs importés / mis à jour`)
    if (!error) loadPlayers()
  }

  // ── Édition inline ──────────────────────────────────────────────────────
  function startEdit(p: Player) {
    setEditId(p.id)
    setEditValues({
      first_name:     p.first_name,
      last_name:      p.last_name,
      email:          p.email,
      gender:         p.gender,
      ranking_simple: p.ranking_simple ?? '',
      ranking_double: p.ranking_double ?? '',
      ranking_mixte:  p.ranking_mixte  ?? '',
      previous_teams: p.previous_teams?.join(';') ?? '',
    })
  }

  async function saveEdit(id: string) {
    setSaving(true)
    await createClient()
      .from('players')
      .update({
        first_name:     editValues.first_name,
        last_name:      editValues.last_name,
        email:          editValues.email.toLowerCase().trim(),
        gender:         normalizeGender(editValues.gender),
        ranking_simple: editValues.ranking_simple || null,
        ranking_double: editValues.ranking_double || null,
        ranking_mixte:  editValues.ranking_mixte  || null,
        previous_teams: editValues.previous_teams
          ? editValues.previous_teams.split(';').map((t) => t.trim()).filter(Boolean)
          : [],
      })
      .eq('id', id)
    setSaving(false)
    setEditId(null)
    loadPlayers()
  }

  // ── Ajout manuel ────────────────────────────────────────────────────────
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newPlayer.first_name || !newPlayer.last_name || !newPlayer.email) return
    setSaving(true)
    const { error } = await createClient().from('players').insert({
      ...newPlayer,
      email: newPlayer.email.toLowerCase().trim(),
      is_new: false,
      ranking_simple: newPlayer.ranking_simple || null,
      ranking_double: newPlayer.ranking_double || null,
      ranking_mixte:  newPlayer.ranking_mixte  || null,
    })
    setSaving(false)
    if (error) {
      alert(`Erreur : ${error.message}`)
    } else {
      setShowAddForm(false)
      setNewPlayer({ ...EMPTY_PLAYER })
      loadPlayers()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce joueur ? Ses réponses seront aussi supprimées.')) return
    await createClient().from('players').delete().eq('id', id)
    loadPlayers()
  }

  const filtered = players.filter((p) => {
    const q = search.toLowerCase()
    return (
      p.first_name.toLowerCase().includes(q) ||
      p.last_name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q)
    )
  })

  const COLS = [
    { key: 'last_name',      label: 'Nom',          w: 'w-28' },
    { key: 'first_name',     label: 'Prénom',        w: 'w-28' },
    { key: 'email',          label: 'Email',         w: 'w-44' },
    { key: 'gender',         label: 'Genre',         w: 'w-16' },
    { key: 'ranking_simple', label: 'Simple',        w: 'w-20' },
    { key: 'ranking_double', label: 'Double',        w: 'w-20' },
    { key: 'ranking_mixte',  label: 'Mixte',         w: 'w-20' },
    { key: 'previous_teams', label: 'Équipes préc.', w: 'w-28' },
  ] as const

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Gestion des joueurs</h1>
        <Button onClick={() => { setShowAddForm((v) => !v); setEditId(null) }}>
          {showAddForm ? 'Annuler' : '+ Ajouter un joueur'}
        </Button>
      </div>

      {/* ── Formulaire ajout manuel ── */}
      {showAddForm && (
        <form onSubmit={handleAdd} className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-5 space-y-4">
          <h2 className="font-semibold text-primary">Nouveau joueur</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { key: 'first_name', label: 'Prénom *' },
              { key: 'last_name',  label: 'Nom *' },
              { key: 'email',      label: 'Email *', type: 'email' },
              { key: 'ranking_simple', label: 'Classement simple' },
              { key: 'ranking_double', label: 'Classement double' },
              { key: 'ranking_mixte',  label: 'Classement mixte' },
              { key: 'previous_teams', label: 'Équipes préc. (séparées par ;)' },
            ].map(({ key, label, type }) => (
              <div key={key} className="space-y-1">
                <Label htmlFor={`new-${key}`} className="text-xs">{label}</Label>
                <Input
                  id={`new-${key}`}
                  type={type ?? 'text'}
                  value={(newPlayer as any)[key] ?? ''}
                  onChange={(e) => setNewPlayer((p) => ({ ...p, [key]: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>
            ))}
            <div className="space-y-1">
              <Label htmlFor="new-gender" className="text-xs">Genre *</Label>
              <select
                id="new-gender"
                value={newPlayer.gender}
                onChange={(e) => setNewPlayer((p) => ({ ...p, gender: e.target.value as 'H' | 'F' }))}
                className="h-9 w-full rounded-xl border-2 bg-white px-3 text-sm"
              >
                <option value="H">H — Homme</option>
                <option value="F">F — Femme</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Enregistrement…' : 'Ajouter'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
              Annuler
            </Button>
          </div>
        </form>
      )}

      {/* ── Import CSV ── */}
      <details className="rounded-2xl border bg-card">
        <summary className="cursor-pointer px-5 py-4 font-semibold hover:bg-muted/40 rounded-2xl">
          📥 Importer un CSV
        </summary>
        <div className="border-t px-5 py-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Colonnes : <code>first_name, last_name, email, gender, ranking_simple, ranking_double, ranking_mixte, previous_teams (séparées par ;)</code>
          </p>
          <Input type="file" accept=".csv" onChange={handleFile} className="max-w-sm" />
          {preview.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">{preview.length} lignes détectées</p>
              <Button onClick={handleImport} disabled={importing} size="sm">
                {importing ? 'Import en cours…' : `Importer ${preview.length} joueurs`}
              </Button>
            </div>
          )}
          {importResult && <p className="text-sm">{importResult}</p>}
        </div>
      </details>

      {/* ── Table éditable ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <p className="font-semibold">{filtered.length} joueur{filtered.length > 1 ? 's' : ''}</p>
          <Input
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs h-9 text-sm"
          />
        </div>

        <div className="overflow-auto rounded-2xl border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                {COLS.map((c) => (
                  <th key={c.key} className={cn('px-3 py-3 text-left font-medium text-muted-foreground whitespace-nowrap', c.w)}>
                    {c.label}
                  </th>
                ))}
                <th className="px-3 py-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const isEditing = editId === p.id
                return (
                  <tr key={p.id} className={cn('border-b last:border-0', isEditing ? 'bg-primary/5' : 'hover:bg-muted/20')}>
                    {COLS.map(({ key }) => (
                      <td key={key} className="px-3 py-2">
                        {isEditing ? (
                          key === 'gender' ? (
                            <select
                              value={editValues[key] ?? ''}
                              onChange={(e) => setEditValues((v) => ({ ...v, [key]: e.target.value }))}
                              className="h-8 w-full rounded-lg border bg-white px-2 text-sm"
                            >
                              <option value="H">H</option>
                              <option value="F">F</option>
                            </select>
                          ) : (
                            <input
                              value={editValues[key] ?? ''}
                              onChange={(e) => setEditValues((v) => ({ ...v, [key]: e.target.value }))}
                              className="h-8 w-full rounded-lg border bg-white px-2 text-sm focus:border-primary focus:outline-none"
                            />
                          )
                        ) : (
                          <span className="block truncate max-w-[10rem]">
                            {key === 'previous_teams'
                              ? (p.previous_teams?.join(', ') || '—')
                              : ((p as any)[key] ?? '—')}
                          </span>
                        )}
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => saveEdit(p.id)}
                              disabled={saving}
                              className="text-xs font-semibold text-primary hover:underline"
                            >
                              {saving ? '…' : 'Sauver'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditId(null)}
                              className="text-xs text-muted-foreground hover:underline"
                            >
                              Annuler
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(p)}
                              className="text-xs text-primary hover:underline"
                            >
                              Modifier
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(p.id)}
                              className="text-xs text-destructive hover:underline"
                            >
                              Suppr.
                            </button>
                          </>
                        )}
                        {p.is_new && (
                          <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-secondary-foreground">
                            NEW
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
