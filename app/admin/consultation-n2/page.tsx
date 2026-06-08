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
import type { ConsultationN2Response } from '@/lib/supabase/types'

const TEAM_LABELS: Record<string, string> = {
  n2: 'Équipe N2', n3: 'Équipe N3', bureau: 'Bureau / commission IC', autre: 'Autre',
}
const DIRECTION_LABELS: Record<string, string> = {
  n2: 'Plutôt rester en N2', neutre: 'Sans avis tranché', n3: 'Plutôt descendre en N3',
}
const PRIORITY_LABELS: Record<string, string> = {
  niveau: 'Niveau de jeu', plaisir: 'Plaisir de jouer', resultats: 'Résultats',
  projet: 'Projet collectif', cohesion: 'Ambiance & cohésion', proximite: 'Proximité des déplacements',
}

export default function AdminConsultationN2Page() {
  const [responses, setResponses] = useState<ConsultationN2Response[]>([])
  const [search, setSearch]       = useState('')
  const [filterTeam, setFilterTeam]           = useState<'all' | 'n2' | 'n3' | 'bureau' | 'autre'>('all')
  const [filterDirection, setFilterDirection] = useState<'all' | 'n2' | 'neutre' | 'n3' | 'none'>('all')
  const [detail, setDetail]       = useState<ConsultationN2Response | null>(null)

  async function load() {
    const supabase = createClient()
    const { data } = await supabase
      .from('consultation_n2_responses')
      .select('*')
      .order('created_at', { ascending: false })
    setResponses((data as ConsultationN2Response[]) ?? [])
  }

  useEffect(() => { load() }, [])

  const filtered = responses.filter((r) => {
    if (search) {
      const q = search.toLowerCase()
      const name = r.is_anonymous ? 'anonyme' : (r.respondent_name ?? '')
      if (!name.toLowerCase().includes(q)) return false
    }
    if (filterTeam !== 'all' && r.team !== filterTeam) return false
    if (filterDirection === 'none' && r.preferred_direction !== null) return false
    if (filterDirection !== 'all' && filterDirection !== 'none' && r.preferred_direction !== filterDirection) return false
    return true
  })

  // ── Statistiques simples ─────────────────────────────────────────────────
  const total  = responses.length
  const byTeam = {
    n2:     responses.filter((r) => r.team === 'n2').length,
    n3:     responses.filter((r) => r.team === 'n3').length,
    bureau: responses.filter((r) => r.team === 'bureau').length,
    autre:  responses.filter((r) => r.team === 'autre').length,
  }
  const byDirection = {
    n2:     responses.filter((r) => r.preferred_direction === 'n2').length,
    neutre: responses.filter((r) => r.preferred_direction === 'neutre').length,
    n3:     responses.filter((r) => r.preferred_direction === 'n3').length,
    none:   responses.filter((r) => r.preferred_direction === null).length,
  }
  const priorityCounts: Record<string, number> = {}
  responses.forEach((r) => (r.priorities ?? []).forEach((p) => {
    priorityCounts[p] = (priorityCounts[p] ?? 0) + 1
  }))
  const topPriorities = Object.entries(priorityCounts).sort((a, b) => b[1] - a[1])

  function exportCsv() {
    const rows = responses.map((r) => ({
      Date: new Date(r.created_at).toLocaleString('fr-FR'),
      Anonyme: r.is_anonymous ? 'Oui' : 'Non',
      Nom: r.is_anonymous ? '' : (r.respondent_name ?? ''),
      Équipe: TEAM_LABELS[r.team] ?? r.team,
      Ressenti: r.feeling_text ?? '',
      Direction: r.preferred_direction ? (DIRECTION_LABELS[r.preferred_direction] ?? r.preferred_direction) : '',
      RaisonDirection: r.direction_reason_text ?? '',
      Priorités: (r.priorities ?? []).map((p) => PRIORITY_LABELS[p] ?? p).join(', '),
      PrioritésAutre: r.priorities_other_text ?? '',
      Reconstruction: r.rebuild_involvement_text ?? '',
      Recrutement: r.recruitment_opinion_text ?? '',
      AutresArguments: r.other_arguments_text ?? '',
      DispoAmbition: r.availability_ambition_text ?? '',
    }))
    const csv = Papa.unparse(rows)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = 'consultation-n2-2026-2027.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Consultation N2 ({filtered.length})</h1>
        <Button variant="outline" onClick={exportCsv}>⬇️ Exporter CSV</Button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Réponses reçues" value={total} />
        <StatCard label="N2 / N3 / Bureau / Autre" value={`${byTeam.n2} / ${byTeam.n3} / ${byTeam.bureau} / ${byTeam.autre}`} />
        <StatCard label="Plutôt N2 / Neutre / N3" value={`${byDirection.n2} / ${byDirection.neutre} / ${byDirection.n3}`} />
        <StatCard label="Sans avis exprimé" value={byDirection.none} />
      </div>

      {topPriorities.length > 0 && (
        <div className="space-y-2 rounded-2xl border bg-muted/20 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-primary">Priorités les plus citées</p>
          <div className="flex flex-wrap gap-2">
            {topPriorities.map(([key, count]) => (
              <span key={key} className="rounded-full border bg-card px-3 py-1 text-xs font-medium">
                {PRIORITY_LABELS[key] ?? key} · {count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Rechercher un nom…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <select value={filterTeam} onChange={(e) => setFilterTeam(e.target.value as any)}
          className="h-10 rounded-lg border bg-background px-3 text-sm">
          <option value="all">Équipe : toutes</option>
          <option value="n2">Équipe N2</option>
          <option value="n3">Équipe N3</option>
          <option value="bureau">Bureau / commission IC</option>
          <option value="autre">Autre</option>
        </select>
        <select value={filterDirection} onChange={(e) => setFilterDirection(e.target.value as any)}
          className="h-10 rounded-lg border bg-background px-3 text-sm">
          <option value="all">Direction : toutes</option>
          <option value="n2">Plutôt N2</option>
          <option value="neutre">Sans avis tranché</option>
          <option value="n3">Plutôt N3</option>
          <option value="none">Pas exprimé</option>
        </select>
      </div>

      {/* Tableau */}
      <div className="overflow-auto rounded-2xl border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              {['Répondant·e', 'Équipe', 'Direction', 'Reçu le', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => setDetail(r)}>
                <td className="px-4 py-3 font-medium whitespace-nowrap">
                  {r.is_anonymous ? '🙈 Anonyme' : (r.respondent_name || '—')}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{TEAM_LABELS[r.team] ?? r.team}</td>
                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                  {r.preferred_direction ? (DIRECTION_LABELS[r.preferred_direction] ?? r.preferred_direction) : '—'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-primary">Détail →</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modale détail */}
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              {detail?.is_anonymous ? 'Réponse anonyme' : (detail?.respondent_name || 'Réponse')}
            </DialogTitle>
          </DialogHeader>
          {detail && <DetailContent r={detail} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Composants d'affichage ───────────────────────────────────────────────────
function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="space-y-1 rounded-2xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  )
}

function DetailContent({ r }: { r: ConsultationN2Response }) {
  return (
    <div className="space-y-4 text-sm">
      <Section title="Identité">
        <Row label="Équipe" value={TEAM_LABELS[r.team] ?? r.team} />
        <Row label="Anonymat" value={r.is_anonymous ? 'Oui — nom non enregistré' : 'Non'} />
        {!r.is_anonymous && r.respondent_name && <Row label="Nom" value={r.respondent_name} />}
        <Row label="Reçu le" value={new Date(r.created_at).toLocaleString('fr-FR')} />
      </Section>

      {r.feeling_text && (
        <Section title="💬 Ressenti">
          <p className="italic leading-relaxed text-muted-foreground">"{r.feeling_text}"</p>
        </Section>
      )}

      {(r.preferred_direction || r.direction_reason_text) && (
        <Section title="🧭 Direction">
          {r.preferred_direction && (
            <Row label="Préférence" value={DIRECTION_LABELS[r.preferred_direction] ?? r.preferred_direction} />
          )}
          {r.direction_reason_text && (
            <p className="italic leading-relaxed text-muted-foreground">"{r.direction_reason_text}"</p>
          )}
        </Section>
      )}

      {(r.priorities?.length || r.priorities_other_text || r.rebuild_involvement_text || r.recruitment_opinion_text) && (
        <Section title="🎯 Priorités & pistes">
          {r.priorities?.length ? (
            <RowList label="Priorités" items={r.priorities.map((p) => PRIORITY_LABELS[p] ?? p)} />
          ) : null}
          {r.priorities_other_text && <Row label="Autre" value={r.priorities_other_text} />}
          {r.rebuild_involvement_text && (
            <TextBlock label="Investissement projet N3" text={r.rebuild_involvement_text} />
          )}
          {r.recruitment_opinion_text && (
            <TextBlock label="Avis recrutement extérieur" text={r.recruitment_opinion_text} />
          )}
        </Section>
      )}

      {(r.other_arguments_text || r.availability_ambition_text) && (
        <Section title="📝 Arguments libres">
          {r.other_arguments_text && <TextBlock label="Idées / angles" text={r.other_arguments_text} />}
          {r.availability_ambition_text && <TextBlock label="Disponibilité / ambition" text={r.availability_ambition_text} />}
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 rounded-xl border bg-muted/20 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-primary">{title}</p>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-32 shrink-0 font-medium text-muted-foreground">{label}</span>
      <span className="flex-1 break-words">{value}</span>
    </div>
  )
}

function RowList({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="flex gap-2">
      <span className="w-32 shrink-0 font-medium text-muted-foreground">{label}</span>
      <ul className="flex-1 space-y-0.5">
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </div>
  )
}

function TextBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="space-y-0.5">
      <p className="font-medium text-muted-foreground">{label}</p>
      <p className="italic leading-relaxed">"{text}"</p>
    </div>
  )
}
