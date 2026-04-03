import { SonglessConfig } from './types';

// Progressive steps in milliseconds
export const PROGRESSIVE_STEPS = [100, 500, 1000, 2000, 4000, 8000, 16000];

export const SONGLESS_CONFIG: SonglessConfig = {
  initialScore: 100,
  skipPenalty: 15,
  maxSkips: PROGRESSIVE_STEPS.length - 1,
  steps: PROGRESSIVE_STEPS,
};

export const MIN_SCORE = 0;
export const FUZZY_MATCH_THRESHOLD = 0.8;


