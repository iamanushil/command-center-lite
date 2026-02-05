import { type ButtonHTMLAttributes, type ReactNode } from 'react'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  label: string
}

export function IconButton({
  icon,
  label,
  className = '',
  ...props
}: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={`
        p-2
        rounded-lg
        cursor-pointer
        text-subtext1
        hover:text-text
        hover:bg-surface0
        active:bg-surface1
        transition-all duration-150 ease-out
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-mauve/50 focus:ring-offset-2 focus:ring-offset-base
        ${className}
      `.trim()}
      {...props}
    >
      {icon}
    </button>
  )
}
