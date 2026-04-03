import { useState, useCallback, useRef, useEffect, useReducer } from 'react';
import { useSpotifyPlayerContext } from '@music';
import { 
  SonglessPhase, 
  SonglessGameStats, 
  SonglessRoundState 
} from '../model/types';
import { SONGLESS_CONFIG, MIN_SCORE } from '../model/constants';

// Actions for the reducer
type GameAction = 
  | { type: 'START_GAME' }
  | { type: 'NEXT_ROUND'; payload: { songTitle: string; songArtist: string } } // Reset round state
  | { type: 'PLAY_SNIPPET' }
  | { type: 'STOP_SNIPPET' }
  | { type: 'SKIP_LEVEL' }
  | { type: 'SUBMIT_GUESS'; payload: { guess: string; isCorrect: boolean; actualTitle: string } }
  | { type: 'GIVE_UP'; payload: { actualTitle: string; actualArtist: string } }
  | { type: 'SET_SUGGESTIONS'; payload: string[] };

const initialStats: SonglessGameStats = {
  score: 0,
  highScore: 0,
  streak: 0,
  bestStreak: 0,
  skipsUsed: 0,
  roundsPlayed: 0,
  totalGuesses: 0,
};

const initialRoundState: SonglessRoundState = {
  currentStepIndex: 0,
  currentDuration: SONGLESS_CONFIG.steps[0],
  isSnippetPlaying: false,
  userGuess: '',
  guessResult: null,
  suggestions: [],
};

