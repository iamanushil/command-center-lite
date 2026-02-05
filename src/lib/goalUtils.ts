/**
 * Goal Utility Functions
 * 
 * Provides helper functions for working with goals, time periods,
 * and goal hierarchies.
 */

import type { Goal, GoalLevel, Season, GoalWithHierarchy, TimePeriod } from '../types'

// ============================================
// SEASON DEFINITIONS
// ============================================

export interface SeasonInfo {
  months: number[]
  label: string
  startMonth: number
  endMonth: number
}

export const SEASONS: Record<Season, SeasonInfo> = {
  winter: { months: [1, 2], label: 'Winter', startMonth: 1, endMonth: 2 },
  spring: { months: [3, 4, 5], label: 'Spring', startMonth: 3, endMonth: 5 },
  summer: { months: [6, 7, 8], label: 'Summer', startMonth: 6, endMonth: 8 },
  fall: { months: [9, 10], label: 'Fall', startMonth: 9, endMonth: 10 },
  holidays: { months: [11, 12], label: 'Holidays', startMonth: 11, endMonth: 12 },
}

// Season order for iteration
export const SEASON_ORDER: Season[] = ['winter', 'spring', 'summer', 'fall', 'holidays']

// Level order for hierarchy
export const LEVEL_ORDER: GoalLevel[] = ['annual', 'seasonal', 'monthly', 'weekly']

// ============================================
// SEASON UTILITIES
// ============================================

/**
 * Get season for a given month (1-12)
 */
export function getSeasonForMonth(month: number): Season {
  if (month === 1 || month === 2) return 'winter'
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month === 9 || month === 10) return 'fall'
  return 'holidays' // 11, 12
}

/**
 * Get the months in a season
 */
export function getMonthsInSeason(season: Season): number[] {
  return SEASONS[season].months
}

/**
 * Get display label for a season
 */
export function getSeasonLabel(season: Season): string {
  return SEASONS[season].label
}

// ============================================
// CURRENT TIME PERIOD UTILITIES
// ============================================

/**
 * Get current year
 */
export function getCurrentYear(): number {
  return new Date().getFullYear()
}

/**
 * Get current season based on current month
 */
export function getCurrentSeason(): Season {
  const month = new Date().getMonth() + 1 // 1-12
  return getSeasonForMonth(month)
}

/**
 * Get current month (1-12)
 */
export function getCurrentMonth(): number {
  return new Date().getMonth() + 1
}

/**
 * Get ISO week number for a date
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

/**
 * Get current ISO week number
 */
export function getCurrentWeek(): number {
  return getWeekNumber(new Date())
}

/**
 * Get the year for the ISO week (handles edge cases at year boundaries)
 */
export function getWeekYear(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  return d.getUTCFullYear()
}

// ============================================
// DATE RANGE UTILITIES
// ============================================

/**
 * Get the start and end dates for a given ISO week
 */
export function getWeekDateRange(year: number, week: number): { start: Date; end: Date } {
  // ISO week 1 is the week containing January 4th
  const jan4 = new Date(year, 0, 4)
  const dayOfWeek = jan4.getDay() || 7 // Make Sunday = 7
  
  // Find Monday of week 1
  const week1Monday = new Date(jan4)
  week1Monday.setDate(jan4.getDate() - dayOfWeek + 1)
  
  // Calculate start of target week
  const start = new Date(week1Monday)
  start.setDate(week1Monday.getDate() + (week - 1) * 7)
  
  // End is 6 days after start (Sunday)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  
  return { start, end }
}

/**
 * Get the start and end dates for a given month
 */
export function getMonthDateRange(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0) // Last day of month
  return { start, end }
}

/**
 * Get the start and end dates for a given season
 */
export function getSeasonDateRange(year: number, season: Season): { start: Date; end: Date } {
  const seasonInfo = SEASONS[season]
  const start = new Date(year, seasonInfo.startMonth - 1, 1)
  const end = new Date(year, seasonInfo.endMonth, 0) // Last day of end month
  return { start, end }
}

