'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
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

// ── Utilitaires classement ─────────────────────────────────────────────────

/** Extrait un ordre numérique depuis un code classement FFBAD (N1=1, R4=4, NC=99). */
function rankOrder(r: string | null | undefined): number {
  if (!r) return 100
  const up = r.toUpperCase().trim()
  if (up === 'NC') return 99
  const n = parseInt(up.replace(/[^0-9]/g, ''), 10)
  return isNaN(n) ? 100 : n
}

/** Meilleur classement parmi les 3 tableaux. */
function bestRank(p: Player): number {
  return Math.min(rankOrder(p.ranking_simple), rankOrder(p.ranking_double), rankOrder(p.ranking_mixte))
}

/** Affiche les 3 classements sous forme N3/R5/R5. */
function rankLabel(p: Player): string {
  const s = p.ranking_simple ?? 'NC'
  const d = p.ranking_double ?? 'NC'
  const m = p.ranking_mixte  ?? 'NC'
  return `${s}/${d}/${m}`
}

/** Trie les joueurs par meilleur classement décroissant (N1 en premier). */
function sortByRank(players: Player[]): Player[] {
  return [...players].sort((a, b) => bestRank(a) - bestRank(b))
}

type BmSubStep = 'team-pick' | 'roster' | 'lineup' | 'done'

