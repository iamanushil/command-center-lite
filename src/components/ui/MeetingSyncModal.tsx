import { useState, useEffect } from 'react'

interface FetchedMeeting {
  title: string
  date: string
  time: string
  link: string | null
  externalId: string
  status: 'new' | 'existing' | 'blocked'
  existingId: string | null
  existingTime: string | null
  hasTimeChanged: boolean
}

interface MeetingSyncModalProps {
  isOpen: boolean
  onClose: () => void
  meetings: FetchedMeeting[]
  date: string
  isLoading: boolean
  onAddMeetings: (meetings: FetchedMeeting[]) => Promise<void>
}

function formatTime(timeString: string): string {
  const [hours, minutes] = timeString.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
}

function formatDate(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

export function MeetingSyncModal({
  isOpen,
  onClose,
  meetings,
  date,
  isLoading,
  onAddMeetings,
}: MeetingSyncModalProps) {
  const [selectedMeetings, setSelectedMeetings] = useState<Set<string>>(new Set())
  const [isAdding, setIsAdding] = useState(false)
  const [editedTitles, setEditedTitles] = useState<Record<string, string>>({})
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null)

  // Auto-select new meetings when meetings change
  useEffect(() => {
    const newMeetingIds = meetings
      .filter(m => m.status === 'new')
      .map(m => m.externalId)
    setSelectedMeetings(new Set(newMeetingIds))
    setEditedTitles({}) // Reset edited titles when meetings change
  }, [meetings])

  const getMeetingTitle = (meeting: FetchedMeeting) => {
    return editedTitles[meeting.externalId] ?? meeting.title
  }

  const setMeetingTitle = (externalId: string, title: string) => {
    setEditedTitles(prev => ({ ...prev, [externalId]: title }))
  }

  if (!isOpen) return null

  const toggleMeeting = (externalId: string) => {
    const newSelected = new Set(selectedMeetings)
    if (newSelected.has(externalId)) {
      newSelected.delete(externalId)
    } else {
      newSelected.add(externalId)
    }
    setSelectedMeetings(newSelected)
  }

  const selectAll = () => {
    const allIds = meetings
      .filter(m => m.status !== 'blocked')
      .map(m => m.externalId)
    setSelectedMeetings(new Set(allIds))
  }

  const selectNone = () => {
    setSelectedMeetings(new Set())
  }

  const selectNew = () => {
    const newIds = meetings
      .filter(m => m.status === 'new')
      .map(m => m.externalId)
    setSelectedMeetings(new Set(newIds))
  }

  const handleAdd = async () => {
    const meetingsToAdd = meetings
      .filter(m => selectedMeetings.has(m.externalId))
      .map(m => ({
        ...m,
        title: getMeetingTitle(m), // Use edited title if available
      }))
    if (meetingsToAdd.length === 0) return
    
    setIsAdding(true)
    try {
      await onAddMeetings(meetingsToAdd)
      onClose()
    } catch (error) {
      console.error('Failed to add meetings:', error)
    } finally {
      setIsAdding(false)
    }
  }

  const newCount = meetings.filter(m => m.status === 'new').length
  const existingCount = meetings.filter(m => m.status === 'existing').length
  const blockedCount = meetings.filter(m => m.status === 'blocked').length

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-base rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-surface1">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-text">📅 Sync Calendar Meetings</h2>
              <p className="text-sm text-subtext0 mt-1">{formatDate(date)}</p>
            </div>
            <button
              onClick={onClose}
              className="text-subtext0 hover:text-text transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="text-2xl animate-spin mb-2">↻</div>
                <p className="text-subtext0">Fetching meetings from calendar...</p>
              </div>
            </div>
          ) : meetings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-subtext0">No meetings found for this date.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Stats */}
              <div className="flex gap-4 text-sm">
                <span className="text-green">✓ {newCount} new</span>
                <span className="text-blue">○ {existingCount} existing</span>
                {blockedCount > 0 && <span className="text-red">⊘ {blockedCount} blocked</span>}
              </div>

              {/* Quick actions */}
              <div className="flex gap-2 text-xs">
                <button
                  onClick={selectAll}
                  className="px-2 py-1 bg-surface0 hover:bg-surface1 rounded text-subtext0 hover:text-text transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={selectNew}
                  className="px-2 py-1 bg-surface0 hover:bg-surface1 rounded text-subtext0 hover:text-text transition-colors"
                >
                  Select New Only
                </button>
                <button
                  onClick={selectNone}
                  className="px-2 py-1 bg-surface0 hover:bg-surface1 rounded text-subtext0 hover:text-text transition-colors"
                >
                  Select None
                </button>
              </div>

              {/* Meeting list */}
              <ul className="space-y-2">
                {meetings
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map((meeting) => {
                    const isSelected = selectedMeetings.has(meeting.externalId)
                    const isBlocked = meeting.status === 'blocked'
                    const isExisting = meeting.status === 'existing'
                    
                    return (
                      <li
                        key={meeting.externalId}
                        className={`
                          flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer
                          ${isBlocked 
                            ? 'bg-red/5 border-red/20 opacity-50 cursor-not-allowed' 
                            : isSelected 
                              ? 'bg-blue/10 border-blue/30' 
                              : 'bg-surface0 border-surface1 hover:border-surface2'
                          }
                        `}
                        onClick={() => !isBlocked && toggleMeeting(meeting.externalId)}
                      >
                        {/* Checkbox */}
                        <div className="mt-0.5">
                          {isBlocked ? (
                            <span className="text-red text-sm">⊘</span>
                          ) : (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleMeeting(meeting.externalId)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 rounded border-surface2 text-blue focus:ring-blue/50"
                            />
                          )}
                        </div>

                        {/* Meeting info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            {editingMeetingId === meeting.externalId ? (
                              <input
                                type="text"
                                value={getMeetingTitle(meeting)}
                                onChange={(e) => setMeetingTitle(meeting.externalId, e.target.value)}
                                className="flex-1 bg-base text-text border border-surface2 rounded px-2 py-0.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue/50"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === 'Escape') {
                                    setEditingMeetingId(null)
                                  }
                                }}
                                onBlur={() => setEditingMeetingId(null)}
                              />
                            ) : (
                              <span 
                                className="text-text font-medium cursor-text hover:text-blue transition-colors group"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (!isBlocked) setEditingMeetingId(meeting.externalId)
                                }}
                                title="Click to edit title"
                              >
                                {getMeetingTitle(meeting)}
                                {editedTitles[meeting.externalId] && (
                                  <span className="ml-1 text-xs text-yellow">✎</span>
                                )}
                              </span>
                            )}
                            {meeting.status === 'new' && (
                              <span className="text-xs px-1.5 py-0.5 bg-green/20 text-green rounded shrink-0">NEW</span>
                            )}
                            {meeting.hasTimeChanged && (
                              <span className="text-xs px-1.5 py-0.5 bg-yellow/20 text-yellow rounded shrink-0">
                                TIME CHANGED
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-sm">
                            <span className="text-blue font-mono">{formatTime(meeting.time)}</span>
                            {meeting.hasTimeChanged && meeting.existingTime && (
                              <span className="text-subtext1 text-xs">
                                (was {formatTime(meeting.existingTime)})
                              </span>
                            )}
                            {meeting.link && (
                              <a
                                href={meeting.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-blue hover:text-sapphire hover:underline text-xs"
                              >
                                🔗 Join link
                              </a>
                            )}
                          </div>
                          {isBlocked && (
                            <p className="text-xs text-red mt-1">Blocked by filter pattern</p>
                          )}
                          {isExisting && !meeting.hasTimeChanged && (
                            <p className="text-xs text-subtext1 mt-1">Already in your meetings</p>
                          )}
                        </div>
                      </li>
                    )
                  })}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-surface1 flex items-center justify-between">
          <span className="text-sm text-subtext0">
            {selectedMeetings.size} meeting{selectedMeetings.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-subtext0 hover:text-text transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={selectedMeetings.size === 0 || isAdding}
              className="px-4 py-2 text-sm bg-blue hover:bg-sapphire text-base rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAdding ? 'Adding...' : `Add ${selectedMeetings.size} Meeting${selectedMeetings.size !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