/**
 * Get the start and end dates for a year
 */
export function getYearDateRange(year: number): { start: Date; end: Date } {
  return {
    start: new Date(year, 0, 1),
    end: new Date(year, 11, 31),
  }
}

// ============================================
// TIME PERIOD FORMATTING
// ============================================

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const MONTH_SHORT_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

/**
 * Format a time period for display based on goal data
 */
export function formatTimePeriod(goal: Goal): string {
  const { level, year, season, month, week } = goal

  switch (level) {
    case 'annual':
      return year ? `${year}` : 'Annual'
    
    case 'seasonal':
      if (season && year) {
        return `${getSeasonLabel(season)} ${year}`
      }
      return season ? getSeasonLabel(season) : 'Seasonal'
    
    case 'monthly':
      if (month && year) {
        return `${MONTH_NAMES[month - 1]} ${year}`
      }
      return month ? MONTH_NAMES[month - 1] : 'Monthly'
    
    case 'weekly':
      if (week && year) {
        const { start, end } = getWeekDateRange(year, week)
        const startStr = `${MONTH_SHORT_NAMES[start.getMonth()]} ${start.getDate()}`
        const endStr = `${MONTH_SHORT_NAMES[end.getMonth()]} ${end.getDate()}`
        return `Week ${week} (${startStr} - ${endStr})`
      }
      return week ? `Week ${week}` : 'Weekly'
    
    default:
      return ''
  }
}

/**
 * Get a short label for a time period
 */
export function formatTimePeriodShort(goal: Goal): string {
  const { level, year, season, month, week } = goal

  switch (level) {
    case 'annual':
      return year ? `${year}` : 'Year'
    case 'seasonal':
      return season ? getSeasonLabel(season).slice(0, 3) : 'Season'
    case 'monthly':
      return month ? MONTH_SHORT_NAMES[month - 1] : 'Month'
    case 'weekly':
      return week ? `W${week}` : 'Week'
    default:
      return ''
  }
}

/**
 * Build a TimePeriod object for a goal
 */
export function buildTimePeriod(goal: Goal): TimePeriod | null {
  const { level, year, season, month, week } = goal
  
  if (!year) return null

  let startDate: Date
  let endDate: Date
  let label: string
  let shortLabel: string
  let isCurrent: boolean

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const currentWeek = getWeekNumber(now)
  const currentSeason = getSeasonForMonth(currentMonth)

  switch (level) {
    case 'annual': {
      const range = getYearDateRange(year)
      startDate = range.start
      endDate = range.end
      label = `${year}`
      shortLabel = `${year}`
      isCurrent = year === currentYear
      break
    }
    
    case 'seasonal': {
      if (!season) return null
      const range = getSeasonDateRange(year, season)
      startDate = range.start
      endDate = range.end
      label = `${getSeasonLabel(season)} ${year}`
      shortLabel = getSeasonLabel(season).slice(0, 3)
      isCurrent = year === currentYear && season === currentSeason
      break
    }
    
    case 'monthly': {
      if (!month) return null
      const range = getMonthDateRange(year, month)
      startDate = range.start
      endDate = range.end
      label = `${MONTH_NAMES[month - 1]} ${year}`
      shortLabel = MONTH_SHORT_NAMES[month - 1]
      isCurrent = year === currentYear && month === currentMonth
      break
    }
    
    case 'weekly': {
      if (!week) return null
      const range = getWeekDateRange(year, week)
      startDate = range.start
      endDate = range.end
      const startStr = `${MONTH_SHORT_NAMES[startDate.getMonth()]} ${startDate.getDate()}`
      const endStr = `${MONTH_SHORT_NAMES[endDate.getMonth()]} ${endDate.getDate()}`
      label = `Week ${week} (${startStr} - ${endStr})`
      shortLabel = `W${week}`
      isCurrent = year === currentYear && week === currentWeek
      break
    }
    
    default:
      return null
  }

  return {
    level,
    year,
    season,
    month,
    week,
    label,
    shortLabel,
    startDate,
    endDate,
    isCurrent,
  }
}

