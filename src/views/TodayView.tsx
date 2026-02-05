import { useState, useEffect, useCallback } from 'react'
import { MorningBriefing, Meetings, TaskList } from '../components/cards'
import { AddMeetingModal } from '../components/ui'
import { useApp, blockMeetingTitle } from '../lib'
import { isElectron } from '../lib/electron'
import type { SubtaskSummary } from '../types'

interface TodayViewProps {
  onAddTask: () => void
}

export function TodayView({ onAddTask }: TodayViewProps) {
  const {
    tasks,
    meetings,
    isLoading,
    toggleTask,
    setTaskStatus,
    updateTaskTitle,
    updateTaskNotes,
    updateTaskLink,
    updateTaskDueDate,
    deleteTask,
    reorderTasks,
    addMeeting,
    toggleMeeting,
    updateMeeting,
    deleteMeeting,
    getSyncPriority,
    getCategoryColor,
    refreshMeetings,
  } = useApp()

  const [isAddMeetingModalOpen, setIsAddMeetingModalOpen] = useState(false)
  const [initialMeetingDate, setInitialMeetingDate] = useState<string | undefined>(undefined)
  
  // Subtask summaries state
  const [subtaskSummaries, setSubtaskSummaries] = useState<Record<string, SubtaskSummary>>({})

  // Load subtask summaries when tasks change
  const loadSubtaskSummaries = useCallback(async () => {
    if (!isElectron() || !window.electronAPI || tasks.length === 0) {
      setSubtaskSummaries({})
      return
    }
    
    try {
      const taskIds = tasks.map(t => t.id)
      const summaries = await window.electronAPI.db.subtasks.getSummaries(taskIds)
      setSubtaskSummaries(summaries)
    } catch (error) {
      console.error('Error loading subtask summaries:', error)
    }
  }, [tasks])

  useEffect(() => {
    loadSubtaskSummaries()
  }, [loadSubtaskSummaries])

  // Handler for blocking a meeting title from future syncs
  const handleBlockMeetingTitle = async (title: string) => {
    try {
      await blockMeetingTitle(title)
    } catch (error) {
      console.error('Failed to block meeting:', error)
    }
  }

  const syncPriority = getSyncPriority()

  // Calculate today's meetings
  const today = new Date()
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const todayMeetings = meetings.filter(m => m.date === todayString)
  const todayMeetingCount = todayMeetings.length
  const completedMeetingCount = todayMeetings.filter(m => m.done).length

  // Find the next upcoming meeting (not completed, sorted by time)
  const now = new Date()
  const currentTimeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const nextMeeting = todayMeetings
    .filter(m => !m.done && m.time >= currentTimeString)
    .sort((a, b) => a.time.localeCompare(b.time))[0] || null

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="bg-mantle rounded-2xl p-10 animate-pulse">
          <div className="h-8 bg-surface1 rounded w-1/3 mb-6" />
          <div className="h-12 bg-surface1 rounded w-2/3 mb-4" />
          <div className="h-6 bg-surface1 rounded w-1/2" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-surface0 rounded-2xl p-8 animate-pulse">
            <div className="h-6 bg-surface1 rounded w-1/2 mb-4" />
            <div className="h-20 bg-surface1 rounded" />
          </div>
          <div className="bg-surface0 rounded-2xl p-8 animate-pulse">
            <div className="h-6 bg-surface1 rounded w-1/2 mb-4" />
            <div className="h-20 bg-surface1 rounded" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Morning Briefing - Full width */}
      <MorningBriefing
        meetingCount={todayMeetingCount}
        completedMeetingCount={completedMeetingCount}
        pendingPriorityTitle={syncPriority?.title}
        nextMeeting={nextMeeting ? { title: nextMeeting.title, time: nextMeeting.time } : null}
      />

      {/* TaskList and Meetings - 2 column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <TaskList
          tasks={tasks}
          subtaskSummaries={subtaskSummaries}
          onToggleTask={toggleTask}
          onSetTaskStatus={setTaskStatus}
          onUpdateTaskTitle={updateTaskTitle}
          onUpdateTaskNotes={updateTaskNotes}
          onUpdateTaskLink={updateTaskLink}
          onUpdateTaskDueDate={updateTaskDueDate}
          onDeleteTask={deleteTask}
          onReorderTasks={reorderTasks}
          onAddTask={onAddTask}
          getCategoryColor={getCategoryColor}
          onSubtasksChanged={loadSubtaskSummaries}
        />
        <Meetings
          meetings={meetings}
          onToggleMeeting={toggleMeeting}
          onUpdateMeeting={updateMeeting}
          onDeleteMeeting={deleteMeeting}
          onAddMeeting={(date) => {
            setInitialMeetingDate(date)
            setIsAddMeetingModalOpen(true)
          }}
          getCategoryColor={getCategoryColor}
          allContacts={[]}
          onGetMeetingContacts={async () => []}
          onSetMeetingContacts={async () => {}}
          onBlockMeetingTitle={handleBlockMeetingTitle}
          onRefreshMeetings={refreshMeetings}
        />
      </div>

      {/* Add Meeting Modal */}
      <AddMeetingModal
        isOpen={isAddMeetingModalOpen}
        onClose={() => {
          setIsAddMeetingModalOpen(false)
          setInitialMeetingDate(undefined)
        }}
        onAddMeeting={addMeeting}
        initialDate={initialMeetingDate}
      />
    </div>
  )
}
