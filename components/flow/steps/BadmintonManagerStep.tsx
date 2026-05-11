'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useQuestionnaireStore } from '@/stores/questionnaire'
import { getNextStep } from '@/lib/flow-config'
import { createClient } from '@/lib/supabase/client'
import { buildUpsertPayload } from '@/lib/flow-save'
import { getBmAllowedTeams, getPlayerLevel } from '@/lib/eligibility'
import {
  validateRoster, validateLineup, getAvailablePlayersForTeam,
  getAssignedPlayerIds, countAppearances,
  SLOT_CONFIG, EMPTY_LINEUP,
  type Lineup, type TeamAssignment, type BmAssignments, type SlotKey,
} from '@/lib/lineup-rules'
import { cn } from '@/lib/utils'
import type { Player, Team } from '@/lib/supabase/types'
import type { TeamCode } from '@/lib/eligibility'

// ── Sous-étapes internes ───────────────────────────────────────────────────
type BmSubStep = 'team-pick' | 'roster' | 'lineup' | 'done'

export function BadmintonManagerStep() {
  const router = useRouter()
  const store  = useQuestionnaireStore()

  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [allTeams,   setAllTeams]   = useState<Team[]>([])
  const [loading,    setLoading]    = useState(true)

  // État BM local — fusionné dans le store seulement à la fin
  const [assignments, setAssignments] = useState<BmAssignments>(
    (store.bmAssignments as BmAssignments | null) ?? {}
  )
  const [currentTeam, setCurrentTeam] = useState<string | null>(null)
  const [roster,      setRoster]      = useState<string[]>([])
  const [lineup,      setLineup]      = useState<Lineup>({ ...EMPTY_LINEUP })
  const [subStep,     setSubStep]     = useState<BmSubStep>('team-pick')

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('players').select('*').returns<Player[]>(),
      supabase.from('teams').select('*').order('level_order').returns<Team[]>(),
    ]).then(([{ data: pl }, { data: tm }]) => {
      setAllPlayers((pl ?? []) as Player[])
      setAllTeams((tm ?? []) as Team[])
      setLoading(false)
    })
  }, [])

  // ── Équipes accessibles ─────────────────────────────────────────────────
  const playerLevel   = store.player ? getPlayerLevel(store.player) : 'departemental'
  const allowedByLevel = new Set(getBmAllowedTeams(playerLevel))

  // Équipes cochées à l'écran 9, filtrées par le niveau du joueur
  const preferredCodes = store.preferredTeams.includes('any')
    ? allTeams.map((t) => t.code)
    : store.preferredTeams

  const eligibleTeams = allTeams.filter(
    (t) => preferredCodes.includes(t.code) && allowedByLevel.has(t.code as TeamCode)
  )

  const alreadyAssigned = getAssignedPlayerIds(assignments)
  const availablePlayers = getAvailablePlayersForTeam(allPlayers, alreadyAssigned, (currentTeam ?? 'D6') as TeamCode)

  const playerMap = new Map(allPlayers.map((p) => [p.id, p]))

  const rosterPlayers = roster.map((id) => playerMap.get(id)).filter(Boolean) as Player[]
  const rosterValidation = currentTeam
    ? validateRoster(rosterPlayers, currentTeam as TeamCode)
    : { valid: false, errors: [] }

  const lineupValidation = validateLineup(lineup, playerMap)
  const appearances = countAppearances(lineup)

  // ── Navigation interne ──────────────────────────────────────────────────
  function pickTeam(code: string) {
    // Si équipe déjà faite → recharger son état pour modifier
    if (assignments[code]) {
      setRoster(assignments[code].roster)
      setLineup({ ...assignments[code].lineup })
    } else {
      setRoster([])
      setLineup({ ...EMPTY_LINEUP })
    }
    setCurrentTeam(code)
    setSubStep('roster')
  }

  function goToLineup() {
    setSubStep('lineup')
  }

  function saveTeamAndContinue() {
    if (!currentTeam) return
    const newAssignments: BmAssignments = {
      ...assignments,
      [currentTeam]: { roster, lineup, substitutes: [] },
    }
    setAssignments(newAssignments)
    setCurrentTeam(null)
    setSubStep('done')
  }

  // ── Terminer BM ─────────────────────────────────────────────────────────
  async function handleFinish() {
    store.patchResponse({ bmAssignments: assignments, didBm: true } as any)
    store.setCurrentStep(10)
    const supabase = createClient()
    await supabase.from('responses').upsert(
      { ...buildUpsertPayload({ ...store, bmAssignments: assignments, didBm: true }), current_step: 10 },
      { onConflict: 'player_id' }
    )
    const next = getNextStep('badminton-manager', store)
    router.push(`/flow/${next ?? 'calendar'}`)
  }

  async function handleSkip() {
    store.setCurrentStep(10)
    const supabase = createClient()
    await supabase.from('responses').upsert(
      { ...buildUpsertPayload(store), current_step: 10 },
      { onConflict: 'player_id' }
    )
    const next = getNextStep('badminton-manager', store)
    router.push(`/flow/${next ?? 'calendar'}`)
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground text-sm">Chargement…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col space-y-5">
      {/* En-tête */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎮</span>
          <h1 className="font-display text-3xl text-primary">Badminton Manager</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Propose ta vision des équipes pour la saison prochaine !
        </p>
      </div>

      <AnimatePresence mode="wait">
        {/* ── Sous-étape 1 : choix de l'équipe ── */}
        {subStep === 'team-pick' && (
          <SubStepWrap key="team-pick">
            <p className="font-semibold">Pour quelle équipe veux-tu proposer une compo ?</p>
            <p className="text-xs text-muted-foreground mb-3">
              Niveau : <strong>{playerLevel === 'regional_plus' ? 'Régional+' : 'Départemental'}</strong>
            </p>

            {eligibleTeams.length === 0 && (
              <p className="text-sm text-muted-foreground rounded-xl border bg-muted/50 p-4">
                Aucune équipe éligible selon ton niveau et tes préférences.
              </p>
            )}

            <div className="space-y-2">
              {eligibleTeams.map((t) => {
                const done = !!assignments[t.code]
                return (
                  <button
                    key={t.code}
                    type="button"
                    onClick={() => pickTeam(t.code)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-colors',
                      done
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-border bg-card hover:border-primary/40'
                    )}
                  >
                    <span className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                      done ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                    )}>
                      {t.code}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium">{t.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.play_days.map((d: string) => d === 'saturday' ? 'Samedi' : d === 'sunday' ? 'Dimanche' : 'Semaine').join(' / ')}
                      </p>
                    </div>
                    {done && <span className="text-xs font-semibold text-primary">✓ Compo faite</span>}
                  </button>
                )
              })}
            </div>

            {Object.keys(assignments).length > 0 && (
              <Button size="lg" className="w-full mt-2" onClick={handleFinish}>
                Terminer Badminton Manager ✅
              </Button>
            )}
            <button type="button" onClick={handleSkip} className="w-full text-sm text-muted-foreground underline underline-offset-4">
              Passer cette étape
            </button>
          </SubStepWrap>
        )}

        {/* ── Sous-étape 2 : constitution de l'effectif ── */}
        {subStep === 'roster' && currentTeam && (
          <SubStepWrap key="roster">
            <div className="flex items-center gap-2 mb-4">
              <button type="button" onClick={() => setSubStep('team-pick')} className="text-primary text-sm">← Retour</button>
              <span className="font-display text-xl">Effectif — {currentTeam}</span>
            </div>

            <RosterCounter players={rosterPlayers} />

            {/* Recherche hommes */}
            <div className="space-y-2">
              <p className="font-medium text-sm">Joueurs H <span className="text-muted-foreground font-normal">(min 4)</span></p>
              <PlayerPicker
                pool={availablePlayers.filter((p) => p.gender === 'H')}
                selected={roster.filter((id) => playerMap.get(id)?.gender === 'H')}
                onToggle={(id) => toggleRoster(id)}
                rankingField="ranking_double"
              />
            </div>

            {/* Recherche femmes */}
            <div className="space-y-2">
              <p className="font-medium text-sm">Joueuses F <span className="text-muted-foreground font-normal">(min 4)</span></p>
              <PlayerPicker
                pool={availablePlayers.filter((p) => p.gender === 'F')}
                selected={roster.filter((id) => playerMap.get(id)?.gender === 'F')}
                onToggle={(id) => toggleRoster(id)}
                rankingField="ranking_double"
              />
            </div>

            {!rosterValidation.valid && roster.length > 0 && (
              <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-3 text-xs text-destructive space-y-1">
                {rosterValidation.errors.map((e) => <p key={e}>{e}</p>)}
              </div>
            )}

            <Button
              size="lg" className="w-full"
              onClick={goToLineup}
              disabled={!rosterValidation.valid}
            >
              Définir la compo type →
            </Button>
          </SubStepWrap>
        )}

        {/* ── Sous-étape 3 : compo type ── */}
        {subStep === 'lineup' && currentTeam && (
          <SubStepWrap key="lineup">
            <div className="flex items-center gap-2 mb-4">
              <button type="button" onClick={() => setSubStep('roster')} className="text-primary text-sm">← Effectif</button>
              <span className="font-display text-xl">Compo — {currentTeam}</span>
            </div>

            <div className="space-y-3">
              {SLOT_CONFIG.map((slot) => (
                <SlotRow
                  key={slot.key}
                  slotKey={slot.key as SlotKey}
                  label={slot.label}
                  type={slot.type}
                  gender={slot.gender}
                  lineup={lineup}
                  roster={rosterPlayers}
                  appearances={appearances}
                  onChange={(key, val) => setLineup((l) => ({ ...l, [key]: val }))}
                />
              ))}
            </div>

            {!lineupValidation.valid && (
              <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-3 text-xs text-destructive space-y-1">
                {lineupValidation.errors.map((e) => <p key={e}>{e}</p>)}
              </div>
            )}

            <Button
              size="lg" className="w-full"
              onClick={saveTeamAndContinue}
              disabled={!lineupValidation.valid}
            >
              Valider cette compo ✅
            </Button>
          </SubStepWrap>
        )}

        {/* ── Sous-étape 4 : bilan + proposition d'une autre équipe ── */}
        {subStep === 'done' && (
          <SubStepWrap key="done">
            <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-5 space-y-2">
              <p className="font-display text-xl text-primary">Compo enregistrée ✅</p>
              <p className="text-sm text-muted-foreground">
                {Object.keys(assignments).length} équipe{Object.keys(assignments).length > 1 ? 's' : ''} proposée{Object.keys(assignments).length > 1 ? 's' : ''} : <strong>{Object.keys(assignments).join(', ')}</strong>
              </p>
            </div>

            {/* Résumé des compos */}
            {Object.entries(assignments).map(([code, a]) => (
              <LineupSummary key={code} teamCode={code} assignment={a} playerMap={playerMap} />
            ))}

            <div className="space-y-3 pt-2">
              {eligibleTeams.filter((t) => !assignments[t.code]).length > 0 && (
                <Button variant="outline" size="lg" className="w-full" onClick={() => setSubStep('team-pick')}>
                  + Proposer une autre équipe
                </Button>
              )}
              <Button size="lg" className="w-full" onClick={handleFinish}>
                Terminer Badminton Manager ✅
              </Button>
            </div>
          </SubStepWrap>
        )}
      </AnimatePresence>
    </div>
  )

  function toggleRoster(id: string) {
    setRoster((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }
}

// ── Composants internes ────────────────────────────────────────────────────

function SubStepWrap({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      {children}
    </motion.div>
  )
}

function RosterCounter({ players }: { players: Player[] }) {
  const men   = players.filter((p) => p.gender === 'H').length
  const women = players.filter((p) => p.gender === 'F').length
  return (
    <div className="flex gap-3">
      <div className={cn(
        'flex-1 rounded-xl p-3 text-center border-2',
        men >= 4 ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/40'
      )}>
        <p className={cn('text-2xl font-bold', men >= 4 ? 'text-primary' : 'text-muted-foreground')}>{men}</p>
        <p className="text-xs text-muted-foreground">Hommes {men >= 4 ? '✓' : '/ 4 min'}</p>
      </div>
      <div className={cn(
        'flex-1 rounded-xl p-3 text-center border-2',
        women >= 4 ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/40'
      )}>
        <p className={cn('text-2xl font-bold', women >= 4 ? 'text-primary' : 'text-muted-foreground')}>{women}</p>
        <p className="text-xs text-muted-foreground">Femmes {women >= 4 ? '✓' : '/ 4 min'}</p>
      </div>
    </div>
  )
}

function PlayerPicker({
  pool, selected, onToggle, rankingField,
}: {
  pool: Player[]
  selected: string[]
  onToggle: (id: string) => void
  rankingField: keyof Player
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {pool.map((p) => {
        const isSelected = selected.includes(p.id)
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onToggle(p.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              isSelected
                ? 'border-primary bg-primary text-white'
                : 'border-border bg-white hover:border-primary/50'
            )}
          >
            <span>{p.first_name} {p.last_name}</span>
            {(p[rankingField] as string | null) && (
              <span className={cn('opacity-70', isSelected && 'opacity-90')}>
                · {p[rankingField] as string}
              </span>
            )}
          </button>
        )
      })}
      {pool.length === 0 && (
        <p className="text-xs text-muted-foreground">Aucun joueur disponible.</p>
      )}
    </div>
  )
}

