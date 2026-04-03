import { HeardleConfig, HeardleSegment } from './types';

// Time steps in milliseconds - matching Heardle-style progression
export const HEARDLE_STEPS = [100, 500, 1000, 2000, 4000, 8000, 16000];

// Total duration (max segment end time)
export const TOTAL_DURATION = HEARDLE_STEPS[HEARDLE_STEPS.length - 1];

export const HEARDLE_CONFIG: HeardleConfig = {
  steps: HEARDLE_STEPS,
  initialScore: 100,
  scoreDecrement: 15,
  minScore: 10,
  maxGuessesPerSegment: 1, // One wrong guess auto-advances to next segment
};

// Helper to create initial segments array
export const createInitialSegments = (): HeardleSegment[] => {
  return HEARDLE_STEPS.map((duration, index) => ({
    index,
    duration,
    endTime: duration,
    status: index === 0 ? 'current' : 'pending',
  }));
};

// Calculate score based on which segment the user guessed correctly
export const calculateScore = (segmentIndex: number): number => {
  const { initialScore, scoreDecrement, minScore } = HEARDLE_CONFIG;
  const score = initialScore - (segmentIndex * scoreDecrement);
  return Math.max(score, minScore);
};

// Format duration for display
export const formatSegmentDuration = (ms: number): string => {
  if (ms < 1000) return `${(ms / 1000).toFixed(1)}s`;
  const seconds = ms / 1000;
  return Number.isInteger(seconds) ? `${seconds}s` : `${seconds.toFixed(1)}s`;
};

// Get segment width percentage (proportional to total duration)
export const getSegmentWidthPercent = (duration: number): number => {
  return (duration / TOTAL_DURATION) * 100;
};

