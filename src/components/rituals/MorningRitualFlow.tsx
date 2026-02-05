import { useState, useEffect, useCallback } from 'react';
import { BreathingExercise } from './BreathingExercise';
import { MORNING_RITUAL_STEPS } from '../../types';
import type { Task, Streak } from '../../types';
import { isElectron } from '../../lib/electron';

interface MorningRitualFlowProps {
  /** Today's tasks for review */
  tasks: Task[];
  /** Main priority task if set */
  mainPriority?: Task | null;
  /** Callback when ritual completes */
  onComplete: (data: { intention: string; focusCommitted: boolean }) => void;
  /** Callback to close/cancel */
  onClose: () => void;
}

export function MorningRitualFlow({
  tasks,
  mainPriority,
  onComplete,
  onClose,
}: MorningRitualFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [intention, setIntention] = useState('');
  const [focusCommitted, setFocusCommitted] = useState(false);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const steps = MORNING_RITUAL_STEPS;

  // Load current streak
  useEffect(() => {
    const loadStreak = async () => {
      if (!isElectron() || !window.electronAPI) return;
      try {
        const morningStreak = await window.electronAPI.db.streaks.get('morning_ritual');
        setStreak(morningStreak);
      } catch (error) {
        console.error('Failed to load streak:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadStreak();
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, steps.length]);

  const handleComplete = useCallback(async () => {
    if (!isElectron() || !window.electronAPI) {
      onComplete({ intention, focusCommitted });
      return;
    }
    
    // Save the ritual completion to daily log
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    
    try {
      await window.electronAPI.db.dailyLogs.upsert(today, {
        morningRitualCompleted: true,
        morningRitualTime: now,
        intention: intention,
        focusAchieved: focusCommitted,
      });
      
      // Update the streak
      await window.electronAPI.db.streaks.update('morning_ritual');
      
      onComplete({ intention, focusCommitted });
    } catch (error) {
      console.error('Failed to save morning ritual:', error);
      // Still complete even if save fails
      onComplete({ intention, focusCommitted });
    }
  }, [intention, focusCommitted, onComplete]);

  const todaysTasks = tasks.filter(t => !t.completedAt).slice(0, 5);
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
      case 'breathe':
        return (
          <BreathingExercise
            duration={60}
            onComplete={handleNext}
            onSkip={handleNext}
          />
        );
      
      case 'review':
        return (
          <div className="space-y-6 py-4">
            {mainPriority && (
              <div className="p-4 bg-peach/10 border border-peach/30 rounded-lg">
                <div className="text-xs text-peach uppercase tracking-wide mb-2">Main Priority</div>
                <div className="text-lg font-medium text-text">{mainPriority.title}</div>
              </div>
            )}
            
            <div className="space-y-3">
              <div className="text-sm text-subtext0 font-medium">Today's Tasks</div>
              {todaysTasks.length === 0 ? (
                <div className="text-subtext1 text-sm italic">No tasks scheduled for today</div>
              ) : (
                <ul className="space-y-2">
                  {todaysTasks.map((task) => (
                    <li 
                      key={task.id}
                      className="flex items-start gap-3 p-3 bg-surface0 rounded-lg"
                    >
                      <span className="text-overlay0 mt-0.5">○</span>
                      <span className="text-text text-sm">{task.title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            <button
              onClick={handleNext}
              className="w-full px-4 py-3 bg-blue hover:bg-blue/80 text-base rounded-lg font-medium transition-colors"
            >
              I've Reviewed My Day
            </button>
          </div>
        );
      
      case 'intention':
        return (
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <label className="text-sm text-subtext0 font-medium">
                What's your intention for today?
              </label>
              <textarea
                value={intention}
                onChange={(e) => setIntention(e.target.value)}
                placeholder="Today I will focus on... / I intend to feel... / My goal is to..."
                className="w-full h-32 p-4 bg-surface0 border border-surface1 rounded-lg text-text placeholder-subtext1 resize-none focus:outline-none focus:border-blue"
                autoFocus
              />
              <p className="text-xs text-subtext1">
                A clear intention helps guide your decisions throughout the day.
              </p>
            </div>
            
            <button
              onClick={handleNext}
              disabled={!intention.trim()}
              className="w-full px-4 py-3 bg-blue hover:bg-blue/80 disabled:bg-surface0 disabled:text-subtext1 text-base rounded-lg font-medium transition-colors"
            >
              Set Intention
            </button>
          </div>
        );
      
      case 'focus':
        return (
          <div className="space-y-6 py-4">
            <div className="p-6 bg-surface0 rounded-lg space-y-4">
              <div className="text-center space-y-2">
                <div className="text-4xl">🎯</div>
                <h4 className="text-lg font-medium text-text">Focus Commitment</h4>
                <p className="text-subtext0 text-sm">
                  Will you protect time for deep work today?
                </p>
              </div>
              
              <button
                onClick={() => setFocusCommitted(!focusCommitted)}
                className={`w-full p-4 rounded-lg border-2 transition-all ${
                  focusCommitted 
                    ? 'border-green bg-green/10 text-green' 
                    : 'border-surface1 bg-surface1/50 text-subtext0 hover:border-overlay0'
                }`}
              >
                <div className="flex items-center justify-center gap-3">
                  <span className="text-2xl">{focusCommitted ? '✓' : '○'}</span>
                  <span className="font-medium">
                    {focusCommitted ? 'Committed to focus time' : 'Tap to commit'}
                  </span>
                </div>
              </button>
            </div>
            
            {streak && streak.currentCount > 0 && (
              <div className="text-center text-sm text-subtext0">
                🔥 {streak.currentCount} day streak! Keep it going.
              </div>
            )}
            
            <button
              onClick={handleComplete}
              className="w-full px-4 py-3 bg-green hover:bg-green/80 text-base rounded-lg font-medium transition-colors"
            >
              Complete Morning Ritual
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
            <h2 className="text-lg font-semibold text-text">☀️ Morning Ritual</h2>
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
                className="h-full bg-blue transition-all duration-300"
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
                  ? 'bg-blue text-base'
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
