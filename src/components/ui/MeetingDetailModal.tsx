import { useEffect, useRef, useState } from 'react'
import type { Meeting, TaskCategory, Contact, MeetingSource } from '../../types'
import { Badge }from './Badge'

interface MeetingDetailModalProps {
  meeting: Meeting | null
  isOpen: boolean
  onClose: () => void
  onUpdate: (id: string, updates: Partial<Pick<Meeting, 'title' | 'date' | 'time' | 'notes' | 'link'>>) => void
  onDelete: (id: string) => void | Promise<void>
  getCategoryColor: (category: TaskCategory) => string
  // Contact support
  allContacts?: Contact[]
  onGetMeetingContacts?: (meetingId: string) => Promise<Contact[]>
  onSetMeetingContacts?: (meetingId: string, contactIds: string[]) => Promise<Contact[]>
  // Block meeting support (for synced meetings)
  onBlockMeetingTitle?: (title: string) => Promise<void>
}

const categoryBadgeColors: Record<TaskCategory, 'green' | 'blue' | 'mauve' | 'peach'> = {
  work: 'green',
  home: 'blue',
  personal: 'mauve',
  'side-project': 'peach',
}

function formatDate(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(timeString: string): string {
  const [hours, minutes] = timeString.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
}

export function MeetingDetailModal({
  meeting,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  getCategoryColor,
  allContacts = [],
  onGetMeetingContacts,
  onSetMeetingContacts,
  onBlockMeetingTitle,
}: MeetingDetailModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [localNotes, setLocalNotes] = useState('')
  const [localDate, setLocalDate] = useState('')
  const [localTime, setLocalTime] = useState('')
  const [localLink, setLocalLink] = useState('')
  const [localTitle, setLocalTitle] = useState('')
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [isEditingDate, setIsEditingDate] = useState(false)
  const [isEditingTime, setIsEditingTime] = useState(false)
  const [isEditingLink, setIsEditingLink] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showBlockConfirm, setShowBlockConfirm] = useState(false)

  // Contact state
  const [linkedContacts, setLinkedContacts] = useState<Contact[]>([])
  const [isEditingContacts, setIsEditingContacts] = useState(false)
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([])
  const [contactSearchQuery, setContactSearchQuery] = useState('')

  // Update local state when meeting changes
  useEffect(() => {
    if (meeting) {
      setLocalNotes(meeting.notes || '')
      setLocalDate(meeting.date)
      setLocalTime(meeting.time)
      setLocalLink(meeting.link || '')
      setLocalTitle(meeting.title)
      setIsEditingContacts(false)
      setIsEditingTitle(false)
      setContactSearchQuery('')

      // Load linked contacts
      if (onGetMeetingContacts) {
        onGetMeetingContacts(meeting.id).then(contacts => {
          setLinkedContacts(contacts)
          setSelectedContactIds(contacts.map(c => c.id))
        }).catch(err => {
          console.error('Error loading meeting contacts:', err)
          setLinkedContacts([])
          setSelectedContactIds([])
        })
      } else {
        setLinkedContacts(meeting.contacts || [])
        setSelectedContactIds((meeting.contacts || []).map(c => c.id))
      }
    }
  }, [meeting, onGetMeetingContacts])

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isEditingNotes && !isEditingDate && !isEditingTime && !isEditingLink && !showDeleteConfirm && !showBlockConfirm) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isEditingNotes, isEditingDate, isEditingTime, isEditingLink, showDeleteConfirm, showBlockConfirm, onClose])

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleSaveNotes = () => {
    if (meeting) {
      onUpdate(meeting.id, { notes: localNotes })
      setIsEditingNotes(false)
      setSaveMessage('Notes saved!')
      setTimeout(() => setSaveMessage(null), 2000)
    }
  }

  const handleSaveDate = () => {
    if (meeting) {
      onUpdate(meeting.id, { date: localDate })
      setIsEditingDate(false)
      setSaveMessage('Date updated!')
      setTimeout(() => setSaveMessage(null), 2000)
    }
  }

  const handleSaveTime = () => {
    if (meeting) {
      onUpdate(meeting.id, { time: localTime })
      setIsEditingTime(false)
      setSaveMessage('Time updated!')
      setTimeout(() => setSaveMessage(null), 2000)
    }
  }

  const handleSaveLink = () => {
    if (meeting) {
      onUpdate(meeting.id, { link: localLink.trim() || undefined })
      setIsEditingLink(false)
      setSaveMessage('Link updated!')
      setTimeout(() => setSaveMessage(null), 2000)
    }
  }

  const handleDelete = async () => {
    if (meeting) {
      try {
        await onDelete(meeting.id)
        onClose()
      } catch (error) {
        console.error('Failed to delete meeting:', error)
      }
    }
  }

  const handleBlockAndDelete = async () => {
    if (meeting && onBlockMeetingTitle) {
      try {
        // First block the meeting title so it won't sync again
        await onBlockMeetingTitle(meeting.title)
        // Then delete the meeting
        await onDelete(meeting.id)
        setSaveMessage('Meeting blocked! It won\'t sync again.')
        setTimeout(() => {
          setSaveMessage(null)
          onClose()
        }, 1500)
      } catch (error) {
        console.error('Failed to block meeting:', error)
      }
    }
  }

  const handleToggleContact = (contactId: string) => {
    setSelectedContactIds(prev => {
      if (prev.includes(contactId)) {
        return prev.filter(id => id !== contactId)
      } else {
        return [...prev, contactId]
      }
    })
  }

  const handleSaveContacts = async () => {
    if (meeting && onSetMeetingContacts) {
      try {
        const contacts = await onSetMeetingContacts(meeting.id, selectedContactIds)
        setLinkedContacts(contacts)
        setIsEditingContacts(false)
        setSaveMessage('Contacts updated!')
        setTimeout(() => setSaveMessage(null), 2000)
      } catch (error) {
        console.error('Failed to update meeting contacts:', error)
      }
    }
  }

  const handleCancelContactEdit = () => {
    setSelectedContactIds(linkedContacts.map(c => c.id))
    setIsEditingContacts(false)
    setContactSearchQuery('')
  }

  // Filter contacts for the search
  const filteredContacts = allContacts.filter(contact => {
    if (!contactSearchQuery.trim()) return true
    const query = contactSearchQuery.toLowerCase()
    return contact.name.toLowerCase().includes(query) ||
           contact.company?.toLowerCase().includes(query)
  })

  if (!isOpen || !meeting) return null

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
        aria-labelledby="meeting-detail-title"
      >
        {/* Header */}
        <div className="p-6 border-b border-surface1">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {isEditingTitle ? (
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={localTitle}
                    onChange={(e) => setLocalTitle(e.target.value)}
                    className="flex-1 bg-base text-text border border-surface2 rounded-lg px-3 py-1.5 text-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue/50"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (localTitle.trim() && localTitle !== meeting.title) {
                          onUpdate(meeting.id, { title: localTitle.trim() })
                          setSaveMessage('Title saved!')
                          setTimeout(() => setSaveMessage(null), 2000)
                        }
                        setIsEditingTitle(false)
                      } else if (e.key === 'Escape') {
                        setLocalTitle(meeting.title)
                        setIsEditingTitle(false)
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (localTitle.trim() && localTitle !== meeting.title) {
                        onUpdate(meeting.id, { title: localTitle.trim() })
                        setSaveMessage('Title saved!')
                        setTimeout(() => setSaveMessage(null), 2000)
                      }
                      setIsEditingTitle(false)
                    }}
                    className="px-2 py-1 text-xs bg-blue text-base rounded hover:bg-blue/90 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setLocalTitle(meeting.title)
                      setIsEditingTitle(false)
                    }}
                    className="px-2 py-1 text-xs text-overlay1 hover:text-text transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <h2 
                  id="meeting-detail-title" 
                  className="text-xl font-medium text-text mb-2 cursor-pointer hover:text-blue transition-colors group"
                  onClick={() => setIsEditingTitle(true)}
                  title="Click to edit title"
                >
                  {meeting.title}
                  <span className="ml-2 text-xs text-overlay1 opacity-0 group-hover:opacity-100 transition-opacity">✎</span>
                </h2>
              )}
              <div className="flex items-center gap-2">
                <Badge color={categoryBadgeColors[meeting.category]}>
                  {meeting.category}
                </Badge>
                {meeting.done && (
                  <span className="text-xs text-green font-medium">✓ Complete</span>
                )}
              </div>
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Date */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-overlay1">Date</span>
              {!isEditingDate && (
                <button
                  onClick={() => setIsEditingDate(true)}
                  className="text-xs text-blue hover:text-blue/80 transition-colors cursor-pointer"
                >
                  Edit
                </button>
              )}
            </div>
            {isEditingDate ? (
              <div className="space-y-2">
                <input
                  type="date"
                  value={localDate}
                  onChange={(e) => setLocalDate(e.target.value)}
                  className="w-full bg-mantle border border-surface1 rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-blue/50 focus:border-blue transition-all"
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setIsEditingDate(false)
                      setLocalDate(meeting.date)
                    }}
                    className="px-3 py-1.5 rounded-lg text-sm text-overlay1 hover:text-text hover:bg-surface1 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveDate}
                    className="px-3 py-1.5 rounded-lg text-sm bg-blue text-base hover:bg-blue/90 transition-colors cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <span className="text-sm text-text font-medium block">{formatDate(meeting.date)}</span>
            )}
          </div>

          {/* Time */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-overlay1">Time</span>
              {!isEditingTime && (
                <button
                  onClick={() => setIsEditingTime(true)}
                  className="text-xs text-blue hover:text-blue/80 transition-colors cursor-pointer"
                >
                  Edit
                </button>
              )}
            </div>
            {isEditingTime ? (
              <div className="space-y-2">
                <input
                  type="time"
                  value={localTime}
                  onChange={(e) => setLocalTime(e.target.value)}
                  className="w-full bg-mantle border border-surface1 rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-blue/50 focus:border-blue transition-all"
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setIsEditingTime(false)
                      setLocalTime(meeting.time)
                    }}
                    className="px-3 py-1.5 rounded-lg text-sm text-overlay1 hover:text-text hover:bg-surface1 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveTime}
                    className="px-3 py-1.5 rounded-lg text-sm bg-blue text-base hover:bg-blue/90 transition-colors cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <span className="text-sm text-text font-medium block">{formatTime(meeting.time)}</span>
            )}
          </div>

          {/* Meeting Link */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-overlay1">Meeting Link</span>
              {!isEditingLink && (
                <button
                  onClick={() => setIsEditingLink(true)}
                  className="text-xs text-blue hover:text-blue/80 transition-colors cursor-pointer"
                >
                  {localLink ? 'Edit' : 'Add'}
                </button>
              )}
            </div>
            {isEditingLink ? (
              <div className="space-y-2">
                <input
                  type="url"
                  value={localLink}
                  onChange={(e) => setLocalLink(e.target.value)}
                  placeholder="https://zoom.us/j/123456789"
                  className="w-full bg-mantle border border-surface1 rounded-lg px-3 py-2 text-sm text-text placeholder:text-overlay0 focus:outline-none focus:ring-2 focus:ring-blue/50 focus:border-blue transition-all"
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setIsEditingLink(false)
                      setLocalLink(meeting.link || '')
                    }}
                    className="px-3 py-1.5 rounded-lg text-sm text-overlay1 hover:text-text hover:bg-surface1 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveLink}
                    className="px-3 py-1.5 rounded-lg text-sm bg-blue text-base hover:bg-blue/90 transition-colors cursor-pointer"
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
                className="text-sm text-blue hover:text-blue/80 transition-colors truncate block"
                onClick={(e) => e.stopPropagation()}
              >
                {localLink}
              </a>
            ) : (
              <span className="text-sm text-overlay0 italic">No link added</span>
            )}
          </div>

          {/* Contacts Section */}
          {(onSetMeetingContacts || linkedContacts.length > 0) && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm text-overlay1 font-medium uppercase tracking-wider">
                  Contacts
                </h3>
                {onSetMeetingContacts && !isEditingContacts && (
                  <button
                    onClick={() => setIsEditingContacts(true)}
                    className="text-xs text-blue hover:text-blue/80 transition-colors cursor-pointer"
                  >
                    {linkedContacts.length > 0 ? 'Edit' : 'Add contacts'}
                  </button>
                )}
              </div>
              {isEditingContacts ? (
                <div className="space-y-3">
                  {/* Search input */}
                  <input
                    type="text"
                    value={contactSearchQuery}
                    onChange={(e) => setContactSearchQuery(e.target.value)}
                    placeholder="Search contacts..."
                    className="w-full bg-mantle border border-surface1 rounded-lg px-3 py-2 text-sm text-text placeholder:text-overlay0 focus:outline-none focus:ring-2 focus:ring-blue/50 focus:border-blue transition-all"
                  />
                  {/* Contact list */}
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {filteredContacts.length > 0 ? (
                      filteredContacts.map(contact => (
                        <button
                          key={contact.id}
                          onClick={() => handleToggleContact(contact.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                            selectedContactIds.includes(contact.id)
                              ? 'bg-teal/20 text-teal'
                              : 'bg-mantle hover:bg-surface1 text-text'
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                            selectedContactIds.includes(contact.id)
                              ? 'bg-teal text-base'
                              : 'bg-surface1 text-overlay1'
                          }`}>
                            {contact.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm truncate block">{contact.name}</span>
                            {contact.company && (
                              <span className="text-xs text-overlay1 truncate block">{contact.company}</span>
                            )}
                          </div>
                          {selectedContactIds.includes(contact.id) && (
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      ))
                    ) : (
                      <p className="text-sm text-overlay0 italic py-2">
                        {contactSearchQuery ? 'No contacts found' : 'No contacts available'}
                      </p>
                    )}
                  </div>
                  {/* Save/Cancel buttons */}
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={handleCancelContactEdit}
                      className="px-3 py-1.5 rounded-lg text-sm text-overlay1 hover:text-text hover:bg-surface1 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveContacts}
                      className="px-3 py-1.5 rounded-lg text-sm bg-blue text-base hover:bg-blue/90 transition-colors cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : linkedContacts.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {linkedContacts.map(contact => (
                    <div
                      key={contact.id}
                      className="flex items-center gap-2 bg-mantle px-3 py-1.5 rounded-lg"
                    >
                      <div className="w-5 h-5 rounded-full bg-teal/20 flex items-center justify-center text-teal text-xs font-medium">
                        {contact.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-text">{contact.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-overlay0 italic">No contacts linked</p>
              )}
            </div>
          )}

          {/* Notes Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm text-overlay1 font-medium uppercase tracking-wider">
                Notes
              </h3>
              {!isEditingNotes && (
                <button
                  onClick={() => setIsEditingNotes(true)}
                  className="text-xs text-blue hover:text-blue/80 transition-colors cursor-pointer"
                >
                  {localNotes ? 'Edit' : 'Add notes'}
                </button>
              )}
            </div>
            {isEditingNotes ? (
              <div className="space-y-2">
                <textarea
                  value={localNotes}
                  onChange={(e) => setLocalNotes(e.target.value)}
                  placeholder="Add notes about this meeting..."
                  rows={6}
                  className="w-full bg-mantle border border-surface1 rounded-lg p-3 text-sm text-text placeholder:text-overlay0 focus:outline-none focus:ring-2 focus:ring-mauve/50 focus:border-mauve transition-all resize-none"
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setIsEditingNotes(false)
                      setLocalNotes(meeting.notes || '')
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
              <div className="text-sm text-text bg-mantle rounded-lg p-3 whitespace-pre-wrap">
                {localNotes}
              </div>
            ) : (
              <p className="text-sm text-overlay0 italic">No notes</p>
            )}
          </div>

          {/* Save confirmation */}
          {saveMessage && (
            <div className="bg-green/20 text-green px-3 py-2 rounded-lg text-sm text-center">
              {saveMessage}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-surface1 flex gap-3">
          {showBlockConfirm ? (
            <>
              <div className="flex-1 text-sm text-overlay1 flex items-center">
                Block &quot;{meeting.title}&quot; from future syncs?
              </div>
              <button
                onClick={() => setShowBlockConfirm(false)}
                className="px-4 py-2.5 rounded-lg text-overlay1 hover:text-text hover:bg-surface1 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleBlockAndDelete}
                className="px-4 py-2.5 rounded-lg bg-yellow text-base hover:bg-yellow/90 transition-colors cursor-pointer"
              >
                Block & Delete
              </button>
            </>
          ) : showDeleteConfirm ? (
            <>
              <div className="flex-1 text-sm text-overlay1 flex items-center">
                Delete this meeting?
              </div>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2.5 rounded-lg text-overlay1 hover:text-text hover:bg-surface1 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2.5 rounded-lg bg-red text-base hover:bg-red/90 transition-colors cursor-pointer"
              >
                Delete
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2.5 rounded-lg text-red hover:bg-red/20 transition-colors cursor-pointer"
              >
                Delete
              </button>
              {/* Show block option for synced meetings */}
              {meeting.source === 'calendar' && onBlockMeetingTitle && (
                <button
                  onClick={() => setShowBlockConfirm(true)}
                  className="px-4 py-2.5 rounded-lg text-yellow hover:bg-yellow/20 transition-colors cursor-pointer"
                  title="Don't sync this meeting in the future"
                >
                  Don&apos;t Sync
                </button>
              )}
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-lg text-overlay1 hover:text-text hover:bg-surface1 transition-colors cursor-pointer"
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
