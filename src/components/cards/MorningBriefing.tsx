import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { isElectron } from '../../lib/electron'

// Calming closing phrases - a mix of original phrases and inspiring quotes
const CLOSING_PHRASES = [
  // Flow & presence
  'Take a breath. What matters most today?',
  'One thing at a time. You\'ve got this.',
  'Start where you are. Use what you have.',
  'Progress, not perfection.',
  'Small steps still move you forward.',
  'Trust the process. Trust yourself.',
  'The only way out is through.',
  'What would make today feel complete?',
  'Focus on what you can control.',
  'You don\'t have to do everything today.',
  
  // Calm & grounding
  'Breathe in clarity, breathe out chaos.',
  'Slow is smooth. Smooth is fast.',
  'You are exactly where you need to be.',
  'Let go of what you can\'t change.',
  'One moment at a time.',
  'Be gentle with yourself today.',
  'Your presence is enough.',
  
  // Inspiring quotes
  '"The secret of getting ahead is getting started." — Mark Twain',
  '"Do what you can, with what you have, where you are." — Theodore Roosevelt',
  '"The journey of a thousand miles begins with a single step." — Lao Tzu',
  '"Simplicity is the ultimate sophistication." — Leonardo da Vinci',
  '"Between stimulus and response there is a space." — Viktor Frankl',
  '"How we spend our days is how we spend our lives." — Annie Dillard',
  '"The best time to plant a tree was twenty years ago. The second best time is now."',
  '"Action is the foundational key to all success." — Pablo Picasso',
  '"Be like water." — Bruce Lee',
  '"Less but better." — Dieter Rams',
  '"Work expands to fill the time available." — Parkinson\'s Law',
]

// Get a random phrase (called once per component mount)
function getRandomPhrase(): string {
  return CLOSING_PHRASES[Math.floor(Math.random() * CLOSING_PHRASES.length)]
}

interface MorningBriefingProps {
  meetingCount: number
  completedMeetingCount: number
  pendingPriorityTitle?: string
  nextMeeting?: { title: string; time: string } | null
}

// Get time-of-day greeting info
function getTimeOfDay(): { label: string; emoji: string; greeting: string } {
  const hour = new Date().getHours()
  if (hour < 12) {
    return { label: 'Morning Briefing', emoji: '☀️', greeting: 'Good morning!' }
  } else if (hour < 17) {
    return { label: 'Afternoon Briefing', emoji: '🌤️', greeting: 'Good afternoon!' }
  } else {
    return { label: 'Evening Briefing', emoji: '🌙', greeting: 'Good evening!' }
  }
}

