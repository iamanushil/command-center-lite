import { useContext, useMemo } from 'react'
import type { Goal } from '../types'
import { GoalsContext } from '../lib/GoalsContext'

/**
 * Hook to access goals context
 * Must be used within GoalsProvider
 */
export function useGoals() {
  const context = useContext(GoalsContext)
  if (!context) {
    throw new Error('useGoals must be used within GoalsProvider')
  }
  return context
}

/**
 * Hook to access a specific goal and its children
 */
export function useGoal(goalId: string | null | undefined) {
  const { getGoalById, getChildGoals } = useGoals()
  
  return useMemo(() => {
    if (!goalId) {
      return { goal: undefined, children: [] }
    }
    
    const goal = getGoalById(goalId)
    const children = goal ? getChildGoals(goalId) : []
    
    return { goal, children }
  }, [goalId, getGoalById, getChildGoals])
}

/**
 * Hook to get current week's goals
 */
export function useCurrentWeekGoals(): Goal[] {
  const { currentWeekGoals } = useGoals()
  return currentWeekGoals
}

/**
 * Hook to get goals by category
 */
export function useGoalsByCategory(category: Goal['category']) {
  const { getGoalsByCategory } = useGoals()
  return useMemo(() => getGoalsByCategory(category), [category, getGoalsByCategory])
}

/**
 * Hook to get goals by level
 */
export function useGoalsByLevel(level: Goal['level']) {
  const { getGoalsByLevel } = useGoals()
  return useMemo(() => getGoalsByLevel(level), [level, getGoalsByLevel])
}
