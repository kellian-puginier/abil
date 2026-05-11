'use client'

import { cn } from '@/lib/utils'
import type { Player } from '@/lib/supabase/types'

type Props = {
  player: Player
  /** Mode compact : initiales seulement */
  compact?: boolean
  className?: string
  selected?: boolean
  onClick?: () => void
}

export function PlayerCard({ player, compact = false, className, selected, onClick }: Props) {
  const initials = `${player.first_name[0]}${player.last_name[0]}`.toUpperCase()
  const bestRanking = player.ranking_simple || player.ranking_double || player.ranking_mixte

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors',
          selected
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border bg-card hover:border-primary/50',
          className
        )}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          {initials}
        </span>
        <span className="font-medium">{player.first_name} {player.last_name}</span>
        {bestRanking && (
          <span className="ml-auto text-xs text-muted-foreground">{bestRanking}</span>
        )}
      </button>
    )
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-2xl border bg-card p-4',
        onClick && 'cursor-pointer transition-colors hover:border-primary/50',
        selected && 'border-primary ring-1 ring-primary',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
        {initials}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">
          {player.first_name} {player.last_name}
        </p>
        {bestRanking && (
          <p className="text-xs text-muted-foreground">Classement : {bestRanking}</p>
        )}
      </div>
      {player.previous_teams?.length > 0 && (
        <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
          {player.previous_teams.join(', ')}
        </span>
      )}
    </div>
  )
}
