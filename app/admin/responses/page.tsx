'use client'

import { useState, useEffect, useCallback } from 'react'
import Papa from 'papaparse'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Player, Response as SurveyResponse } from '@/lib/supabase/types'

type FullResponse = SurveyResponse & { player: Player }

export default function AdminResponsesPage() {
  const [responses, setResponses] = useState<FullResponse[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'complete' | 'partial' | 'none'>('all')
  const [filterLicensed, setFilterLicensed] = useState<'all' | 'yes' | 'no'>('all')
  const [filterIc, setFilterIc] = useState<'all' | 'yes' | 'no'>('all')
  const [detail, setDetail] = useState<FullResponse | null>(null)

  async function load() {
    const supabase = createClient()
    const [{ data: r }, { data: p }] = await Promise.all([
      supabase.from('responses').select('*').order('created_at', { ascending: false }),
      supabase.from('players').select('*'),
    ])
    const playerMap = Object.fromEntries(((p as Player[]) ?? []).map((pl) => [pl.id, pl]))
    setPlayers((p as Player[]) ?? [])
    setResponses(
      ((r as SurveyResponse[]) ?? []).map((resp) => ({
        ...resp,
        player: playerMap[resp.player_id],
      })).filter((r) => r.player)
    )
  }

  useEffect(() => { load() }, [])

  const filtered = responses.filter((r) => {
    if (search) {
      const q = search.toLowerCase()
      const name = `${r.player.first_name} ${r.player.last_name} ${r.player.email}`.toLowerCase()
      if (!name.includes(q)) return false
    }
    if (filterStatus === 'complete' && !r.completed) return false
    if (filterStatus === 'partial' && (r.completed || r.current_step === 0)) return false
    if (filterStatus === 'none' && r.current_step !== 0) return false
    if (filterLicensed === 'yes' && r.staying_licensed !== true) return false
    if (filterLicensed === 'no' && r.staying_licensed !== false) return false
    if (filterIc === 'yes' && r.doing_interclubs !== true) return false
    if (filterIc === 'no' && r.doing_interclubs !== false) return false
    return true
  })

  function exportCsv() {
    const playerMap = Object.fromEntries(players.map((p) => [p.id, `${p.first_name} ${p.last_name}`]))
    const rows = responses.map((r) => ({
      Nom: r.player.last_name,
      Prénom: r.player.first_name,
      Email: r.player.email,
      Genre: r.player.gender,
      Statut: r.completed ? 'Complet' : r.current_step > 0 ? 'En cours' : 'Non commencé',
      Licence: r.staying_licensed === true ? 'Oui' : r.staying_licensed === false ? 'Non' : '',
      IC: r.doing_interclubs === true ? 'Oui' : r.doing_interclubs === false ? 'Non' : '',
      Tableaux: r.tableau_ranking?.join(' > ') ?? '',
      Dispos: r.availability?.join(', ') ?? '',
      Équipes: r.preferred_teams?.join(', ') ?? '',
      PartenairesDouble: (r.double_partners ?? []).map((id) => playerMap[id] ?? id).join('; '),
      PartenairesMixte: (r.mixte_partners ?? []).map((id) => playerMap[id] ?? id).join('; '),
      MatchsParRencontre: r.matches_per_encounter ?? '',
      MatchsParJournée: r.matches_per_day ?? '',
      Feedback: r.season_feedback ?? '',
      RaisonDépart: r.reason_leaving_club ?? '',
      RaisonPasIC: r.reason_no_ic ?? '',
      MàJ: r.updated_at,
    }))
    const csv = Papa.unparse(rows)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'reponses-abil-ic-2025-2026.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function statusLabel(r: FullResponse) {
    if (r.completed) return { text: 'Complet', cls: 'bg-green-100 text-green-700' }
    if (r.current_step > 0) return { text: 'En cours', cls: 'bg-yellow-100 text-yellow-700' }
    return { text: 'Non commencé', cls: 'bg-muted text-muted-foreground' }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Réponses ({filtered.length})</h1>
        <Button variant="outline" onClick={exportCsv}>⬇️ Exporter CSV</Button>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <Input placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="h-10 rounded-lg border bg-background px-3 text-sm"
        >
          <option value="all">Tous les statuts</option>
          <option value="complete">Complets</option>
          <option value="partial">En cours</option>
          <option value="none">Non commencés</option>
        </select>
        <select
          value={filterLicensed}
          onChange={(e) => setFilterLicensed(e.target.value as any)}
          className="h-10 rounded-lg border bg-background px-3 text-sm"
        >
          <option value="all">Licence : tous</option>
          <option value="yes">Renouvelle</option>
          <option value="no">Ne renouvelle pas</option>
        </select>
        <select
          value={filterIc}
          onChange={(e) => setFilterIc(e.target.value as any)}
          className="h-10 rounded-lg border bg-background px-3 text-sm"
        >
          <option value="all">IC : tous</option>
          <option value="yes">Fait les IC</option>
          <option value="no">Pas les IC</option>
        </select>
      </div>

      {/* Tableau */}
      <div className="overflow-auto rounded-2xl border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              {['Joueur', 'Email', 'Statut', 'Licence', 'IC', 'Équipes', 'Dispos', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const s = statusLabel(r)
              return (
                <tr
                  key={r.id}
                  className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                  onClick={() => setDetail(r)}
                >
                  <td className="px-4 py-3 font-medium whitespace-nowrap">
                    {r.player.first_name} {r.player.last_name}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.player.email}</td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', s.cls)}>{s.text}</span>
                  </td>
                  <td className="px-4 py-3">
                    {r.staying_licensed === true ? '✅' : r.staying_licensed === false ? '❌' : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {r.doing_interclubs === true ? '🔥' : r.doing_interclubs === false ? '⏭' : '—'}
                  </td>
                  <td className="px-4 py-3 max-w-[140px] truncate">
                    {r.preferred_teams?.includes('any') ? '✨ Peu importe' : r.preferred_teams?.join(', ') ?? '—'}
                  </td>
                  <td className="px-4 py-3 max-w-[140px] truncate">
                    {r.availability?.join(', ') ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-primary">Détail →</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modale détail */}
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              {detail?.player.first_name} {detail?.player.last_name}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <Row label="Email" value={detail.player.email} />
              <Row label="Genre" value={detail.player.gender} />
              <Row label="Équipes précédentes" value={detail.player.previous_teams?.join(', ') || '—'} />
              <hr />
              <Row label="Renouvelle licence" value={detail.staying_licensed === true ? 'Oui' : detail.staying_licensed === false ? 'Non' : '—'} />
              {detail.reason_leaving_club && <Row label="Raison départ" value={detail.reason_leaving_club} />}
              <Row label="Fait les IC" value={detail.doing_interclubs === true ? 'Oui' : detail.doing_interclubs === false ? 'Non' : '—'} />
              {detail.reason_no_ic && <Row label="Raison pas IC" value={detail.reason_no_ic} />}
              <Row label="Tableaux" value={detail.tableau_ranking?.join(' > ') ?? '—'} />
              <Row label="Disponibilités" value={detail.availability?.join(', ') ?? '—'} />
              <Row label="Matchs/rencontre" value={detail.matches_per_encounter ?? '—'} />
              <Row label="Matchs/journée" value={detail.matches_per_day ?? '—'} />
              <Row label="Équipes souhaitées" value={detail.preferred_teams?.join(', ') ?? '—'} />
              {detail.season_feedback && <Row label="Feedback saison" value={detail.season_feedback} />}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-40 shrink-0 font-medium text-muted-foreground">{label}</span>
      <span className="flex-1">{value}</span>
    </div>
  )
}
