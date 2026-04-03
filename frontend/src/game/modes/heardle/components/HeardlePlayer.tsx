import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, SkipForward, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HeardleSegment } from '../model/types';
import { formatSegmentDuration, calculateScore } from '../model/constants';

interface HeardlePlayerProps {
  segments: HeardleSegment[];
  currentSegmentIndex: number;
  isPlaying: boolean;
  isPaused: boolean;
  isGameOver: boolean;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onReplay: () => void;
  onSkip: () => void;
  onGiveUp: () => void;
  disabled?: boolean;
  isActionPending?: boolean;
}

const HeardlePlayer: React.FC<HeardlePlayerProps> = ({
  segments,
  currentSegmentIndex,
  isPlaying,
  isPaused,
  isGameOver,
  onPlay,
  onPause,
  onResume,
  onReplay,
  onSkip,
  onGiveUp,
  disabled = false,
  isActionPending = false
}) => {
  const currentSegment = segments[currentSegmentIndex];
  const isLastSegment = currentSegmentIndex === segments.length - 1;
  const potentialScore = calculateScore(currentSegmentIndex);

  // Handle play/pause toggle
  const handlePlayPauseClick = () => {
    if (disabled || isGameOver) return;
    
    if (isPlaying && !isPaused) {
      onPause();
    } else if (isPaused) {
      onResume();
    } else {
      onPlay();
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {/* Score indicator */}
      <div className="flex items-center gap-4 text-center">
        <div className="bg-slate-800/80 px-4 py-2 rounded-full border border-slate-600/50">
          <span className="text-slate-400 text-sm">Potential Score: </span>
          <span className="text-emerald-400 font-bold">{potentialScore} pts</span>
        </div>
        <div className="bg-slate-800/80 px-4 py-2 rounded-full border border-slate-600/50">
          <span className="text-slate-400 text-sm">Listen up to: </span>
          <span className="text-cyan-400 font-bold">{formatSegmentDuration(currentSegment?.endTime || 0)}</span>
        </div>
      </div>

      {/* Main play button - large and central */}
      <Button
        onClick={handlePlayPauseClick}
        disabled={disabled || isGameOver || isActionPending}
        className={cn(
          "w-20 h-20 rounded-full shadow-lg text-white transition-all duration-300",
          "hover:scale-105 active:scale-95",
          isPlaying && !isPaused 
            ? "bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500" 
            : "bg-gradient-to-br from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500",
          "border-4 border-white/20"
        )}
      >
        {isPlaying && !isPaused ? (
          <Pause size={32} className="fill-current" />
        ) : (
          <Play size={36} className="fill-current ml-1" />
        )}
      </Button>

      {/* Status text */}
      <p className={cn(
        "text-sm font-medium transition-colors",
        isPlaying && !isPaused ? "text-emerald-400" : isPaused ? "text-amber-400" : "text-slate-400"
      )}>
        {isPlaying && !isPaused 
          ? "Playing snippet..." 
          : isPaused 
            ? "Paused - click to resume" 
            : "Click to play snippet"}
      </p>

      {/* Control buttons row */}
      <div className="flex flex-wrap justify-center gap-3 w-full max-w-md">
        {/* Replay button */}
        <Button
          variant="outline"
          onClick={onReplay}
          disabled={disabled || isGameOver || isActionPending}
          className="flex-1 min-w-[100px] border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
        >
          <RotateCcw size={18} className="mr-2" />
          Replay
        </Button>

        {/* Skip button */}
        <Button
          variant="outline"
          onClick={onSkip}
          disabled={disabled || isGameOver || isLastSegment || isActionPending}
          className={cn(
            "flex-1 min-w-[100px] border-amber-600/50 text-amber-400",
            "hover:bg-amber-600/20 hover:text-amber-300 hover:border-amber-500",
            isLastSegment && "opacity-50"
          )}
        >
          <SkipForward size={18} className="mr-2 fill-current" />
          {isLastSegment ? "Final Try" : "Skip (+time)"}
        </Button>

        {/* Give up button */}
        <Button
          variant="ghost"
          onClick={onGiveUp}
          disabled={disabled || isGameOver || isActionPending}
          className="flex-1 min-w-[100px] text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <Flag size={18} className="mr-2" />
          Give Up
        </Button>
      </div>

      {/* Skip penalty notice */}
      {!isLastSegment && !isGameOver && (
        <p className="text-xs text-slate-500 text-center">
          Skipping reveals more of the song but reduces your potential score by 15 points
        </p>
      )}
    </div>
  );
};

export default memo(HeardlePlayer);

