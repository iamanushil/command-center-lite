import { useState, useEffect, useRef, useCallback } from 'react'
import type { TaskCategory } from '../../types'

type RecurrenceUnit = 'none' | 'days' | 'weeks' | 'months' | 'quarters' | 'years'
type CaptureDestination = 'task'

interface TaskSubmission {
  title: string
  category: TaskCategory
  dueDate?: string
  notes?: string
  link?: string
  recurrence?: {
    interval: number
    unit: RecurrenceUnit
  }
}

interface InboxSubmission {
  title: string
  notes?: string
}

interface GoalSubmission {
  title: string
  goalId: string
  notes?: string
}

type QuickCaptureSubmission = 
  | { destination: 'inbox'; data: InboxSubmission }
  | { destination: 'task'; data: TaskSubmission }
  | { destination: 'goal'; data: GoalSubmission }

interface QuickCaptureModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (submission: QuickCaptureSubmission) => void
  weeklyGoals?: Goal[]
}

const categories: { value: TaskCategory; label: string; color: string }[] = [
  { value: 'work', label: 'Work', color: 'bg-green' },
  { value: 'home', label: 'Home', color: 'bg-blue' },
  { value: 'personal', label: 'Personal', color: 'bg-mauve' },
  { value: 'side-project', label: 'Side Project', color: 'bg-peach' },
]

const recurrenceUnits: { value: RecurrenceUnit; label: string }[] = [
  { value: 'none', label: 'No recurrence' },
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' },
  { value: 'quarters', label: 'Quarters' },
  { value: 'years', label: 'Years' },
]

const STORAGE_KEY = 'quickCapture.lastDestination'

function getStoredDestination(): CaptureDestination {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'inbox' || stored === 'task' || stored === 'goal') {
      return stored
    }
  } catch {
    // localStorage not available
  }
  return 'inbox'
}

function saveDestination(destination: CaptureDestination) {
  try {
    localStorage.setItem(STORAGE_KEY, destination)
  } catch {
    // localStorage not available
  }
}

function getTodayString(): string {
  return new Date().toISOString().split('T')[0]
}

