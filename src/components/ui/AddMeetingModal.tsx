import { useEffect, useRef, useState } from 'react'
import type { TaskCategory } from '../../types'

interface AddMeetingModalProps {
  isOpen: boolean
  onClose: () => void
  onAddMeeting: (meetingData: {
    title: string
    date: string
    time: string
    category: TaskCategory
    link?: string
  }) => Promise<void>
  initialDate?: string
}

export function AddMeetingModal({
  isOpen,
  onClose,
  onAddMeeting,
  initialDate,
}: AddMeetingModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0])
  const [time, setTime] = useState('09:00')
  const [category, setCategory] = useState<TaskCategory>('work')
  const [link, setLink] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle('')
      setDate(initialDate || new Date().toISOString().split('T')[0])
      setTime('09:00')
      setCategory('work')
      setLink('')
      setError(null)
      // Focus the title input after a short delay
      setTimeout(() => titleInputRef.current?.focus(), 100)
    }
  }, [isOpen, initialDate])

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
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
  }, [isOpen, onClose])

  // Close on click outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim()) {
      setError('Title is required')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await onAddMeeting({
        title: title.trim(),
        date,
        time,
        category,
        link: link.trim() || undefined,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add meeting')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-crust/80 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-meeting-title"
    >
      <div
        ref={modalRef}
        className="bg-surface0 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="bg-mantle px-6 py-4 border-b border-surface1">
          <div className="flex items-center justify-between">
            <h2 id="add-meeting-title" className="text-lg font-medium text-text">
              Add New Meeting
            </h2>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Error message */}
          {error && (
            <div className="bg-red/20 text-red px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="meeting-title" className="block text-sm text-overlay1 mb-2">
              Meeting Title <span className="text-red">*</span>
            </label>
            <input
              ref={titleInputRef}
              id="meeting-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Team standup, Client call"
              className="w-full bg-mantle border border-surface1 rounded-lg px-3 py-2 text-text placeholder:text-overlay0 focus:outline-none focus:ring-2 focus:ring-mauve/50 focus:border-mauve transition-all"
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="meeting-date" className="block text-sm text-overlay1 mb-2">
                Date <span className="text-red">*</span>
              </label>
              <input
                id="meeting-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="
                  w-full bg-mantle border border-surface1 rounded-lg px-3 py-2 text-text
                  focus:outline-none focus:ring-2 focus:ring-mauve/50 focus:border-mauve
                  transition-all cursor-pointer
                  [color-scheme:dark]
                "
              />
            </div>

            <div>
              <label htmlFor="meeting-time" className="block text-sm text-overlay1 mb-2">
                Time <span className="text-red">*</span>
              </label>
              <input
                id="meeting-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="
                  w-full bg-mantle border border-surface1 rounded-lg px-3 py-2 text-text
                  focus:outline-none focus:ring-2 focus:ring-mauve/50 focus:border-mauve
                  transition-all cursor-pointer
                  [color-scheme:dark]
                "
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm text-overlay1 mb-2">
              Category <span className="text-red">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['work', 'home', 'personal', 'side-project'] as TaskCategory[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`
                    px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer
                    ${category === cat
                      ? 'bg-mauve text-base ring-2 ring-mauve/50'
                      : 'bg-surface1 text-overlay1 hover:bg-surface2 hover:text-text'
                    }
                  `}
                >
                  {cat === 'side-project' ? 'side project' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Meeting Link */}
          <div>
            <label htmlFor="meeting-link" className="block text-sm text-overlay1 mb-2">
              Meeting Link <span className="text-overlay0">(optional)</span>
            </label>
            <input
              id="meeting-link"
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="e.g., https://zoom.us/j/123456789"
              className="w-full bg-mantle border border-surface1 rounded-lg px-3 py-2 text-text placeholder:text-overlay0 focus:outline-none focus:ring-2 focus:ring-mauve/50 focus:border-mauve transition-all"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg text-overlay1 hover:text-text hover:bg-surface1 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="flex-1 px-4 py-2.5 rounded-lg bg-teal text-base font-medium hover:bg-teal/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Adding...' : 'Add Meeting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
