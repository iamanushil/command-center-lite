import { useState } from 'react'
import type { Meeting, TaskCategory } from '../../types'
import { Card, Checkbox, Badge, MeetingDetailModal, MeetingSyncModal } from '../ui'
import { getCategoryBadgeColor } from '../../lib/utils'
import { getElectronAPI } from '../../lib/electron'

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

function formatTime(timeString: string): string {
  const [hours, minutes] = timeString.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
}

// Check if a meeting is within 5 minutes (before or after start time)
function isMeetingJoinable(meetingDate: string, meetingTime: string): boolean {
  const now = new Date()
  const [hours, minutes] = meetingTime.split(':').map(Number)
  const [year, month, day] = meetingDate.split('-').map(Number)
  const meetingStart = new Date(year, month - 1, day, hours, minutes)
  
  const diffMs = meetingStart.getTime() - now.getTime()
  const diffMinutes = diffMs / (1000 * 60)
  
  // Within 5 minutes before or 5 minutes after start
  return diffMinutes >= -5 && diffMinutes <= 5
}

interface MeetingsProps {
  meetings: Meeting[]
  onToggleMeeting: (id: string) => void
  onAddMeeting: (date?: string) => void
  onUpdateMeeting: (id: string, updates: Partial<Pick<Meeting, 'title' | 'date' | 'time' | 'notes' | 'link'>>) => void
  onDeleteMeeting: (id: string) => void
  getCategoryColor: (category: TaskCategory) => string
  // Block meeting support
  onBlockMeetingTitle?: (title: string) => Promise<void>
  // Refresh meetings after sync
  onRefreshMeetings?: () => void
}