// ============================================
// HIERARCHY UTILITIES
// ============================================

/**
 * Build a hierarchy tree from a flat list of goals
 */
export function buildGoalTree(goals: Goal[]): GoalWithHierarchy[] {
  const goalsById = new Map<string, GoalWithHierarchy>()
  const roots: GoalWithHierarchy[] = []

  // Create nodes with empty children arrays
  for (const goal of goals) {
    goalsById.set(goal.id, { ...goal, children: [], depth: 0 })
  }

  // Build tree structure
  for (const goal of goals) {
    const node = goalsById.get(goal.id)!
    if (goal.parentId && goalsById.has(goal.parentId)) {
      const parent = goalsById.get(goal.parentId)!
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  }

  // Calculate depths
  function setDepths(nodes: GoalWithHierarchy[], depth: number): void {
    for (const node of nodes) {
      node.depth = depth
      setDepths(node.children, depth + 1)
    }
  }
  setDepths(roots, 0)

  return roots
}

/**
 * Flatten a goal tree back to a list (depth-first order)
 */
export function flattenGoalTree(tree: GoalWithHierarchy[]): GoalWithHierarchy[] {
  const result: GoalWithHierarchy[] = []
  
  function traverse(nodes: GoalWithHierarchy[]): void {
    for (const node of nodes) {
      result.push(node)
      traverse(node.children)
    }
  }
  
  traverse(tree)
  return result
}

// ============================================
// PROGRESS UTILITIES
// ============================================

/**
 * Calculate progress from children goals
 */
export function calculateProgressFromChildren(children: Goal[]): number {
  if (children.length === 0) return 0
  
  const totalProgress = children.reduce((sum, child) => sum + (child.progress || 0), 0)
  return Math.round(totalProgress / children.length)
}

/**
 * Calculate progress from linked tasks
 */
export function calculateProgressFromTasks(tasks: { status: string }[]): number {
  if (tasks.length === 0) return 0
  
  const completedTasks = tasks.filter(t => t.status === 'done').length
  return Math.round((completedTasks / tasks.length) * 100)
}

// ============================================
// LEVEL UTILITIES
// ============================================

/**
 * Get the level below the current level
 */
export function getChildLevel(level: GoalLevel): GoalLevel | null {
  const index = LEVEL_ORDER.indexOf(level)
  return index < LEVEL_ORDER.length - 1 ? LEVEL_ORDER[index + 1] : null
}

/**
 * Get the level above the current level
 */
export function getParentLevel(level: GoalLevel): GoalLevel | null {
  const index = LEVEL_ORDER.indexOf(level)
  return index > 0 ? LEVEL_ORDER[index - 1] : null
}

/**
 * Get display name for a goal level
 */
export function getLevelDisplayName(level: GoalLevel): string {
  const names: Record<GoalLevel, string> = {
    annual: 'Annual Goal',
    seasonal: 'Seasonal Goal',
    monthly: 'Monthly Goal',
    weekly: 'Weekly Goal',
  }
  return names[level]
}

/**
 * Get plural display name for a goal level
 */
export function getLevelDisplayNamePlural(level: GoalLevel): string {
  const names: Record<GoalLevel, string> = {
    annual: 'Annual Goals',
    seasonal: 'Seasonal Goals',
    monthly: 'Monthly Goals',
    weekly: 'Weekly Goals',
  }
  return names[level]
}

// ============================================
// SUGGESTED PARENTS
// ============================================

/**
 * Get suggested parent goals for a new goal at a given level
 * Returns goals from the parent level that match the time period
 */
export function getSuggestedParents(level: GoalLevel, goals: Goal[], timePeriod?: {
  year?: number
  season?: Season
  month?: number
  week?: number
}): Goal[] {
  const parentLevel = getParentLevel(level)
  if (!parentLevel) return []

  // Filter to parent level goals that are active
  let candidates = goals.filter(g => g.level === parentLevel && g.status === 'active')

  // If time period is specified, filter by matching time period
  if (timePeriod?.year) {
    candidates = candidates.filter(g => g.year === timePeriod.year)

    // For monthly goals, prefer seasonal parents in the same season
    if (level === 'monthly' && timePeriod.month) {
      const season = getSeasonForMonth(timePeriod.month)
      const seasonalCandidates = candidates.filter(g => g.season === season)
      if (seasonalCandidates.length > 0) {
        candidates = seasonalCandidates
      }
    }

    // For weekly goals, prefer monthly parents in the same month
    if (level === 'weekly' && timePeriod.week) {
      const { start } = getWeekDateRange(timePeriod.year, timePeriod.week)
      const month = start.getMonth() + 1
      const monthlyCandidates = candidates.filter(g => g.month === month)
      if (monthlyCandidates.length > 0) {
        candidates = monthlyCandidates
      }
    }
  }

  return candidates
}

// ============================================
// CURRENT PERIOD DETECTION
// ============================================

/**
 * Check if a goal is in the current time period
 */
export function isCurrentPeriod(goal: Goal): boolean {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const currentWeek = getWeekNumber(now)
  const currentSeason = getSeasonForMonth(currentMonth)

  switch (goal.level) {
    case 'annual':
      return goal.year === currentYear
    
    case 'seasonal':
      return goal.year === currentYear && goal.season === currentSeason
    
    case 'monthly':
      return goal.year === currentYear && goal.month === currentMonth
    
    case 'weekly':
      return goal.year === currentYear && goal.week === currentWeek
    
    default:
      return false
  }
}

/**
 * Check if a goal's time period has passed
 */
export function isPastPeriod(goal: Goal): boolean {
  const now = new Date()
  const timePeriod = buildTimePeriod(goal)
  
  if (!timePeriod) return false
  
  return timePeriod.endDate < now
}

/**
 * Check if a goal's time period is in the future
 */
export function isFuturePeriod(goal: Goal): boolean {
  const now = new Date()
  const timePeriod = buildTimePeriod(goal)
  
  if (!timePeriod) return false
  
  return timePeriod.startDate > now
}

// ============================================
// GOAL CATEGORY UTILITIES
// ============================================

/**
 * Get color for goal category
 */
export function getGoalCategoryColor(category: Goal['category']): string {
  const colors: Record<Goal['category'], string> = {
    home: 'blue',
    personal: 'mauve',
    career: 'green',
    'side-project': 'peach',
  }
  return colors[category]
}

/**
 * Get display name for goal category
 */
export function getGoalCategoryDisplayName(category: Goal['category']): string {
  const names: Record<Goal['category'], string> = {
    home: 'Home',
    personal: 'Personal',
    career: 'Career',
    'side-project': 'Side Project',
  }
  return names[category]
}

// ============================================
// GOAL STATUS UTILITIES
// ============================================

/**
 * Get color for goal status
 */
export function getGoalStatusColor(status: Goal['status']): string {
  const colors: Record<Goal['status'], string> = {
    active: 'blue',
    completed: 'green',
    abandoned: 'overlay1',
  }
  return colors[status]
}

/**
 * Get display name for goal status
 */
export function getGoalStatusDisplayName(status: Goal['status']): string {
  const names: Record<Goal['status'], string> = {
    active: 'Active',
    completed: 'Completed',
    abandoned: 'Abandoned',
  }
  return names[status]
}

// ============================================
// DEFAULT TIME PERIOD FOR NEW GOALS
// ============================================

/**
 * Get default time period values for a new goal at a given level
 */
export function getDefaultTimePeriod(level: GoalLevel): {
  year: number
  season?: Season
  month?: number
  week?: number
} {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const week = getWeekNumber(now)
  const season = getSeasonForMonth(month)

  switch (level) {
    case 'annual':
      return { year }
    case 'seasonal':
      return { year, season }
    case 'monthly':
      return { year, month }
    case 'weekly':
      return { year, week }
  }
}
