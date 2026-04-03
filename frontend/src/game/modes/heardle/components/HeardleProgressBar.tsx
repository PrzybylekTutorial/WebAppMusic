import React, { useRef, useEffect, memo } from 'react';
import { cn } from '@/lib/utils';
import { HeardleSegment } from '../model/types';
import { TOTAL_DURATION, formatSegmentDuration } from '../model/constants';

interface HeardleProgressBarProps {
  segments: HeardleSegment[];
  currentSegmentIndex: number;
  playbackPosition: number;
  isPlaying: boolean;
  isPaused: boolean;
  onSegmentClick?: (index: number) => void;
}

const HeardleProgressBar: React.FC<HeardleProgressBarProps> = ({
  segments,
  currentSegmentIndex,
  playbackPosition,
  isPlaying,
  isPaused,
  onSegmentClick
}) => {
  const progressFillRef = useRef<HTMLDivElement>(null);
  const currentSegment = segments[currentSegmentIndex];
  
  // Calculate fill percentage within current segment
  useEffect(() => {
    if (!progressFillRef.current || !currentSegment) return;
    
    // Calculate how much of the current segment is filled
    const segmentStartTime = currentSegmentIndex > 0 
      ? segments[currentSegmentIndex - 1].endTime 
      : 0;
    const segmentDuration = currentSegment.duration - (currentSegmentIndex > 0 ? segments[currentSegmentIndex - 1].duration : 0);
    const positionInSegment = Math.max(0, playbackPosition - segmentStartTime);
    const fillPercent = Math.min((positionInSegment / segmentDuration) * 100, 100);
    
    progressFillRef.current.style.width = `${fillPercent}%`;
  }, [playbackPosition, currentSegmentIndex, currentSegment, segments]);

  // Get segment status colors and styles
  const getSegmentStyle = (segment: HeardleSegment, index: number) => {
    const isCurrent = index === currentSegmentIndex;
    const isPending = segment.status === 'pending';
    const isCompleted = segment.status === 'completed';
    const isSkipped = segment.status === 'skipped';
    const isFailed = segment.status === 'failed';

    return cn(
      "relative h-full flex items-center justify-center transition-all duration-300 border-r border-white/20 last:border-r-0",
      // Base states
      isPending && "bg-slate-700/50",
      isCurrent && "bg-slate-600/70",
      isCompleted && "bg-emerald-500/80",
      isSkipped && "bg-amber-500/60",
      isFailed && "bg-red-500/60",
      // Interactive states
      onSegmentClick && index <= currentSegmentIndex && "cursor-pointer hover:brightness-110"
    );
  };

  // Calculate segment width based on its duration relative to total
  const getSegmentWidth = (segment: HeardleSegment, index: number): string => {
    const prevEndTime = index > 0 ? segments[index - 1].endTime : 0;
    const segmentDuration = segment.endTime - prevEndTime;
    const widthPercent = (segmentDuration / TOTAL_DURATION) * 100;
    return `${widthPercent}%`;
  };

  return (
    <div className="w-full">
      {/* Time labels above bar */}
      <div className="flex mb-1">
        {segments.map((segment, index) => (
          <div 
            key={`label-${index}`}
            className="flex items-center justify-center"
            style={{ width: getSegmentWidth(segment, index) }}
          >
            <span 
              className={cn(
                "text-xs font-bold transition-all duration-300",
                index === currentSegmentIndex 
                  ? "text-white scale-110" 
                  : index < currentSegmentIndex 
                    ? "text-emerald-400" 
                    : "text-slate-500"
              )}
            >
              {formatSegmentDuration(segment.endTime)}
            </span>
          </div>
        ))}
      </div>

      {/* Progress bar container */}
      <div className="w-full h-10 bg-slate-800 rounded-lg overflow-hidden flex shadow-inner border border-slate-600/50">
        {segments.map((segment, index) => (
          <div
            key={`segment-${index}`}
            className={getSegmentStyle(segment, index)}
            style={{ width: getSegmentWidth(segment, index) }}
            onClick={() => onSegmentClick?.(index)}
          >
            {/* Fill animation for current segment */}
            {index === currentSegmentIndex && (
              <div 
                ref={progressFillRef}
                className={cn(
                  "absolute left-0 top-0 bottom-0 transition-none will-change-[width]",
                  isPlaying && !isPaused 
                    ? "bg-gradient-to-r from-cyan-400 to-emerald-400" 
                    : "bg-gradient-to-r from-cyan-500/70 to-emerald-500/70"
                )}
                style={{ width: '0%' }}
              />
            )}
            
            {/* Segment number indicator */}
            <span 
              className={cn(
                "relative z-10 text-sm font-bold transition-all",
                index === currentSegmentIndex 
                  ? "text-white drop-shadow-lg" 
                  : index < currentSegmentIndex 
                    ? "text-white/90" 
                    : "text-slate-400"
              )}
            >
              {index + 1}
            </span>

            {/* Status icon for completed/skipped/failed */}
            {segment.status === 'completed' && (
              <span className="absolute right-1 top-1/2 -translate-y-1/2 text-white text-xs">✓</span>
            )}
            {segment.status === 'skipped' && (
              <span className="absolute right-1 top-1/2 -translate-y-1/2 text-white text-xs">→</span>
            )}
            {segment.status === 'failed' && (
              <span className="absolute right-1 top-1/2 -translate-y-1/2 text-white text-xs">✗</span>
            )}
          </div>
        ))}
      </div>

      {/* Current segment info */}
      <div className="flex justify-between items-center mt-2 px-1">
        <span className="text-sm text-slate-400">
          Segment {currentSegmentIndex + 1} of {segments.length}
        </span>
        <span className={cn(
          "text-sm font-medium",
          isPlaying && !isPaused ? "text-emerald-400" : isPaused ? "text-amber-400" : "text-slate-400"
        )}>
          {isPlaying && !isPaused ? "Playing..." : isPaused ? "Paused" : "Ready"}
        </span>
        <span className="text-sm text-slate-400">
          {formatSegmentDuration(currentSegment?.endTime || 0)} max
        </span>
      </div>
    </div>
  );
};

export default memo(HeardleProgressBar);