function SlotRow({
  slotKey, label, type, gender, lineup, roster, appearances, onChange,
}: {
  slotKey: SlotKey
  label: string
  type: 'single' | 'double' | 'mixed'
  gender: 'H' | 'F' | 'X'
  lineup: Lineup
  roster: Player[]
  appearances: Map<string, number>
  onChange: (key: SlotKey, val: string | null | [string, string]) => void
}) {
  const genderIcon = gender === 'H' ? '👨' : gender === 'F' ? '👩' : '👫'

  const menPool   = roster.filter((p) => p.gender === 'H')
  const womenPool = roster.filter((p) => p.gender === 'F')

  // Joueur trop utilisé (>= 2 apparitions) => désactivé pour d'autres postes
  const isOverused = (id: string) => (appearances.get(id) ?? 0) >= 2

  function playerSelect(
    pool: Player[],
    currentVal: string | null,
    onSelect: (id: string | null) => void,
    placeholder: string
  ) {
    return (
      <select
        value={currentVal ?? ''}
        onChange={(e) => onSelect(e.target.value || null)}
        className="h-9 flex-1 min-w-0 rounded-xl border-2 bg-white px-2 text-sm focus:border-primary focus:outline-none"
      >
        <option value="">{placeholder}</option>
        {pool.map((p) => {
          const over = isOverused(p.id) && currentVal !== p.id
          return (
            <option key={p.id} value={p.id} disabled={over}>
              {p.first_name} {p.last_name}{over ? ' (max)' : ''}
            </option>
          )
        })}
      </select>
    )
  }

  const currentValue = lineup[slotKey]

  return (
    <div className="flex items-center gap-2">
      <div className="w-20 shrink-0">
        <span className="text-xs font-bold text-primary uppercase tracking-wide">{slotKey}</span>
        <p className="text-[10px] text-muted-foreground">{genderIcon} {label}</p>
      </div>

      {type === 'single' && (
        playerSelect(
          gender === 'H' ? menPool : womenPool,
          currentValue as string | null,
          (id) => onChange(slotKey, id),
          '— Choisir —'
        )
      )}

      {type === 'double' && (
        <div className="flex flex-1 gap-1">
          {playerSelect(
            menPool, (currentValue as [string,string] | null)?.[0] ?? null,
            (id) => onChange(slotKey, id ? [id, (currentValue as [string,string] | null)?.[1] ?? ''] : null),
            '— Joueur 1 —'
          )}
          {playerSelect(
            menPool, (currentValue as [string,string] | null)?.[1] ?? null,
            (id) => onChange(slotKey, id ? [(currentValue as [string,string] | null)?.[0] ?? '', id] : null),
            '— Joueur 2 —'
          )}
        </div>
      )}

      {type === 'mixed' && (
        <div className="flex flex-1 gap-1">
          {playerSelect(
            menPool, (currentValue as [string,string] | null)?.[0] ?? null,
            (id) => onChange(slotKey, id ? [id, (currentValue as [string,string] | null)?.[1] ?? ''] : null),
            '👨 Homme —'
          )}
          {playerSelect(
            womenPool, (currentValue as [string,string] | null)?.[1] ?? null,
            (id) => onChange(slotKey, id ? [(currentValue as [string,string] | null)?.[0] ?? '', id] : null),
            '👩 Femme —'
          )}
        </div>
      )}
    </div>
  )
}

