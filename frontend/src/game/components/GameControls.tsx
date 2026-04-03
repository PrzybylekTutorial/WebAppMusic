import React, { memo, useMemo } from 'react';
import { Play, Pause, RotateCcw, SkipForward, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProgress } from '@music';

interface GameControlsProps {
  isPaused: boolean;
  togglePlayPause: () => void;
  restartMusic: () => void;
  skipSong: () => void;
  progress: number; // Fallback for compatibility
  gameModeDuration: number;
  gameMode: string;
  currentStepIndex: number;
  totalSteps: number;
  progressiveSteps: number[];
  /** Is an action currently pending (prevents double-clicks) */
  isActionPending?: boolean;
}

const GameControls: React.FC<GameControlsProps> = ({ 
  isPaused, 
  togglePlayPause, 
  restartMusic, 
  skipSong, 
  progress: propProgress, 
  gameModeDuration, 
  gameMode,
  currentStepIndex,
  totalSteps,
  progressiveSteps,
  isActionPending = false
}) => {
  // Subscribe to progress updates from store
  const storeProgress = useProgress();
  const progress = storeProgress > 0 ? storeProgress : propProgress;

  const formatTime = useMemo(() => (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  const skipLabel = useMemo(() => {
    if (gameMode === 'progressive' && progressiveSteps && currentStepIndex < totalSteps - 1) {
      const currentDuration = progressiveSteps[currentStepIndex];
      const nextDuration = progressiveSteps[currentStepIndex + 1];
      const diff = nextDuration - currentDuration;
      const diffDisplay = diff >= 1000 ? `${(diff / 1000).toFixed(1)}s` : `${diff}ms`;
      return (
        <>
          Reveal <span className="text-[0.8em] opacity-80 ml-1">(+{diffDisplay})</span>
        </>
      );
    }
    return 'Skip';
  }, [gameMode, progressiveSteps, currentStepIndex, totalSteps]);

  // Determine button text based on state
  const playButtonText = progress >= gameModeDuration && gameMode !== 'endless' 
    ? 'Play' 
    : (isPaused ? 'Play' : 'Pause');

  return (
    <div className="flex flex-col items-center gap-4 mt-6">
      {gameMode === 'progressive' && (
        <div className="bg-white/50 px-4 py-1.5 rounded-full text-sm font-semibold text-gray-500 flex items-center gap-1.5">
          <Clock size={14} />
          Time Tier: {currentStepIndex + 1} / {totalSteps} ({formatTime(gameModeDuration)})
        </div>
      )}
      
      <div className="flex flex-wrap justify-center gap-4 w-full">
        {/* Play/Pause Button - shows loading when action pending */}
        <Button 
          onClick={togglePlayPause} 
          variant={isPaused ? "mint" : "active"}
          size="lg"
          className="min-w-[120px]"
          isLoading={isActionPending}
          disabled={isActionPending}
        >
          {isPaused ? (
            <Play size={20} className="mr-2 fill-current" />
          ) : (
            <Pause size={20} className="mr-2 fill-current" />
          )}
          {playButtonText}
        </Button>

        {/* Replay Button */}
        <Button 
          onClick={restartMusic} 
          variant="lavender"
          size="lg"
          className="min-w-[120px]"
          disabled={isActionPending}
        >
          <RotateCcw size={20} className="mr-2" />
          Replay
        </Button>

        {/* Skip/Reveal Button */}
        <Button 
          onClick={skipSong} 
          variant="peach"
          size="lg"
          className="min-w-[120px]"
          disabled={isActionPending}
        >
          <SkipForward size={20} className="mr-2 fill-current" />
          {skipLabel}
        </Button>
      </div>
    </div>
  );
};

export default memo(GameControls);
