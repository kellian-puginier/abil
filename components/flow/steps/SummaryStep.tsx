'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { Button } from '@/components/ui/button'
import { useQuestionnaireStore } from '@/stores/questionnaire'
import { createClient } from '@/lib/supabase/client'
import { buildUpsertPayload } from '@/lib/flow-save'
import type { Team, IcDate, IcEvent } from '@/lib/supabase/types'
import type { BmAssignments } from '@/lib/lineup-rules'

// ── Libellés ────────────────────────────────────────────────────────────────
const AVAIL_LABELS: Record<string, string> = {
  weekday: '🌙 Soirée semaine', saturday: '📅 Samedi',
  sunday: '📅 Dimanche', anytime: '⏰ Tout le temps',
}
const TABLEAU_LABELS: Record<string, string> = {
  simple: 'Simple', double: 'Double', mixte: 'Mixte',
}
const CAPTAIN_LABELS: Record<string, string> = {
  yes: 'Oui 🙋', no: 'Non 🙅', if_needed: 'Si besoin 🤷',
}
const ROLE_LABELS: Record<string, string> = {
  titulaire: 'Titulaire 🏆', remplacant: 'Remplaçant(e) 🔄', peu_importe: 'Peu importe ✨',
}
const TSHIRT_LABELS: Record<string, string> = {
  bleu: 'Le bleu 🔵', jaune: 'Le jaune 🟡', les_deux: 'Les deux 🔵🟡', none: 'Aucun',
}
const FORMATION_LABELS: Record<string, string> = {
  table: 'Gestion de compétitions (Table/Badnet)',
  arbitrage: "Formation d'arbitrage",
  ja: 'Formation Juge Arbitre',
  jamais: 'Jamais de la vie !',
}
const STAGE_AVAIL_LABELS: Record<string, string> = {
  yes: 'Disponible ✅', no: 'Indisponible ❌', uncertain: 'Incertain(e) 🤔',
}

