import { useState, useEffect } from 'react';
import type { Streak, DailyLog } from '../../types';
import { isElectron } from '../../lib/electron';

interface RitualMetricsProps {
  /** Callback to start morning ritual */
  onStartMorningRitual?: () => void;
  /** Callback to start evening ritual */
  onStartEveningRitual?: () => void;
}

export function RitualMetrics({
  onStartMorningRitual,
  onStartEveningRitual,
}: RitualMetricsProps) {
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [todayLog, setTodayLog] = useState<DailyLog | null>(null);
  const [weekLogs, setWeekLogs] = useState<DailyLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!isElectron() || !window.electronAPI) {
        setIsLoading(false);
        return;
      }
      
      try {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        // Get start of week (Monday)
        const dayOfWeek = today.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(today);
        monday.setDate(today.getDate() + mondayOffset);
        const mondayStr = monday.toISOString().split('T')[0];
        
        const [allStreaks, log, logs] = await Promise.all([
          window.electronAPI.db.streaks.getAll(),
          window.electronAPI.db.dailyLogs.get(todayStr),
          window.electronAPI.db.dailyLogs.getRange(mondayStr, todayStr),
        ]);
        
        setStreaks(allStreaks);
        setTodayLog(log);
        setWeekLogs(logs);
      } catch (error) {
        console.error('Failed to load metrics:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="p-6 bg-mantle rounded-xl">
        <div className="text-subtext0 text-center">Loading metrics...</div>
      </div>
    );
  }

  const morningStreak = streaks.find(s => s.streakType === 'morning_ritual');
  const eveningStreak = streaks.find(s => s.streakType === 'evening_ritual');
  const fullDayStreak = streaks.find(s => s.streakType === 'full_day');
  const focusStreak = streaks.find(s => s.streakType === 'focus');

  // Calculate this week's ritual completion
  const thisWeekMornings = weekLogs.filter(l => l.morningRitualCompleted).length;
  const thisWeekEvenings = weekLogs.filter(l => l.eveningRitualCompleted).length;
  const thisWeekFocus = weekLogs.filter(l => l.focusAchieved).length;

  // Get time of day for ritual suggestions
  const hour = new Date().getHours();
  const isMorningTime = hour >= 5 && hour < 11;
  const isEveningTime = hour >= 15 && hour < 23;

  return (
    <div className="space-y-6">
      {/* Today's Status */}
      <div className="p-4 bg-mantle rounded-xl">
        <h3 className="text-sm font-medium text-subtext0 mb-4">Today's Rituals</h3>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Morning */}
          <div className={`p-4 rounded-lg border ${
            todayLog?.morningRitualCompleted 
              ? 'bg-green/10 border-green/30' 
              : 'bg-surface0 border-surface1'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg">☀️</span>
              {todayLog?.morningRitualCompleted && (
                <span className="text-green text-sm">✓</span>
              )}
            </div>
            <div className="text-sm font-medium text-text">Morning</div>
            {todayLog?.morningRitualCompleted ? (
              <div className="text-xs text-green mt-1">
                Completed {todayLog.morningRitualTime 
                  ? new Date(todayLog.morningRitualTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'today'
                }
              </div>
            ) : isMorningTime ? (
              <button
                onClick={onStartMorningRitual}
                className="mt-2 w-full px-3 py-1.5 bg-blue hover:bg-blue/80 text-xs text-base rounded font-medium transition-colors"
              >
                Start Now
              </button>
            ) : (
              <div className="text-xs text-subtext1 mt-1">Not completed</div>
            )}
          </div>
          
          {/* Evening */}
          <div className={`p-4 rounded-lg border ${
            todayLog?.eveningRitualCompleted 
              ? 'bg-mauve/10 border-mauve/30' 
              : 'bg-surface0 border-surface1'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg">🌙</span>
              {todayLog?.eveningRitualCompleted && (
                <span className="text-mauve text-sm">✓</span>
              )}
            </div>
            <div className="text-sm font-medium text-text">Evening</div>
            {todayLog?.eveningRitualCompleted ? (
              <div className="text-xs text-mauve mt-1">
                Completed {todayLog.eveningRitualTime 
                  ? new Date(todayLog.eveningRitualTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'today'
                }
              </div>
            ) : isEveningTime ? (
              <button
                onClick={onStartEveningRitual}
                className="mt-2 w-full px-3 py-1.5 bg-mauve hover:bg-mauve/80 text-xs text-base rounded font-medium transition-colors"
              >
                Start Now
              </button>
            ) : (
              <div className="text-xs text-subtext1 mt-1">Not completed</div>
            )}
          </div>
        </div>
      </div>

      {/* Streaks */}
      <div className="p-4 bg-mantle rounded-xl">
        <h3 className="text-sm font-medium text-subtext0 mb-4">🔥 Streaks</h3>
        
        <div className="grid grid-cols-2 gap-3">
          <StreakCard
            label="Morning Ritual"
            emoji="☀️"
            current={morningStreak?.currentCount || 0}
            best={morningStreak?.bestCount || 0}
          />
          <StreakCard
            label="Evening Ritual"
            emoji="🌙"
            current={eveningStreak?.currentCount || 0}
            best={eveningStreak?.bestCount || 0}
          />
          <StreakCard
            label="Full Day"
            emoji="✨"
            current={fullDayStreak?.currentCount || 0}
            best={fullDayStreak?.bestCount || 0}
          />
          <StreakCard
            label="Focus Time"
            emoji="🎯"
            current={focusStreak?.currentCount || 0}
            best={focusStreak?.bestCount || 0}
          />
        </div>
      </div>

      {/* This Week */}
      <div className="p-4 bg-mantle rounded-xl">
        <h3 className="text-sm font-medium text-subtext0 mb-4">📅 This Week</h3>
        
        <div className="space-y-3">
          <WeeklyProgressBar
            label="Morning Rituals"
            value={thisWeekMornings}
            max={7}
            color="bg-yellow"
          />
          <WeeklyProgressBar
            label="Evening Rituals"
            value={thisWeekEvenings}
            max={7}
            color="bg-mauve"
          />
          <WeeklyProgressBar
            label="Focus Days"
            value={thisWeekFocus}
            max={7}
            color="bg-blue"
          />
        </div>
        
        {/* Week visualization */}
        <div className="mt-4 flex justify-between">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
            const log = weekLogs[i];
            const hasMorning = log?.morningRitualCompleted;
            const hasEvening = log?.eveningRitualCompleted;
            const isToday = i === weekLogs.length - 1;
            
            return (
              <div key={day} className="flex flex-col items-center gap-1">
                <div className={`text-xs ${isToday ? 'text-blue font-medium' : 'text-subtext1'}`}>
                  {day[0]}
                </div>
                <div className={`w-6 h-6 rounded flex items-center justify-center text-xs ${
                  hasMorning && hasEvening
                    ? 'bg-green/20 text-green'
                    : hasMorning || hasEvening
                    ? 'bg-yellow/20 text-yellow'
                    : 'bg-surface0 text-subtext1'
                }`}>
                  {hasMorning && hasEvening ? '✓' : hasMorning ? '☀' : hasEvening ? '🌙' : '·'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Insights */}
      {todayLog?.intention && (
        <div className="p-4 bg-mantle rounded-xl">
          <h3 className="text-sm font-medium text-subtext0 mb-2">💭 Today's Intention</h3>
          <p className="text-text text-sm italic">"{todayLog.intention}"</p>
        </div>
      )}
      
      {todayLog?.gratitude && (
        <div className="p-4 bg-mantle rounded-xl">
          <h3 className="text-sm font-medium text-subtext0 mb-2">🙏 Today's Gratitude</h3>
          <p className="text-text text-sm italic">"{todayLog.gratitude}"</p>
        </div>
      )}
    </div>
  );
}

// Helper components
interface StreakCardProps {
  label: string;
  emoji: string;
  current: number;
  best: number;
}

function StreakCard({ label, emoji, current, best }: StreakCardProps) {
  return (
    <div className="p-3 bg-surface0 rounded-lg">
      <div className="flex items-center gap-2 mb-1">
        <span>{emoji}</span>
        <span className="text-xs text-subtext0">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-text">{current}</span>
        {best > 0 && (
          <span className="text-xs text-subtext1">best: {best}</span>
        )}
      </div>
    </div>
  );
}

interface WeeklyProgressBarProps {
  label: string;
  value: number;
  max: number;
  color: string;
}

function WeeklyProgressBar({ label, value, max, color }: WeeklyProgressBarProps) {
  const percentage = (value / max) * 100;
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-subtext0">{label}</span>
        <span className="text-subtext1">{value}/{max}</span>
      </div>
      <div className="h-2 bg-surface0 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
