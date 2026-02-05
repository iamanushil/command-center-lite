import { useEffect, useRef, useState } from 'react'

type CheckInFrequency = 'Weekly' | 'Monthly' | 'Quarterly' | 'Annual'

interface AddContactModalProps {
  isOpen: boolean
  onClose: () => void
  onAddContact: (contactData: {
    name: string
    knownFor: string
    checkInFrequency: CheckInFrequency
    lastCheckIn: string
    birthday?: string
  }) => Promise<void>
}

export function AddContactModal({
  isOpen,
  onClose,
  onAddContact,
}: AddContactModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  
  const [name, setName] = useState('')
  const [knownFor, setKnownFor] = useState('')
  const [checkInFrequency, setCheckInFrequency] = useState<CheckInFrequency>('Monthly')
  const [lastCheckIn, setLastCheckIn] = useState('')
  const [birthday, setBirthday] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName('')
      setKnownFor('')
      setCheckInFrequency('Monthly')
      setLastCheckIn(new Date().toISOString().split('T')[0]) // Default to today
      setBirthday('')
      setError(null)
      // Focus the name input after a short delay
      setTimeout(() => nameInputRef.current?.focus(), 100)
    }
  }, [isOpen])

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
    
    if (!name.trim()) {
      setError('Name is required')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await onAddContact({
        name: name.trim(),
        knownFor: knownFor.trim(),
        checkInFrequency,
        lastCheckIn,
        birthday: birthday || undefined,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add contact')
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
      aria-labelledby="add-contact-title"
    >
      <div
        ref={modalRef}
        className="bg-surface0 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="bg-mantle px-6 py-4 border-b border-surface1">
          <div className="flex items-center justify-between">
            <h2 id="add-contact-title" className="text-lg font-medium text-text">
              Add New Contact
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

          {/* Name */}
          <div>
            <label htmlFor="contact-name" className="block text-sm text-overlay1 mb-2">
              Name <span className="text-red">*</span>
            </label>
            <input
              ref={nameInputRef}
              id="contact-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contact name"
              className="w-full bg-mantle border border-surface1 rounded-lg px-3 py-2 text-text placeholder:text-overlay0 focus:outline-none focus:ring-2 focus:ring-mauve/50 focus:border-mauve transition-all"
            />
          </div>

          {/* Known for */}
          <div>
            <label htmlFor="known-for" className="block text-sm text-overlay1 mb-2">
              Known for
            </label>
            <input
              id="known-for"
              type="text"
              value={knownFor}
              onChange={(e) => setKnownFor(e.target.value)}
              placeholder="e.g., Work colleague, College friend, etc."
              className="w-full bg-mantle border border-surface1 rounded-lg px-3 py-2 text-text placeholder:text-overlay0 focus:outline-none focus:ring-2 focus:ring-mauve/50 focus:border-mauve transition-all"
            />
          </div>

          {/* Check-in Frequency */}
          <div>
            <label htmlFor="check-in-frequency" className="block text-sm text-overlay1 mb-2">
              Check-in Frequency
            </label>
            <select
              id="check-in-frequency"
              value={checkInFrequency}
              onChange={(e) => setCheckInFrequency(e.target.value as CheckInFrequency)}
              className="w-full bg-mantle border border-surface1 rounded-lg px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-mauve/50 focus:border-mauve transition-all cursor-pointer"
            >
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Annual">Annual</option>
            </select>
          </div>

          {/* Last Check-in Date */}
          <div>
            <label htmlFor="last-check-in" className="block text-sm text-overlay1 mb-2">
              Last Check-in
            </label>
            <input
              id="last-check-in"
              type="date"
              value={lastCheckIn}
              onChange={(e) => setLastCheckIn(e.target.value)}
              className="w-full bg-mantle border border-surface1 rounded-lg px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-mauve/50 focus:border-mauve transition-all cursor-pointer"
            />
            <p className="text-xs text-overlay0 mt-1">
              Next check-in will be calculated based on frequency
            </p>
          </div>

          {/* Birthday */}
          <div>
            <label htmlFor="birthday" className="block text-sm text-overlay1 mb-2">
              Birthday
            </label>
            <input
              id="birthday"
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              className="w-full bg-mantle border border-surface1 rounded-lg px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-mauve/50 focus:border-mauve transition-all cursor-pointer"
            />
            <p className="text-xs text-overlay0 mt-1">
              🎂 You'll be reminded to wish them happy birthday
            </p>
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
              disabled={isSubmitting || !name.trim()}
              className="flex-1 px-4 py-2.5 rounded-lg bg-teal text-base font-medium hover:bg-teal/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Adding...' : 'Add Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
