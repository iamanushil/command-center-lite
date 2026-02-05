import { useState, useEffect, useCallback } from 'react';
import { EVENING_RITUAL_STEPS } from '../../types';
import type { Task, Meeting, DailyLog, Streak } from '../../types';
import { isElectron, getElectronAPI } from '../../lib/electron';

interface EveningRitualFlowProps {
  /** Today's completed tasks */
  completedTasks: Task[];
  /** Tomorrow's main priority if known */
  tomorrowPriority?: Task | null;
  /** Tomorrow's scheduled tasks */
  tomorrowTasks?: Task[];
  /** Tomorrow's meetings */
  tomorrowMeetings?: Meeting[];
  /** Callback when ritual completes */
  onComplete: (data: { 
    untrackedWins: string; 
    reflection: string; 
    gratitude: string;
  }) => void;
  /** Callback to close/cancel */
  onClose: () => void;
  /** Callback to refresh meetings after sync */
  onRefreshMeetings?: () => Promise<void>;
}

export function EveningRitualFlow({
  completedTasks,
  tomorrowPriority,
  tomorrowTasks = [],
  tomorrowMeetings = [],
  onComplete,
  onClose,
  onRefreshMeetings,
}: EveningRitualFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [untrackedWins, setUntrackedWins] = useState('');
  const [wentWell, setWentWell] = useState('');
  const [isSyncingMeetings, setIsSyncingMeetings] = useState(false);
  const [couldImprove, setCouldImprove] = useState('');
  const [gratitude, setGratitude] = useState('');
  const [streak, setStreak] = useState<Streak | null>(null);
  const [todayLog, setTodayLog] = useState<DailyLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const steps = EVENING_RITUAL_STEPS;

  // Load current streak and today's log
  useEffect(() => {
    const loadData = async () => {
      if (!isElectron() || !window.electronAPI) {
        setIsLoading(false);
        return;
      }
      try {
        const [eveningStreak, log] = await Promise.all([
          window.electronAPI.db.streaks.get('evening_ritual'),
          window.electronAPI.db.dailyLogs.getToday(),
        ]);
        setStreak(eveningStreak);
        setTodayLog(log);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, steps.length]);

  const handleComplete = useCallback(async () => {
    // Combine reflection
    const reflection = `What went well: ${wentWell}\n\nWhat could improve: ${couldImprove}`;
    
    if (!isElectron() || !window.electronAPI) {
      onComplete({ untrackedWins, reflection, gratitude });
      return;
    }
    
    // Save the ritual completion to daily log
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    
    try {
      await window.electronAPI.db.dailyLogs.upsert(today, {
        eveningRitualCompleted: true,
        eveningRitualTime: now,
        reflection: reflection,
        gratitude: gratitude,
        untrackedWins: untrackedWins,
        tasksCompleted: completedTasks.length,
      });
      
      // Update the streak
      await window.electronAPI.db.streaks.update('evening_ritual');
      
      // Check if both rituals done today for full_day streak
      if (todayLog?.morningRitualCompleted) {
        await window.electronAPI.db.streaks.update('full_day');
      }
      
      onComplete({ untrackedWins, reflection, gratitude });
    } catch (error) {
      console.error('Failed to save evening ritual:', error);
      onComplete({ untrackedWins, reflection, gratitude });
    }
  }, [untrackedWins, wentWell, couldImprove, gratitude, completedTasks.length, todayLog, onComplete]);

  const currentStepDef = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-base/95 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="text-subtext0">Loading...</div>
      </div>
    );
  }

  const renderStepContent = () => {
    switch (currentStepDef.id) {
      case 'wins':
        return (
          <div className="space-y-6 py-4">
            {/* Today's completed tasks */}
            {completedTasks.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm text-subtext0 font-medium flex items-center gap-2">
                  <span className="text-green">✓</span> Completed Today
                </div>
                <ul className="space-y-2 max-h-32 overflow-y-auto">
                  {completedTasks.slice(0, 5).map((task) => (
                    <li 
                      key={task.id}
                      className="flex items-start gap-3 p-2 bg-green/10 rounded-lg text-sm"
                    >
                      <span className="text-green mt-0.5">✓</span>
                      <span className="text-text line-through opacity-70">{task.title}</span>
                    </li>
                  ))}
                  {completedTasks.length > 5 && (
                    <li className="text-xs text-subtext1 pl-7">
                      +{completedTasks.length - 5} more completed
                    </li>
                  )}
                </ul>
              </div>
            )}
            
            <div className="space-y-3">
              <label className="text-sm text-subtext0 font-medium">
                Any wins not captured above?
              </label>
              <textarea
                value={untrackedWins}
                onChange={(e) => setUntrackedWins(e.target.value)}
                placeholder="Helped a colleague, had a good idea, handled something difficult..."
                className="w-full h-24 p-4 bg-surface0 border border-surface1 rounded-lg text-text placeholder-subtext1 resize-none focus:outline-none focus:border-blue"
                autoFocus
              />
            </div>
            
            <button
              onClick={handleNext}
              className="w-full px-4 py-3 bg-blue hover:bg-blue/80 text-base rounded-lg font-medium transition-colors"
            >
              {untrackedWins.trim() ? 'Capture Wins' : 'Skip to Reflection'}
            </button>
          </div>
        );
      
      case 'reflect':
        return (
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <label className="text-sm text-subtext0 font-medium flex items-center gap-2">
                <span className="text-green">↑</span> What went well?
              </label>
              <textarea
                value={wentWell}
                onChange={(e) => setWentWell(e.target.value)}
                placeholder="Focused deeply on X, good meeting with Y..."
                className="w-full h-20 p-4 bg-surface0 border border-surface1 rounded-lg text-text placeholder-subtext1 resize-none focus:outline-none focus:border-green"
                autoFocus
              />
            </div>
            
            <div className="space-y-3">
              <label className="text-sm text-subtext0 font-medium flex items-center gap-2">
                <span className="text-peach">↓</span> What could improve?
              </label>
              <textarea
                value={couldImprove}
                onChange={(e) => setCouldImprove(e.target.value)}
                placeholder="Got distracted by X, need to prepare better for Y..."
                className="w-full h-20 p-4 bg-surface0 border border-surface1 rounded-lg text-text placeholder-subtext1 resize-none focus:outline-none focus:border-peach"
              />
            </div>
            
            <button
              onClick={handleNext}
              disabled={!wentWell.trim()}
              className="w-full px-4 py-3 bg-blue hover:bg-blue/80 disabled:bg-surface0 disabled:text-subtext1 text-base rounded-lg font-medium transition-colors"
            >
              Continue
            </button>
          </div>
        );
      
      case 'gratitude':
        return (
          <div className="space-y-6 py-4">
            <div className="p-6 bg-surface0/50 rounded-lg text-center space-y-4">
              <div className="text-4xl">🙏</div>
              <p className="text-subtext0 text-sm">
                Research shows gratitude improves wellbeing. What's one thing you're grateful for today?
              </p>
            </div>
            
            <div className="space-y-3">
              <textarea
                value={gratitude}
                onChange={(e) => setGratitude(e.target.value)}
                placeholder="I'm grateful for..."
                className="w-full h-24 p-4 bg-surface0 border border-surface1 rounded-lg text-text placeholder-subtext1 resize-none focus:outline-none focus:border-mauve"
                autoFocus
              />
            </div>
            
            <button
              onClick={handleNext}
              disabled={!gratitude.trim()}
              className="w-full px-4 py-3 bg-blue hover:bg-blue/80 disabled:bg-surface0 disabled:text-subtext1 text-base rounded-lg font-medium transition-colors"
            >
              Continue
            </button>
          </div>
        );
      
      case 'tomorrow':
        // Helper to format time in 12-hour format
        const formatTime = (timeString: string): string => {
          const [hours, minutes] = timeString.split(':').map(Number);
          const period = hours >= 12 ? 'PM' : 'AM';
          const displayHours = hours % 12 || 12;
          return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
        };
        
        return (
          <div className="space-y-6 py-4">
            {tomorrowPriority ? (
              <div className="p-4 bg-peach/10 border border-peach/30 rounded-lg">
                <div className="text-xs text-peach uppercase tracking-wide mb-2">Tomorrow's Priority</div>
                <div className="text-lg font-medium text-text">{tomorrowPriority.title}</div>
              </div>
            ) : (
              <div className="p-4 bg-surface0 border border-surface1 rounded-lg text-center">
                <div className="text-subtext1 text-sm">
                  No main priority set for tomorrow yet
                </div>
              </div>
            )}
            
            {/* Tomorrow's Meetings */}
            <div className="space-y-3">
              <div className="text-sm text-subtext0 font-medium flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>📅</span> Tomorrow's Meetings ({tomorrowMeetings.length})
                </div>
                <button
                  onClick={async () => {
                    const api = getElectronAPI();
                    if (!api?.workiq) return;
                    setIsSyncingMeetings(true);
                    try {
                      // Get tomorrow's date string
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      const year = tomorrow.getFullYear();
                      const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
                      const day = String(tomorrow.getDate()).padStart(2, '0');
                      const tomorrowStr = `${year}-${month}-${day}`;
                      
                      // Fetch and auto-add all new meetings for evening ritual (simpler flow)
                      const result = await api.workiq.fetchMeetingsForSelection(tomorrowStr);
                      if (result.success && result.meetings.length > 0) {
                        // Auto-add new meetings only
                        const newMeetings = result.meetings.filter(m => m.status === 'new');
                        if (newMeetings.length > 0) {
                          await api.workiq.addSelectedMeetings(newMeetings.map(m => ({
                            title: m.title,
                            date: m.date,
                            time: m.time,
                            link: m.link,
                            externalId: m.externalId,
                          })));
                        }
                      }
                      if (onRefreshMeetings) {
                        await onRefreshMeetings();
                      }
                    } catch (error) {
                      console.error('Failed to sync tomorrow meetings:', error);
                    } finally {
                      setIsSyncingMeetings(false);
                    }
                  }}
                  disabled={isSyncingMeetings}
                  className="text-xs px-2 py-1 rounded bg-surface0 hover:bg-surface1 text-subtext0 hover:text-text transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  <span className={isSyncingMeetings ? 'animate-spin' : ''}>↻</span>
                  {isSyncingMeetings ? 'Syncing...' : 'Sync'}
                </button>
              </div>
            {tomorrowMeetings.length > 0 && (
              <>
                <ul className="space-y-2 max-h-40 overflow-y-auto">
                  {tomorrowMeetings
                    .sort((a, b) => a.time.localeCompare(b.time))
                    .map((meeting) => (
                    <li 
                      key={meeting.id}
                      className="flex items-start gap-3 p-2 bg-blue/10 border border-blue/20 rounded-lg text-sm"
                    >
                      <span className="text-blue font-mono text-xs mt-0.5 min-w-[4.5rem]">
                        {formatTime(meeting.time)}
                      </span>
                      <span className="text-text">{meeting.title}</span>
                    </li>
                  ))}
                </ul>
                <div className="text-xs text-subtext1 p-2 bg-surface0 rounded">
                  💡 Make sure you have everything prepped for these meetings!
                </div>
              </>
            )}
            {tomorrowMeetings.length === 0 && (
              <div className="text-xs text-subtext1 p-2 bg-surface0 rounded">
                No meetings synced for tomorrow yet. Click Sync to fetch them.
              </div>
            )}
            </div>
            
            {tomorrowTasks.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm text-subtext0 font-medium">Tomorrow's Tasks</div>
                <ul className="space-y-2 max-h-32 overflow-y-auto">
                  {tomorrowTasks.slice(0, 4).map((task) => (
                    <li 
                      key={task.id}
                      className="flex items-start gap-3 p-2 bg-surface0 rounded-lg text-sm"
                    >
                      <span className="text-overlay0 mt-0.5">○</span>
                      <span className="text-text">{task.title}</span>
                    </li>
                  ))}
                  {tomorrowTasks.length > 4 && (
                    <li className="text-xs text-subtext1 pl-7">
                      +{tomorrowTasks.length - 4} more tasks
                    </li>
                  )}
                </ul>
              </div>
            )}
            
            <div className="p-4 bg-blue/10 border border-blue/30 rounded-lg text-center">
              <p className="text-blue text-sm">
                ✨ You're prepared for tomorrow. Rest well!
              </p>
            </div>
            
            {streak && streak.currentCount > 0 && (
              <div className="text-center text-sm text-subtext0">
                🌙 {streak.currentCount} day evening streak! 
                {todayLog?.morningRitualCompleted && ' Full day ritual achieved! 🎉'}
              </div>
            )}
            
            <button
              onClick={handleComplete}
              className="w-full px-4 py-3 bg-green hover:bg-green/80 text-base rounded-lg font-medium transition-colors"
            >
              Complete Evening Ritual
            </button>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-base/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-mantle rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-surface0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-text">🌙 Evening Ritual</h2>
            <button
              onClick={onClose}
              className="p-2 text-subtext0 hover:text-text hover:bg-surface0 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>
          
          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-surface0 rounded-full overflow-hidden">
              <div 
                className="h-full bg-mauve transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-subtext1">
              {currentStep + 1}/{steps.length}
            </span>
          </div>
        </div>
        
        {/* Step indicator */}
        <div className="flex justify-center gap-2 py-4 bg-surface0/30">
          {steps.map((step, i) => (
            <div
              key={step.id}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                i === currentStep
                  ? 'bg-mauve text-base'
                  : i < currentStep
                  ? 'bg-green/20 text-green'
                  : 'bg-surface0 text-subtext1'
              }`}
            >
              {i < currentStep ? '✓' : i + 1}. {step.title}
            </div>
          ))}
        </div>
        
        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-4">
            <h3 className="text-xl font-semibold text-text">{currentStepDef.title}</h3>
            <p className="text-subtext0 text-sm mt-1">{currentStepDef.description}</p>
          </div>
          
          {renderStepContent()}
        </div>
      </div>
    </div>
  );
}
