import { useContext } from 'react'
import { AppContext, type AppContextType } from './AppContextDef'

// Hook to use the context
export function useApp(): AppContextType {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}

// Export individual hooks for convenience
export function useTasks() {
  const { tasks, addTask, toggleTask, getActiveTasks, getCompletedTasks } = useApp()
  return { tasks, addTask, toggleTask, getActiveTasks, getCompletedTasks }
}

export function useSyncPriority() {
  const { syncPriorityId, setSyncPriority, getSyncPriority } = useApp()
  return { syncPriorityId, setSyncPriority, getSyncPriority }
}

export function useMeetings() {
  const { meetings, toggleMeeting } = useApp()
  return { meetings, toggleMeeting }
}

export function useContacts() {
  const { contacts } = useApp()
  return { contacts }
}