export function MorningBriefing({
  meetingCount,
  completedMeetingCount,
  pendingPriorityTitle,
  nextMeeting = null,
}: MorningBriefingProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [countdown, setCountdown] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  
  const timeOfDay = getTimeOfDay()
  
  // Pick a random closing phrase once per session
  const closingPhrase = useMemo(() => getRandomPhrase(), [])
  
  // Countdown timer for next meeting
  useEffect(() => {
    if (!nextMeeting) {
      setCountdown(null)
      return
    }
    
    const updateCountdown = () => {
      const now = new Date()
      const [hours, minutes] = nextMeeting.time.split(':').map(Number)
      const meetingTime = new Date()
      meetingTime.setHours(hours, minutes, 0, 0)
      
      const diffMs = meetingTime.getTime() - now.getTime()
      
      if (diffMs <= 0) {
        setCountdown('now')
        return
      }
      
      const diffMins = Math.floor(diffMs / (1000 * 60))
      const diffHours = Math.floor(diffMins / 60)
      const remainingMins = diffMins % 60
      
      if (diffHours > 0) {
        setCountdown(`${diffHours}h ${remainingMins}m`)
      } else if (diffMins > 0) {
        setCountdown(`${diffMins}m`)
      } else {
        setCountdown('< 1m')
      }
    }
    
    updateCountdown()
    const interval = setInterval(updateCountdown, 30000) // Update every 30 seconds
    
    return () => clearInterval(interval)
  }, [nextMeeting])
  
  // Plain text versions for speech
  const getMeetingTextPlain = (): string => {
    const remainingCount = meetingCount - completedMeetingCount
    
    if (meetingCount > 0 && remainingCount === 0) {
      return meetingCount === 1 ? 'had 1 meeting' : `had ${meetingCount} meetings`
    }
    
    if (completedMeetingCount > 0 && remainingCount > 0) {
      return remainingCount === 1 ? '1 meeting left' : `${remainingCount} meetings left`
    }
    
    if (meetingCount === 0) return 'no meetings'
    if (meetingCount === 1) return '1 meeting'
    return `${meetingCount} meetings`
  }
  
  const getMeetingText = () => {
    const remainingCount = meetingCount - completedMeetingCount
    
    // All meetings completed
    if (meetingCount > 0 && remainingCount === 0) {
      if (meetingCount === 1) {
        return <span className="text-text">had 1 meeting</span>
      }
      return <span className="text-text">had {meetingCount} meetings</span>
    }
    
    // Some meetings completed
    if (completedMeetingCount > 0 && remainingCount > 0) {
      if (remainingCount === 1) {
        return <span className="text-text">1 meeting left</span>
      }
      return <span className="text-text">{remainingCount} meetings left</span>
    }
    
    // No meetings completed yet (or no meetings at all)
    if (meetingCount === 0) {
      return <span className="text-text">no meetings</span>
    }
    if (meetingCount === 1) {
      return <span className="text-text">1 meeting</span>
    }
    return <span className="text-text">{meetingCount} meetings</span>
  }

  const getPriorityText = () => {
    if (!pendingPriorityTitle) {
      return 'no main priority set yet'
    }
    return (
      <>
        your main priority is <span className="text-peach">{pendingPriorityTitle}</span>
      </>
    )
  }
  
  const getPriorityTextPlain = (): string => {
    if (!pendingPriorityTitle) {
      return 'no main priority set yet'
    }
    return `your main priority is ${pendingPriorityTitle}`
  }

  // Generate full speech text
  const generateSpeechText = useCallback((): string => {
    const parts = [
      timeOfDay.greeting,
      `You have ${getMeetingTextPlain()} today, and ${getPriorityTextPlain()}.`,
      closingPhrase,
    ]
    return parts.filter(Boolean).join(' ')
  }, [
    timeOfDay.greeting,
    meetingCount,
    completedMeetingCount,
    pendingPriorityTitle,
    closingPhrase,
  ])
  
  // Handle read aloud
  const handleReadAloud = useCallback(async () => {
    // If already playing, stop
    if (isPlaying && audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
      return
    }
    
    // Check if ElevenLabs is available
    if (!isElectron() || !window.electronAPI?.elevenlabs) {
      // Fallback to browser speech synthesis
      const text = generateSpeechText()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      utterance.onend = () => setIsPlaying(false)
      setIsPlaying(true)
      speechSynthesis.speak(utterance)
      return
    }
    
    // Check if configured
    const isConfigured = await window.electronAPI.elevenlabs.isConfigured()
    if (!isConfigured) {
      // Fallback to browser speech synthesis
      const text = generateSpeechText()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      utterance.onend = () => setIsPlaying(false)
      setIsPlaying(true)
      speechSynthesis.speak(utterance)
      return
    }
    
    // Use ElevenLabs
    setIsLoading(true)
    try {
      const text = generateSpeechText()
      const result = await window.electronAPI.elevenlabs.textToSpeech(text)
      
      if (!result.success) {
        console.error('ElevenLabs error:', result.error)
        // Fallback to browser speech
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.rate = 0.9
        utterance.onend = () => setIsPlaying(false)
        setIsPlaying(true)
        speechSynthesis.speak(utterance)
        return
      }
      
      // Convert base64 to audio blob and play
      const audioData = Uint8Array.from(atob(result.audio), c => c.charCodeAt(0))
      const blob = new Blob([audioData], { type: 'audio/mpeg' })
      const url = URL.createObjectURL(blob)
      
      const audio = new Audio(url)
      audioRef.current = audio
      
      audio.onended = () => {
        setIsPlaying(false)
        URL.revokeObjectURL(url)
      }
      
      audio.onerror = () => {
        setIsPlaying(false)
        URL.revokeObjectURL(url)
        console.error('Audio playback error')
      }
      
      setIsPlaying(true)
      await audio.play()
    } catch (error) {
      console.error('Read aloud error:', error)
      setIsPlaying(false)
    } finally {
      setIsLoading(false)
    }
  }, [generateSpeechText, isPlaying])

  return (
    <div className="bg-mantle rounded-2xl p-10 relative overflow-hidden">
      {/* Decorative gradient */}
      <div
        className="absolute top-0 right-0 w-80 h-80 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at top right, rgba(203, 166, 247, 0.15) 0%, transparent 70%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Header row */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="text-xl">{timeOfDay.emoji}</span>
            <span className="font-mono text-xs uppercase tracking-wider text-mauve">
              {timeOfDay.label}
            </span>
          </div>
          <button
            onClick={handleReadAloud}
            disabled={isLoading}
            className={`
              font-mono text-xs uppercase tracking-wider
              px-4 py-2 rounded-lg
              cursor-pointer
              bg-transparent border
              transition-colors duration-150
              ${isPlaying
                ? 'border-mauve text-mauve hover:border-red hover:text-red'
                : 'border-surface2 text-overlay1 hover:text-text hover:border-surface1'
              }
              ${isLoading ? 'opacity-50 cursor-wait' : ''}
            `}
          >
            {isLoading ? '⏳ Loading...' : isPlaying ? '⏹ Stop' : '▶ Read aloud'}
          </button>
        </div>

        {/* Main text */}
        <p className="text-2xl font-display font-light text-subtext1 leading-relaxed max-w-2xl mb-6">
          You have {getMeetingText()} today{nextMeeting && countdown && countdown !== 'now' && (
            <> — next is <span className="text-blue">{nextMeeting.title}</span> in <span className="text-mauve">{countdown}</span></>
          )}{nextMeeting && countdown === 'now' && (
            <> — <span className="text-peach">{nextMeeting.title}</span> is starting now!</>
          )}, and {getPriorityText()}.
        </p>

        {/* Closing line */}
        <p className="text-overlay1 italic font-display">
          {closingPhrase}
        </p>
      </div>
    </div>
  )
}