function LineupSummary({
  teamCode, assignment, playerMap,
}: {
  teamCode: string
  assignment: TeamAssignment
  playerMap: Map<string, Player>
}) {
  function name(id: string | null) {
    if (!id) return '—'
    const p = playerMap.get(id)
    return p ? `${p.first_name} ${p.last_name}` : '?'
  }
  const l = assignment.lineup
  return (
    <details className="rounded-2xl border bg-card">
      <summary className="cursor-pointer px-4 py-3 font-semibold hover:bg-muted/40 rounded-2xl text-sm">
        Équipe {teamCode} — {assignment.roster.length} joueurs · Voir la compo
      </summary>
      <div className="border-t px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
        <Row k="SH1" v={name(l.SH1)} />
        <Row k="SH2" v={name(l.SH2)} />
        <Row k="SD1" v={name(l.SD1)} />
        <Row k="SD2" v={name(l.SD2)} />
        <Row k="DH"  v={`${name(l.DH?.[0]??null)} / ${name(l.DH?.[1]??null)}`} />
        <Row k="DD"  v={`${name(l.DD?.[0]??null)} / ${name(l.DD?.[1]??null)}`} />
        <Row k="DMx1" v={`${name(l.DMx1?.[0]??null)} / ${name(l.DMx1?.[1]??null)}`} />
        <Row k="DMx2" v={`${name(l.DMx2?.[0]??null)} / ${name(l.DMx2?.[1]??null)}`} />
      </div>
    </details>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-1">
      <span className="w-10 shrink-0 font-bold text-primary">{k}</span>
      <span className="text-muted-foreground truncate">{v}</span>
    </div>
  )
}
