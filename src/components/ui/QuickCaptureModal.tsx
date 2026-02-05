import { useState, useEffect, useRef, useCallback } from 'react'
import type { TaskCategory } from '../../types'

interface TaskSubmission {
  title: string
  category: TaskCategory
  dueDate?: string
  notes?: string
  link?: string
  saveToNotion: false
}

interface QuickCaptureSubmission {
  destination: 'task'
  data: TaskSubmission
}

interface QuickCaptureModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (submission: QuickCaptureSubmission) => void
}

const categories: { value: TaskCategory; label: string; color: string }[] = [
  { value: 'work', label: 'Work', color: 'bg-green' },
  { value: 'home', label: 'Home', color: 'bg-blue' },
  { value: 'personal', label: 'Personal', color: 'bg-mauve' },
  { value: 'side-project', label: 'Side Project', color: 'bg-peach' },
]

function getTodayString(): string {
  return new Date().toISOString().split('T')[0]
}

export function QuickCaptureModal({ isOpen, onClose, onSubmit }: QuickCaptureModalProps) {
  // Basic state
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  
  // Task-specific state
  const [category, setCategory] = useState<TaskCategory>('work')
  const [dueDate, setDueDate] = useState(getTodayString())
  const [link, setLink] = useState('')
  
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
  useEffect(() => {
    if (isOpen) {
      setTitle('')
      setNotes('')
      setCategory('work')
      setDueDate(getTodayString())
      setLink('')
      setShowExpandedOptions(false)
    }
  }, [isOpen])

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault()
    if (!title.trim()) return

    onSubmit({
      destination: 'task',
      data: {
        title: title.trim(),
        category,
        dueDate: dueDate || undefined,
        notes: notes.trim() || undefined,
        link: link.trim() || undefined,
        saveToNotion: false,
      },
    })

    onClose()
  }, [title, notes, category, dueDate, link, onSubmit, onClose])

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'Enter' && !e.shiftKey) {
        if (document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault()
          handleSubmit()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, handleSubmit])

  const canSubmit = title.trim().length > 0

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
              placeholder="What do you need to do?"
              className="
                w-full
                bg-mantle
                border border-surface1
                rounded-xl
                px-4 py-3
                text-lg text-text
                placeholder:text-overlay0
                focus:outline-none focus:ring-2 focus:ring-green/50 focus:border-green
                transition-all duration-150
              "
              autoComplete="off"
            />
          </div>

          {/* Expand/Collapse Options */}
          {!showExpandedOptions && (
            <button
              type="button"
              onClick={() => setShowExpandedOptions(true)}
              className="w-full p-2 text-xs text-overlay1 hover:text-text transition-colors"
            >
              + Add details
            </button>
          )}

          {/* Task options */}
          {showExpandedOptions && (
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

              {/* Notes */}
              <div>
                <label htmlFor="task-notes" className="block text-xs text-overlay1 mb-1 font-mono uppercase tracking-wider">
                  Notes (optional)
                </label>
                <textarea
                  id="task-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional details..."
                  rows={2}
                  className="
                    w-full
                    bg-surface0
                    border border-surface1
                    rounded-lg
                    px-4 py-2.5
                    text-text
                    placeholder:text-overlay0
                    focus:outline-none focus:ring-2 focus:ring-green/50 focus:border-green
                    transition-all duration-150
                    resize-none
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
            <div className="text-xs text-overlay0">
              <kbd className="px-1 py-0.5 bg-mantle rounded text-xs">Enter</kbd> to create task
            </div>
            <button
              type="submit"
              disabled={!canSubmit}
              className="
                px-4 py-2 rounded-lg
                font-mono text-xs uppercase tracking-wider
                bg-green text-base hover:bg-green/90
                transition-all duration-150
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface0 focus:ring-green/50
                cursor-pointer
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export type { TaskSubmission, QuickCaptureSubmission }
