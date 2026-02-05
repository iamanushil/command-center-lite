import { useEffect, useRef, useState, useCallback } from 'react'
import type { Task, TaskCategory, TaskStatus, Subtask } from '../../types'
import { Badge } from './Badge'
import { isElectron } from '../../lib/electron'

interface TaskDetailModalProps {
  task: Task | null
  isOpen: boolean
  onClose: () => void
  onToggleTask: (id: string) => void
  onSetTaskStatus: (id: string, status: TaskStatus) => void
  onUpdateTaskTitle: (id: string, title: string) => void
  onUpdateTaskNotes: (id: string, notes: string) => void
  onUpdateTaskLink: (id: string, link: string) => void
  onUpdateTaskDueDate: (id: string, dueDate: string | undefined) => void
  onDeleteTask: (id: string) => void
  getCategoryColor: (category: TaskCategory) => string
  onSubtasksChanged?: () => void
}

const categoryBadgeColors: Record<TaskCategory, 'green' | 'blue' | 'mauve' | 'peach'> = {
  work: 'green',
  home: 'blue',
  personal: 'mauve',
  'side-project': 'peach',
}

// Parse a YYYY-MM-DD date string as local date (not UTC)
function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'No due date'
  
  // Parse as local date to avoid timezone issues
  const date = parseLocalDate(dateString)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const taskDate = new Date(date)
  taskDate.setHours(0, 0, 0, 0)
  
  const diffTime = taskDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  })
  
  if (diffDays < 0) {
    return `${formattedDate} (${Math.abs(diffDays)} days overdue)`
  }
  if (diffDays === 0) {
    return `${formattedDate} (Today)`
  }
  if (diffDays === 1) {
    return `${formattedDate} (Tomorrow)`
  }
  return `${formattedDate} (in ${diffDays} days)`
}

function formatCreatedDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// Notion icon component
function NotionIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 100 100"
      fill="currentColor"
    >
      <path d="M6.017 4.313l55.333 -4.087c6.797 -0.583 8.543 -0.19 12.817 2.917l17.663 12.443c2.913 2.14 3.883 2.723 3.883 5.053v68.243c0 4.277 -1.553 6.807 -6.99 7.193L24.467 99.967c-4.08 0.193 -6.023 -0.39 -8.16 -3.113L3.3 79.94c-2.333 -3.113 -3.3 -5.443 -3.3 -8.167V11.113c0 -3.497 1.553 -6.413 6.017 -6.8z" />
      <path
        fill="var(--ctp-base)"
        d="M61.35 0.227l-55.333 4.087C1.553 4.7 0 7.617 0 11.113v60.66c0 2.723 0.967 5.053 3.3 8.167l13.007 16.913c2.137 2.723 4.08 3.307 8.16 3.113l64.257 -3.89c5.433 -0.387 6.99 -2.917 6.99 -7.193V20.64c0 -2.21 -0.873 -2.847 -3.443 -4.733L74.167 3.143c-4.273 -3.107 -6.02 -3.5 -12.817 -2.917zM25.92 19.523c-5.247 0.353 -6.437 0.433 -9.417 -1.99L8.927 11.507c-0.77 -0.78 -0.383 -1.753 1.557 -1.947l53.193 -3.887c4.467 -0.39 6.793 1.167 8.543 2.527l9.123 6.61c0.39 0.197 1.36 1.36 0.193 1.36l-54.933 3.307 -0.68 0.047zM19.803 88.3V30.367c0 -2.53 0.777 -3.697 3.103 -3.893L86 22.78c2.14 -0.193 3.107 1.167 3.107 3.693v57.547c0 2.53 -0.39 4.67 -3.883 4.863l-60.377 3.5c-3.493 0.193 -5.043 -0.97 -5.043 -4.083zm59.6 -54.827c0.387 1.75 0 3.5 -1.75 3.7l-2.91 0.577v42.773c-2.527 1.36 -4.853 2.137 -6.797 2.137 -3.107 0 -3.883 -0.973 -6.21 -3.887l-19.03 -29.94v28.967l6.02 1.363s0 3.5 -4.857 3.5l-13.39 0.777c-0.39 -0.78 0 -2.723 1.357 -3.11l3.497 -0.97v-38.3L30.48 40.667c-0.39 -1.75 0.58 -4.277 3.3 -4.473l14.367 -0.967 19.8 30.327v-26.83l-5.047 -0.58c-0.39 -2.143 1.163 -3.7 3.103 -3.89l13.4 -0.78z"
      />
    </svg>
  )
}

