/**
 * ProgressBar Component
 * ---------------------
 * A highly-performant, visually appealing progress bar used to display the progress
 * of music playback or a current "stage" in a game round. Especially designed for music/gaming
 * scenarios, supporting both standard and "progressive" (multi-step) game modes.
 * 
 * Features:
 * - Uses direct DOM manipulation for *ultra-smooth* (60fps+) progress fill animation.
 * - Supports "progressive" mode, drawing a step indicator with circles and time-limits per step.
 * - Flexible: Adapts to standard timer or restricted, multi-phase (e.g. "progressive") gameplay.
 * - Allows seeking by clicking the bar; onSeek gets called with intended seek time.
 * - Visualizes step markers, cutoff points, and transitions for improved UX.
 * - Accepts external progress source (via useProgress), but can also fallback to prop value.
 * 
 * Props:
 * @param {number} progress - Current progress in ms (if store is unavailable)
 * @param {number} duration - Current round/step duration in ms
 * @param {number|null} maxDuration - For progressive: the max for the progress bar, to limit area
 * @param {number[]|null} markers - Optional list of marker times (ms) for showing visual ticks (progressive)
 * @param {(time: number) => void} onSeek - Invoked if bar is clicked, with intended position (ms)
 * @param {boolean} [isPlaying] - Optional. Marks playback as active (not currently used for style)
 * @param {string} [gameMode] - If "progressive", renders alternate UI
 * @param {number} [currentStepIndex] - For progressive mode, which step/circle is active
 * @param {number[]} [progressiveSteps] - List of step/circle time limits (for headers)
 * 
 * Usage:
 * <ProgressBar
 *   progress={currentProgress}
 *   duration={duration}
 *   maxDuration={maxAllowed}
 *   markers={stepMarkers}
 *   onSeek={mySeekHandler}
 *   isPlaying={isPlaying}
 *   gameMode={"progressive"}
 *   currentStepIndex={currentStep}
 *   progressiveSteps={[...]}
 * />
 */

import React, { useRef, useEffect, useMemo, memo } from 'react';
import { cn } from '@/lib/utils';
import { useProgress } from '@music';

interface ProgressBarProps {
  progress: number; // Fallback prop for compatibility
  duration: number;
  maxDuration: number | null;
  markers: number[] | null;
  onSeek: (time: number) => void;
  isPlaying?: boolean;
  gameMode?: string;
  currentStepIndex?: number;
  progressiveSteps?: number[];
}

/**
 * StepIndicator
 * -------------
 * Memoized subcomponent.
 * Renders a circle step indicator for each step in progressive mode.
 * Colors and shadows change depending on whether the step is completed, current, or in the future.
 * Shows a formatted label underneath.
 */
const StepIndicator = memo(({ 
  step, 
  index, 
  currentStepIndex,
  formatStepTime 
}: { 
  step: number; 
  index: number; 
  currentStepIndex: number;
  formatStepTime: (ms: number) => string;
}) => {
  const isCompleted = index < currentStepIndex;
  const isCurrent = index === currentStepIndex;
  const isFuture = index > currentStepIndex;
  
  return (
    <div className="flex flex-col items-center">
      <div 
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
          isCompleted && "bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]",
          isCurrent && "bg-gradient-to-r from-[var(--color-primary-mint)] to-[var(--color-accent-lavender)] text-white shadow-[0_0_15px_rgba(181,234,215,0.7)] scale-110",
          isFuture && "bg-gray-300 text-gray-500"
        )}
      >
        {index + 1}
      </div>
      <span 
        className={cn(
          "text-xs mt-1 font-medium transition-colors duration-300",
          isCurrent ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]"
        )}
      >
        {formatStepTime(step)}
      </span>
    </div>
  );
});

StepIndicator.displayName = 'StepIndicator';

/**
 * ProgressBar
 * -----------
 * See file-level JSDoc above for overview and usage.
 */