export function Meetings({
  meetings,
  onToggleMeeting,
  onAddMeeting,
  onUpdateMeeting,
  onDeleteMeeting,
  getCategoryColor,
  onBlockMeetingTitle,
  onRefreshMeetings,
}: MeetingsProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false)
  const [fetchedMeetings, setFetchedMeetings] = useState<FetchedMeeting[]>([])
  const [syncModalDate, setSyncModalDate] = useState('')

  // Compute date string for the selected date (used for filtering and syncing)
  const year = selectedDate.getFullYear()
  const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
  const day = String(selectedDate.getDate()).padStart(2, '0')
  const selectedDateString = `${year}-${month}-${day}`

  const handleSyncForDate = async () => {
    const api = getElectronAPI()
    if (!api?.workiq) return
    
    setIsSyncing(true)
    setSyncModalDate(selectedDateString)
    setFetchedMeetings([])
    setIsSyncModalOpen(true)
    
    try {
      const result = await api.workiq.fetchMeetingsForSelection(selectedDateString)
      console.log(`[Meetings] Fetched meetings for ${selectedDateString}:`, result)
      if (result.success) {
        setFetchedMeetings(result.meetings)
      }
    } catch (error) {
      console.error('[Meetings] Fetch failed:', error)
    } finally {
      setIsSyncing(false)
    }
  }

  const handleAddSelectedMeetings = async (meetingsToAdd: FetchedMeeting[]) => {
    const api = getElectronAPI()
    if (!api?.workiq) return
    
    const result = await api.workiq.addSelectedMeetings(meetingsToAdd.map(m => ({
      title: m.title,
      date: m.date,
      time: m.time,
      link: m.link,
      externalId: m.externalId,
    })))
    
    console.log('[Meetings] Added meetings:', result)
    if (result.success && onRefreshMeetings) {
      onRefreshMeetings()
    }
  }

  const handleCloseSyncModal = () => {
    setIsSyncModalOpen(false)
    setFetchedMeetings([])
  }

  const handleMeetingClick = (meeting: Meeting) => {
    setSelectedMeeting(meeting)
    setIsDetailModalOpen(true)
  }

  const handleCloseDetail = () => {
    setIsDetailModalOpen(false)
    setSelectedMeeting(null)
  }

  // Format date for display
  const formatDate = (date: Date) => {
    // Set to noon to avoid timezone issues
    const today = new Date()
    today.setHours(12, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    // Create date at noon for comparison
    const compareDate = new Date(date)
    compareDate.setHours(12, 0, 0, 0)

    if (compareDate.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (compareDate.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow'
    } else if (compareDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    }
  }

  // Navigate to previous day
  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() - 1)
    setSelectedDate(newDate)
  }

  // Navigate to next day
  const goToNextDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + 1)
    setSelectedDate(newDate)
  }

  // Filter meetings by selected date (selectedDateString already computed above)
  const filteredMeetings = meetings.filter(meeting => meeting.date === selectedDateString)

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="text-lg">📅</span>
          <span className="font-mono text-xs uppercase tracking-wider text-overlay1">
            Meetings
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncForDate}
            disabled={isSyncing}
            className="font-mono text-xs uppercase tracking-wider text-overlay1 hover:text-text transition-colors disabled:opacity-50"
            title={`Sync meetings for ${formatDate(selectedDate)}`}
          >
            {isSyncing ? '⟳ Syncing...' : '⟳ Sync'}
          </button>
          <button
            onClick={() => onAddMeeting(selectedDateString)}
            className="font-mono text-xs uppercase tracking-wider text-overlay1 hover:text-text transition-colors"
          >
            + Add
          </button>
        </div>
      </div>

      {/* Date navigation */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-surface1">
        <button
          onClick={goToPreviousDay}
          className="p-2 text-overlay1 hover:text-text transition-colors"
          aria-label="Previous day"
        >
          ←
        </button>
        <span className="font-mono text-sm text-text">
          {formatDate(selectedDate)}
        </span>
        <button
          onClick={goToNextDay}
          className="p-2 text-overlay1 hover:text-text transition-colors"
          aria-label="Next day"
        >
          →
        </button>
      </div>

      {/* Meeting list */}
      {filteredMeetings.length > 0 ? (
        <div className="space-y-0">
          {filteredMeetings.map((meeting, index) => (
            <div
              key={meeting.id}
              className={`
                flex items-center gap-4 py-3
                hover:bg-surface1 rounded-lg px-2 -mx-2
                transition-colors cursor-pointer
                ${index < filteredMeetings.length - 1 ? 'border-b border-surface1' : ''}
              `}
              onClick={() => handleMeetingClick(meeting)}
            >
              <div onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={meeting.done}
                  onChange={() => onToggleMeeting(meeting.id)}
                  color={getCategoryBadgeColor(meeting.category)}
                />
              </div>
              <span className="font-mono text-sm text-overlay1 min-w-[4.5rem]">
                {formatTime(meeting.time)}
              </span>
              <div className="flex-1 flex items-center gap-2">
                <span
                  className={`
                    text-text
                    ${meeting.done ? 'line-through text-overlay1' : ''}
                  `}
                >
                  {meeting.title}
                </span>
                <Badge color={getCategoryBadgeColor(meeting.category)}>
                  {meeting.category}
                </Badge>
                {meeting.notes && (
                  <span className="text-xs text-overlay1" title="Has notes">📝</span>
                )}
                {meeting.link && (
                  <span className="text-xs text-overlay1" title="Has meeting link">🔗</span>
                )}
              </div>
              {/* Join Meeting button - show when within 5 minutes of start time */}
              {meeting.link && isMeetingJoinable(meeting.date, meeting.time) && !meeting.done && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    window.open(meeting.link, '_blank', 'noopener,noreferrer')
                  }}
                  className="px-3 py-1 rounded-lg text-xs font-medium bg-green text-base hover:bg-green/90 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Join Meeting
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-overlay1 italic text-sm">
          No meetings on {formatDate(selectedDate).toLowerCase()}
        </p>
      )}
      
      {/* Meeting Detail Modal */}
      <MeetingDetailModal
        meeting={selectedMeeting}
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetail}
        onUpdate={onUpdateMeeting}
        onDelete={onDeleteMeeting}
        getCategoryColor={getCategoryColor}
        onBlockMeetingTitle={onBlockMeetingTitle}
      />

      {/* Meeting Sync Modal */}
      <MeetingSyncModal
        isOpen={isSyncModalOpen}
        onClose={handleCloseSyncModal}
        meetings={fetchedMeetings}
        date={syncModalDate}
        isLoading={isSyncing}
        onAddMeetings={handleAddSelectedMeetings}
      />
    </Card>
  )
}