export function BadmintonManagerStep() {
  const router = useRouter()
  const store  = useQuestionnaireStore()

  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [allTeams,   setAllTeams]   = useState<Team[]>([])
  const [loading,    setLoading]    = useState(true)

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

  const playerLevel    = store.player ? getPlayerLevel(store.player) : 'departemental'
  const allowedByLevel = new Set(getBmAllowedTeams(playerLevel))

  const preferredCodes = store.preferredTeams.includes('any')
    ? allTeams.map((t) => t.code)
    : store.preferredTeams

  // Équipes que le joueur veut faire + accessibles selon son niveau
  const myTeams = allTeams.filter(
    (t) => preferredCodes.includes(t.code) && allowedByLevel.has(t.code as TeamCode)
  )
  // Autres équipes accessibles selon son niveau mais non cochées à l'écran 9
  const otherTeams = allTeams.filter(
    (t) => !preferredCodes.includes(t.code) && allowedByLevel.has(t.code as TeamCode)
  )
  // Union pour les vérifications (ex: équipes déjà faites)
  const eligibleTeams = [...myTeams, ...otherTeams]

  const alreadyAssigned  = getAssignedPlayerIds(assignments)
  const availablePlayers = getAvailablePlayersForTeam(allPlayers, alreadyAssigned, (currentTeam ?? 'D6') as TeamCode)

  const playerMap    = useMemo(() => new Map(allPlayers.map((p) => [p.id, p])), [allPlayers])
  const rosterPlayers = roster.map((id) => playerMap.get(id)).filter(Boolean) as Player[]

  const rosterValidation = currentTeam
    ? validateRoster(rosterPlayers, currentTeam as TeamCode)
    : { valid: false, errors: [] }

  const lineupValidation = validateLineup(lineup, playerMap)
  const appearances      = countAppearances(lineup)

  // ── Navigation interne ──────────────────────────────────────────────────
  function pickTeam(code: string) {
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

  function saveTeamAndContinue() {
    if (!currentTeam) return
    setAssignments((prev) => ({
      ...prev,
      [currentTeam]: { roster, lineup, substitutes: [] },
    }))
    setCurrentTeam(null)
    setSubStep('done')
  }

  async function handleFinish() {
    const finalAssignments = currentTeam
      ? { ...assignments, [currentTeam]: { roster, lineup, substitutes: [] } }
      : assignments
    store.patchResponse({ bmAssignments: finalAssignments, didBm: true } as any)
    store.setCurrentStep(10)
    const supabase = createClient()
    await supabase.from('responses').upsert(
      { ...buildUpsertPayload({ ...store, bmAssignments: finalAssignments, didBm: true }), current_step: 10 },
      { onConflict: 'player_id' }
    )
    router.push(`/flow/${getNextStep('badminton-manager', store) ?? 'calendar'}`)
  }

  async function handleSkip() {
    store.setCurrentStep(10)
    const supabase = createClient()
    await supabase.from('responses').upsert(
      { ...buildUpsertPayload(store), current_step: 10 },
      { onConflict: 'player_id' }
    )
    router.push(`/flow/${getNextStep('badminton-manager', store) ?? 'calendar'}`)
  }

  function toggleRoster(id: string) {
    setRoster((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
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
            <p className="text-xs text-muted-foreground">
              Niveau : <strong>{playerLevel === 'regional_plus' ? 'Régional+' : 'Départemental'}</strong>
            </p>

            {myTeams.length === 0 && otherTeams.length === 0 && (
              <p className="text-sm text-muted-foreground rounded-xl border bg-muted/50 p-4">
                Aucune équipe accessible selon ton niveau.
              </p>
            )}

            {/* Mes équipes (préférences écran 9) */}
            {myTeams.length > 0 && (
              <div className="space-y-2">
                {myTeams.map((t) => <TeamButton key={t.code} team={t} done={!!assignments[t.code]} onPick={pickTeam} />)}
              </div>
            )}

            {/* Autres équipes du club accessibles selon le niveau */}
            {otherTeams.length > 0 && (
              <div className="space-y-2">
                <div className="rounded-xl bg-secondary/30 border border-secondary/50 px-3 py-2">
                  <p className="text-xs font-semibold text-secondary-foreground">
                    Tu peux aussi proposer des compos pour d'autres équipes du club 👇
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Ce n'est pas obligatoire, mais c'est utile pour le staff !
                  </p>
                </div>
                {otherTeams.map((t) => <TeamButton key={t.code} team={t} done={!!assignments[t.code]} onPick={pickTeam} secondary />)}
              </div>
            )}

            {Object.keys(assignments).length > 0 && (
              <Button size="lg" className="w-full" onClick={handleFinish}>
                Terminer Badminton Manager ✅
              </Button>
            )}
            <button type="button" onClick={handleSkip}
              className="w-full text-sm text-muted-foreground underline underline-offset-4">
              Passer cette étape
            </button>
          </SubStepWrap>
        )}

        {/* ── Sous-étape 2 : constitution de l'effectif ── */}
        {subStep === 'roster' && currentTeam && (
          <SubStepWrap key="roster">
            <div className="flex items-center gap-2 mb-1">
              <button type="button" onClick={() => setSubStep('team-pick')} className="text-primary text-sm">← Retour</button>
              <span className="font-display text-xl">Effectif — {currentTeam}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Coche les joueurs. Classement affiché : Simple/Double/Mixte.
            </p>

            <RosterCounter players={rosterPlayers} />

            <div className="space-y-2">
              <p className="font-medium text-sm">Joueurs <span className="text-muted-foreground font-normal">(H, min 4)</span></p>
              <RosterSearch
                pool={sortByRank(availablePlayers.filter((p) => p.gender === 'H'))}
                selected={roster}
                onToggle={toggleRoster}
              />
            </div>

            <div className="space-y-2">
              <p className="font-medium text-sm">Joueuses <span className="text-muted-foreground font-normal">(F, min 4)</span></p>
              <RosterSearch
                pool={sortByRank(availablePlayers.filter((p) => p.gender === 'F'))}
                selected={roster}
                onToggle={toggleRoster}
              />
            </div>

            {!rosterValidation.valid && roster.length > 0 && (
              <ul className="rounded-xl bg-destructive/5 border border-destructive/20 p-3 text-xs text-destructive space-y-1">
                {rosterValidation.errors.map((e) => <li key={e}>{e}</li>)}
              </ul>
            )}

            <Button size="lg" className="w-full" onClick={() => setSubStep('lineup')}
              disabled={!rosterValidation.valid}>
              Définir la compo type →
            </Button>
          </SubStepWrap>
        )}

        {/* ── Sous-étape 3 : compo type ── */}
        {subStep === 'lineup' && currentTeam && (
          <SubStepWrap key="lineup">
            <div className="flex items-center gap-2 mb-1">
              <button type="button" onClick={() => setSubStep('roster')} className="text-primary text-sm">← Effectif</button>
              <span className="font-display text-xl">Compo — {currentTeam}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Classement : Simple/Double/Mixte. Un joueur max 2× dans la compo.
            </p>

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
              <ul className="rounded-xl bg-destructive/5 border border-destructive/20 p-3 text-xs text-destructive space-y-1">
                {lineupValidation.errors.map((e) => <li key={e}>{e}</li>)}
              </ul>
            )}

            <Button size="lg" className="w-full"
              onClick={saveTeamAndContinue} disabled={!lineupValidation.valid}>
              Valider cette compo ✅
            </Button>
          </SubStepWrap>
        )}

        {/* ── Sous-étape 4 : bilan ── */}
        {subStep === 'done' && (
          <SubStepWrap key="done">
            <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4 space-y-1">
              <p className="font-display text-xl text-primary">Compo enregistrée ✅</p>
              <p className="text-sm text-muted-foreground">
                {Object.keys(assignments).length} équipe{Object.keys(assignments).length > 1 ? 's' : ''} proposée{Object.keys(assignments).length > 1 ? 's' : ''} :{' '}
                <strong>{Object.keys(assignments).join(', ')}</strong>
              </p>
            </div>

            {Object.entries(assignments).map(([code, a]) => (
              <LineupSummary key={code} teamCode={code} assignment={a} playerMap={playerMap} />
            ))}

            <div className="space-y-3 pt-2">
              {[...myTeams, ...otherTeams].filter((t) => !assignments[t.code]).length > 0 && (
                <Button variant="outline" size="lg" className="w-full"
                  onClick={() => setSubStep('team-pick')}>
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
}

// ── Composants internes ────────────────────────────────────────────────────

function TeamButton({ team, done, onPick, secondary }: {
  team: Team
  done: boolean
  onPick: (code: string) => void
  secondary?: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(team.code)}
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-colors',
        done
          ? 'border-primary/40 bg-primary/5'
          : secondary
          ? 'border-border/60 bg-muted/30 hover:border-primary/40'
          : 'border-border bg-card hover:border-primary/40'
      )}
    >
      <span className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold',
        done ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
      )}>
        {team.code}
      </span>
      <div className="flex-1">
        <p className="font-medium">{team.label}</p>
        <p className="text-xs text-muted-foreground">
          {team.play_days.map((d: string) =>
            d === 'saturday' ? 'Samedi' : d === 'sunday' ? 'Dimanche' : 'Semaine'
          ).join(' / ')}
        </p>
      </div>
      {done
        ? <span className="text-xs font-semibold text-primary">✓ Compo faite</span>
        : secondary && <span className="text-xs text-muted-foreground">Optionnel</span>
      }
    </button>
  )
}

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
      {[{ label: 'Hommes', count: men }, { label: 'Femmes', count: women }].map(({ label, count }) => (
        <div key={label} className={cn(
          'flex-1 rounded-xl p-3 text-center border-2',
          count >= 4 ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/40'
        )}>
          <p className={cn('text-2xl font-bold', count >= 4 ? 'text-primary' : 'text-muted-foreground')}>{count}</p>
          <p className="text-xs text-muted-foreground">{label} {count >= 4 ? '✓' : '/ 4 min'}</p>
        </div>
      ))}
    </div>
  )
}

