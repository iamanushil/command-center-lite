import { useState, useCallback } from 'react'
import type { Task, TaskCategory, TaskStatus, SubtaskSummary } from '../../types'
import { Card, Badge, TaskDetailModal } from '../ui'
import { DonutChart } from '../ui/DonutChart'

interface TaskListProps {
  tasks: Task[]
  subtaskSummaries: Record<string, SubtaskSummary>
  onToggleTask: (id: string) => void
  onSetTaskStatus: (id: string, status: TaskStatus) => void
  onUpdateTaskTitle: (id: string, title: string) => void
  onUpdateTaskNotes: (id: string, notes: string) => void
  onUpdateTaskLink: (id: string, link: string) => void
  onUpdateTaskDueDate: (id: string, dueDate: string | undefined) => void
  onDeleteTask: (id: string) => void
  onReorderTasks: (taskIds: string[]) => Promise<void>
  onAddTask: () => void
  getCategoryColor: (category: TaskCategory) => string
  onSubtasksChanged?: () => void
}

const categoryBadgeColors: Record<TaskCategory, 'green' | 'blue' | 'mauve' | 'peach'> = {
  work: 'green',
  home: 'blue',
  personal: 'mauve',
  'side-project': 'peach',
}

export function TaskList({
  tasks,
  subtaskSummaries,
  onToggleTask,
  onSetTaskStatus,
  onUpdateTaskTitle,
  onUpdateTaskNotes,
  onUpdateTaskLink,
  onUpdateTaskDueDate,
  onDeleteTask,
  onReorderTasks,
  onAddTask,
  getCategoryColor,
  onSubtasksChanged,
}: TaskListProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null)
  
  // Get today's date as YYYY-MM-DD for comparison
  const today = new Date()
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  
  // Sort tasks by sortOrder (undefined sortOrder goes to end with high number)
  const sortedTasks = [...tasks].sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999))
  const inProgressTasks = sortedTasks.filter(t => t.status === 'in-progress')
  const todoTasks = sortedTasks.filter(t => t.status === 'todo')
  // Only show tasks completed today (completedAt starts with today's date)
  const completedTasks = sortedTasks.filter(t => t.status === 'done' && t.completedAt?.startsWith(todayString))

  const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', taskId)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggedTaskId(null)
    setDragOverTaskId(null)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, taskId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedTaskId && draggedTaskId !== taskId) {
      setDragOverTaskId(taskId)
    }
  }, [draggedTaskId])

  const handleDragLeave = useCallback(() => {
    setDragOverTaskId(null)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent, targetTaskId: string, targetStatus: TaskStatus) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!draggedTaskId || draggedTaskId === targetTaskId) {
      handleDragEnd()
      return
    }

    const draggedTask = tasks.find(t => t.id === draggedTaskId)
    if (!draggedTask) {
      handleDragEnd()
      return
    }

    // Use the already sorted lists from the component
    const currentOrder = [...inProgressTasks, ...todoTasks]
    
    // Remove dragged task from its current position
    const filteredTasks = currentOrder.filter(t => t.id !== draggedTaskId)
    
    // Find the target task's index in the filtered list
    const targetIdx = filteredTasks.findIndex(t => t.id === targetTaskId)
    
    // Insert dragged task before the target
    if (targetIdx >= 0) {
      filteredTasks.splice(targetIdx, 0, draggedTask)
    } else {
      filteredTasks.push(draggedTask)
    }

    // Build new order
    const newOrder = filteredTasks.map(t => t.id)

    // IMPORTANT: Save the reorder FIRST so the database has updated sortOrder
    // Then setTaskStatus won't overwrite it when it fetches the updated task
    await onReorderTasks(newOrder)

    // If status changed, update it after reorder is persisted
    if (draggedTask.status !== targetStatus) {
      await onSetTaskStatus(draggedTaskId, targetStatus)
    }
    
    handleDragEnd()
  }, [draggedTaskId, tasks, inProgressTasks, todoTasks, onSetTaskStatus, onReorderTasks, handleDragEnd])

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="text-lg">☑️</span>
          <span className="font-mono text-xs uppercase tracking-wider text-overlay1">
            Today's Tasks
          </span>
        </div>
        <button
          onClick={onAddTask}
          className="
            font-mono text-xs uppercase tracking-wider
            px-3 py-1.5 rounded-lg
            bg-transparent border border-surface2
            text-overlay1 hover:text-text hover:border-surface1
            transition-colors duration-150 cursor-pointer
          "
        >
          + Add task
        </button>
      </div>

      {/* In Progress tasks section */}
      <div className="mb-6 pb-6 border-b border-yellow/30">
        <p className="font-mono text-xs uppercase tracking-wider text-yellow mb-4 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          In Progress ({inProgressTasks.length})
        </p>
        <div className="space-y-3">
          {inProgressTasks.map((task) => {
            return (
              <div
                key={task.id}
                data-task-id={task.id}
                draggable
                onDragStart={(e) => handleDragStart(e, task.id)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, task.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, task.id, 'in-progress')}
                className={`
                  bg-yellow/10 border border-yellow/30 rounded-xl p-4 flex items-center gap-4 transition-all duration-150 ease-out hover:bg-yellow/15 cursor-pointer relative
                  ${dragOverTaskId === task.id ? 'before:absolute before:left-0 before:right-0 before:-top-2 before:h-0.5 before:bg-yellow before:rounded-full' : ''}
                  ${draggedTaskId === task.id ? 'opacity-50' : ''}
                `}
                onClick={() => setSelectedTask(task)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelectedTask(task)
                  }
                }}
              >
                {/* Drag handle */}
                <div 
                  className="cursor-grab active:cursor-grabbing text-overlay1 hover:text-yellow flex-shrink-0"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="9" cy="6" r="1.5" />
                    <circle cx="15" cy="6" r="1.5" />
                    <circle cx="9" cy="12" r="1.5" />
                    <circle cx="15" cy="12" r="1.5" />
                    <circle cx="9" cy="18" r="1.5" />
                    <circle cx="15" cy="18" r="1.5" />
                  </svg>
                </div>

                {/* Pause button to move back to todo */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onSetTaskStatus(task.id, 'todo')
                  }}
                  className="w-5 h-5 rounded-full flex-shrink-0 bg-yellow flex items-center justify-center cursor-pointer transition-all duration-150 ease-out hover:scale-110 focus:outline-none focus:ring-2 focus:ring-yellow/50 focus:ring-offset-2 focus:ring-offset-mantle"
                  aria-label={`Pause "${task.title}"`}
                  title="Pause task"
                >
                  <svg className="w-2.5 h-2.5 text-base" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                </button>

                {/* Complete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onSetTaskStatus(task.id, 'done')
                  }}
                  className="p-1.5 rounded-lg text-green hover:bg-green/20 transition-colors cursor-pointer flex-shrink-0"
                  aria-label={`Complete "${task.title}"`}
                  title="Mark as complete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </button>

                {/* Task title */}
                <div className="flex-1 min-w-0">
                  <span className="text-text font-medium flex items-center gap-2">
                    {task.title}
                    {task.source === 'notion' && (
                      <NotionIcon className="text-overlay1 flex-shrink-0" />
                    )}
                    {task.link && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          window.electronAPI.openExternal(task.link!)
                        }}
                        className="cursor-pointer hover:text-blue transition-colors border-b border-transparent hover:border-blue"
                        title={task.link}
                      >
                        <svg className="w-3.5 h-3.5 text-mauve flex-shrink-0 hover:text-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </button>
                    )}
                  </span>
                </div>

                {/* Subtask progress */}
                {subtaskSummaries[task.id] && subtaskSummaries[task.id].total > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-overlay1">
                    <DonutChart
                      completed={subtaskSummaries[task.id].completed}
                      total={subtaskSummaries[task.id].total}
                      size={16}
                      strokeWidth={2.5}
                    />
                    <span>{subtaskSummaries[task.id].completed}/{subtaskSummaries[task.id].total}</span>
                  </div>
                )}

                {/* Category badge */}
                <Badge color={categoryBadgeColors[task.category]}>
                  {task.category}
                </Badge>
              </div>
            )
          })}
        </div>
      </div>

      {/* Todo tasks */}
      <div className="space-y-3">
        {todoTasks.length > 0 ? (
          todoTasks.map((task) => {
            const categoryColor = getCategoryColor(task.category)

            return (
              <div
                key={task.id}
                data-task-id={task.id}
                draggable
                onDragStart={(e) => handleDragStart(e, task.id)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, task.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, task.id, 'todo')}
                className={`
                  bg-mantle rounded-xl p-4
                  flex items-center gap-4
                  transition-all duration-150 ease-out
                  hover:bg-surface0/50 cursor-pointer relative
                  ${dragOverTaskId === task.id ? 'before:absolute before:left-0 before:right-0 before:-top-2 before:h-0.5 before:bg-mauve before:rounded-full' : ''}
                  ${draggedTaskId === task.id ? 'opacity-50' : ''}
                `}
                onClick={() => setSelectedTask(task)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelectedTask(task)
                  }
                }}
              >
                {/* Drag handle */}
                <div 
                  className="cursor-grab active:cursor-grabbing text-overlay1 hover:text-mauve flex-shrink-0"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="9" cy="6" r="1.5" />
                    <circle cx="15" cy="6" r="1.5" />
                    <circle cx="9" cy="12" r="1.5" />
                    <circle cx="15" cy="12" r="1.5" />
                    <circle cx="9" cy="18" r="1.5" />
                    <circle cx="15" cy="18" r="1.5" />
                  </svg>
                </div>

                {/* Circular checkbox with category color */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleTask(task.id)
                  }}
                  className="
                    w-5 h-5 rounded-full
                    border-2 flex-shrink-0
                    cursor-pointer
                    transition-all duration-150 ease-out
                    hover:scale-110 hover:bg-surface0
                    focus:outline-none focus:ring-2 focus:ring-mauve/50 focus:ring-offset-2 focus:ring-offset-mantle
                  "
                  style={{ borderColor: categoryColor }}
                  aria-label={`Mark "${task.title}" as complete`}
                />

                {/* Start button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onSetTaskStatus(task.id, 'in-progress')
                  }}
                  className="p-1.5 rounded-lg text-overlay1 hover:text-yellow hover:bg-yellow/20 transition-colors cursor-pointer flex-shrink-0"
                  aria-label={`Start "${task.title}"`}
                  title="Start working on this"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>

                {/* Task title */}
                <div className="flex-1 min-w-0">
                  <span className="text-text flex items-center gap-2">
                    {task.title}
                    {task.source === 'notion' && (
                      <NotionIcon className="text-overlay1 flex-shrink-0" />
                    )}
                    {task.link && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          window.electronAPI.openExternal(task.link!)
                        }}
                        className="cursor-pointer hover:text-blue transition-colors border-b border-transparent hover:border-blue"
                        title={task.link}
                      >
                        <svg className="w-3.5 h-3.5 text-mauve flex-shrink-0 hover:text-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </button>
                    )}
                  </span>
                </div>

                {/* Subtask progress */}
                {subtaskSummaries[task.id] && subtaskSummaries[task.id].total > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-overlay1">
                    <DonutChart
                      completed={subtaskSummaries[task.id].completed}
                      total={subtaskSummaries[task.id].total}
                      size={16}
                      strokeWidth={2.5}
                    />
                    <span>{subtaskSummaries[task.id].completed}/{subtaskSummaries[task.id].total}</span>
                  </div>
                )}

                {/* Category badge */}
                <Badge color={categoryBadgeColors[task.category]}>
                  {task.category}
                </Badge>
              </div>
            )
          })
        ) : inProgressTasks.length === 0 ? (
          <p className="text-overlay1 italic text-sm py-4">
            No tasks for today. Add one to get started!
          </p>
        ) : null}
      </div>

      {/* Completed tasks section */}
      {completedTasks.length > 0 && (
        <div className="mt-6 pt-6 border-t border-surface1">
          <p className="font-mono text-xs uppercase tracking-wider text-overlay1 mb-4">
            Completed today ({completedTasks.length})
          </p>
          <div className="space-y-2">
            {completedTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-4 opacity-50 hover:opacity-70 transition-opacity duration-150 cursor-pointer"
                onClick={() => setSelectedTask(task)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelectedTask(task)
                  }
                }}
              >
                {/* Filled green circle with checkmark */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onSetTaskStatus(task.id, 'todo')
                  }}
                  className="
                    w-5 h-5 rounded-full flex-shrink-0
                    bg-green flex items-center justify-center
                    cursor-pointer
                    transition-transform duration-150 ease-out
                    hover:scale-110
                    focus:outline-none focus:ring-2 focus:ring-green/50 focus:ring-offset-2 focus:ring-offset-surface0
                  "
                  aria-label={`Mark "${task.title}" as incomplete`}
                >
                  <svg
                    className="w-3 h-3 text-base"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </button>

                {/* Strikethrough title */}
                <span className="text-overlay1 line-through flex-1 flex items-center gap-2">
                  {task.title}
                  {task.source === 'notion' && (
                    <NotionIcon className="text-overlay1 flex-shrink-0" />
                  )}
                </span>

                {/* Category badge (dimmed) */}
                <Badge color={categoryBadgeColors[task.category]}>
                  {task.category}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={selectedTask !== null}
        onClose={() => setSelectedTask(null)}
        onToggleTask={onToggleTask}
        onSetTaskStatus={onSetTaskStatus}
        onUpdateTaskTitle={onUpdateTaskTitle}
        onUpdateTaskNotes={onUpdateTaskNotes}
        onUpdateTaskLink={onUpdateTaskLink}
        onUpdateTaskDueDate={onUpdateTaskDueDate}
        onDeleteTask={onDeleteTask}
        getCategoryColor={getCategoryColor}
        onSubtasksChanged={onSubtasksChanged}
      />
    </Card>
  )
}
