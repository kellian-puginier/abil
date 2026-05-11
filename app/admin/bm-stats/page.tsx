import { createClient } from '@/lib/supabase/server'
import type { Player, Response as SurveyResponse } from '@/lib/supabase/types'
import type { BmAssignments } from '@/lib/lineup-rules'

type PlayerStat = {
  player: Player
  teams: string[]
  slots: string[]
  totalAppearances: number
}

type TeamStat = {
  teamCode: string
  totalResponses: number
  playerFrequency: { player: Player; count: number }[]
  slotFrequency: Record<string, { playerId: string; count: number }[]>
}

export default async function AdminBmStatsPage() {
  const supabase = await createClient()

  const [{ data: responses }, { data: players }] = await Promise.all([
    supabase.from('responses').select('player_id, bm_assignments, did_bm').eq('did_bm', true),
    supabase.from('players').select('*'),
  ])

  const playerMap = new Map(((players as Player[]) ?? []).map((p) => [p.id, p]))
  const bmResponses = (responses as SurveyResponse[]) ?? []

  if (bmResponses.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Badminton Manager — Stats</h1>
        <div className="rounded-2xl border bg-card p-8 text-center text-muted-foreground">
          <p className="text-4xl mb-3">🎮</p>
          <p className="font-medium">Aucune compo soumise pour l'instant.</p>
          <p className="text-sm mt-1">Les stats apparaîtront une fois que des joueurs auront utilisé le module Badminton Manager.</p>
        </div>
      </div>
    )
  }

  // ── Agrégation par joueur ────────────────────────────────────────────────
  const playerStats = new Map<string, PlayerStat>()

  function recordPlayer(playerId: string, teamCode: string, slot: string) {
    if (!playerId || !playerMap.has(playerId)) return
    if (!playerStats.has(playerId)) {
      playerStats.set(playerId, {
        player: playerMap.get(playerId)!,
        teams: [], slots: [], totalAppearances: 0,
      })
    }
    const s = playerStats.get(playerId)!
    if (!s.teams.includes(teamCode)) s.teams.push(teamCode)
    s.slots.push(slot)
    s.totalAppearances++
  }

  // ── Agrégation par équipe ────────────────────────────────────────────────
  const teamStats = new Map<string, {
    count: number
    playerCounts: Map<string, number>
    slotCounts: Map<string, Map<string, number>>
  }>()

  for (const resp of bmResponses) {
    const bm = resp.bm_assignments as BmAssignments | null
    if (!bm) continue

    for (const [teamCode, assignment] of Object.entries(bm)) {
      if (!teamStats.has(teamCode)) {
        teamStats.set(teamCode, { count: 0, playerCounts: new Map(), slotCounts: new Map() })
      }
      const ts = teamStats.get(teamCode)!
      ts.count++

      const l = assignment.lineup

      const recordSlot = (slot: string, id: string | null) => {
        if (!id) return
        ts.playerCounts.set(id, (ts.playerCounts.get(id) ?? 0) + 1)
        if (!ts.slotCounts.has(slot)) ts.slotCounts.set(slot, new Map())
        const slotMap = ts.slotCounts.get(slot)!
        slotMap.set(id, (slotMap.get(id) ?? 0) + 1)
        recordPlayer(id, teamCode, slot)
      }

      recordSlot('SH1', l.SH1); recordSlot('SH2', l.SH2)
      recordSlot('SD1', l.SD1); recordSlot('SD2', l.SD2)
      l.DH?.forEach((id, i) => recordSlot(`DH[${i}]`, id))
      l.DD?.forEach((id, i) => recordSlot(`DD[${i}]`, id))
      l.DMx1?.forEach((id, i) => recordSlot(`DMx1[${i}]`, id))
      l.DMx2?.forEach((id, i) => recordSlot(`DMx2[${i}]`, id))
    }
  }

  const sortedPlayers = [...playerStats.values()].sort((a, b) => b.totalAppearances - a.totalAppearances)
  const sortedTeams   = [...teamStats.entries()].sort((a, b) => b[1].count - a[1].count)

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Badminton Manager — Stats</h1>
        <span className="rounded-full bg-primary/10 px-3 py-0.5 text-sm font-semibold text-primary">
          {bmResponses.length} compo{bmResponses.length > 1 ? 's' : ''} soumise{bmResponses.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Stats par joueur ── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Joueurs les plus placés</h2>
        <div className="overflow-auto rounded-2xl border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                {['#', 'Joueur', 'Apparitions totales', 'Équipes', 'Postes'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.slice(0, 20).map((s, i) => (
                <tr key={s.player.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">
                    {s.player.first_name} {s.player.last_name}
                    <span className="ml-2 text-xs text-muted-foreground">{s.player.gender}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(s.totalAppearances * 8, 80)}px` }} />
                      <span className="font-semibold text-primary">{s.totalAppearances}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.teams.join(', ')}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                    {[...new Set(s.slots)].join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Stats par équipe ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Par équipe</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {sortedTeams.map(([teamCode, ts]) => {
            const topPlayers = [...ts.playerCounts.entries()]
              .sort((a, b) => b[1] - a[1])
              .slice(0, 6)
              .map(([id, count]) => ({ player: playerMap.get(id), count }))
              .filter((x) => x.player)

            return (
              <div key={teamCode} className="rounded-2xl border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                      {teamCode}
                    </span>
                    <div>
                      <p className="font-semibold">{teamCode}</p>
                      <p className="text-xs text-muted-foreground">{ts.count} compo{ts.count > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {topPlayers.map(({ player: p, count }) => (
                    <div key={p!.id} className="flex items-center gap-2 text-sm">
                      <div
                        className="h-1.5 rounded-full bg-primary/70"
                        style={{ width: `${Math.min(count / ts.count * 100, 100)}%`, minWidth: '8px', maxWidth: '80px' }}
                      />
                      <span className="truncate">{p!.first_name} {p!.last_name}</span>
                      <span className="ml-auto text-xs text-muted-foreground shrink-0">{count}×</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