export function TaskDetailModal({
  task,
  isOpen,
  onClose,
  onToggleTask,
  onSetTaskStatus,
  onUpdateTaskTitle,
  onUpdateTaskNotes,
  onUpdateTaskLink,
  onUpdateTaskDueDate,
  onDeleteTask,
  getCategoryColor,
  onSubtasksChanged,
}: TaskDetailModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState('')
  const [localTitle, setLocalTitle] = useState<string>('')
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [editedNotes, setEditedNotes] = useState('')
  const [isEditingLink, setIsEditingLink] = useState(false)
  const [editedLink, setEditedLink] = useState('')
  const [isEditingDueDate, setIsEditingDueDate] = useState(false)
  const [editedDueDate, setEditedDueDate] = useState('')
  const [localStatus, setLocalStatus] = useState<TaskStatus>('todo')
  const [localNotes, setLocalNotes] = useState<string>('')
  const [localLink, setLocalLink] = useState<string>('')
  const [localDueDate, setLocalDueDate] = useState<string | undefined>()
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  
  // Subtasks state
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [isAddingSubtask, setIsAddingSubtask] = useState(false)
  const subtaskInputRef = useRef<HTMLInputElement>(null)

  // Sync local state with task prop when modal opens or task ID changes
  useEffect(() => {
    if (isOpen && task) {
      setIsEditingTitle(false)
      setEditedTitle(task.title)
      setLocalTitle(task.title)
      setIsEditingNotes(false)
      setEditedNotes(task.notes || '')
      setIsEditingLink(false)
      setEditedLink(task.link || '')
      setIsEditingDueDate(false)
      setEditedDueDate(task.dueDate || '')
      setLocalStatus(task.status)
      setLocalNotes(task.notes || '')
      setLocalLink(task.link || '')
      setLocalDueDate(task.dueDate)
      setSaveMessage(null)
      setNewSubtaskTitle('')
      setIsAddingSubtask(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, task?.id]) // Only reset when task ID changes, not on every task object change

  // Load subtasks when modal opens
  useEffect(() => {
    if (isOpen && task) {
      loadSubtasks()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, task?.id])

  const loadSubtasks = useCallback(async () => {
    if (!task || !isElectron() || !window.electronAPI) return
    try {
      const loadedSubtasks = await window.electronAPI.db.subtasks.getForTask(task.id)
      setSubtasks(loadedSubtasks)
    } catch (error) {
      console.error('Error loading subtasks:', error)
    }
  }, [task])

  const handleAddSubtask = async () => {
    if (!task || !newSubtaskTitle.trim() || !isElectron() || !window.electronAPI) return
    try {
      const newSubtask = await window.electronAPI.db.subtasks.create(task.id, newSubtaskTitle.trim())
      setSubtasks(prev => [...prev, newSubtask])
      setNewSubtaskTitle('')
      onSubtasksChanged?.()
      // Keep focus for adding more
      subtaskInputRef.current?.focus()
    } catch (error) {
      console.error('Error adding subtask:', error)
    }
  }

  const handleToggleSubtask = async (subtaskId: string) => {
    if (!isElectron() || !window.electronAPI) return
    try {
      const updated = await window.electronAPI.db.subtasks.toggle(subtaskId)
      if (updated) {
        setSubtasks(prev => prev.map(s => s.id === subtaskId ? updated : s))
        onSubtasksChanged?.()
      }
    } catch (error) {
      console.error('Error toggling subtask:', error)
    }
  }

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!isElectron() || !window.electronAPI) return
    try {
      const success = await window.electronAPI.db.subtasks.delete(subtaskId)
      if (success) {
        setSubtasks(prev => prev.filter(s => s.id !== subtaskId))
        onSubtasksChanged?.()
      }
    } catch (error) {
      console.error('Error deleting subtask:', error)
    }
  }

  const handleSubtaskKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newSubtaskTitle.trim()) {
      e.preventDefault()
      handleAddSubtask()
    } else if (e.key === 'Escape') {
      setIsAddingSubtask(false)
      setNewSubtaskTitle('')
    }
  }

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditingTitle) {
          setIsEditingTitle(false)
          setEditedTitle(localTitle)
        } else if (isEditingNotes) {
          setIsEditingNotes(false)
          setEditedNotes(localNotes)
        } else {
          onClose()
        }
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose, isEditingTitle, localTitle, isEditingNotes, localNotes])

  // Close on click outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleStatusChange = (newStatus: TaskStatus) => {
    if (task) {
      setLocalStatus(newStatus)
      onSetTaskStatus(task.id, newStatus)
      setSaveMessage('Status updated!')
      setTimeout(() => setSaveMessage(null), 2000)
    }
  }

  const handleSaveTitle = () => {
    if (task && editedTitle.trim()) {
      setLocalTitle(editedTitle.trim())
      onUpdateTaskTitle(task.id, editedTitle.trim())
      setIsEditingTitle(false)
      setSaveMessage('Title saved!')
      setTimeout(() => setSaveMessage(null), 2000)
    }
  }

  const handleSaveNotes = () => {
    if (task) {
      setLocalNotes(editedNotes)
      onUpdateTaskNotes(task.id, editedNotes)
      setIsEditingNotes(false)
      setSaveMessage('Notes saved!')
      setTimeout(() => setSaveMessage(null), 2000)
    }
  }

  const handleSaveLink = () => {
    if (task) {
      setLocalLink(editedLink)
      onUpdateTaskLink(task.id, editedLink)
      setIsEditingLink(false)
      setSaveMessage('Link saved!')
      setTimeout(() => setSaveMessage(null), 2000)
    }
  }

  const handleSaveDueDate = () => {
    if (task) {
      const newDueDate = editedDueDate || undefined
      setLocalDueDate(newDueDate)
      onUpdateTaskDueDate(task.id, newDueDate)
      setIsEditingDueDate(false)
      setSaveMessage('Due date saved!')
      setTimeout(() => setSaveMessage(null), 2000)
    }
  }

  if (!isOpen || !task) return null

  const categoryColor = getCategoryColor(task.category)
  const isDone = localStatus === 'done'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-crust/80 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="bg-surface0 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-detail-title"
      >
        {/* Header */}
        <div className="p-6 border-b border-surface1">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge color={categoryBadgeColors[task.category]}>
                  {task.category}
                </Badge>
                {task.source === 'notion' && (
                  <span className="flex items-center gap-1 text-xs text-overlay1">
                    <NotionIcon className="text-overlay1" />
                    Notion
                  </span>
                )}
              </div>
              {isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleSaveTitle()
                      } else if (e.key === 'Escape') {
                        setIsEditingTitle(false)
                        setEditedTitle(localTitle)
                      }
                    }}
                    className="flex-1 text-xl font-medium text-text bg-surface1 rounded-lg px-3 py-1 border border-surface2 focus:border-blue focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveTitle}
                    className="p-1.5 rounded-lg text-green hover:bg-green/20 transition-colors cursor-pointer"
                    title="Save title"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingTitle(false)
                      setEditedTitle(localTitle)
                    }}
                    className="p-1.5 rounded-lg text-overlay1 hover:bg-surface1 transition-colors cursor-pointer"
                    title="Cancel"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <h2
                  id="task-detail-title"
                  className="text-xl font-medium text-text cursor-pointer hover:text-blue transition-colors group flex items-center gap-2"
                  onClick={() => {
                    setEditedTitle(localTitle)
                    setIsEditingTitle(true)
                  }}
                  title="Click to edit title"
                >
                  {localTitle}
                  <svg className="w-4 h-4 text-overlay1 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </h2>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-overlay1 hover:text-text hover:bg-surface1 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Save message toast */}
          {saveMessage && (
            <div className="bg-green/20 text-green px-3 py-2 rounded-lg text-sm font-medium animate-pulse">
              {saveMessage}
            </div>
          )}

          {/* Status with buttons */}
          <div>
            <span className="text-sm text-overlay1 block mb-2">Status</span>
            <div className="flex gap-2">
              <button
                onClick={() => handleStatusChange('todo')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  localStatus === 'todo'
                    ? 'bg-overlay1 text-base'
                    : 'bg-surface1 text-overlay1 hover:bg-surface2'
                }`}
              >
                To Do
              </button>
              <button
                onClick={() => handleStatusChange('in-progress')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  localStatus === 'in-progress'
                    ? 'bg-yellow text-base'
                    : 'bg-surface1 text-overlay1 hover:bg-surface2'
                }`}
              >
                In Progress
              </button>
              <button
                onClick={() => handleStatusChange('done')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  localStatus === 'done'
                    ? 'bg-green text-base'
                    : 'bg-surface1 text-overlay1 hover:bg-surface2'
                }`}
              >
                Done
              </button>
            </div>
          </div>

          {/* Subtasks Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-overlay1">
                Subtasks {subtasks.length > 0 && (
                  <span className="text-xs ml-1">
                    ({subtasks.filter(s => s.completed).length}/{subtasks.length})
                  </span>
                )}
              </span>
              {!isAddingSubtask && (
                <button
                  onClick={() => {
                    setIsAddingSubtask(true)
                    setTimeout(() => subtaskInputRef.current?.focus(), 0)
                  }}
                  className="text-xs text-mauve hover:text-mauve/80 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add subtask
                </button>
              )}
            </div>
            
            <div className="space-y-1">
              {/* Existing subtasks */}
              {subtasks.map(subtask => (
                <div 
                  key={subtask.id}
                  className="flex items-center gap-2 group py-1"
                >
                  <button
                    onClick={() => handleToggleSubtask(subtask.id)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors cursor-pointer flex-shrink-0 ${
                      subtask.completed
                        ? 'bg-green border-green'
                        : 'border-overlay0 hover:border-overlay1'
                    }`}
                  >
                    {subtask.completed && (
                      <svg className="w-3 h-3 text-base" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <span className={`flex-1 text-sm ${subtask.completed ? 'text-overlay0 line-through' : 'text-text'}`}>
                    {subtask.title}
                  </span>
                  <button
                    onClick={() => handleDeleteSubtask(subtask.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-overlay0 hover:text-red transition-all cursor-pointer"
                    aria-label="Delete subtask"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              
              {/* Add subtask input */}
              {isAddingSubtask && (
                <div className="flex items-center gap-2 py-1">
                  <div className="w-5 h-5 rounded border-2 border-overlay0 flex-shrink-0" />
                  <input
                    ref={subtaskInputRef}
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={handleSubtaskKeyDown}
                    onBlur={() => {
                      if (!newSubtaskTitle.trim()) {
                        setIsAddingSubtask(false)
                      }
                    }}
                    placeholder="Add a subtask..."
                    className="flex-1 bg-transparent border-none text-sm text-text placeholder:text-overlay0 focus:outline-none"
                  />
                  <button
                    onClick={handleAddSubtask}
                    disabled={!newSubtaskTitle.trim()}
                    className="text-xs text-mauve hover:text-mauve/80 disabled:text-overlay0 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingSubtask(false)
                      setNewSubtaskTitle('')
                    }}
                    className="text-xs text-overlay1 hover:text-text transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
              
              {/* Empty state */}
              {subtasks.length === 0 && !isAddingSubtask && (
                <p className="text-sm text-overlay0 italic py-1">No subtasks</p>
              )}
            </div>
          </div>

          {/* Due Date - Editable */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-overlay1">Due Date</span>
              {!isEditingDueDate && (
                <button
                  onClick={() => {
                    setEditedDueDate(localDueDate || '')
                    setIsEditingDueDate(true)
                  }}
                  className="text-xs text-mauve hover:text-mauve/80 transition-colors cursor-pointer"
                >
                  {localDueDate ? 'Edit' : 'Add due date'}
                </button>
              )}
            </div>
            {isEditingDueDate ? (
              <div className="space-y-2">
                <input
                  type="date"
                  value={editedDueDate}
                  onChange={(e) => setEditedDueDate(e.target.value)}
                  className="w-full bg-mantle border border-surface1 rounded-lg p-3 text-sm text-text placeholder:text-overlay0 focus:outline-none focus:ring-2 focus:ring-mauve/50 focus:border-mauve transition-all cursor-pointer"
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setIsEditingDueDate(false)
                      setEditedDueDate(localDueDate || '')
                    }}
                    className="px-3 py-1.5 rounded-lg text-sm text-overlay1 hover:text-text hover:bg-surface1 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveDueDate}
                    className="px-3 py-1.5 rounded-lg text-sm bg-mauve text-base hover:bg-mauve/90 transition-colors cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <span className={`text-sm font-medium ${
                localDueDate && parseLocalDate(localDueDate) < new Date(new Date().setHours(0, 0, 0, 0)) && localStatus !== 'done'
                  ? 'text-red'
                  : 'text-text'
              }`}>
                {formatDate(localDueDate)}
              </span>
            )}
          </div>

          {/* Link - Editable */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-overlay1">Link</span>
              {!isEditingLink && (
                <button
                  onClick={() => {
                    setEditedLink(localLink)
                    setIsEditingLink(true)
                  }}
                  className="text-xs text-mauve hover:text-mauve/80 transition-colors cursor-pointer"
                >
                  {localLink ? 'Edit' : 'Add link'}
                </button>
              )}
            </div>
            {isEditingLink ? (
              <div className="space-y-2">
                <input
                  type="url"
                  value={editedLink}
                  onChange={(e) => setEditedLink(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-mantle border border-surface1 rounded-lg p-3 text-sm text-text placeholder:text-overlay0 focus:outline-none focus:ring-2 focus:ring-mauve/50 focus:border-mauve transition-all"
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setIsEditingLink(false)
                      setEditedLink(localLink)
                    }}
                    className="px-3 py-1.5 rounded-lg text-sm text-overlay1 hover:text-text hover:bg-surface1 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveLink}
                    className="px-3 py-1.5 rounded-lg text-sm bg-mauve text-base hover:bg-mauve/90 transition-colors cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : localLink ? (
              <a
                href={localLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-mauve hover:text-mauve/80 underline break-all"
              >
                {localLink}
              </a>
            ) : (
              <p className="text-sm text-overlay0 italic">No link</p>
            )}
          </div>

          {/* Notes - Editable */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-overlay1">Notes</span>
              {!isEditingNotes && (
                <button
                  onClick={() => {
                    setEditedNotes(localNotes)
                    setIsEditingNotes(true)
                  }}
                  className="text-xs text-mauve hover:text-mauve/80 transition-colors cursor-pointer"
                >
                  {localNotes ? 'Edit' : 'Add notes'}
                </button>
              )}
            </div>
            {isEditingNotes ? (
              <div className="space-y-2">
                <textarea
                  value={editedNotes}
                  onChange={(e) => setEditedNotes(e.target.value)}
                  placeholder="Add notes about this task..."
                  rows={4}
                  className="w-full bg-mantle border border-surface1 rounded-lg p-3 text-sm text-text placeholder:text-overlay0 focus:outline-none focus:ring-2 focus:ring-mauve/50 focus:border-mauve transition-all resize-none"
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setIsEditingNotes(false)
                      setEditedNotes(localNotes)
                    }}
                    className="px-3 py-1.5 rounded-lg text-sm text-overlay1 hover:text-text hover:bg-surface1 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveNotes}
                    className="px-3 py-1.5 rounded-lg text-sm bg-mauve text-base hover:bg-mauve/90 transition-colors cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : localNotes ? (
              <p className="text-sm text-text bg-mantle rounded-lg p-3 whitespace-pre-wrap">
                {localNotes}
              </p>
            ) : (
              <p className="text-sm text-overlay0 italic">No notes</p>
            )}
          </div>

          {/* Created Date */}
          <div className="flex items-center justify-between text-xs text-overlay0">
            <span>Created</span>
            <span>{formatCreatedDate(task.createdAt)}</span>
          </div>

          {/* Completed Date */}
          {task.completedAt && (
            <div className="flex items-center justify-between text-xs text-overlay0">
              <span>Completed</span>
              <span>{formatCreatedDate(task.completedAt)}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-surface1 flex justify-between">
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-overlay1 hover:text-text hover:bg-surface1 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={() => {
                const confirmMsg = task.source === 'notion' 
                  ? 'Delete this task from Command Center? (This will not delete it from Notion)'
                  : 'Are you sure you want to delete this task?'
                if (confirm(confirmMsg)) {
                  onDeleteTask(task.id)
                  onClose()
                }
              }}
              className="px-4 py-2 rounded-lg text-sm text-red hover:bg-red/10 transition-colors cursor-pointer"
            >
              Delete
            </button>
          </div>
          <button
            onClick={() => {
              onToggleTask(task.id)
              onClose()
            }}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium
              transition-colors cursor-pointer
              ${isDone 
                ? 'bg-surface1 text-text hover:bg-surface2' 
                : 'text-base hover:opacity-90'
              }
            `}
            style={!isDone ? { backgroundColor: categoryColor } : undefined}
          >
            {isDone ? 'Mark as Incomplete' : 'Mark as Complete'}
          </button>
        </div>
      </div>
    </div>
  )
}
