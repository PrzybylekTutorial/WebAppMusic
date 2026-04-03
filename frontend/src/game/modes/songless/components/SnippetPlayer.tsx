import React, { useRef, useEffect, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Square } from 'lucide-react';
import { useProgress } from '@music';

interface SnippetPlayerProps {
  isPlaying: boolean;
  duration: number; // in ms
  maxDuration: number;
  onPlay: () => void;
  onStop: () => void;
  disabled?: boolean;
}

const SnippetPlayer: React.FC<SnippetPlayerProps> = ({
  isPlaying,
  duration,
  maxDuration,
  onPlay,
  onStop,
  disabled
}) => {
  // Subscribe to global progress store (synced with actual Spotify playback)
  const storeProgress = useProgress();
  const progressBarRef = useRef<HTMLDivElement>(null);
  
  // Update progress bar directly via ref (no state, smooth 60fps)
  useEffect(() => {
    if (!progressBarRef.current) return;
    
    if (isPlaying) {
      // Calculate percentage based on actual playback progress vs current duration limit
      const percent = Math.min((storeProgress / duration) * 100, 100);
      progressBarRef.current.style.width = `${percent}%`;
    } else {
      // Reset to 0 when not playing
      progressBarRef.current.style.width = '0%';
    }
  }, [storeProgress, duration, isPlaying]);

  // Format duration for display
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${(ms / 1000).toFixed(1)}s`;
    const seconds = ms / 1000;
    return Number.isInteger(seconds) ? `${seconds}s` : `${seconds.toFixed(1)}s`;
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md mx-auto p-6 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
      <div className="text-xl font-bold font-mono text-[var(--color-text-primary)]">
        {formatDuration(duration)} Snippet
      </div>
      
      {/* Progress bar - updated via ref for smooth animation */}
      <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
        <div 
          ref={progressBarRef}
          className="h-full bg-gradient-to-r from-[var(--color-primary-mint)] to-[var(--color-accent-lavender)] will-change-[width] transition-none"
          style={{ width: '0%' }}
        />
      </div>

      <Button
        onClick={isPlaying ? onStop : onPlay}
        disabled={disabled}
        size="lg"
        className="w-24 h-24 rounded-full shadow-lg text-white text-4xl transition-transform hover:scale-105 active:scale-95 bg-gradient-to-br from-purple-500 to-indigo-600 border-4 border-white/30"
      >
        {isPlaying ? <Square fill="currentColor" size={32} /> : <Play fill="currentColor" size={40} className="ml-2" />}
      </Button>
      
      <p className="text-sm text-gray-500 font-medium">
        {isPlaying ? 'Playing...' : 'Press to Play'}
      </p>
    </div>
  );
};

export default memo(SnippetPlayer);

