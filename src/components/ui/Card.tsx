import { type ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  padding?: string
}

export function Card({
  children,
  className = '',
  padding = 'p-8',
}: CardProps) {
  return (
    <div
      className={`
        bg-surface0
        border border-surface1
        rounded-2xl
        transition-shadow duration-150 ease-out
        ${padding}
        ${className}
      `.trim()}
    >
      {children}
    </div>
  )
}