export function QuickCaptureModal({ isOpen, onClose, onSubmit, weeklyGoals = [] }: QuickCaptureModalProps) {
  // Basic state
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [destination, setDestination] = useState<CaptureDestination>(getStoredDestination)
  
  // Task-specific state
  const [category, setCategory] = useState<TaskCategory>('home')
  const [dueDate, setDueDate] = useState(getTodayString())
  const [link, setLink] = useState('')
  const [saveToNotion, setSaveToNotion] = useState(false)
  const [recurrenceInterval, setRecurrenceInterval] = useState(1)
  const [recurrenceUnit, setRecurrenceUnit] = useState<RecurrenceUnit>('none')
  
  // Goal-specific state
  const [selectedGoalId, setSelectedGoalId] = useState<string>('')
  const [goalSearch, setGoalSearch] = useState('')
  
  // UI state
  const [showExpandedOptions, setShowExpandedOptions] = useState(false)
  
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Reset form when modal opens
  // Note: setState in effect is intentional - we want to reset form state when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle('')
      setNotes('')
      setDestination(getStoredDestination())
      setCategory('home')
      setDueDate(getTodayString())
      setLink('')
      setSaveToNotion(false)
      setRecurrenceInterval(1)
      setRecurrenceUnit('none')
      setSelectedGoalId('')
      setGoalSearch('')
      setShowExpandedOptions(false)
    }
  }, [isOpen])

  const handleDestinationChange = (newDestination: CaptureDestination) => {
    setDestination(newDestination)
    saveDestination(newDestination)
    // Auto-expand options for task/goal
    if (newDestination !== 'inbox') {
      setShowExpandedOptions(true)
    }
  }

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault()
    if (!title.trim()) return

    if (destination === 'inbox') {
      onSubmit({
        destination: 'inbox',
        data: {
          title: title.trim(),
          notes: notes.trim() || undefined,
        },
      })
    } else if (destination === 'task') {
      const taskData: TaskSubmission = {
        title: title.trim(),
        category,
        dueDate: dueDate || undefined,
        notes: notes.trim() || undefined,
        link: link.trim() || undefined,
        saveToNotion,
      }
      if (saveToNotion && recurrenceUnit !== 'none') {
        taskData.recurrence = {
          interval: recurrenceInterval,
          unit: recurrenceUnit,
        }
      }
      onSubmit({
        destination: 'task',
        data: taskData,
      })
    } else if (destination === 'goal' && selectedGoalId) {
      onSubmit({
        destination: 'goal',
        data: {
          title: title.trim(),
          goalId: selectedGoalId,
          notes: notes.trim() || undefined,
        },
      })
    } else {
      // Default to inbox if goal not selected
      onSubmit({
        destination: 'inbox',
        data: {
          title: title.trim(),
          notes: notes.trim() || undefined,
        },
      })
    }

    onClose()
  }, [title, notes, destination, category, dueDate, link, saveToNotion, recurrenceInterval, recurrenceUnit, selectedGoalId, onSubmit, onClose])

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'Enter' && !e.shiftKey) {
        // Plain Enter - submit to current destination
        if (e.metaKey || e.ctrlKey) {
          if (e.shiftKey) {
            // ⌘+Shift+Enter - Goal
            setDestination('goal')
            setShowExpandedOptions(true)
          } else {
            // ⌘+Enter - Task
            e.preventDefault()
            handleDestinationChange('task')
            // Don't submit immediately, let user pick category
          }
        } else if (document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault()
          handleSubmit()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, handleSubmit])

  // Filter goals for search
  const filteredGoals = weeklyGoals.filter(g => 
    g.title.toLowerCase().includes(goalSearch.toLowerCase())
  )

  const canSubmit = title.trim() && (destination !== 'goal' || selectedGoalId)

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150 cursor-pointer"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-crust/80 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-surface0 rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-150 cursor-default max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚡</span>
            <span className="font-mono text-xs uppercase tracking-wider text-overlay1">
              Quick Capture
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-overlay1 hover:text-text transition-colors p-1 cursor-pointer"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title Input */}
          <div>
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's on your mind?"
              className="
                w-full
                bg-mantle
                border border-surface1
                rounded-xl
                px-4 py-3
                text-lg text-text
                placeholder:text-overlay0
                focus:outline-none focus:ring-2 focus:ring-blue/50 focus:border-blue
                transition-all duration-150
              "
              autoComplete="off"
            />
          </div>

          {/* Destination Selector */}
          <div>
            <label className="block text-xs text-overlay1 mb-2 font-mono uppercase tracking-wider">
              Add to:
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleDestinationChange('task')}
                className={`
                  flex-1 flex flex-col items-center gap-1
                  p-3 rounded-xl border-2 transition-all
                  ${destination === 'task'
                    ? 'border-green bg-green/10 text-text'
                    : 'border-surface1 bg-mantle text-overlay1 hover:border-surface2 hover:bg-surface0'
                  }
                `}
              >
                <span className="text-xl">☑️</span>
                <span className="text-xs font-medium">Task</span>
                <span className="text-xs text-overlay0">(today)</span>
              </button>
            </div>
          </div>

          {/* Notes (shown when expanded or for non-inbox) */}
          {(showExpandedOptions) && (
            <div>
              <label htmlFor="capture-notes" className="block text-xs text-overlay1 mb-1 font-mono uppercase tracking-wider">
                Notes (optional)
              </label>
              <textarea
                id="capture-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional details..."
                rows={2}
                className="
                  w-full
                  bg-mantle
                  border border-surface1
                  rounded-xl
                  px-4 py-2.5
                  text-text
                  placeholder:text-overlay0
                  focus:outline-none focus:ring-2 focus:ring-blue/50 focus:border-blue
                  transition-all duration-150
                  resize-none
                "
              />
            </div>
          )}

          {/* Task-specific options */}
          {destination === 'task' && (
            <div className="space-y-4 p-4 bg-mantle rounded-xl border border-surface1">
              {/* Category */}
              <div>
                <label className="block text-xs text-overlay1 mb-2 font-mono uppercase tracking-wider">
                  Category
                </label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setCategory(cat.value)}
                      className={`
                        flex items-center gap-2
                        px-3 py-1.5 rounded-lg
                        font-mono text-xs uppercase tracking-wider
                        cursor-pointer
                        transition-all duration-150
                        ${category === cat.value
                          ? 'bg-surface2 text-text'
                          : 'bg-transparent text-overlay1 hover:text-subtext1 hover:bg-surface1'
                        }
                      `}
                    >
                      <div className={`w-2 h-2 rounded-full ${cat.color}`} />
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label htmlFor="due-date" className="block text-xs text-overlay1 mb-1 font-mono uppercase tracking-wider">
                  Due Date
                </label>
                <input
                  id="due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="
                    w-full
                    bg-surface0
                    border border-surface1
                    rounded-lg
                    px-4 py-2
                    text-text
                    focus:outline-none focus:ring-2 focus:ring-green/50 focus:border-green
                    transition-all duration-150
                    [color-scheme:dark]
                  "
                />
              </div>

              {/* Link */}
              <div>
                <label htmlFor="task-link" className="block text-xs text-overlay1 mb-1 font-mono uppercase tracking-wider">
                  Link (optional)
                </label>
                <input
                  id="task-link"
                  type="url"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://..."
                  className="
                    w-full
                    bg-surface0
                    border border-surface1
                    rounded-lg
                    px-4 py-2
                    text-text
                    placeholder:text-overlay0
                    focus:outline-none focus:ring-2 focus:ring-green/50 focus:border-green
                    transition-all duration-150
                  "
                />
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-surface1">
            <div className="text-xs text-overlay0 space-y-0.5">
              <div><kbd className="px-1 py-0.5 bg-mantle rounded text-xs">Enter</kbd> add</div>
              <div><kbd className="px-1 py-0.5 bg-mantle rounded text-xs">⌘+Enter</kbd> task</div>
            </div>
            <button
              type="submit"
              disabled={!canSubmit}
              className={`
                px-4 py-2 rounded-lg
                font-mono text-xs uppercase tracking-wider
                transition-all duration-150
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface0
                cursor-pointer
                disabled:opacity-50 disabled:cursor-not-allowed
                ${destination === 'task' ? 'bg-green text-base hover:bg-green/90 focus:ring-green/50' : ''}
              `}
            >
              {destination === 'task' && 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export type { TaskSubmission, InboxSubmission, GoalSubmission, QuickCaptureSubmission }

