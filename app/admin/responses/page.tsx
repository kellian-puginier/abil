'use client'

import { useState, useEffect } from 'react'
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
import type { Player, Response as SurveyResponse, IcDate, IcEvent } from '@/lib/supabase/types'

type FullResponse = SurveyResponse & { player: Player }

// ── Labels (mirrored from SummaryStep) ──────────────────────────────────────
const AVAIL_LABELS: Record<string, string> = {
  weekday: 'Soirée semaine', saturday: 'Samedi', sunday: 'Dimanche', anytime: 'Tout le temps',
}
const TABLEAU_LABELS: Record<string, string> = {
  simple: 'Simple', double: 'Double', mixte: 'Mixte',
}
const CAPTAIN_LABELS: Record<string, string> = {
  yes: 'Oui', no: 'Non', if_needed: 'Si besoin',
}
const ROLE_LABELS: Record<string, string> = {
  titulaire: 'Titulaire', remplacant: 'Remplaçant(e)', peu_importe: 'Peu importe',
}
const TSHIRT_LABELS: Record<string, string> = {
  bleu: 'Bleu', jaune: 'Jaune', les_deux: 'Les deux', none: 'Aucun',
}
const FORMATION_LABELS: Record<string, string> = {
  table: 'Table/Badnet', arbitrage: "Arbitrage", ja: 'Juge Arbitre', jamais: 'Jamais',
}
const STAGE_AVAIL_LABELS: Record<string, string> = {
  yes: 'Disponible', no: 'Indisponible', uncertain: 'Incertain(e)',
}

function licenseLabel(r: SurveyResponse): string {
  if (r.staying_licensed === true) return 'Renouvelle'
  if (r.staying_licensed === false) return 'Ne renouvelle pas'
  return 'Incertain(e)'
}
function icLabel(r: SurveyResponse): string {
  if (r.doing_interclubs === true) return 'Fait les IC'
  if (r.doing_interclubs === false) return 'Pas les IC'
  return 'Incertain(e)'
}