/** Recherche + sélection des joueurs de l'effectif avec menu déroulant. */
function RosterSearch({ pool, selected, onToggle }: {
  pool: Player[]
  selected: string[]
  onToggle: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const [open,  setOpen]  = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selectedInPool = pool.filter((p) => selected.includes(p.id))

  const results = useMemo(() => {
    if (!query.trim()) return pool.slice(0, 12)
    const q = query.toLowerCase()
    return pool.filter((p) =>
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(q)
    ).slice(0, 12)
  }, [query, pool])

  return (
    <div ref={ref} className="space-y-2">
      {/* Chips des joueurs sélectionnés */}
      {selectedInPool.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedInPool.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onToggle(p.id)}
              className="flex items-center gap-1 rounded-full bg-primary pl-2.5 pr-2 py-1 text-xs font-medium text-white"
            >
              {p.first_name} {p.last_name}
              <span className="opacity-70">· {rankLabel(p)}</span>
              <span className="ml-1 opacity-80">✕</span>
            </button>
          ))}
        </div>
      )}

      {/* Champ de recherche */}
      <div className="relative">
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Rechercher et ajouter un joueur…"
          className="h-10 w-full rounded-xl border-2 bg-white px-3 text-sm focus:border-primary focus:outline-none placeholder:text-muted-foreground/60"
        />

        {open && results.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-xl border bg-white shadow-lg max-h-52 overflow-auto">
            {results.map((p) => {
              const isSel = selected.includes(p.id)
              return (
                <button
                  key={p.id}
                  type="button"
                  onMouseDown={() => { onToggle(p.id); setQuery('') }}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted/50',
                    isSel && 'bg-primary/5'
                  )}
                >
                  {isSel
                    ? <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] text-white">✓</span>
                    : <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] text-muted-foreground" />
                  }
                  <span className="font-medium">{p.first_name} {p.last_name}</span>
                  <span className="ml-auto text-xs text-muted-foreground shrink-0">{rankLabel(p)}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function SlotRow({ slotKey, label, type, gender, lineup, roster, appearances, onChange }: {
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

  // Pool selon le genre requis du poste
  const menPool   = sortByRank(roster.filter((p) => p.gender === 'H'))
  const womenPool = sortByRank(roster.filter((p) => p.gender === 'F'))

  const isOverused = (id: string, currentInSlot: boolean) =>
    !currentInSlot && (appearances.get(id) ?? 0) >= 2

  function makeSelect(
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
          const over = isOverused(p.id, currentVal === p.id)
          return (
            <option key={p.id} value={p.id} disabled={over}>
              {p.first_name} {p.last_name} · {rankLabel(p)}{over ? ' (max)' : ''}
            </option>
          )
        })}
      </select>
    )
  }

  const val = lineup[slotKey]

  return (
    <div className="flex items-center gap-2">
      <div className="w-[4.5rem] shrink-0">
        <span className="text-xs font-bold text-primary uppercase tracking-wide">{slotKey}</span>
        <p className="text-[10px] text-muted-foreground leading-tight">{genderIcon} {label}</p>
      </div>

      {/* Simple : 1 select du bon genre */}
      {type === 'single' && makeSelect(
        gender === 'H' ? menPool : womenPool,
        val as string | null,
        (id) => onChange(slotKey, id),
        '— Choisir —'
      )}

      {/* Double homme ou double dame : 2 selects du même genre */}
      {type === 'double' && (
        <div className="flex flex-1 gap-1">
          {makeSelect(
            gender === 'H' ? menPool : womenPool,   // ← correction bug DD
            (val as [string,string] | null)?.[0] ?? null,
            (id) => onChange(slotKey, id ? [id, (val as [string,string] | null)?.[1] ?? ''] : null),
            '— J1 —'
          )}
          {makeSelect(
            gender === 'H' ? menPool : womenPool,   // ← correction bug DD
            (val as [string,string] | null)?.[1] ?? null,
            (id) => onChange(slotKey, id ? [(val as [string,string] | null)?.[0] ?? '', id] : null),
            '— J2 —'
          )}
        </div>
      )}

      {/* Mixte : 1H + 1F */}
      {type === 'mixed' && (
        <div className="flex flex-1 gap-1">
          {makeSelect(
            menPool,
            (val as [string,string] | null)?.[0] ?? null,
            (id) => onChange(slotKey, id ? [id, (val as [string,string] | null)?.[1] ?? ''] : null),
            '👨 H —'
          )}
          {makeSelect(
            womenPool,
            (val as [string,string] | null)?.[1] ?? null,
            (id) => onChange(slotKey, id ? [(val as [string,string] | null)?.[0] ?? '', id] : null),
            '👩 F —'
          )}
        </div>
      )}
    </div>
  )
}

