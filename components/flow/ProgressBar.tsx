'use client'

import { motion } from 'framer-motion'

type Props = {
  current: number
  total: number
}

export function ProgressBar({ current, total }: Props) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <div className="w-full" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          style={{
            background: 'linear-gradient(90deg, oklch(0.45 0.22 265), oklch(0.62 0.22 265))',
          }}
        />
      </div>
    </div>
  )
}
