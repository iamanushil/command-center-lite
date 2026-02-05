import { type ReactNode } from 'react'

type BadgeColor = 'green' | 'blue' | 'mauve' | 'peach' | 'red' | 'yellow' | 'teal' | 'pink' | 'lavender' | 'sky'

interface BadgeProps {
  children: ReactNode
  color?: BadgeColor
  className?: string
}

const colorClasses: Record<BadgeColor, string> = {
  green: 'bg-green/20 text-green',
  blue: 'bg-blue/20 text-blue',
  mauve: 'bg-mauve/20 text-mauve',
  peach: 'bg-peach/20 text-peach',
  red: 'bg-red/20 text-red',
  yellow: 'bg-yellow/20 text-yellow',
  teal: 'bg-teal/20 text-teal',
  pink: 'bg-pink/20 text-pink',
  lavender: 'bg-lavender/20 text-lavender',
  sky: 'bg-sky/20 text-sky',
}

export function Badge({
  children,
  color = 'blue',
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center
        px-2 py-0.5
        rounded-full
        font-mono text-xs
        ${colorClasses[color]}
        ${className}
      `.trim()}
    >
      {children}
    </span>
  )
}
