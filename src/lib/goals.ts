/**
 * Typed goals database access for the React frontend
 * 
 * This module provides type-safe access to the goals table via Electron IPC.
 * When running in a browser (without Electron), these functions return empty data.
 */

import { isElectron } from './electron'
import type { 
  Task, 
  Goal, 
  GoalCategory, 
  GoalLevel, 
  GoalStatus, 
  Season,
  CreateGoalInput,
  UpdateGoalInput,
  GoalFilters,
} from '../types'

// Re-export types for convenience
export type { Goal, GoalCategory, GoalLevel, GoalStatus, Season, CreateGoalInput, UpdateGoalInput, GoalFilters }

// Goals API type definition
interface GoalsAPI {
  create: (goal: CreateGoalInput) => Promise<Goal>
  getById: (id: string) => Promise<Goal | null>
  update: (id: string, updates: UpdateGoalInput) => Promise<Goal | null>
  delete: (id: string) => Promise<boolean>
  getAll: () => Promise<Goal[]>
  getByLevel: (level: GoalLevel, filters?: GoalFilters) => Promise<Goal[]>
  getActive: () => Promise<Goal[]>
  getChildren: (parentId: string) => Promise<Goal[]>
  getAncestors: (id: string) => Promise<Goal[]>
  getDescendants: (id: string) => Promise<Goal[]>
  getForYear: (year: number) => Promise<Goal[]>
  getForSeason: (year: number, season: Season) => Promise<Goal[]>
  getForMonth: (year: number, month: number) => Promise<Goal[]>
  getForWeek: (year: number, week: number) => Promise<Goal[]>
  getCurrentWeek: () => Promise<Goal[]>
  linkTask: (goalId: string, taskId: string) => Promise<boolean>
  unlinkTask: (goalId: string, taskId: string) => Promise<boolean>
  getTasksForGoal: (goalId: string) => Promise<Task[]>
  getGoalsForTask: (taskId: string) => Promise<Goal[]>
  calculateProgress: (goalId: string) => Promise<number>
  updateProgress: (goalId: string, progress?: number) => Promise<Goal | null>
  recalculateProgressChain: (goalId: string) => Promise<Goal | null>
}

// Helper to get the goals API
function getGoalsApi(): GoalsAPI | null {
  if (!isElectron() || !window.electronAPI?.db?.goals) {
    return null
  }
  return window.electronAPI.db.goals as GoalsAPI
}

// ============================================
// AVAILABILITY
// ============================================

/**
 * Check if goals database is available
 */
export function isGoalsAvailable(): boolean {
  return isElectron() && window.electronAPI?.db?.goals !== undefined
}

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Create a new goal
 */
export async function createGoal(goal: CreateGoalInput): Promise<Goal | null> {
  const api = getGoalsApi()
  if (!api) {
    console.warn('Goals database is only available in Electron mode')
    return null
  }

  try {
    return await api.create(goal)
  } catch (error) {
    console.error('Error creating goal:', error)
    throw error
  }
}

/**
 * Get a goal by ID
 */
export async function getGoalById(id: string): Promise<Goal | null> {
  const api = getGoalsApi()
  if (!api) return null

  try {
    return await api.getById(id)
  } catch (error) {
    console.error('Error getting goal:', error)
    throw error
  }
}

/**
 * Update a goal
 */
export async function updateGoal(id: string, updates: UpdateGoalInput): Promise<Goal | null> {
  const api = getGoalsApi()
  if (!api) return null

  try {
    return await api.update(id, updates)
  } catch (error) {
    console.error('Error updating goal:', error)
    throw error
  }
}

/**
 * Delete a goal
 */
export async function deleteGoal(id: string): Promise<boolean> {
  const api = getGoalsApi()
  if (!api) return false

  try {
    return await api.delete(id)
  } catch (error) {
    console.error('Error deleting goal:', error)
    throw error
  }
}

/**
 * Get all goals
 */
export async function getAllGoals(): Promise<Goal[]> {
  const api = getGoalsApi()
  if (!api) return []

  try {
    return await api.getAll()
  } catch (error) {
    console.error('Error getting all goals:', error)
    throw error
  }
}

/**
 * Get goals by level with optional filters
 */
export async function getGoalsByLevel(level: GoalLevel, filters?: GoalFilters): Promise<Goal[]> {
  const api = getGoalsApi()
  if (!api) return []

  try {
    return await api.getByLevel(level, filters)
  } catch (error) {
    console.error('Error getting goals by level:', error)
    throw error
  }
}

/**
 * Get all active goals
 */
export async function getActiveGoals(): Promise<Goal[]> {
  const api = getGoalsApi()
  if (!api) return []

  try {
    return await api.getActive()
  } catch (error) {
    console.error('Error getting active goals:', error)
    throw error
  }
}

// ============================================
// HIERARCHY OPERATIONS
// ============================================

/**
 * Get direct children of a goal
 */
export async function getChildGoals(parentId: string): Promise<Goal[]> {
  const api = getGoalsApi()
  if (!api) return []

  try {
    return await api.getChildren(parentId)
  } catch (error) {
    console.error('Error getting child goals:', error)
    throw error
  }
}

/**
 * Get all ancestors of a goal (parent chain up to root)
 */