// ── Composant carte section ─────────────────────────────────────────────────
function SectionCard({
  title, children, onEdit,
}: {
  title: string
  children: React.ReactNode
  onEdit: () => void
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-sm">{title}</p>
        <button
          type="button"
          onClick={onEdit}
          className="text-xs text-primary underline underline-offset-4 shrink-0"
        >
          Modifier
        </button>
      </div>
      <div className="text-sm text-muted-foreground space-y-0.5">{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <p><span className="font-medium text-foreground/80">{label} : </span>{value}</p>
  )
}

// ── Composant principal ─────────────────────────────────────────────────────
export function SummaryStep() {
  const router = useRouter()
  const store  = useQuestionnaireStore()

  const [teams,    setTeams]    = useState<Team[]>([])
  const [icDates,  setIcDates]  = useState<IcDate[]>([])
  const [icEvents, setIcEvents] = useState<IcEvent[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('teams').select('*').order('level_order'),
      supabase.from('ic_dates').select('*').order('date'),
      supabase.from('ic_events').select('*').order('date'),
    ]).then(([{ data: t }, { data: d }, { data: e }]) => {
      setTeams((t as Team[]) ?? [])
      setIcDates((d as IcDate[]) ?? [])
      setIcEvents((e as IcEvent[]) ?? [])
    })
  }, [])

  async function handleValidate() {
    setSubmitting(true)
    const supabase = createClient()
    await supabase.from('responses').upsert(
      { ...buildUpsertPayload(store), completed: true },
      { onConflict: 'player_id' }
    )
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.5 }, colors: ['#2563EB', '#F59E0B', '#fff'] })
    setTimeout(() => router.push('/merci'), 600)
  }

  const teamsMap   = Object.fromEntries(teams.map((t) => [t.code, t]))
  const datesMap   = Object.fromEntries(icDates.map((d) => [d.id, d]))
  const eventsMap  = Object.fromEntries(icEvents.map((e) => [e.id, e]))
  const unavailDates = store.unavailableDates.map((id) => datesMap[id]).filter(Boolean)

  // Helpers
  const inIc = store.doingInterclubs === true || store.icUnsure
  const hasLicense = store.stayingLicensed === true || store.licensedUnsure

  return (
    <div className="flex flex-1 flex-col space-y-3">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Récap de ton sondage ✅</h1>
        <p className="text-sm text-muted-foreground">Vérifie et valide avant d'envoyer.</p>
      </div>

      {/* Bandeau confirmation */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary font-medium">
        ✅ Toutes tes réponses sont bien enregistrées. Tu peux les modifier avant de valider.
      </div>

      {/* ── Licence ── */}
      <SectionCard title="🎽 Licence" onEdit={() => router.push('/flow/license')}>
        <p>
          {store.stayingLicensed === true ? '✅ Je reste à l\'ABIL'
            : store.licensedUnsure ? '🤔 Je ne sais pas encore'
            : '❌ Pas de renouvellement'}
        </p>
        {store.reasonLeavingClub && (
          <p className="italic text-xs">"{store.reasonLeavingClub}"</p>
        )}
      </SectionCard>

      {/* ── Interclubs ── */}
      {hasLicense && (
        <SectionCard title="🔥 Interclubs" onEdit={() => router.push('/flow/ic-engagement')}>
          <p>
            {store.doingInterclubs === true ? '🔥 Je fais les IC'
              : store.icUnsure ? '🤔 Je ne sais pas encore'
              : '⏭ Pas les IC cette année'}
          </p>
          {store.reasonNoIc && (
            <p className="italic text-xs">"{store.reasonNoIc}"</p>
          )}
        </SectionCard>
      )}

      {/* ── Blocs IC détaillés (si IC oui/incertain) ── */}
      {hasLicense && inIc && (
        <>
          {/* Charte */}
          <SectionCard title="⚖️ Charte du joueur" onEdit={() => router.push('/flow/charter')}>
            <p>{store.charterConsent ? '✅ Charte acceptée' : '⚠️ Charte non signée'}</p>
          </SectionCard>

          {/* Capitaine */}
          {store.wantsCaptain && (
            <SectionCard title="⚓ Capitaine" onEdit={() => router.push('/flow/captain')}>
              <p>{CAPTAIN_LABELS[store.wantsCaptain] ?? store.wantsCaptain}</p>
            </SectionCard>
          )}

          {/* Rôle IC */}
          {store.icRole && (
            <SectionCard title="🎯 Rôle en IC" onEdit={() => router.push('/flow/ic-role')}>
              <p>{ROLE_LABELS[store.icRole] ?? store.icRole}</p>
            </SectionCard>
          )}

          {/* Tableaux */}
          {store.tableauRanking.length > 0 && (
            <SectionCard title="🏸 Tableaux préférés" onEdit={() => router.push('/flow/tableau-ranking')}>
              <p>{store.tableauRanking.map((t, i) => `${i + 1}. ${TABLEAU_LABELS[t]}`).join(' — ')}</p>
            </SectionCard>
          )}

          {/* Disponibilités */}
          {store.availability.length > 0 && (
            <SectionCard title="📅 Disponibilités" onEdit={() => router.push('/flow/availability')}>
              <p>{store.availability.map((a) => AVAIL_LABELS[a] ?? a).join(', ')}</p>
            </SectionCard>
          )}

          {/* Partenaires */}
          {(store.doublePartners.length > 0 || store.mixtePartners.length > 0) && (
            <SectionCard title="💙 Partenaires" onEdit={() => router.push('/flow/partners')}>
              {store.doublePartners.length > 0 && (
                <p>{store.doublePartners.length} partenaire{store.doublePartners.length > 1 ? 's' : ''} de double</p>
              )}
              {store.mixtePartners.length > 0 && (
                <p>{store.mixtePartners.length} partenaire{store.mixtePartners.length > 1 ? 's' : ''} de mixte</p>
              )}
            </SectionCard>
          )}

          {/* Équipes */}
          {store.preferredTeams.length > 0 && (
            <SectionCard title="🏆 Équipes souhaitées" onEdit={() => router.push('/flow/teams')}>
              <p>
                {store.preferredTeams.includes('any')
                  ? '✨ Là où on a besoin de moi'
                  : store.preferredTeams.map((code) => {
                      const t = teamsMap[code]
                      return t ? `${t.code} — ${t.label}` : code
                    }).join(', ')
                }
              </p>
            </SectionCard>
          )}

          {/* T-shirt */}
          {(store.tshirtHas.length > 0 || store.tshirtSize) && (
            <SectionCard title="👕 T-shirt" onEdit={() => router.push('/flow/tshirt')}>
              {store.tshirtHas.length > 0 && (
                <Row label="T-shirt(s)" value={store.tshirtHas.map((v) => TSHIRT_LABELS[v] ?? v).join(', ')} />
              )}
              {store.tshirtModel && (
                <Row label="Coupe" value={store.tshirtModel === 'homme' ? 'Homme' : 'Femme'} />
              )}
              {store.tshirtSize && (
                <Row label="Taille" value={store.tshirtSize} />
              )}
            </SectionCard>
          )}

          {/* Formations */}
          {store.formationsInterest.length > 0 && (
            <SectionCard title="🎓 Formations" onEdit={() => router.push('/flow/formations')}>
              {store.formationsInterest.map((f) => (
                <p key={f}>{FORMATION_LABELS[f] ?? f}</p>
              ))}
            </SectionCard>
          )}

          {/* Badminton Manager */}
          {store.didBm && store.bmAssignments && Object.keys(store.bmAssignments).length > 0 ? (
            <SectionCard title="🎮 Badminton Manager" onEdit={() => router.push('/flow/badminton-manager')}>
              <BmSummaryBlock assignments={store.bmAssignments as BmAssignments} teamsMap={teamsMap} />
            </SectionCard>
          ) : (
            <div className="rounded-2xl border border-dashed bg-muted/30 p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">🎮 Badminton Manager</p>
                <p className="text-xs text-muted-foreground">Tu n'as pas encore proposé de compo.</p>
              </div>
              <button
                type="button"
                onClick={() => router.push('/flow/badminton-manager')}
                className="shrink-0 text-xs font-semibold text-primary underline underline-offset-4"
              >
                Proposer
              </button>
            </div>
          )}

          {/* Empêchements calendrier IC */}
          <SectionCard title="📆 Calendrier IC" onEdit={() => router.push('/flow/calendar')}>
            {unavailDates.length > 0 ? (
              unavailDates.map((d) => (
                <p key={d.id}>
                  ❌ {new Date(d.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                  {store.dateComments[d.id] && (
                    <span className="italic text-xs"> — {store.dateComments[d.id]}</span>
                  )}
                </p>
              ))
            ) : (
              <p>Aucun empêchement signalé</p>
            )}
          </SectionCard>

          {/* Stage de reprise (si applicable) */}
          {Object.keys(store.stageAvailability).length > 0 && (
            <SectionCard title="🏕️ Stage de reprise" onEdit={() => router.push('/flow/stage-reprise')}>
              {Object.entries(store.stageAvailability).map(([eventId, avail]) => {
                const ev = eventsMap[eventId]
                return (
                  <Row
                    key={eventId}
                    label={ev ? ev.title : eventId}
                    value={STAGE_AVAIL_LABELS[avail] ?? avail}
                  />
                )
              })}
            </SectionCard>
          )}

          {/* Cohésion */}
          {(store.cohesionText || store.cohesionDate) && (
            <SectionCard title="🎉 Cohésion" onEdit={() => router.push('/flow/cohesion')}>
              {store.cohesionDate && (
                <Row
                  label="Date suggérée"
                  value={new Date(store.cohesionDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                />
              )}
              {store.cohesionText && (
                <p className="italic text-xs mt-1">"{store.cohesionText}"</p>
              )}
            </SectionCard>
          )}
        </>
      )}

      <motion.div whileTap={{ scale: 0.97 }}>
        <Button
          size="lg"
          className="h-14 w-full text-base"
          onClick={handleValidate}
          disabled={submitting}
        >
          {submitting ? 'Envoi…' : '✅ Valider mon sondage'}
        </Button>
      </motion.div>
    </div>
  )
}

function BmSummaryBlock({ assignments, teamsMap }: {
  assignments: BmAssignments
  teamsMap: Record<string, Team>
}) {
  return (
    <div className="space-y-2">
      {Object.entries(assignments).map(([code, a]) => (
        <div key={code} className="rounded-xl border bg-primary/5 px-3 py-2">
          <p className="text-xs font-bold text-primary">{code} — {teamsMap[code]?.label ?? code}</p>
          <p className="text-xs text-muted-foreground">
            Effectif : {a.roster.length} joueur{a.roster.length > 1 ? 's' : ''}
          </p>
        </div>
      ))}
    </div>
  )
}
