import { useContext } from 'react'
import { InboxContext } from '../lib/InboxContext'

/**
 * Hook to access inbox context
 * Must be used within InboxProvider
 */
export function useInbox() {
  const context = useContext(InboxContext)
  if (!context) {
    throw new Error('useInbox must be used within InboxProvider')
  }
  return context
}

/**
 * Hook to access a specific inbox item by ID
 */
export function useInboxItem(id: string | null | undefined) {
  const { getItemById } = useInbox()
  
  if (!id) return undefined
  return getItemById(id)
}

/**
 * Hook to get inbox count
 */
export function useInboxCount() {
  const { inboxCount } = useInbox()
  return inboxCount
}

/**
 * Hook to get pending items count
 */
export function usePendingCount() {
  const { pendingCount } = useInbox()
  return pendingCount
}

/**
 * Hook to get urgent items count (older than 24h)
 */
export function useUrgentCount() {
  const { urgentCount } = useInbox()
  return urgentCount
}

/**
 * Hook to get inbox stats
 */
export function useInboxStats() {
  const { stats } = useInbox()
  return stats
}

/**
 * Hook to get deferred items
 */
export function useDeferredItems() {
  const { deferredItems } = useInbox()
  return deferredItems
}

/**
 * Hook for triage actions
 */
export function useTriageActions() {
  const {
    routeToTask,
    routeToGoal,
    markDone,
    dismiss,
    defer,
    bulkMarkDone,
    bulkDismiss,
  } = useInbox()

  return {
    routeToTask,
    routeToGoal,
    markDone,
    dismiss,
    defer,
    bulkMarkDone,
    bulkDismiss,
  }
}