export async function getGoalAncestors(id: string): Promise<Goal[]> {
  const api = getGoalsApi()
  if (!api) return []

  try {
    return await api.getAncestors(id)
  } catch (error) {
    console.error('Error getting goal ancestors:', error)
    throw error
  }
}

/**
 * Get all descendants of a goal (all children recursively)
 */
export async function getGoalDescendants(id: string): Promise<Goal[]> {
  const api = getGoalsApi()
  if (!api) return []

  try {
    return await api.getDescendants(id)
  } catch (error) {
    console.error('Error getting goal descendants:', error)
    throw error
  }
}

// ============================================
// TIME-BASED QUERIES
// ============================================

/**
 * Get all goals for a specific year
 */
export async function getGoalsForYear(year: number): Promise<Goal[]> {
  const api = getGoalsApi()
  if (!api) return []

  try {
    return await api.getForYear(year)
  } catch (error) {
    console.error('Error getting goals for year:', error)
    throw error
  }
}

/**
 * Get goals for a specific season
 */
export async function getGoalsForSeason(year: number, season: Season): Promise<Goal[]> {
  const api = getGoalsApi()
  if (!api) return []

  try {
    return await api.getForSeason(year, season)
  } catch (error) {
    console.error('Error getting goals for season:', error)
    throw error
  }
}

/**
 * Get goals for a specific month
 */
export async function getGoalsForMonth(year: number, month: number): Promise<Goal[]> {
  const api = getGoalsApi()
  if (!api) return []

  try {
    return await api.getForMonth(year, month)
  } catch (error) {
    console.error('Error getting goals for month:', error)
    throw error
  }
}

/**
 * Get goals for a specific week
 */
export async function getGoalsForWeek(year: number, week: number): Promise<Goal[]> {
  const api = getGoalsApi()
  if (!api) return []

  try {
    return await api.getForWeek(year, week)
  } catch (error) {
    console.error('Error getting goals for week:', error)
    throw error
  }
}

/**
 * Get current week's goals
 */
export async function getCurrentWeekGoals(): Promise<Goal[]> {
  const api = getGoalsApi()
  if (!api) return []

  try {
    return await api.getCurrentWeek()
  } catch (error) {
    console.error('Error getting current week goals:', error)
    throw error
  }
}

// ============================================
// GOAL-TASK LINKING
// ============================================

/**
 * Link a goal to a task
 */
export async function linkGoalToTask(goalId: string, taskId: string): Promise<boolean> {
  const api = getGoalsApi()
  if (!api) return false

  try {
    return await api.linkTask(goalId, taskId)
  } catch (error) {
    console.error('Error linking goal to task:', error)
    throw error
  }
}

/**
 * Unlink a goal from a task
 */
export async function unlinkGoalFromTask(goalId: string, taskId: string): Promise<boolean> {
  const api = getGoalsApi()
  if (!api) return false

  try {
    return await api.unlinkTask(goalId, taskId)
  } catch (error) {
    console.error('Error unlinking goal from task:', error)
    throw error
  }
}

/**
 * Get all tasks linked to a goal
 */
export async function getTasksForGoal(goalId: string): Promise<Task[]> {
  const api = getGoalsApi()
  if (!api) return []

  try {
    return await api.getTasksForGoal(goalId)
  } catch (error) {
    console.error('Error getting tasks for goal:', error)
    throw error
  }
}

/**
 * Get all goals linked to a task
 */
export async function getGoalsForTask(taskId: string): Promise<Goal[]> {
  const api = getGoalsApi()
  if (!api) return []

  try {
    return await api.getGoalsForTask(taskId)
  } catch (error) {
    console.error('Error getting goals for task:', error)
    throw error
  }
}

// ============================================
// PROGRESS OPERATIONS
// ============================================

/**
 * Calculate goal progress based on children or linked tasks
 */
export async function calculateGoalProgress(goalId: string): Promise<number> {
  const api = getGoalsApi()
  if (!api) return 0

  try {
    return await api.calculateProgress(goalId)
  } catch (error) {
    console.error('Error calculating goal progress:', error)
    throw error
  }
}

/**
 * Update goal progress (manual or calculated)
 */
export async function updateGoalProgress(goalId: string, progress?: number): Promise<Goal | null> {
  const api = getGoalsApi()
  if (!api) return null

  try {
    return await api.updateProgress(goalId, progress)
  } catch (error) {
    console.error('Error updating goal progress:', error)
    throw error
  }
}

/**
 * Recalculate progress for a goal and all its ancestors
 */
export async function recalculateGoalProgressChain(goalId: string): Promise<Goal | null> {
  const api = getGoalsApi()
  if (!api) return null

  try {
    return await api.recalculateProgressChain(goalId)
  } catch (error) {
    console.error('Error recalculating goal progress chain:', error)
    throw error
  }
}

// Re-export utilities from goalUtils for convenience
export {
  getCurrentYear,
  getCurrentSeason,
  getCurrentMonth,
  getCurrentWeek,
  getWeekNumber,
  getWeekDateRange,
  getSeasonForMonth,
  formatTimePeriod,
  formatTimePeriodShort,
  buildGoalTree,
  getChildLevel,
  getParentLevel,
  getLevelDisplayName,
  getGoalCategoryColor,
  getGoalStatusColor,
  isCurrentPeriod,
  getSuggestedParents,
  getDefaultTimePeriod,
  SEASONS,
  SEASON_ORDER,
  LEVEL_ORDER,
} from './goalUtils'
