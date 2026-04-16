import {
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'
import type { Task, Meeting, DailyLog, TaskCategory, TaskStatus } from '../types'
import { generateId, getCategoryColor } from './utils'
import { mockTasks, mockMeetings } from './mockData'
import { isElectron } from './electron'
import { AppContext, type AppContextType } from './AppContextDef'
export type { AppContextType } from './AppContextDef'
export { AppContext } from './AppContextDef'

// Provider component
interface AppProviderProps {
  children: ReactNode
}

export function AppProvider({ children }: AppProviderProps) {
  // State
  const [tasks, setTasks] = useState<Task[]>(mockTasks)
  const [meetings, setMeetings] = useState<Meeting[]>(mockMeetings)
  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null)
  const [syncPriorityId, setSyncPriorityIdState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load data from database on mount
  useEffect(() => {
    async function loadData() {
      if (!isElectron() || !window.electronAPI) {
        setIsLoading(false)
        return
      }

      try {
        // Load data in parallel
        const [
          localTasks,
          allMeetings,
        ] = await Promise.all([
          window.electronAPI.db.tasks.getAll(),
          window.electronAPI.db.meetings.getAll(),
          window.electronAPI.db.tasks.getSyncPriority(),
        ])

        // Merge local tasks with Other tasks
        const allTasks = [
          ...(localTasks || []),
        ]

        setTasks(allTasks)
        setMeetings(allMeetings || [])
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  // Actions
  const addTask = useCallback(async (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    const newTask: Task = {
      ...taskData,
      id: generateId(),
      createdAt: new Date().toISOString(),
    }

    // If in Electron, persist to database
    if (isElectron() && window.electronAPI) {
      try {
        const createdTask = await window.electronAPI.db.tasks.create(taskData)
        setTasks(prev => [...prev, createdTask])
        return
      } catch (error) {
        console.error('Error creating task:', error)
      }
    }

    setTasks(prev => [...prev, newTask])
  }, [])

  const toggleTask = useCallback(async (id: string) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return

    // Handle local tasks
    if (isElectron() && window.electronAPI) {
      try {
        const updatedTask = await window.electronAPI.db.tasks.toggle(id)
        if (updatedTask) {
          setTasks(prev =>
            prev.map(t => t.id === id ? updatedTask : t)
          )
        }
        return
      } catch (error) {
        console.error('Error toggling task:', error)
        return // Don't update local state if database update failed
      }
    }

    // Fallback to local state update
    setTasks(prev =>
      prev.map(t => {
        if (t.id !== id) return t
        const newStatus = t.status === 'done' ? 'todo' : 'done'
        return {
          ...t,
          status: newStatus,
          completedAt: newStatus === 'done' ? new Date().toISOString() : undefined,
        }
      })
    )
  }, [tasks])

  const deleteTask = useCallback(async (id: string) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return

    // Handle Notion tasks - try to delete from cache, ignore Notion errors
    if (task.source === 'notion' && task.notionId) {
      if (isElectron() && window.electronAPI) {
        try {
          // Try to delete from Notion cache - this will remove the ghost task
          await window.electronAPI.db.tasks.deleteFromCache(task.notionId)
        } catch (error) {
          // Log but continue - we still want to remove from local state
          console.warn('Error deleting task from cache (continuing anyway):', error)
        }
      }
      // Remove from local state regardless of cache deletion result
      setTasks(prev => prev.filter(t => t.id !== id))
      
      // Clear sync priority if this was the priority task
      if (syncPriorityId === id) {
        setSyncPriorityIdState(null)
      }
      return
    }

    // Delete local tasks from database if in Electron
    if (isElectron() && window.electronAPI) {
      try {
        await window.electronAPI.db.tasks.delete(id)
      } catch (error) {
        console.error('Error deleting task:', error)
        return
      }
    }

    // Remove from local state
    setTasks(prev => prev.filter(t => t.id !== id))

    // Clear sync priority if this was the priority task
    if (syncPriorityId === id) {
      setSyncPriorityIdState(null)
    }
  }, [tasks, syncPriorityId])

  const reorderTasks = useCallback(async (taskIds: string[]) => {
    if (!isElectron() || !window.electronAPI) return
    
    try {
      // First persist to database so any subsequent operations get the right sortOrder
      await window.electronAPI.db.tasks.reorder(taskIds)
      
      // Then update the local state to match
      setTasks(prevTasks => {
        const updated = prevTasks.map(task => {
          const newOrder = taskIds.indexOf(task.id)
          if (newOrder !== -1) {
            return { ...task, sortOrder: newOrder }
          }
          return task
        })
        return updated
      })
    } catch (error) {
      console.error('Error reordering tasks:', error)
    }
  }, [])

  const setTaskStatus = useCallback(async (id: string, status: TaskStatus) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return

    // Handle local tasks - update in database
    if (isElectron() && window.electronAPI) {
      try {
        const updatedTask = await window.electronAPI.db.tasks.update(id, { 
          status,
          completedAt: status === 'done' ? new Date().toISOString() : undefined 
        })
        
        if (updatedTask) {
          // Update local state with the task from database
          setTasks(prev =>
            prev.map(t => t.id === id ? updatedTask : t)
          )
        }
        return
      } catch (error) {
        console.error('Error updating task status:', error)
        return // Don't update local state if database update failed
      }
    }

    // Fallback for non-Electron or other scenarios - update local state only
    setTasks(prev =>
      prev.map(t => {
        if (t.id !== id) return t
        return {
          ...t,
          status,
          completedAt: status === 'done' ? new Date().toISOString() : undefined,
        }
      })
    )
  }, [tasks])

  const updateTaskTitle = useCallback(async (id: string, title: string) => {
    const task = tasks.find(t => t.id === id)
    if (!task || !title.trim()) return

    // Handle local tasks - update in database
    if (isElectron() && window.electronAPI) {
      try {
        const updatedTask = await window.electronAPI.db.tasks.update(id, { title: title.trim() })
        
        if (updatedTask) {
          // Update local state with the task from database
          setTasks(prev =>
            prev.map(t => t.id === id ? updatedTask : t)
          )
        }
        return
      } catch (error) {
        console.error('Error updating task title:', error)
        return // Don't update local state if database update failed
      }
    }
  }, [tasks])

  const updateTaskNotes = useCallback(async (id: string, notes: string) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return

    // Handle local tasks - update in database
    if (isElectron() && window.electronAPI) {
      try {
        const updatedTask = await window.electronAPI.db.tasks.update(id, { notes })
        
        if (updatedTask) {
          // Update local state with the task from database
          setTasks(prev =>
            prev.map(t => t.id === id ? updatedTask : t)
          )
        }
        return
      } catch (error) {
        console.error('Error updating task notes:', error)
        return // Don't update local state if database update failed
      }
    }

    // Update local state only
    setTasks(prev =>
      prev.map(t => {
        if (t.id !== id) return t
        return { ...t, notes }
      })
    )
  }, [tasks])

  const updateTaskLink = useCallback(async (id: string, link: string) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return

    // Handle local tasks - update in database
    if (isElectron() && window.electronAPI) {
      try {
        const updatedTask = await window.electronAPI.db.tasks.update(id, { link })
        
        if (updatedTask) {
          // Update local state with the task from database
          setTasks(prev =>
            prev.map(t => t.id === id ? updatedTask : t)
          )
        }
        return
      } catch (error) {
        console.error('Error updating task link:', error)
        return // Don't update local state if database update failed
      }
    }

    // For Notion tasks, update locally
    setTasks(prev =>
      prev.map(t => {
        if (t.id !== id) return t
        return { ...t, link }
      })
    )
  }, [tasks])

  const updateTaskDueDate = useCallback(async (id: string, dueDate: string | undefined) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return

    // Handle local tasks - update in database
    if (isElectron() && window.electronAPI) {
      try {
        const updatedTask = await window.electronAPI.db.tasks.update(id, { dueDate })
        
        if (updatedTask) {
          // Update local state with the task from database
          setTasks(prev =>
            prev.map(t => t.id === id ? updatedTask : t)
          )
        }
        return
      } catch (error) {
        console.error('Error updating task due date:', error)
        return // Don't update local state if database update failed
      }
    }

    // For Notion tasks, update locally
    setTasks(prev =>
      prev.map(t => {
        if (t.id !== id) return t
        return { ...t, dueDate }
      })
    )
  }, [tasks])
  const setSyncPriority = useCallback(async (taskId: string | null) => {
    setSyncPriorityIdState(taskId)
    
    // Update database if in Electron
    if (isElectron() && window.electronAPI) {
      try {
        await window.electronAPI.db.tasks.setSyncPriority(taskId)
      } catch (error) {
        console.error('Error setting sync priority:', error)
      }
    }
    
    // Also update the task's isSyncPriority flag
    setTasks(prev =>
      prev.map(task => ({
        ...task,
        isSyncPriority: task.id === taskId,
      }))
    )
  }, [])

  const addMeeting = useCallback(async (meetingData: Omit<Meeting, 'id' | 'done'>) => {
    if (!isElectron() || !window.electronAPI) {
      console.error('Cannot add meeting: Electron API not available')
      return
    }

    try {
      const newMeeting = await window.electronAPI.db.meetings.create({ ...meetingData, done: false })
      setMeetings(prev => [...prev, newMeeting])
    } catch (error) {
      console.error('Error creating meeting:', error)
      throw error
    }
  }, [])

  const getMeetingsByDate = useCallback(async (date: string) => {
    if (!isElectron() || !window.electronAPI) {
      return meetings.filter(m => m.date === date)
    }

    try {
      return await window.electronAPI.db.meetings.getByDate(date)
    } catch (error) {
      console.error('Error getting meetings by date:', error)
      return meetings.filter(m => m.date === date)
    }
  }, [meetings])

  const toggleMeeting = useCallback(async (id: string) => {
    if (isElectron() && window.electronAPI) {
      try {
        const updatedMeeting = await window.electronAPI.db.meetings.toggle(id)
        if (updatedMeeting) {
          setMeetings(prev =>
            prev.map(m => m.id === id ? updatedMeeting : m)
          )
          return
        }
      } catch (error) {
        console.error('Error toggling meeting:', error)
      }
    }

    setMeetings(prev =>
      prev.map(meeting =>
        meeting.id === id ? { ...meeting, done: !meeting.done } : meeting
      )
    )
  }, [])

  const updateMeeting = useCallback(async (id: string, updates: Partial<Pick<Meeting, 'date' | 'time' | 'title' | 'category' | 'notes' | 'link'>>) => {
    if (isElectron() && window.electronAPI) {
      try {
        const updatedMeeting = await window.electronAPI.db.meetings.update(id, updates)
        if (updatedMeeting) {
          setMeetings(prev =>
            prev.map(m => m.id === id ? updatedMeeting : m)
          )
          return
        }
      } catch (error) {
        console.error('Error updating meeting:', error)
        throw error
      }
    }

    setMeetings(prev =>
      prev.map(meeting =>
        meeting.id === id ? { ...meeting, ...updates } : meeting
      )
    )
  }, [])

  const updateMeetingNotes = useCallback(async (id: string, notes: string) => {
    await updateMeeting(id, { notes })
  }, [updateMeeting])

  const deleteMeeting = useCallback(async (id: string) => {
    if (isElectron() && window.electronAPI) {
      try {
        await window.electronAPI.db.meetings.delete(id)
        setMeetings(prev => prev.filter(m => m.id !== id))
      } catch (error) {
        console.error('Error deleting meeting:', error)
        throw error
      }
    }
  }, [])

  const updateDailyLog = useCallback((updates: Partial<DailyLog>) => {
    setDailyLog(prev => {
      if (!prev) {
        // Create new daily log if none exists
        return {
          id: generateId(),
          date: new Date().toISOString().split('T')[0],
          meetings: '',
          ...updates,
        } as DailyLog
      }
      return { ...prev, ...updates }
    })
  }, [])

  // Refresh meetings from database
  const refreshMeetings = useCallback(async () => {
    if (!isElectron() || !window.electronAPI?.db?.meetings) {
      return
    }
    try {
      const allMeetings = await window.electronAPI.db.meetings.getAll()
      setMeetings(allMeetings || [])
    } catch (error) {
      console.error('Error refreshing meetings:', error)
    }
  }, [])

  // Helpers
  const getCategoryColorHelper = useCallback((category: TaskCategory) => {
    return getCategoryColor(category)
  }, [])

  const getSyncPriority = useCallback(() => {
    // Return the first in-progress task (sorted by sortOrder) as the main priority
    const sortedTasks = [...tasks].sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999))
    return sortedTasks.find(t => t.status === 'in-progress') ?? null
  }, [tasks])

  const getActiveTasks = useCallback(() => {
    return tasks.filter(t => t.status !== 'done')
  }, [tasks])

  const getCompletedTasks = useCallback(() => {
    return tasks.filter(t => t.status === 'done')
  }, [tasks])

  const value: AppContextType = {
    // State
    tasks,
    meetings,
    dailyLog,
    syncPriorityId,
    isLoading,
    // Actions
    addTask,
    toggleTask,
    setTaskStatus,
    updateTaskTitle,
    updateTaskNotes,
    updateTaskLink,
    updateTaskDueDate,
    deleteTask,
    reorderTasks,
    setSyncPriority,
    addMeeting,
    toggleMeeting,
    updateMeeting,
    updateMeetingNotes,
    deleteMeeting,
    getMeetingsByDate,
    updateDailyLog,
    refreshMeetings,
    // Helpers
    getCategoryColor: getCategoryColorHelper,
    getSyncPriority,
    getActiveTasks,
    getCompletedTasks,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
