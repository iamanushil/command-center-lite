import type { TaskCategory } from '../types'

/**
 * Get the color hex value for a task category
 */
export function getCategoryColor(category: TaskCategory): string {
  const colors: Record<TaskCategory, string> = {
    work: '#a6e3a1',        // green
    home: '#89b4fa',        // blue
    personal: '#cba6f7',    // mauve
    'side-project': '#fab387', // peach
  }
  return colors[category]
}

/**
 * Get the Tailwind color name for a task category badge
 */
export function getCategoryBadgeColor(category: TaskCategory): 'green' | 'blue' | 'mauve' | 'peach' {
  const colors: Record<TaskCategory, 'green' | 'blue' | 'mauve' | 'peach'> = {
    work: 'green',
    home: 'blue',
    personal: 'mauve',
    'side-project': 'peach',
  }
  return colors[category]
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Get greeting based on time of day
 */
export function getGreeting(): string {
  const hour = new Date().getHours()
  
  if (hour < 12) {
    return 'Good morning'
  } else if (hour < 17) {
    return 'Good afternoon'
  } else {
    return 'Good evening'
  }
}

/**
 * Format a date for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Get the number of days until a date
 */
export function getDaysUntil(dateString: string): number {
  const date = new Date(dateString)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)
  
  const diffTime = date.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}
