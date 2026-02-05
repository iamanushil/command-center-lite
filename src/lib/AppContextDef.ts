import { createContext } from 'react'
import type { Task, Meeting, DailyLog, TaskCategory, TaskStatus } from '../types'
// State shape
interface AppState {
  tasks: Task[]
  meetings: Meeting[]
  dailyLog: DailyLog | null
  syncPriorityId: string | null
  isLoading: boolean
}

// Actions
interface AppActions {
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => void
  toggleTask: (id: string) => void
  setTaskStatus: (id: string, status: TaskStatus) => void
  updateTaskTitle: (id: string, title: string) => void
  updateTaskNotes: (id: string, notes: string) => void
  updateTaskLink: (id: string, link: string) => void
  updateTaskDueDate: (id: string, dueDate: string | undefined) => void
  deleteTask: (id: string) => void
  reorderTasks: (taskIds: string[]) => Promise<void>
  setSyncPriority: (taskId: string | null) => void
  addMeeting: (meetingData: Omit<Meeting, 'id' | 'done'>) => Promise<void>
  toggleMeeting: (id: string) => void
  updateMeeting: (id: string, updates: Partial<Pick<Meeting, 'date' | 'time' | 'title' | 'category' | 'notes' | 'link'>>) => Promise<void>
  updateMeetingNotes: (id: string, notes: string) => void
  deleteMeeting: (id: string) => Promise<void>
  getMeetingsByDate: (date: string) => Promise<Meeting[]>
  updateDailyLog: (updates: Partial<DailyLog>) => void
  
  // Refresh
  refreshMeetings: () => Promise<void>
}

// Helper functions
interface AppHelpers {
  getCategoryColor: (category: TaskCategory) => string
  getSyncPriority: () => Task | null
  getActiveTasks: () => Task[]
  getCompletedTasks: () => Task[]
}

// Combined context type
export interface AppContextType extends AppState, AppActions, AppHelpers {}

// Create context - exported for use by hooks and provider
export const AppContext = createContext<AppContextType | null>(null)