function LineupSummary({ teamCode, assignment, playerMap }: {
  teamCode: string
  assignment: TeamAssignment
  playerMap: Map<string, Player>
}) {
  function name(id: string | null | undefined) {
    if (!id) return '—'
    const p = playerMap.get(id)
    return p ? `${p.first_name} ${p.last_name}` : '?'
  }
  const l = assignment.lineup
  const rows = [
    ['SH1', name(l.SH1)],
    ['SH2', name(l.SH2)],
    ['SD1', name(l.SD1)],
    ['SD2', name(l.SD2)],
    ['DH',  `${name(l.DH?.[0])} / ${name(l.DH?.[1])}`],
    ['DD',  `${name(l.DD?.[0])} / ${name(l.DD?.[1])}`],
    ['DMx1',`${name(l.DMx1?.[0])} / ${name(l.DMx1?.[1])}`],
    ['DMx2',`${name(l.DMx2?.[0])} / ${name(l.DMx2?.[1])}`],
  ]
  return (
    <details className="rounded-2xl border bg-card">
      <summary className="cursor-pointer px-4 py-3 font-semibold hover:bg-muted/40 rounded-2xl text-sm">
        Équipe {teamCode} — {assignment.roster.length} joueurs · Voir la compo
      </summary>
      <div className="border-t px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-1">
            <span className="w-10 shrink-0 font-bold text-primary">{k}</span>
            <span className="text-muted-foreground truncate">{v}</span>
          </div>
        ))}
      </div>
    </details>
  )
}
