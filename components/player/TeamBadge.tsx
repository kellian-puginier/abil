'use client'

import { cn } from '@/lib/utils'
import type { Team } from '@/lib/supabase/types'

const DAY_LABELS: Record<string, string> = {
  saturday: 'Samedi',
  sunday:   'Dimanche',
  weekday:  'Semaine',
}

type Props = {
  team: Team
  className?: string
  size?: 'sm' | 'md'
}

export function TeamBadge({ team, className, size = 'md' }: Props) {
  const days = team.play_days.map((d) => DAY_LABELS[d] ?? d).join(' / ')

  if (size === 'sm') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary',
          className
        )}
      >
        {team.code}
      </span>
    )
  }

  return (
    <div
      className={cn(
        'inline-flex flex-col rounded-xl border border-primary/30 bg-primary/5 px-3 py-2',
        className
      )}
    >
      <span className="text-sm font-bold text-primary">{team.code}</span>
      <span className="text-xs text-muted-foreground">{team.label}</span>
      <span className="text-xs text-muted-foreground">{days}</span>
    </div>
  )
}