export const useSonglessGame = (
  currentSong: any, 
  onLoadNewSong: () => Promise<void>,
  totalSongs: number,
  allSongTitles: string[] = []
) => {
  const player = useSpotifyPlayerContext();
  const [phase, setPhase] = useState<SonglessPhase>('idle');
  const [stats, setStats] = useState<SonglessGameStats>(initialStats);
  const [roundState, setRoundState] = useState<SonglessRoundState>(initialRoundState);
  
  // Ref for audio timeout to clear it reliably
  const audioTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Clear timeout helper
  const clearAudioTimeout = useCallback(() => {
    if (audioTimeoutRef.current) {
      clearTimeout(audioTimeoutRef.current);
      audioTimeoutRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearAudioTimeout();
  }, [clearAudioTimeout]);

  // Start Game
  const startGame = useCallback(async () => {
    setStats(initialStats);
    setPhase('idle');
    await onLoadNewSong();
    // After loading, we are ready. User needs to press "Play Snippet"
  }, [onLoadNewSong]);

  // Initialize round when song changes
  useEffect(() => {
    if (currentSong) {
      setRoundState(initialRoundState);
      setPhase('playing'); // Ready to play
    }
  }, [currentSong]);

  // Play Snippet Logic - Optimized with local SDK methods
  const playSnippet = useCallback(async () => {
    if (!currentSong || !player.isDeviceReady) return;

    try {
      clearAudioTimeout();
      
      // Update UI immediately (optimistic)
      setRoundState(prev => ({ ...prev, isSnippetPlaying: true }));
      
      // playLocalSnippet handles both cached (instant) and new tracks (single API call)
      // No separate preload or fallback needed - everything in one method
      await player.playLocalSnippet(currentSong.uri, currentSong.id);
      
      const duration = roundState.currentDuration;
      
      // Schedule pause at duration limit using local SDK (instant stop)
      audioTimeoutRef.current = setTimeout(async () => {
        await player.localPause();
        setRoundState(prev => ({ ...prev, isSnippetPlaying: false }));
      }, duration);
      
    } catch (error) {
      console.error("Error playing snippet:", error);
      setRoundState(prev => ({ ...prev, isSnippetPlaying: false }));
    }
  }, [currentSong, player, roundState.currentDuration, clearAudioTimeout]);

  // Stop Snippet Manually - uses local SDK (instant)
  const stopSnippet = useCallback(async () => {
    clearAudioTimeout();
    setRoundState(prev => ({ ...prev, isSnippetPlaying: false }));
    try {
      // Always use local SDK for instant response
      await player.localPause();
    } catch (error) {
      console.error("Error stopping snippet:", error);
    }
  }, [player, clearAudioTimeout]);

  // Skip / Increase Duration
  const handleSkip = useCallback(() => {
    if (phase !== 'playing' && phase !== 'guessing') return;

    const nextIndex = roundState.currentStepIndex + 1;
    
    // Check if max skips reached
    if (nextIndex >= SONGLESS_CONFIG.steps.length) {
      // Game Over for this round (or just reveal)
      setPhase('failed');
      setRoundState(prev => ({
        ...prev,
        guessResult: {
          correct: false,
          actualTitle: currentSong.title,
          actualArtist: currentSong.artist
        }
      }));
      setStats(prev => ({
        ...prev,
        streak: 0,
        roundsPlayed: prev.roundsPlayed + 1
      }));
      return;
    }

    // Apply penalty
    setStats(prev => ({
      ...prev,
      score: Math.max(MIN_SCORE, prev.score - SONGLESS_CONFIG.skipPenalty),
      skipsUsed: prev.skipsUsed + 1
    }));

    // Update round state
    setRoundState(prev => ({
      ...prev,
      currentStepIndex: nextIndex,
      currentDuration: SONGLESS_CONFIG.steps[nextIndex]
    }));
    
    // Optional: Auto-play next snippet?
    // Let's not auto-play, let user click play again to hear longer version.
    // Or maybe just flash the new duration.
  }, [phase, roundState.currentStepIndex, currentSong]);

  // Submit Guess
  const submitGuess = useCallback((guess: string) => {
    if (!currentSong) return;
    
    const normalizedGuess = guess.trim().toLowerCase();
    const normalizedTitle = currentSong.title.toLowerCase();
    
    // Simple exact match or "includes" check if lenient
    // The requirement says "fuzzy matching", "tolerance for partial"
    // For now simple inclusion or exact match.
    // Let's do a basic check:
    
    const isCorrect = normalizedGuess === normalizedTitle || (normalizedTitle.includes(normalizedGuess) && normalizedGuess.length > 3);
    
    setStats(prev => ({
      ...prev,
      totalGuesses: prev.totalGuesses + 1
    }));

    if (isCorrect) {
      setPhase('success');
      // Calculate score based on remaining skips? 
      // Plan said: "Points start: 100. Each skip: -15". 
      // We already deducted points on skip. So current score is the result.
      // Maybe add a bonus?
      
      setStats(prev => {
        const newScore = prev.score + 10; // Bonus for correct guess? Or just keep what's left.
                                          // Prompt says: "Start 100, skip -15".
                                          // So if I guess immediately: 100.
                                          // If I skip once: 85.
                                          // So we just keep the accumulated score logic, but maybe add the round score to a total game score?
                                          // Wait, `stats.score` seems to be the TOTAL score across rounds?
                                          // Or round score?
                                          // "Scoring: Punkty startowe: 100. Każdy skip: -15. Minimalny score: 0."
                                          // This implies per-round potential points.
                                          // But we also want a global score.
        
        // Let's assume `stats.score` is the GLOBAL score accumulator.
        // And we calculate round points now.
        
        const skipsInRound = roundState.currentStepIndex;
        const roundPoints = Math.max(0, SONGLESS_CONFIG.initialScore - (skipsInRound * SONGLESS_CONFIG.skipPenalty));
        
        const newTotalScore = prev.score + roundPoints;
        const newStreak = prev.streak + 1;
        
        return {
          ...prev,
          score: newTotalScore,
          highScore: Math.max(prev.highScore, newTotalScore),
          streak: newStreak,
          bestStreak: Math.max(prev.bestStreak, newStreak),
          roundsPlayed: prev.roundsPlayed + 1
        };
      });

      setRoundState(prev => ({
        ...prev,
        guessResult: {
          correct: true,
          actualTitle: currentSong.title,
          actualArtist: currentSong.artist
        }
      }));
    } else {
      // Wrong guess
      // Reset streak
      setStats(prev => ({
        ...prev,
        streak: 0
      }));
      
      // Maybe just show wrong guess message, don't fail immediately unless strict mode?
      // "Im szybciej i wcześniej odgadnięta piosenka → tym większy wynik."
      // Doesn't explicitly say wrong guess ends round.
      // Usually it allows retrying or forces a skip?
      // Let's allow retry but maybe small penalty?
      // Or just feedback "Wrong".
      
      setRoundState(prev => ({
        ...prev,
        guessResult: {
          correct: false
        }
      }));
      
      // Clear result after delay
      setTimeout(() => {
         setRoundState(prev => ({ ...prev, guessResult: null }));
      }, 2000);
    }
  }, [currentSong, roundState.currentStepIndex]);

  // Give Up / Reveal
  const giveUp = useCallback(() => {
    if (!currentSong) return;
    
    setPhase('revealed');
    setStats(prev => ({
      ...prev,
      streak: 0,
      roundsPlayed: prev.roundsPlayed + 1
    }));
    setRoundState(prev => ({
      ...prev,
      guessResult: {
        correct: false,
        actualTitle: currentSong.title,
        actualArtist: currentSong.artist
      }
    }));
  }, [currentSong]);

  // Handle input change and suggestions
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const inputLower = value.toLowerCase();
    
    // Update user guess
    setRoundState(prev => ({ ...prev, userGuess: value }));

    // Generate suggestions
    if (!value || value.length < 2) {
      setRoundState(prev => ({ ...prev, suggestions: [] }));
      return;
    }

    // Filter local suggestions
    const matchingSongs = allSongTitles.filter(song => 
      song.toLowerCase().includes(inputLower)
    );

    // Sort suggestions
    const sortedSuggestions = matchingSongs.sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      if (aLower === inputLower) return -1;
      if (bLower === inputLower) return 1;
      if (aLower.startsWith(inputLower)) return -1;
      if (bLower.startsWith(inputLower)) return 1;
      return aLower.localeCompare(bLower);
    });

    setRoundState(prev => ({ ...prev, suggestions: sortedSuggestions.slice(0, 5) }));
  }, [allSongTitles]);

  return {
    phase,
    stats,
    roundState,
    actions: {
      startGame,
      playSnippet,
      stopSnippet,
      handleSkip,
      submitGuess,
      giveUp,
      setRoundState,
      handleInputChange
    }
  };
};