const ProgressBar: React.FC<ProgressBarProps> = ({ 
  progress: propProgress, 
  duration, 
  maxDuration, 
  markers, 
  onSeek,
  isPlaying = false,
  gameMode,
  currentStepIndex = 0,
  progressiveSteps = []
}) => {
  // Outer bar and dynamic fill refs
  const barRef = useRef<HTMLDivElement>(null);
  const progressFillRef = useRef<HTMLDivElement>(null);
  
  // Subscribe to progress updates from global store (fastest possible updates)
  const storeProgress = useProgress();
  
  // Use store progress if available (for perfectly synced UI on rapid changes)
  const currentProgress = storeProgress > 0 ? storeProgress : propProgress;

  // Direct bar fill update: ensures decoupling from React render, highest perf
  useEffect(() => {
    if (!progressFillRef.current) return;
    const effectiveDuration = maxDuration || duration;
    // When maxDuration is set, do *not* fill past that limit.
    const safeProgress = maxDuration ? Math.min(currentProgress, duration) : currentProgress;
    const percent = Math.min((safeProgress / effectiveDuration) * 100, 100);
    progressFillRef.current.style.width = `${percent}%`;
  }, [currentProgress, duration, maxDuration]);

  // Format functions: memoized for efficiency
  /**
   * Formats ms as m:ss or ms
   */
  const formatTime = useMemo(() => (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);
  /**
   * Formats ms for step indicators, e.g. "5s" or "3.5s"
   */
  const formatStepTime = useMemo(() => (ms: number) => {
    if (ms < 1000) return `${(ms / 1000).toFixed(1)}s`;
    const seconds = ms / 1000;
    if (Number.isInteger(seconds)) return `${seconds}s`;
    return `${seconds.toFixed(1)}s`;
  }, []);
  /**
   * For user-facing big time display in progressive mode, e.g. "5 seconds"
   */
  const formatDisplayTime = useMemo(() => (ms: number) => {
    if (ms < 1000) return `${(ms / 1000).toFixed(1)} seconds`;
    const seconds = ms / 1000;
    if (seconds === 1) return '1 second';
    if (Number.isInteger(seconds)) return `${seconds} seconds`;
    return `${seconds.toFixed(1)} seconds`;
  }, []);

  // Determine which mode
  const effectiveDuration = maxDuration || duration;
  const isProgressiveMode = gameMode === 'progressive' && progressiveSteps.length > 0;
  
  /**
   * Handles user seek (click), computing new time and calling onSeek.
   * Does *not* let users seek into restricted area beyond allowed (maxDuration).
   */
  const handleSeek = (e: React.MouseEvent) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const percentage = Math.max(0, Math.min(1, x / width));
    const seekTime = Math.floor(percentage * effectiveDuration);
    const allowedTime = maxDuration ? Math.min(seekTime, duration) : seekTime;
    onSeek(allowedTime);
  };

  // What percent of bar is fillable (for progressive cutoff visuals)
  const limitPercent = maxDuration ? (duration / effectiveDuration) * 100 : 100;
  // Used for time labels display only:
  const safeProgress = maxDuration ? Math.min(currentProgress, duration) : currentProgress;

  // --------------------- Progressive mode render ---------------------------
  if (isProgressiveMode) {
    return (
      <div className="mb-6">
        {/* Step Indicator header: circles */}
        <div className="flex justify-center items-center gap-2 mb-4">
          {progressiveSteps.map((step, index) => (
            <StepIndicator
              key={index}
              step={step}
              index={index}
              currentStepIndex={currentStepIndex}
              formatStepTime={formatStepTime}
            />
          ))}
        </div>

        {/* Display current round/step's time limit */}
        <div className="text-center mb-4">
          <span className="text-2xl font-bold text-[var(--color-text-primary)] bg-white/50 px-6 py-2 rounded-full shadow-sm">
            {formatDisplayTime(duration)}
          </span>
        </div>

        {/* Main interactive progress bar */}
        <div className="relative pt-3">
          {/* Current round time limit marker, red triangle above bar */}
          <div 
            className="absolute top-0 -translate-x-1/2 z-10 pointer-events-none transition-[left] duration-300 ease-out"
            style={{ left: `${limitPercent}%` }}
          >
            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-red-500 drop-shadow-[0_2px_4px_rgba(239,68,68,0.5)]" />
          </div>
          
          {/* Bar & fill */}
          <div 
            className="w-full h-2.5 bg-black/10 rounded-full cursor-pointer overflow-visible relative" 
            onClick={handleSeek}
            ref={barRef}
          >
            {/* Playable area highlight */}
            <div 
              className="absolute left-0 top-0 bottom-0 bg-white/20 rounded-l-full z-0 transition-[width] duration-300"
              style={{ width: `${limitPercent}%` }}
            />

            {/* Step markers as vertical ticks (optional) */}
            {markers && markers.map((marker, index) => (
              <div 
                key={index}
                className={cn(
                  "absolute top-0 bottom-0 w-0.5 z-[1] transition-colors duration-300",
                  index <= currentStepIndex ? "bg-white/50" : "bg-white/20"
                )}
                style={{ left: `${(marker / effectiveDuration) * 100}%` }}
              />
            ))}

            {/* Red vertical line at current round limit */}
            <div 
              className="absolute top-[-3px] bottom-[-3px] w-0.5 bg-red-500 z-[2] rounded-full shadow-[0_0_6px_rgba(239,68,68,0.8)] transition-[left] duration-300 -translate-x-1/2"
              style={{ left: `${limitPercent}%` }}
            />

            {/* Main animated progress fill */}
            <div 
              ref={progressFillRef}
              className="h-full bg-gradient-to-r from-[var(--color-primary-mint)] to-[var(--color-accent-lavender)] rounded-full z-[3] relative will-change-[width] transition-none"
              style={{ width: '0%' }}
            />
          </div>

          {/* Time/step labels under bar */}
          <div className="flex justify-between text-xs text-[var(--color-text-secondary)] mt-2 font-medium">
            <span>0:00</span>
            <span className="text-[var(--color-text-primary)] font-semibold">
              Step {currentStepIndex + 1} of {progressiveSteps.length}
            </span>
            <span>{formatTime(effectiveDuration)}</span>
          </div>
        </div>
      </div>
    );
  }

  // ------------------- Standard (non-progressive) bar ----------------------
  return (
    <div className="mb-9 relative">
      {/* Top time labels */}
      <div className="flex justify-between text-sm text-[var(--color-text-secondary)] mb-1 font-semibold h-5">
        <span>{formatTime(safeProgress)}</span>
        <span>{formatTime(effectiveDuration)}</span>
      </div>
      
      <div 
        className="w-full h-3 bg-black/5 rounded-full cursor-pointer overflow-visible relative" 
        onClick={handleSeek}
        ref={barRef}
      >
        {/* Animated fill (direct DOM perf) */}
        <div 
          ref={progressFillRef}
          className="h-full bg-gradient-to-r from-[var(--color-primary-mint)] to-[var(--color-accent-lavender)] rounded-full z-[3] will-change-[width] transition-none"
          style={{ width: '0%' }}
        />
      </div>
    </div>
  );
};

export default memo(ProgressBar);
