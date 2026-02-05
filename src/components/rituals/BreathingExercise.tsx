import { useState, useEffect, useCallback } from 'react';

interface BreathingExerciseProps {
  /** Total duration in seconds (default 60) */
  duration?: number;
  /** Callback when exercise completes */
  onComplete?: () => void;
  /** Callback to skip the exercise */
  onSkip?: () => void;
}

// 4-7-8 breathing pattern
const INHALE_SECONDS = 4;
const HOLD_SECONDS = 7;
const EXHALE_SECONDS = 8;
const CYCLE_TOTAL = INHALE_SECONDS + HOLD_SECONDS + EXHALE_SECONDS; // 19 seconds per cycle

type Phase = 'inhale' | 'hold' | 'exhale' | 'complete';

export function BreathingExercise({ 
  duration = 60, 
  onComplete, 
  onSkip 
}: BreathingExerciseProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [cycleElapsed, setCycleElapsed] = useState(0);
  const [phase, setPhase] = useState<Phase>('inhale');
  const [cycleCount, setCycleCount] = useState(0);

  // Calculate which phase we're in based on cycle elapsed time
  const getPhase = useCallback((elapsed: number): Phase => {
    if (elapsed < INHALE_SECONDS) return 'inhale';
    if (elapsed < INHALE_SECONDS + HOLD_SECONDS) return 'hold';
    return 'exhale';
  }, []);

  // Get seconds remaining in current phase
  const getPhaseRemaining = useCallback((elapsed: number, currentPhase: Phase): number => {
    switch (currentPhase) {
      case 'inhale':
        return INHALE_SECONDS - elapsed;
      case 'hold':
        return INHALE_SECONDS + HOLD_SECONDS - elapsed;
      case 'exhale':
        return CYCLE_TOTAL - elapsed;
      default:
        return 0;
    }
  }, []);

  // Timer effect
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTotalElapsed(prev => {
        const newTotal = prev + 1;
        if (newTotal >= duration) {
          setIsRunning(false);
          setPhase('complete');
          onComplete?.();
          return duration;
        }
        return newTotal;
      });

      setCycleElapsed(prev => {
        const newElapsed = prev + 1;
        if (newElapsed >= CYCLE_TOTAL) {
          setCycleCount(c => c + 1);
          return 0;
        }
        return newElapsed;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, duration, onComplete]);

  // Calculate current phase from cycleElapsed (derived state, no effect needed)
  const currentPhase = phase === 'complete' ? 'complete' : getPhase(cycleElapsed);

  const handleStart = () => {
    setIsRunning(true);
    setTotalElapsed(0);
    setCycleElapsed(0);
    setCycleCount(0);
    setPhase('inhale');
  };

  const phaseRemaining = Math.ceil(getPhaseRemaining(cycleElapsed, currentPhase));
  const progress = (totalElapsed / duration) * 100;

  // Calculate circle scale based on phase
  const getCircleScale = () => {
    switch (currentPhase) {
      case 'inhale':
        // Grow from 0.6 to 1.0 over INHALE_SECONDS
        return 0.6 + (0.4 * (cycleElapsed / INHALE_SECONDS));
      case 'hold':
        // Stay at 1.0
        return 1.0;
      case 'exhale': {
        // Shrink from 1.0 to 0.6 over EXHALE_SECONDS
        const exhaleProgress = (cycleElapsed - INHALE_SECONDS - HOLD_SECONDS) / EXHALE_SECONDS;
        return 1.0 - (0.4 * exhaleProgress);
      }
      default:
        return 0.8;
    }
  };

  const getPhaseColor = () => {
    switch (currentPhase) {
      case 'inhale':
        return 'bg-blue/30 border-blue';
      case 'hold':
        return 'bg-mauve/30 border-mauve';
      case 'exhale':
        return 'bg-green/30 border-green';
      case 'complete':
        return 'bg-green/30 border-green';
      default:
        return 'bg-surface0 border-overlay0';
    }
  };

  const getPhaseText = () => {
    switch (currentPhase) {
      case 'inhale':
        return 'Breathe In';
      case 'hold':
        return 'Hold';
      case 'exhale':
        return 'Breathe Out';
      case 'complete':
        return 'Complete';
      default:
        return '';
    }
  };

  const getPhaseInstruction = () => {
    switch (currentPhase) {
      case 'inhale':
        return 'Slowly fill your lungs through your nose';
      case 'hold':
        return 'Hold gently, stay relaxed';
      case 'exhale':
        return 'Release slowly through your mouth';
      case 'complete':
        return 'Well done! You\'re centered and ready.';
      default:
        return '';
    }
  };

  if (!isRunning && totalElapsed === 0) {
    return (
      <div className="flex flex-col items-center justify-center space-y-6 py-8">
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold text-text">4-7-8 Breathing</h3>
          <p className="text-subtext0 text-sm max-w-xs">
            A calming technique: inhale for 4, hold for 7, exhale for 8.
          </p>
        </div>
        
        {/* Preview circle */}
        <div className="relative w-48 h-48 flex items-center justify-center">
          <div className="absolute w-40 h-40 rounded-full bg-surface0 border-2 border-overlay0 flex items-center justify-center">
            <span className="text-subtext0 text-sm">~{Math.ceil(duration / CYCLE_TOTAL)} cycles</span>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={handleStart}
            className="px-6 py-3 bg-blue hover:bg-blue/80 text-base rounded-lg font-medium transition-colors"
          >
            Begin
          </button>
          {onSkip && (
            <button
              onClick={onSkip}
              className="px-6 py-3 bg-surface0 hover:bg-surface1 text-subtext0 rounded-lg font-medium transition-colors"
            >
              Skip
            </button>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'complete') {
    return (
      <div className="flex flex-col items-center justify-center space-y-6 py-8">
        <div className="relative w-48 h-48 flex items-center justify-center">
          <div className={`absolute w-40 h-40 rounded-full ${getPhaseColor()} border-2 flex items-center justify-center`}>
            <div className="text-center">
              <div className="text-4xl mb-2">✨</div>
              <span className="text-green font-medium">Complete</span>
            </div>
          </div>
        </div>
        
        <p className="text-subtext0 text-sm text-center max-w-xs">
          {cycleCount} cycles completed. You're centered and ready.
        </p>
        
        <button
          onClick={onComplete}
          className="px-6 py-3 bg-green hover:bg-green/80 text-base rounded-lg font-medium transition-colors"
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-6 py-8">
      {/* Main breathing circle */}
      <div className="relative w-56 h-56 flex items-center justify-center">
        {/* Background track */}
        <div className="absolute w-48 h-48 rounded-full bg-surface0/50 border border-surface1" />
        
        {/* Animated breathing circle */}
        <div 
          className={`absolute rounded-full ${getPhaseColor()} border-2 flex items-center justify-center transition-all duration-1000 ease-in-out`}
          style={{
            width: `${getCircleScale() * 192}px`,
            height: `${getCircleScale() * 192}px`,
          }}
        >
          <div className="text-center">
            <div className="text-4xl font-bold text-text mb-1">
              {phaseRemaining}
            </div>
            <div className="text-sm font-medium text-text/80">
              {getPhaseText()}
            </div>
          </div>
        </div>
      </div>
      
      {/* Phase instruction */}
      <p className="text-subtext0 text-sm text-center h-5">
        {getPhaseInstruction()}
      </p>
      
      {/* Progress bar */}
      <div className="w-64 space-y-1">
        <div className="h-1.5 bg-surface0 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-subtext1">
          <span>Cycle {cycleCount + 1}</span>
          <span>{Math.ceil(duration - totalElapsed)}s remaining</span>
        </div>
      </div>
      
      {/* Skip button */}
      {onSkip && (
        <button
          onClick={onSkip}
          className="text-sm text-subtext0 hover:text-subtext1 transition-colors"
        >
          Skip breathing exercise
        </button>
      )}
    </div>
  );
}
