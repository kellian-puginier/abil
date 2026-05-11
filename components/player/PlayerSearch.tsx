'use client'

import { useState, useMemo, useRef } from 'react'
import type { Player } from '@/lib/supabase/types'
import { Input } from '@/components/ui/input'
import { PlayerCard } from './PlayerCard'

type RankingField = 'ranking_simple' | 'ranking_double' | 'ranking_mixte'

type Props = {
  players: Player[]
  selected: string[]
  onChange: (ids: string[]) => void
  maxSelect?: number
  filterGender?: 'H' | 'F'
  rankingField?: RankingField   // quel classement afficher dans la liste
  placeholder?: string
}

/**
 * Recherche locale + autocomplete parmi les joueurs du club.
 * Réutilisable en V1.1 pour la constitution d'effectifs Badminton Manager.
 */
export function PlayerSearch({
  players,
  selected,
  onChange,
  maxSelect = 3,
  filterGender,
  rankingField,
  placeholder = 'Rechercher un(e) joueur(se)…',
}: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const pool = useMemo(
    () => (filterGender ? players.filter((p) => p.gender === filterGender) : players),
    [players, filterGender]
  )

  const results = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return pool
      .filter((p) => {
        const full = `${p.first_name} ${p.last_name}`.toLowerCase()
        return full.includes(q) && !selected.includes(p.id)
      })
      .slice(0, 8)
  }, [query, pool, selected])

  const selectedPlayers = useMemo(
    () => players.filter((p) => selected.includes(p.id)),
    [players, selected]
  )

  function togglePlayer(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id))
    } else if (selected.length < maxSelect) {
      onChange([...selected, id])
      setQuery('')
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="space-y-2">
      {/* Joueurs déjà sélectionnés */}
      {selectedPlayers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedPlayers.map((p) => (
            <PlayerCard
              key={p.id}
              player={p}
              compact
              selected
              onClick={() => togglePlayer(p.id)}
            />
          ))}
        </div>
      )}

      {/* Champ de recherche */}
      {selected.length < maxSelect && (
        <div className="relative">
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={placeholder}
            aria-label={placeholder}
            className="h-12 text-base"
          />

          {/* Dropdown résultats */}
          {open && results.length > 0 && (
            <div className="absolute z-50 mt-1 w-full rounded-xl border bg-popover shadow-lg">
              {results.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-accent"
                  onMouseDown={() => togglePlayer(p.id)}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {p.first_name[0]}{p.last_name[0]}
                  </span>
                  <span className="font-medium">{p.first_name} {p.last_name}</span>
                  {rankingField && p[rankingField] && (
                    <span className="ml-auto text-muted-foreground">
                      {p[rankingField]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selected.length >= maxSelect && (
        <p className="text-xs text-muted-foreground">
          Maximum {maxSelect} partenaire{maxSelect > 1 ? 's' : ''} sélectionné{maxSelect > 1 ? 's' : ''}.
        </p>
      )}
    </div>
  )
}
