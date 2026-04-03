export type HeardlePhase = 'idle' | 'playing' | 'paused' | 'guessing' | 'success' | 'failed' | 'revealed';

export interface HeardleSegment {
  index: number;
  duration: number; // Duration in ms for this segment
  endTime: number;  // Cumulative end time in ms
  status: 'pending' | 'current' | 'completed' | 'skipped' | 'failed';
}

export interface HeardleGameStats {
  score: number;
  highScore: number;
  streak: number;
  bestStreak: number;
  roundsPlayed: number;
  totalGuesses: number;
  perfectGuesses: number; // Guessed on first segment
}

export interface HeardleRoundState {
  currentSegmentIndex: number;
  segments: HeardleSegment[];
  isPlaying: boolean;
  isPaused: boolean;
  playbackPosition: number; // Current position in ms
  pausedAt: number | null;  // Position where playback was paused
  userGuess: string;
  guessResult: {
    correct: boolean;
    actualTitle?: string;
    actualArtist?: string;
    segmentGuessedAt?: number; // Which segment they guessed correctly at
  } | null;
  suggestions: string[];
  guessHistory: GuessAttempt[];
}

export interface GuessAttempt {
  guess: string;
  segmentIndex: number;
  correct: boolean;
}

export interface HeardleConfig {
  steps: number[];           // Duration steps in ms: [100, 500, 1000, 2000, 4000, 8000, 16000]
  initialScore: number;      // Points for guessing on first segment
  scoreDecrement: number;    // Points lost per segment
  minScore: number;          // Minimum points for correct guess
  maxGuessesPerSegment: number; // Max wrong guesses before auto-skip
}

