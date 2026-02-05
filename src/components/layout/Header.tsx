import { getGreeting } from '../../lib/utils'
import { useConfig } from '../../hooks/useConfig'

export function Header() {
  const greeting = getGreeting()
  const { config } = useConfig()
  const userName = config.user?.name || 'Friend'

  return (
    <header className="border-b border-surface1 pb-8 mb-10">
      {/* Draggable region for Electron window - acts as title bar */}
      <div 
        className="h-8 -mx-12 -mt-12 mb-4"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />
      
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-overlay1 mb-2">
            Command Center
          </p>
          <h1 className="text-4xl font-display text-text">
            {greeting}, {userName}
          </h1>
        </div>
      </div>
    </header>
  )
}
