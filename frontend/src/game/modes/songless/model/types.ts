export type SonglessPhase = 'idle' | 'playing' | 'guessing' | 'success' | 'failed' | 'revealed';

export interface SonglessGameStats {
  score: number;
  highScore: number;
  streak: number;
  bestStreak: number;
  skipsUsed: number;
  roundsPlayed: number;
  totalGuesses: number;
}

export interface SonglessConfig {
  initialScore: number;
  skipPenalty: number;
  maxSkips: number;
  steps: number[]; // Duration in ms for each step
}

export interface SonglessRoundState {
  currentStepIndex: number;
  currentDuration: number;
  isSnippetPlaying: boolean;
  userGuess: string;
  guessResult: {
    correct: boolean;
    actualTitle?: string;
    actualArtist?: string;
  } | null;
  suggestions: string[];
}


