import React from 'react';
import { Play, Pause, RotateCcw, SkipForward, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GameControlsProps {
  isPaused: boolean;
  togglePlayPause: () => void;
  restartMusic: () => void;
  skipSong: () => void;
  progress: number;
  gameModeDuration: number;
  gameMode: string;
  currentStepIndex: number;
  totalSteps: number;
  progressiveSteps: number[];
}

const GameControls: React.FC<GameControlsProps> = ({ 
  isPaused, 
  togglePlayPause, 
  restartMusic, 
  skipSong, 
  progress, 
  gameModeDuration, 
  gameMode,
  currentStepIndex,
  totalSteps,
  progressiveSteps
}) => {
  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getSkipLabel = () => {
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
  };

  return (
    <div className="flex flex-col items-center gap-4 mt-6">
      {gameMode === 'progressive' && (
        <div className="bg-white/50 px-4 py-1.5 rounded-full text-sm font-semibold text-gray-500 flex items-center gap-1.5">
          <Clock size={14} />
          Time Tier: {currentStepIndex + 1} / {totalSteps} ({formatTime(gameModeDuration)})
        </div>
      )}
      
      <div className="flex flex-wrap justify-center gap-4 w-full">
        <Button 
          onClick={togglePlayPause} 
          variant={isPaused ? "mint" : "active"}
          size="lg"
          className="min-w-[120px]"
        >
          {isPaused ? <Play size={20} className="mr-2 fill-current" /> : <Pause size={20} className="mr-2 fill-current" />}
          {progress >= gameModeDuration && gameMode !== 'endless' ? 'Play' : (isPaused ? 'Play' : 'Pause')}
        </Button>

        <Button 
          onClick={restartMusic} 
          variant="lavender"
          size="lg"
          className="min-w-[120px]"
        >
          <RotateCcw size={20} className="mr-2" />
          Replay
        </Button>

        <Button 
          onClick={skipSong} 
          variant="peach"
          size="lg"
          className="min-w-[120px]"
        >
          <SkipForward size={20} className="mr-2 fill-current" />
          {getSkipLabel()}
        </Button>
      </div>
    </div>
  );
};

export default GameControls;