export default function AdminResponsesPage() {
  const [responses, setResponses]   = useState<FullResponse[]>([])
  const [players,   setPlayers]     = useState<Player[]>([])
  const [icDates,   setIcDates]     = useState<IcDate[]>([])
  const [icEvents,  setIcEvents]    = useState<IcEvent[]>([])
  const [search,    setSearch]      = useState('')
  const [filterStatus,   setFilterStatus]   = useState<'all' | 'complete' | 'partial' | 'none'>('all')
  const [filterLicensed, setFilterLicensed] = useState<'all' | 'yes' | 'no' | 'unsure'>('all')
  const [filterIc,       setFilterIc]       = useState<'all' | 'yes' | 'no' | 'unsure'>('all')
  const [detail, setDetail] = useState<FullResponse | null>(null)

  async function load() {
    const supabase = createClient()
    const [{ data: r }, { data: p }, { data: d }, { data: e }] = await Promise.all([
      supabase.from('responses').select('*').order('created_at', { ascending: false }),
      supabase.from('players').select('*'),
      supabase.from('ic_dates').select('*').order('date'),
      supabase.from('ic_events').select('*').order('date'),
    ])
    const playerMap = Object.fromEntries(((p as Player[]) ?? []).map((pl) => [pl.id, pl]))
    setPlayers((p as Player[]) ?? [])
    setIcDates((d as IcDate[]) ?? [])
    setIcEvents((e as IcEvent[]) ?? [])
    setResponses(
      ((r as SurveyResponse[]) ?? [])
        .map((resp) => ({ ...resp, player: playerMap[resp.player_id] }))
        .filter((r) => r.player)
    )
  }

  useEffect(() => { load() }, [])

  const playerMap  = Object.fromEntries(players.map((p) => [p.id, `${p.first_name} ${p.last_name}`]))
  const datesMap   = Object.fromEntries(icDates.map((d) => [d.id, d]))
  const eventsMap  = Object.fromEntries(icEvents.map((e) => [e.id, e]))

  const filtered = responses.filter((r) => {
    if (search) {
      const q = search.toLowerCase()
      if (!`${r.player.first_name} ${r.player.last_name} ${r.player.email}`.toLowerCase().includes(q)) return false
    }
    if (filterStatus === 'complete' && !r.completed) return false
    if (filterStatus === 'partial' && (r.completed || r.current_step === 0)) return false
    if (filterStatus === 'none' && r.current_step !== 0) return false
    if (filterLicensed === 'yes'   && r.staying_licensed !== true)  return false
    if (filterLicensed === 'no'    && r.staying_licensed !== false) return false
    if (filterLicensed === 'unsure' && r.staying_licensed !== null) return false
    if (filterIc === 'yes'   && r.doing_interclubs !== true)  return false
    if (filterIc === 'no'    && r.doing_interclubs !== false) return false
    if (filterIc === 'unsure' && r.doing_interclubs !== null) return false
    return true
  })

  function exportCsv() {
    const rows = responses.map((r) => ({
      Nom: r.player.last_name,
      Prénom: r.player.first_name,
      Email: r.player.email,
      Genre: r.player.gender,
      Statut: r.completed ? 'Complet' : r.current_step > 0 ? 'En cours' : 'Non commencé',
      Licence: licenseLabel(r),
      RaisonDépart: r.reason_leaving_club ?? '',
      IC: icLabel(r),
      RaisonPasIC: r.reason_no_ic ?? '',
      Charte: r.charter_consent ? 'Oui' : 'Non',
      Capitaine: r.wants_captain ? (CAPTAIN_LABELS[r.wants_captain] ?? r.wants_captain) : '',
      RôleIC: r.ic_role ? (ROLE_LABELS[r.ic_role] ?? r.ic_role) : '',
      Tableaux: r.tableau_ranking?.map((t) => TABLEAU_LABELS[t] ?? t).join(' > ') ?? '',
      Disponibilités: r.availability?.map((a) => AVAIL_LABELS[a] ?? a).join(', ') ?? '',
      PartenairesDouble: (r.double_partners ?? []).map((id) => playerMap[id] ?? id).join('; '),
      PartenairesMixte:  (r.mixte_partners ?? []).map((id) => playerMap[id] ?? id).join('; '),
      Équipes: r.preferred_teams?.includes('any') ? 'Peu importe' : r.preferred_teams?.join(', ') ?? '',
      TshirtA: r.tshirt_has?.map((v) => TSHIRT_LABELS[v] ?? v).join(', ') ?? '',
      TshirtCoupe: r.tshirt_model ?? '',
      TshirtTaille: r.tshirt_size ?? '',
      Formations: r.formations_interest?.map((f) => FORMATION_LABELS[f] ?? f).join(', ') ?? '',
      BM: r.did_bm ? `${Object.keys(r.bm_assignments ?? {}).length} équipe(s)` : 'Non',
      EmpêchementsIC: (r.unavailable_dates ?? []).map((id) => {
        const d = datesMap[id]
        return d ? new Date(d.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : id
      }).join(', '),
      Cohésion: r.cohesion_date ?? '',
      CohésionCommentaire: r.cohesion_text ?? '',
      MàJ: r.updated_at,
    }))
    const csv = Papa.unparse(rows)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = 'reponses-abil-ic-2026-2027.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function statusLabel(r: FullResponse) {
    if (r.completed)        return { text: 'Complet',       cls: 'bg-green-100 text-green-700' }
    if (r.current_step > 0) return { text: 'En cours',      cls: 'bg-yellow-100 text-yellow-700' }
    return                         { text: 'Non commencé',  cls: 'bg-muted text-muted-foreground' }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Réponses ({filtered.length})</h1>
        <Button variant="outline" onClick={exportCsv}>⬇️ Exporter CSV</Button>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Rechercher…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}
          className="h-10 rounded-lg border bg-background px-3 text-sm">
          <option value="all">Tous les statuts</option>
          <option value="complete">Complets</option>
          <option value="partial">En cours</option>
          <option value="none">Non commencés</option>
        </select>
        <select value={filterLicensed} onChange={(e) => setFilterLicensed(e.target.value as any)}
          className="h-10 rounded-lg border bg-background px-3 text-sm">
          <option value="all">Licence : tous</option>
          <option value="yes">Renouvelle</option>
          <option value="no">Ne renouvelle pas</option>
          <option value="unsure">Incertain(e)</option>
        </select>
        <select value={filterIc} onChange={(e) => setFilterIc(e.target.value as any)}
          className="h-10 rounded-lg border bg-background px-3 text-sm">
          <option value="all">IC : tous</option>
          <option value="yes">Fait les IC</option>
          <option value="no">Pas les IC</option>
          <option value="unsure">Incertain(e)</option>
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
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => setDetail(r)}>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{r.player.first_name} {r.player.last_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.player.email}</td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', s.cls)}>{s.text}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {r.staying_licensed === true ? '✅' : r.staying_licensed === false ? '❌' : '🤔'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {r.doing_interclubs === true ? '🔥' : r.doing_interclubs === false ? '⏭' : '🤔'}
                  </td>
                  <td className="px-4 py-3 max-w-[140px] truncate">
                    {r.preferred_teams?.includes('any') ? '✨ Peu importe' : r.preferred_teams?.join(', ') ?? '—'}
                  </td>
                  <td className="px-4 py-3 max-w-[140px] truncate text-muted-foreground">
                    {r.availability?.map((a) => AVAIL_LABELS[a] ?? a).join(', ') ?? '—'}
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
        <DialogContent className="max-w-lg max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              {detail?.player.first_name} {detail?.player.last_name}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <DetailContent
              r={detail}
              playerMap={playerMap}
              datesMap={datesMap}
              eventsMap={eventsMap}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Contenu de la modale détail ──────────────────────────────────────────────
function DetailContent({
  r, playerMap, datesMap, eventsMap,
}: {
  r: FullResponse
  playerMap: Record<string, string>
  datesMap: Record<string, IcDate>
  eventsMap: Record<string, IcEvent>
}) {
  const unavailDates = (r.unavailable_dates ?? []).map((id) => datesMap[id]).filter(Boolean)

  return (
    <div className="space-y-4 text-sm">

      {/* Joueur */}
      <Section title="Joueur">
        <Row label="Email"   value={r.player.email} />
        <Row label="Genre"   value={r.player.gender === 'H' ? 'Homme' : 'Femme'} />
        <Row label="Classement" value={[r.player.ranking_simple, r.player.ranking_double, r.player.ranking_mixte].filter(Boolean).join(' / ') || '—'} />
        {r.player.previous_teams?.length > 0 && (
          <Row label="Équipes 25-26" value={r.player.previous_teams.join(', ')} />
        )}
      </Section>

      {/* Licence */}
      <Section title="🎽 Licence">
        <Row label="Licence" value={
          r.staying_licensed === true  ? '✅ Renouvelle' :
          r.staying_licensed === false ? '❌ Ne renouvelle pas' : '🤔 Incertain(e)'
        } />
        {r.reason_leaving_club && <Row label="Raison" value={r.reason_leaving_club} />}
      </Section>

      {/* Interclubs */}
      <Section title="🔥 Interclubs">
        <Row label="IC" value={
          r.doing_interclubs === true  ? '🔥 Fait les IC' :
          r.doing_interclubs === false ? '⏭ Pas les IC' : '🤔 Incertain(e)'
        } />
        {r.reason_no_ic && <Row label="Raison" value={r.reason_no_ic} />}
      </Section>

      {/* Charte + Capitaine + Rôle */}
      {(r.charter_consent != null || r.wants_captain || r.ic_role) && (
        <Section title="⚖️ Engagement IC">
          {r.charter_consent != null && (
            <Row label="Charte" value={r.charter_consent ? '✅ Acceptée' : '⚠️ Non signée'} />
          )}
          {r.wants_captain && (
            <Row label="Capitaine" value={CAPTAIN_LABELS[r.wants_captain] ?? r.wants_captain} />
          )}
          {r.ic_role && (
            <Row label="Rôle" value={ROLE_LABELS[r.ic_role] ?? r.ic_role} />
          )}
        </Section>
      )}

      {/* Tableaux + Dispos */}
      {(r.tableau_ranking?.length || r.availability?.length) ? (
        <Section title="🏸 Jeu">
          {r.tableau_ranking?.length ? (
            <Row label="Tableaux" value={r.tableau_ranking.map((t, i) => `${i + 1}. ${TABLEAU_LABELS[t] ?? t}`).join(' — ')} />
          ) : null}
          {r.availability?.length ? (
            <Row label="Dispos" value={r.availability.map((a) => AVAIL_LABELS[a] ?? a).join(', ')} />
          ) : null}
        </Section>
      ) : null}

      {/* Partenaires */}
      {(r.double_partners?.length || r.mixte_partners?.length) ? (
        <Section title="💙 Partenaires">
          {r.double_partners?.length ? (
            <RowList label="Double" items={r.double_partners.map((id) => playerMap[id] ?? id)} />
          ) : null}
          {r.mixte_partners?.length ? (
            <RowList label="Mixte" items={r.mixte_partners.map((id) => playerMap[id] ?? id)} />
          ) : null}
        </Section>
      ) : null}

      {/* Équipes */}
      {r.preferred_teams?.length ? (
        <Section title="🏆 Équipes souhaitées">
          <Row
            label="Équipes"
            value={r.preferred_teams.includes('any') ? '✨ Peu importe' : r.preferred_teams.join(', ')}
          />
        </Section>
      ) : null}

      {/* T-shirt */}
      {(r.tshirt_has?.length || r.tshirt_size) ? (
        <Section title="👕 T-shirt">
          {r.tshirt_has?.length ? (
            <Row label="T-shirt" value={r.tshirt_has.map((v) => TSHIRT_LABELS[v] ?? v).join(', ')} />
          ) : null}
          {r.tshirt_model && (
            <Row label="Coupe" value={r.tshirt_model === 'homme' ? 'Homme' : 'Femme'} />
          )}
          {r.tshirt_size && <Row label="Taille" value={r.tshirt_size} />}
        </Section>
      ) : null}

      {/* Formations */}
      {r.formations_interest?.length ? (
        <Section title="🎓 Formations">
          <RowList label="" items={r.formations_interest.map((f) => FORMATION_LABELS[f] ?? f)} />
        </Section>
      ) : null}

      {/* Badminton Manager */}
      <Section title="🎮 Badminton Manager">
        {r.did_bm && r.bm_assignments && Object.keys(r.bm_assignments).length > 0 ? (
          <>
            <Row label="Équipes proposées" value={Object.keys(r.bm_assignments).join(', ')} />
            {Object.entries(r.bm_assignments).map(([code, a]) => (
              <Row key={code} label={code} value={`${a.roster.length} joueur(s) — ${Object.values(a.lineup).filter(Boolean).length} slot(s) rempli(s)`} />
            ))}
          </>
        ) : (
          <p className="text-muted-foreground">Pas de compo proposée</p>
        )}
      </Section>

      {/* Calendrier IC */}
      <Section title="📆 Calendrier IC">
        {unavailDates.length > 0 ? (
          unavailDates.map((d) => (
            <div key={d.id} className="flex gap-2">
              <span className="w-40 shrink-0 font-medium text-muted-foreground">
                {new Date(d.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
              </span>
              <span className="flex-1 italic">
                {r.date_comments?.[d.id] ?? 'Indisponible'}
              </span>
            </div>
          ))
        ) : (
          <p className="text-muted-foreground">Aucun empêchement</p>
        )}
      </Section>

      {/* Stage de reprise */}
      {r.stage_availability && Object.keys(r.stage_availability).length > 0 && (
        <Section title="🏕️ Stage de reprise">
          {Object.entries(r.stage_availability).map(([eventId, avail]) => {
            const ev = eventsMap[eventId]
            return (
              <Row
                key={eventId}
                label={ev ? ev.title : eventId}
                value={STAGE_AVAIL_LABELS[avail] ?? avail}
              />
            )
          })}
        </Section>
      )}

      {/* Cohésion */}
      {(r.cohesion_date || r.cohesion_text) && (
        <Section title="🎉 Cohésion">
          {r.cohesion_date && (
            <Row label="Date suggérée" value={new Date(r.cohesion_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} />
          )}
          {r.cohesion_text && (
            <p className="italic text-muted-foreground text-xs mt-1">"{r.cohesion_text}"</p>
          )}
        </Section>
      )}

      {/* Meta */}
      <div className="pt-1 text-xs text-muted-foreground border-t">
        Dernière mise à jour : {new Date(r.updated_at).toLocaleString('fr-FR')}
        {r.completed && ' · ✅ Sondage validé'}
      </div>
    </div>
  )
}

// ── Composants d'affichage ───────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-muted/20 p-3 space-y-1.5">
      <p className="text-xs font-bold text-primary uppercase tracking-wide">{title}</p>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      {label && <span className="w-36 shrink-0 font-medium text-muted-foreground">{label}</span>}
      <span className="flex-1 break-words">{value}</span>
    </div>
  )
}

function RowList({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="flex gap-2">
      {label && <span className="w-36 shrink-0 font-medium text-muted-foreground">{label}</span>}
      <ul className="flex-1 space-y-0.5">
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </div>
  )
}
