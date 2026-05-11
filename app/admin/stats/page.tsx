'use client'

import { useState, useEffect } from 'react'
import Papa from 'papaparse'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import type { Player, PlayerStats } from '@/lib/supabase/types'

type CsvRow = {
  email: string
  matches_simple?: string
  matches_double?: string
  matches_mixte?: string
  partners?: string
  notes?: string
}

type PlayerWithStats = Player & { stats: PlayerStats | null }

export default function AdminStatsPage() {
  const [players, setPlayers]         = useState<PlayerWithStats[]>([])
  const [search, setSearch]           = useState('')
  const [preview, setPreview]         = useState<CsvRow[]>([])
  const [importing, setImporting]     = useState(false)
  const [csvResult, setCsvResult]     = useState('')

  // Édition inline stats
  const [editId, setEditId]           = useState<string | null>(null)
  const [editStats, setEditStats]     = useState<Partial<PlayerStats>>({})
  const [saving, setSaving]           = useState(false)

  async function load() {
    const supabase = createClient()
    const [{ data: pl }, { data: st }] = await Promise.all([
      supabase.from('players').select('*').order('last_name'),
      supabase.from('player_stats').select('*'),
    ])
    const statsMap = Object.fromEntries(((st as PlayerStats[]) ?? []).map((s) => [s.player_id, s]))
    setPlayers(
      ((pl as Player[]) ?? []).map((p) => ({ ...p, stats: statsMap[p.id] ?? null }))
    )
  }

  useEffect(() => { load() }, [])

  // ── Import CSV ──────────────────────────────────────────────────────────
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (r) => setPreview(r.data),
    })
  }

  async function handleImport() {
    if (!preview.length) return
    setImporting(true)
    const supabase = createClient()
    let ok = 0, fail = 0
    for (const row of preview) {
      const { data: player } = await supabase
        .from('players').select('id').eq('email', row.email.toLowerCase().trim()).single<Pick<Player, 'id'>>()
      if (!player) { fail++; continue }
      await supabase.from('player_stats').upsert({
        player_id: player.id,
        matches_simple: parseInt(row.matches_simple ?? '0') || 0,
        matches_double: parseInt(row.matches_double ?? '0') || 0,
        matches_mixte:  parseInt(row.matches_mixte  ?? '0') || 0,
        partners: row.partners ? row.partners.split(';').map((p) => p.trim()).filter(Boolean) : [],
        notes: row.notes?.trim() || null,
      })
      ok++
    }
    setImporting(false)
    setPreview([])
    setCsvResult(`✅ ${ok} lignes importées — ⚠️ ${fail} emails non trouvés`)
    load()
  }

  // ── Édition inline ──────────────────────────────────────────────────────
  function startEdit(pw: PlayerWithStats) {
    setEditId(pw.id)
    setEditStats({
      matches_simple: pw.stats?.matches_simple ?? 0,
      matches_double: pw.stats?.matches_double ?? 0,
      matches_mixte:  pw.stats?.matches_mixte  ?? 0,
      partners:       pw.stats?.partners ?? [],
      notes:          pw.stats?.notes ?? '',
    })
  }

  async function saveStats(playerId: string) {
    setSaving(true)
    await createClient().from('player_stats').upsert({
      player_id: playerId,
      matches_simple: editStats.matches_simple ?? 0,
      matches_double: editStats.matches_double ?? 0,
      matches_mixte:  editStats.matches_mixte  ?? 0,
      partners: typeof editStats.partners === 'string'
        ? (editStats.partners as unknown as string).split(';').map((s) => s.trim()).filter(Boolean)
        : editStats.partners ?? [],
      notes: (editStats.notes as string) || null,
    })
    setSaving(false)
    setEditId(null)
    load()
  }

  const filtered = players.filter((p) => {
    const q = search.toLowerCase()
    return `${p.first_name} ${p.last_name} ${p.email}`.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Stats saison passée</h1>

      {/* ── Import CSV ── */}
      <details className="rounded-2xl border bg-card">
        <summary className="cursor-pointer px-5 py-4 font-semibold hover:bg-muted/40 rounded-2xl">
          📥 Importer un CSV
        </summary>
        <div className="border-t px-5 py-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Colonnes : <code>email, matches_simple, matches_double, matches_mixte, partners (séparés par ;), notes</code>
          </p>
          <Input type="file" accept=".csv" onChange={handleFile} className="max-w-sm" />
          {preview.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">{preview.length} lignes détectées</p>
              <Button onClick={handleImport} disabled={importing} size="sm">
                {importing ? 'Import…' : `Importer ${preview.length} lignes`}
              </Button>
            </div>
          )}
          {csvResult && <p className="text-sm">{csvResult}</p>}
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
                {['Joueur', 'Simple', 'Double', 'Mixte', 'Partenaires (séparés par ;)', 'Notes', ''].map((h) => (
                  <th key={h} className="px-3 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((pw) => {
                const isEditing = editId === pw.id
                return (
                  <tr key={pw.id} className={isEditing ? 'border-b bg-primary/5' : 'border-b hover:bg-muted/20'}>
                    {/* Nom */}
                    <td className="px-3 py-2 font-medium whitespace-nowrap">
                      {pw.first_name} {pw.last_name}
                      {!pw.stats && !isEditing && (
                        <span className="ml-2 text-[10px] text-muted-foreground">(pas de stats)</span>
                      )}
                    </td>

                    {/* Champs éditables */}
                    {(['matches_simple', 'matches_double', 'matches_mixte'] as const).map((field) => (
                      <td key={field} className="px-3 py-2">
                        {isEditing ? (
                          <input
                            type="number"
                            min={0}
                            value={(editStats[field] as number) ?? 0}
                            onChange={(e) => setEditStats((s) => ({ ...s, [field]: parseInt(e.target.value) || 0 }))}
                            className="h-8 w-16 rounded-lg border bg-white px-2 text-sm focus:border-primary focus:outline-none"
                          />
                        ) : (
                          <span>{pw.stats?.[field] ?? '—'}</span>
                        )}
                      </td>
                    ))}

                    {/* Partenaires */}
                    <td className="px-3 py-2 max-w-[180px]">
                      {isEditing ? (
                        <input
                          value={
                            Array.isArray(editStats.partners)
                              ? editStats.partners.join(';')
                              : (editStats.partners as unknown as string) ?? ''
                          }
                          onChange={(e) => setEditStats((s) => ({ ...s, partners: e.target.value as any }))}
                          className="h-8 w-full rounded-lg border bg-white px-2 text-sm focus:border-primary focus:outline-none"
                          placeholder="Nom1;Nom2"
                        />
                      ) : (
                        <span className="truncate block">{pw.stats?.partners?.join(', ') || '—'}</span>
                      )}
                    </td>

                    {/* Notes */}
                    <td className="px-3 py-2 max-w-[160px]">
                      {isEditing ? (
                        <input
                          value={(editStats.notes as string) ?? ''}
                          onChange={(e) => setEditStats((s) => ({ ...s, notes: e.target.value }))}
                          className="h-8 w-full rounded-lg border bg-white px-2 text-sm focus:border-primary focus:outline-none"
                        />
                      ) : (
                        <span className="truncate block text-muted-foreground">{pw.stats?.notes || '—'}</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => saveStats(pw.id)}
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
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(pw)}
                          className="text-xs text-primary hover:underline"
                        >
                          {pw.stats ? 'Modifier' : '+ Saisir'}
                        </button>
                      )}
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
