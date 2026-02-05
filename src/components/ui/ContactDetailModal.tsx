import { useEffect, useRef, useState } from 'react'
import type { Contact, UpdateContactInput } from '../../types'

type CheckInFrequency = 'Weekly' | 'Monthly' | 'Quarterly' | 'Annual'

interface ContactDetailModalProps {
  contact: Contact | null
  isOpen: boolean
  onClose: () => void
  onUpdateNotes: (contactId: string, notes: string) => Promise<void>
  onUpdateFrequency: (contactId: string, frequency: string) => Promise<void>
  onRecordCheckIn: (contactId: string) => Promise<void>
  onUpdate?: (contactId: string, updates: UpdateContactInput) => Promise<void>
  onDelete?: (contactId: string) => Promise<void>
}

// Parse a YYYY-MM-DD date string as local date (not UTC)
function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'Not set'
  
  const date = parseLocalDate(dateString)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const targetDate = new Date(date)
  targetDate.setHours(0, 0, 0, 0)
  
  const diffTime = targetDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
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

export function ContactDetailModal({
  contact,
  isOpen,
  onClose,
  onUpdateNotes,
  onUpdateFrequency,
  onRecordCheckIn,
  onUpdate,
  onDelete,
}: ContactDetailModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [editedNotes, setEditedNotes] = useState('')
  const [localNotes, setLocalNotes] = useState('')
  const [localFrequency, setLocalFrequency] = useState<CheckInFrequency>('Monthly')
  const [localLastCheckIn, setLocalLastCheckIn] = useState<string | undefined>()
  const [localNextCheckIn, setLocalNextCheckIn] = useState<string | undefined>()
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isEditingBirthday, setIsEditingBirthday] = useState(false)

  // Editable fields
  const [editName, setEditName] = useState('')
  const [editCompany, setEditCompany] = useState('')
  const [editKnownFor, setEditKnownFor] = useState('')
  const [editContactMethod, setEditContactMethod] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editBirthday, setEditBirthday] = useState('')

  // Sync local state with contact prop when modal opens or contact changes
  useEffect(() => {
    if (isOpen && contact) {
      setIsEditing(false)
      setIsEditingNotes(false)
      setEditedNotes(contact.notes || '')
      setLocalNotes(contact.notes || '')
      setLocalFrequency((contact.checkInFrequency as CheckInFrequency) || 'Monthly')
      setLocalLastCheckIn(contact.lastCheckIn)
      setLocalNextCheckIn(contact.nextCheckIn)
      setSaveMessage(null)
      setShowDeleteConfirm(false)
      setIsEditingBirthday(false)

      // Set editable fields
      setEditName(contact.name)
      setEditCompany(contact.company || '')
      setEditKnownFor(contact.knownFor || '')
      setEditContactMethod(contact.contactMethod || '')
      setEditEmail(contact.email || '')
      setEditPhone(contact.phone || '')
      setEditBirthday(contact.birthday || '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, contact?.id])

  // Keep dates in sync with external updates (e.g., after check-in)
  useEffect(() => {
    if (contact) {
      setLocalLastCheckIn(contact.lastCheckIn)
      setLocalNextCheckIn(contact.nextCheckIn)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact?.lastCheckIn, contact?.nextCheckIn])

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditingNotes) {
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
  }, [isOpen, onClose, isEditingNotes, localNotes])

  // Close on click outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleSaveNotes = async () => {
    if (!contact) return
    
    setIsSaving(true)
    try {
      await onUpdateNotes(contact.id, editedNotes)
      setLocalNotes(editedNotes)
      setIsEditingNotes(false)
      setSaveMessage('Notes saved!')
      setTimeout(() => setSaveMessage(null), 2000)
    } catch (error) {
      console.error('Error saving notes:', error)
      setSaveMessage('Error saving notes')
      setTimeout(() => setSaveMessage(null), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  const handleFrequencyChange = async (newFrequency: CheckInFrequency) => {
    if (!contact || newFrequency === localFrequency) return
    
    setIsSaving(true)
    try {
      await onUpdateFrequency(contact.id, newFrequency)
      setLocalFrequency(newFrequency)
      setSaveMessage('Frequency updated!')
      setTimeout(() => setSaveMessage(null), 2000)
    } catch (error) {
      console.error('Error updating frequency:', error)
      setSaveMessage('Error updating frequency')
      setTimeout(() => setSaveMessage(null), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  const handleRecordCheckIn = async () => {
    if (!contact) return

    setIsSaving(true)
    try {
      await onRecordCheckIn(contact.id)
      // Update local state with today's date
      const today = new Date().toISOString().split('T')[0]
      setLocalLastCheckIn(today)
      // The next check-in will be calculated server-side
      setSaveMessage('Check-in recorded!')
      setTimeout(() => setSaveMessage(null), 2000)
    } catch (error) {
      console.error('Error recording check-in:', error)
      setSaveMessage('Error recording check-in')
      setTimeout(() => setSaveMessage(null), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!contact || !onUpdate) return

    setIsSaving(true)
    try {
      await onUpdate(contact.id, {
        name: editName,
        company: editCompany || undefined,
        knownFor: editKnownFor || undefined,
        contactMethod: editContactMethod || undefined,
        email: editEmail || undefined,
        phone: editPhone || undefined,
        birthday: editBirthday || undefined,
      })
      setSaveMessage('Contact updated!')
      setIsEditing(false)
      setTimeout(() => setSaveMessage(null), 2000)
    } catch (error) {
      console.error('Error updating contact:', error)
      setSaveMessage('Error updating contact')
      setTimeout(() => setSaveMessage(null), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    // Reset to original values
    setEditName(contact?.name || '')
    setEditCompany(contact?.company || '')
    setEditKnownFor(contact?.knownFor || '')
    setEditContactMethod(contact?.contactMethod || '')
    setEditEmail(contact?.email || '')
    setEditPhone(contact?.phone || '')
    setEditBirthday(contact?.birthday || '')
    setIsEditing(false)
  }

  const handleSaveBirthday = async () => {
    if (!contact || !onUpdate) return

    setIsSaving(true)
    try {
      await onUpdate(contact.id, {
        birthday: editBirthday || undefined,
      })
      setSaveMessage('Birthday updated!')
      setIsEditingBirthday(false)
      setTimeout(() => setSaveMessage(null), 2000)
    } catch (error) {
      console.error('Error updating birthday:', error)
      setSaveMessage('Error updating birthday')
      setTimeout(() => setSaveMessage(null), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelBirthdayEdit = () => {
    setEditBirthday(contact?.birthday || '')
    setIsEditingBirthday(false)
  }

  const handleDelete = async () => {
    if (!contact || !onDelete) return

    setIsSaving(true)
    try {
      await onDelete(contact.id)
      setShowDeleteConfirm(false)
      onClose()
    } catch (error) {
      console.error('Error deleting contact:', error)
      setSaveMessage('Error deleting contact')
      setTimeout(() => setSaveMessage(null), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen || !contact) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-crust/80 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-detail-title"
    >
      <div
        ref={modalRef}
        className="bg-surface0 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="bg-mantle px-6 py-4 border-b border-surface1 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-10 h-10 rounded-full bg-teal/20 flex items-center justify-center text-teal font-medium text-lg">
                  {(isEditing ? editName : contact.name).charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 id="contact-detail-title" className="text-xl font-medium text-text">
                    {isEditing ? editName : contact.name}
                  </h2>
                  {!isEditing && contact.company && (
                    <p className="text-sm text-overlay1">{contact.company}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Edit/Save button */}
              {onUpdate && (
                isEditing ? (
                  <button
                    onClick={handleCancelEdit}
                    className="p-2 rounded-lg text-overlay1 hover:text-text hover:bg-surface1 transition-colors cursor-pointer"
                    aria-label="Cancel edit"
                    disabled={isSaving}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 rounded-lg text-overlay1 hover:text-teal hover:bg-teal/10 transition-colors cursor-pointer"
                    aria-label="Edit contact"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                )
              )}
              {/* Delete button */}
              {onDelete && !isEditing && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 rounded-lg text-overlay1 hover:text-red hover:bg-red/10 transition-colors cursor-pointer"
                  aria-label="Delete contact"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
              {/* Close button */}
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
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Delete confirmation */}
          {showDeleteConfirm && (
            <div className="bg-red/10 border border-red/30 rounded-xl p-4">
              <p className="text-sm text-red font-medium mb-3">
                Are you sure you want to delete this contact? This action cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 rounded-lg text-sm text-overlay1 hover:text-text hover:bg-surface1 transition-colors cursor-pointer"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isSaving}
                  className="px-3 py-1.5 rounded-lg text-sm bg-red text-base hover:bg-red/90 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          )}

          {/* Save message toast */}
          {saveMessage && (
            <div className={`px-3 py-2 rounded-lg text-sm font-medium ${
              saveMessage.includes('Error')
                ? 'bg-red/20 text-red'
                : 'bg-green/20 text-green'
            }`}>
              {saveMessage}
            </div>
          )}

          {/* Edit Form */}
          {isEditing ? (
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-sm text-overlay1 block mb-1">Name *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-mantle border border-surface1 rounded-lg p-2.5 text-sm text-text placeholder:text-overlay0 focus:outline-none focus:ring-2 focus:ring-teal/50 focus:border-teal transition-all"
                  placeholder="Contact name"
                  required
                />
              </div>

              {/* Company */}
              <div>
                <label className="text-sm text-overlay1 block mb-1">Company</label>
                <input
                  type="text"
                  value={editCompany}
                  onChange={(e) => setEditCompany(e.target.value)}
                  className="w-full bg-mantle border border-surface1 rounded-lg p-2.5 text-sm text-text placeholder:text-overlay0 focus:outline-none focus:ring-2 focus:ring-teal/50 focus:border-teal transition-all"
                  placeholder="Company name"
                />
              </div>

              {/* Known For */}
              <div>
                <label className="text-sm text-overlay1 block mb-1">Known For</label>
                <input
                  type="text"
                  value={editKnownFor}
                  onChange={(e) => setEditKnownFor(e.target.value)}
                  className="w-full bg-mantle border border-surface1 rounded-lg p-2.5 text-sm text-text placeholder:text-overlay0 focus:outline-none focus:ring-2 focus:ring-teal/50 focus:border-teal transition-all"
                  placeholder="What are they known for?"
                />
              </div>

              {/* Contact Method */}
              <div>
                <label className="text-sm text-overlay1 block mb-1">Preferred Contact Method</label>
                <input
                  type="text"
                  value={editContactMethod}
                  onChange={(e) => setEditContactMethod(e.target.value)}
                  className="w-full bg-mantle border border-surface1 rounded-lg p-2.5 text-sm text-text placeholder:text-overlay0 focus:outline-none focus:ring-2 focus:ring-teal/50 focus:border-teal transition-all"
                  placeholder="e.g., Coffee, Email, Phone"
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-sm text-overlay1 block mb-1">Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-mantle border border-surface1 rounded-lg p-2.5 text-sm text-text placeholder:text-overlay0 focus:outline-none focus:ring-2 focus:ring-teal/50 focus:border-teal transition-all"
                  placeholder="email@example.com"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="text-sm text-overlay1 block mb-1">Phone</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-mantle border border-surface1 rounded-lg p-2.5 text-sm text-text placeholder:text-overlay0 focus:outline-none focus:ring-2 focus:ring-teal/50 focus:border-teal transition-all"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              {/* Birthday */}
              <div>
                <label className="text-sm text-overlay1 block mb-1">🎂 Birthday</label>
                <input
                  type="date"
                  value={editBirthday}
                  onChange={(e) => setEditBirthday(e.target.value)}
                  className="w-full bg-mantle border border-surface1 rounded-lg p-2.5 text-sm text-text placeholder:text-overlay0 focus:outline-none focus:ring-2 focus:ring-teal/50 focus:border-teal transition-all cursor-pointer"
                />
              </div>

              {/* Save Button */}
              <button
                onClick={handleSaveEdit}
                disabled={isSaving || !editName.trim()}
                className="w-full py-3 rounded-xl bg-teal text-base font-medium hover:bg-teal/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          ) : (
            <>
              {/* Known For (view mode) */}
              {contact.knownFor && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-overlay1">Known For</span>
                  <span className="text-sm font-medium text-text">{contact.knownFor}</span>
                </div>
              )}

              {/* Birthday (view mode) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-overlay1">🎂 Birthday</span>
                  {!isEditingBirthday && onUpdate && (
                    <button
                      onClick={() => {
                        setEditBirthday(contact.birthday || '')
                        setIsEditingBirthday(true)
                      }}
                      className="text-xs text-teal hover:text-teal/80 transition-colors cursor-pointer"
                    >
                      {contact.birthday ? 'Edit' : 'Add birthday'}
                    </button>
                  )}
                </div>
                {isEditingBirthday ? (
                  <div className="space-y-2">
                    <input
                      type="date"
                      value={editBirthday}
                      onChange={(e) => setEditBirthday(e.target.value)}
                      className="w-full bg-mantle border border-surface1 rounded-lg p-2.5 text-sm text-text placeholder:text-overlay0 focus:outline-none focus:ring-2 focus:ring-teal/50 focus:border-teal transition-all cursor-pointer"
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={handleCancelBirthdayEdit}
                        className="px-3 py-1.5 rounded-lg text-sm text-overlay1 hover:text-text hover:bg-surface1 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveBirthday}
                        disabled={isSaving}
                        className="px-3 py-1.5 rounded-lg text-sm bg-teal text-base hover:bg-teal/90 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : contact.birthday ? (
                  <span className="text-sm font-medium text-text">
                    {new Date(contact.birthday + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                  </span>
                ) : (
                  <span className="text-sm text-overlay0 italic">Not set</span>
                )}
              </div>

              {/* Check-in Frequency */}
              <div>
                <span className="text-sm text-overlay1 block mb-2">Check-in Frequency</span>
                <div className="flex gap-2 flex-wrap">
                  {(['Weekly', 'Monthly', 'Quarterly', 'Annual'] as CheckInFrequency[]).map((freq) => (
                    <button
                      key={freq}
                      onClick={() => handleFrequencyChange(freq)}
                      disabled={isSaving}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 ${
                        localFrequency === freq
                          ? 'bg-teal text-base'
                          : 'bg-surface1 text-overlay1 hover:bg-surface2'
                      }`}
                    >
                      {freq}
                    </button>
                  ))}
                </div>
              </div>

              {/* Last Check-in */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-overlay1">Last Check-in</span>
                <span className="text-sm font-medium text-text">
                  {localLastCheckIn ? formatDate(localLastCheckIn) : 'Never'}
                </span>
              </div>

              {/* Next Check-in */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-overlay1">Next Check-in</span>
                <span className={`text-sm font-medium ${
                  localNextCheckIn && parseLocalDate(localNextCheckIn) < new Date(new Date().setHours(0, 0, 0, 0))
                    ? 'text-red'
                    : 'text-text'
                }`}>
                  {localNextCheckIn ? formatDate(localNextCheckIn) : 'Not scheduled'}
                </span>
              </div>

              {/* Record Check-in Button */}
              <button
                onClick={handleRecordCheckIn}
                disabled={isSaving}
                className="w-full py-3 rounded-xl bg-teal text-base font-medium hover:bg-teal/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {isSaving ? 'Recording...' : 'Record Check-in Today'}
              </button>

              {/* Contact Method */}
              {contact.contactMethod && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-overlay1">Contact Method</span>
                  <span className="text-sm font-medium text-text">{contact.contactMethod}</span>
                </div>
              )}

              {/* Email */}
              {contact.email && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-overlay1">Email</span>
                  <a href={`mailto:${contact.email}`} className="text-sm font-medium text-teal hover:underline">
                    {contact.email}
                  </a>
                </div>
              )}

              {/* Phone */}
              {contact.phone && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-overlay1">Phone</span>
                  <a href={`tel:${contact.phone}`} className="text-sm font-medium text-teal hover:underline">
                    {contact.phone}
                  </a>
                </div>
              )}
            </>
          )}

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
                  className="text-xs text-teal hover:text-teal/80 transition-colors cursor-pointer"
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
                  placeholder="Add notes about this contact..."
                  rows={4}
                  className="w-full bg-mantle border border-surface1 rounded-lg p-3 text-sm text-text placeholder:text-overlay0 focus:outline-none focus:ring-2 focus:ring-teal/50 focus:border-teal transition-all resize-none"
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
                    disabled={isSaving}
                    className="px-3 py-1.5 rounded-lg text-sm bg-teal text-base hover:bg-teal/90 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save'}
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
        </div>

        {/* Footer */}
        <div className="bg-mantle px-6 py-4 border-t border-surface1 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-lg text-overlay1 hover:text-text hover:bg-surface1 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
