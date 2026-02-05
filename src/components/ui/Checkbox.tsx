import { type InputHTMLAttributes } from 'react'

type CheckboxColor = 'green' | 'blue' | 'mauve' | 'peach' | 'red' | 'yellow' | 'teal' | 'pink'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  checked: boolean
  onChange: (checked: boolean) => void
  color?: CheckboxColor
}

const colorClasses: Record<CheckboxColor, { border: string; bg: string; check: string }> = {
  green: { border: 'border-green', bg: 'bg-green', check: 'text-base' },
  blue: { border: 'border-blue', bg: 'bg-blue', check: 'text-base' },
  mauve: { border: 'border-mauve', bg: 'bg-mauve', check: 'text-base' },
  peach: { border: 'border-peach', bg: 'bg-peach', check: 'text-base' },
  red: { border: 'border-red', bg: 'bg-red', check: 'text-base' },
  yellow: { border: 'border-yellow', bg: 'bg-yellow', check: 'text-crust' },
  teal: { border: 'border-teal', bg: 'bg-teal', check: 'text-base' },
  pink: { border: 'border-pink', bg: 'bg-pink', check: 'text-base' },
}

export function Checkbox({
  checked,
  onChange,
  color = 'green',
  className = '',
  ...props
}: CheckboxProps) {
  const colors = colorClasses[color]

  return (
    <label className={`relative inline-flex items-center cursor-pointer ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
        {...props}
      />
      <div
        className={`
          w-5 h-5
          rounded
          border-2
          ${colors.border}
          transition-all duration-150 ease-out
          flex items-center justify-center
          peer-checked:${colors.bg}
          peer-focus:ring-2 peer-focus:ring-mauve/50 peer-focus:ring-offset-2 peer-focus:ring-offset-base
          ${checked ? colors.bg : 'bg-transparent'}
        `}
      >
        {checked && (
          <svg
            className={`w-3 h-3 ${colors.check}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </div>
    </label>
  )
}
