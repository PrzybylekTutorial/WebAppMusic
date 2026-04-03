import { useState, useCallback, useRef, useEffect } from 'react';
import { useSpotifyPlayerContext, useProgress } from '@music';
import { 
  HeardlePhase, 
  HeardleGameStats, 
  HeardleRoundState,
  HeardleSegment,
  GuessAttempt
} from '../model/types';
import { 
  HEARDLE_CONFIG, 
  createInitialSegments, 
  calculateScore 
} from '../model/constants';

const initialStats: HeardleGameStats = {
  score: 0,
  highScore: 0,
  streak: 0,
  bestStreak: 0,
  roundsPlayed: 0,
  totalGuesses: 0,
  perfectGuesses: 0,
};

const createInitialRoundState = (): HeardleRoundState => ({
  currentSegmentIndex: 0,
  segments: createInitialSegments(),
  isPlaying: false,
  isPaused: false,
  playbackPosition: 0,
  pausedAt: null,
  userGuess: '',
  guessResult: null,
  suggestions: [],
  guessHistory: [],
});

export const useHeardleGame = (
  currentSong: any,
  onLoadNewSong: () => Promise<void>,
  totalSongs: number,
  allSongTitles: string[] = []
) => {
  const player = useSpotifyPlayerContext();
  const storeProgress = useProgress();
  
  const [phase, setPhase] = useState<HeardlePhase>('idle');
  const [stats, setStats] = useState<HeardleGameStats>(initialStats);
  const [roundState, setRoundState] = useState<HeardleRoundState>(createInitialRoundState());
  
  // Refs for precise timing control
  const playbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const playbackStartTimeRef = useRef<number>(0);
  const pausedPositionRef = useRef<number>(0);

  // Clear timeout helper
  const clearPlaybackTimeout = useCallback(() => {
    if (playbackTimeoutRef.current) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c9158dbd-f640-43e8-bfa2-60719e3baca4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useHeardleGame.ts:clearPlaybackTimeout',message:'Clearing timeout',data:{hadTimeout:true},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      clearTimeout(playbackTimeoutRef.current);
      playbackTimeoutRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearPlaybackTimeout();
  }, [clearPlaybackTimeout]);

  // Sync playback position with Spotify progress store
  useEffect(() => {
    if (roundState.isPlaying && !roundState.isPaused) {
      setRoundState(prev => ({
        ...prev,
        playbackPosition: storeProgress
      }));
    }
  }, [storeProgress, roundState.isPlaying, roundState.isPaused]);

  // Initialize round when song changes
  useEffect(() => {
    if (currentSong) {
      setRoundState(createInitialRoundState());
      setPhase('playing');
    }
  }, [currentSong]);

  // Start game - load a new song
  const startGame = useCallback(async () => {
    setStats(initialStats);
    setPhase('idle');
    await onLoadNewSong();
  }, [onLoadNewSong]);

  // Play snippet from beginning or resume from paused position
  const playSnippet = useCallback(async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c9158dbd-f640-43e8-bfa2-60719e3baca4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useHeardleGame.ts:playSnippet:entry',message:'playSnippet called',data:{hasCurrentSong:!!currentSong,isDeviceReady:player.isDeviceReady},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    if (!currentSong || !player.isDeviceReady) return;

    try {
      clearPlaybackTimeout();
      
      const currentSegment = roundState.segments[roundState.currentSegmentIndex];
      const maxPlayTime = currentSegment.endTime;
      
      // Determine start position
      const startPosition = roundState.pausedAt || 0;
      const remainingTime = maxPlayTime - startPosition;
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c9158dbd-f640-43e8-bfa2-60719e3baca4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useHeardleGame.ts:playSnippet:timing',message:'Timing values calculated',data:{segmentIndex:roundState.currentSegmentIndex,maxPlayTime,startPosition,remainingTime,pausedAt:roundState.pausedAt,segmentEndTime:currentSegment.endTime},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B'})}).catch(()=>{});
      // #endregion
      
      // Update state immediately (optimistic)
      setRoundState(prev => ({
        ...prev,
        isPlaying: true,
        isPaused: false,
        pausedAt: null,
      }));
      
      pausedPositionRef.current = startPosition;

      // Use local snippet play for cached instant playback
      if (startPosition === 0) {
        // Fresh start - play from beginning
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/c9158dbd-f640-43e8-bfa2-60719e3baca4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useHeardleGame.ts:playSnippet:beforePlay',message:'About to call playLocalSnippet',data:{uri:currentSong.uri,id:currentSong.id},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        await player.playLocalSnippet(currentSong.uri, currentSong.id);
        // playLocalSnippet confirms playback is at position ~0 when it returns
        // So we set playbackStartTimeRef AFTER it completes
        playbackStartTimeRef.current = Date.now();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/c9158dbd-f640-43e8-bfa2-60719e3baca4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useHeardleGame.ts:playSnippet:afterPlay',message:'playLocalSnippet completed - position confirmed at 0',data:{playbackStartTime:playbackStartTimeRef.current},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
      } else {
        // Resume from paused position
        await player.localSeek(startPosition);
        await player.handleResume();
        playbackStartTimeRef.current = Date.now();
      }

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c9158dbd-f640-43e8-bfa2-60719e3baca4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useHeardleGame.ts:playSnippet:settingTimeout',message:'Setting timeout to stop playback',data:{remainingTime,maxPlayTime},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      
      // Schedule stop at segment end - playLocalSnippet confirmed we're at position 0
      playbackTimeoutRef.current = setTimeout(async () => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/c9158dbd-f640-43e8-bfa2-60719e3baca4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useHeardleGame.ts:playSnippet:timeoutFired',message:'Timeout fired - stopping playback',data:{actualDelay:Date.now()-playbackStartTimeRef.current,expectedDelay:remainingTime},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D,E'})}).catch(()=>{});
        // #endregion
        await player.localPause();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/c9158dbd-f640-43e8-bfa2-60719e3baca4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useHeardleGame.ts:playSnippet:pauseComplete',message:'localPause completed',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        setRoundState(prev => ({
          ...prev,
          isPlaying: false,
          isPaused: false,
          playbackPosition: maxPlayTime,
        }));
      }, remainingTime);

    } catch (error) {
      console.error("Error playing snippet:", error);
      setRoundState(prev => ({
        ...prev,
        isPlaying: false,
        isPaused: false,
      }));
    }
  }, [currentSong, player, roundState.segments, roundState.currentSegmentIndex, roundState.pausedAt, clearPlaybackTimeout]);

  // Pause snippet - remembers position for resume
  const pauseSnippet = useCallback(async () => {
    clearPlaybackTimeout();
    
    // Calculate current position based on elapsed time
    const elapsed = Date.now() - playbackStartTimeRef.current;
    const currentPosition = pausedPositionRef.current + elapsed;
    
    setRoundState(prev => ({
      ...prev,
      isPlaying: false,
      isPaused: true,
      pausedAt: currentPosition,
      playbackPosition: currentPosition,
    }));

    try {
      await player.localPause();
    } catch (error) {
      console.error("Error pausing snippet:", error);
    }
  }, [player, clearPlaybackTimeout]);

  // Resume from paused position
  const resumeSnippet = useCallback(async () => {
    if (!currentSong || !player.isDeviceReady || !roundState.pausedAt) return;

    try {
      clearPlaybackTimeout();
      
      const currentSegment = roundState.segments[roundState.currentSegmentIndex];
      const maxPlayTime = currentSegment.endTime;
      const remainingTime = maxPlayTime - roundState.pausedAt;

      if (remainingTime <= 0) {
        // Already at end of segment
        setRoundState(prev => ({
          ...prev,
          isPaused: false,
          pausedAt: null,
        }));
        return;
      }

      // Update state
      setRoundState(prev => ({
        ...prev,
        isPlaying: true,
        isPaused: false,
      }));

      playbackStartTimeRef.current = Date.now();
      pausedPositionRef.current = roundState.pausedAt;

      // Seek and resume
      await player.localSeek(roundState.pausedAt);
      await player.handleResume();

      // Schedule stop
      playbackTimeoutRef.current = setTimeout(async () => {
        await player.localPause();
        setRoundState(prev => ({
          ...prev,
          isPlaying: false,
          isPaused: false,
          playbackPosition: maxPlayTime,
          pausedAt: null,
        }));
      }, remainingTime);

    } catch (error) {
      console.error("Error resuming snippet:", error);
      setRoundState(prev => ({
        ...prev,
        isPlaying: false,
        isPaused: false,
      }));
    }
  }, [currentSong, player, roundState.pausedAt, roundState.segments, roundState.currentSegmentIndex, clearPlaybackTimeout]);

  // Replay from beginning of current segment
  const replaySnippet = useCallback(async () => {
    setRoundState(prev => ({
      ...prev,
      pausedAt: null,
      playbackPosition: 0,
    }));
    
    // Small delay to ensure state is updated
    await new Promise(resolve => setTimeout(resolve, 50));
    await playSnippet();
  }, [playSnippet]);

  // Skip to next segment
  const handleSkip = useCallback(async () => {
    if (phase !== 'playing') return;

    const nextIndex = roundState.currentSegmentIndex + 1;
    
    // Check if at last segment
    if (nextIndex >= roundState.segments.length) {
      // Can't skip past last segment - must guess or give up
      return;
    }

    clearPlaybackTimeout();
    await player.localPause();

    // Update segments - mark current as skipped, next as current
    const updatedSegments = roundState.segments.map((seg, idx) => {
      if (idx === roundState.currentSegmentIndex) {
        return { ...seg, status: 'skipped' as const };
      }
      if (idx === nextIndex) {
        return { ...seg, status: 'current' as const };
      }
      return seg;
    });

    setRoundState(prev => ({
      ...prev,
      currentSegmentIndex: nextIndex,
      segments: updatedSegments,
      isPlaying: false,
      isPaused: false,
      pausedAt: null,
      playbackPosition: 0,
    }));

  }, [phase, roundState.currentSegmentIndex, roundState.segments, player, clearPlaybackTimeout]);

  // Submit a guess
  const submitGuess = useCallback((guess: string) => {
    if (!currentSong) return;

    clearPlaybackTimeout();
    player.localPause();

    const normalizedGuess = guess.trim().toLowerCase();
    const normalizedTitle = currentSong.title.toLowerCase();
    
    // Check for correct answer (exact match or close enough)
    const isCorrect = normalizedGuess === normalizedTitle || 
      (normalizedTitle.includes(normalizedGuess) && normalizedGuess.length > 3);

    // Record guess attempt
    const attempt: GuessAttempt = {
      guess: guess.trim(),
      segmentIndex: roundState.currentSegmentIndex,
      correct: isCorrect,
    };

    setStats(prev => ({
      ...prev,
      totalGuesses: prev.totalGuesses + 1,
    }));

    if (isCorrect) {
      // Correct guess!
      const pointsEarned = calculateScore(roundState.currentSegmentIndex);
      const isPerfect = roundState.currentSegmentIndex === 0;

      setPhase('success');
      
      // Update segments - mark current as completed
      const updatedSegments = roundState.segments.map((seg, idx) => {
        if (idx === roundState.currentSegmentIndex) {
          return { ...seg, status: 'completed' as const };
        }
        return seg;
      });

      setRoundState(prev => ({
        ...prev,
        segments: updatedSegments,
        isPlaying: false,
        isPaused: false,
        guessResult: {
          correct: true,
          actualTitle: currentSong.title,
          actualArtist: currentSong.artist,
          segmentGuessedAt: roundState.currentSegmentIndex,
        },
        guessHistory: [...prev.guessHistory, attempt],
      }));

      setStats(prev => {
        const newScore = prev.score + pointsEarned;
        const newStreak = prev.streak + 1;
        
        return {
          ...prev,
          score: newScore,
          highScore: Math.max(prev.highScore, newScore),
          streak: newStreak,
          bestStreak: Math.max(prev.bestStreak, newStreak),
          roundsPlayed: prev.roundsPlayed + 1,
          perfectGuesses: isPerfect ? prev.perfectGuesses + 1 : prev.perfectGuesses,
        };
      });

    } else {
      // Wrong guess
      const nextIndex = roundState.currentSegmentIndex + 1;
      
      // Record the failed attempt
      setRoundState(prev => ({
        ...prev,
        guessHistory: [...prev.guessHistory, attempt],
        userGuess: '',
        suggestions: [],
      }));

      // Check if at last segment
      if (nextIndex >= roundState.segments.length) {
        // Failed on last segment - game over
        setPhase('failed');
        
        const updatedSegments = roundState.segments.map((seg, idx) => {
          if (idx === roundState.currentSegmentIndex) {
            return { ...seg, status: 'failed' as const };
          }
          return seg;
        });

        setRoundState(prev => ({
          ...prev,
          segments: updatedSegments,
          isPlaying: false,
          guessResult: {
            correct: false,
            actualTitle: currentSong.title,
            actualArtist: currentSong.artist,
          },
        }));

        setStats(prev => ({
          ...prev,
          streak: 0,
          roundsPlayed: prev.roundsPlayed + 1,
        }));
      } else {
        // Auto-advance to next segment after wrong guess
        const updatedSegments = roundState.segments.map((seg, idx) => {
          if (idx === roundState.currentSegmentIndex) {
            return { ...seg, status: 'failed' as const };
          }
          if (idx === nextIndex) {
            return { ...seg, status: 'current' as const };
          }
          return seg;
        });

        setRoundState(prev => ({
          ...prev,
          currentSegmentIndex: nextIndex,
          segments: updatedSegments,
          isPlaying: false,
          isPaused: false,
          pausedAt: null,
          playbackPosition: 0,
          guessResult: {
            correct: false,
          },
        }));

        // Clear wrong guess feedback after a short delay
        setTimeout(() => {
          setRoundState(prev => ({
            ...prev,
            guessResult: null,
          }));
        }, 1500);
      }
    }
  }, [currentSong, roundState.currentSegmentIndex, roundState.segments, player, clearPlaybackTimeout]);

  // Give up - reveal answer
  const giveUp = useCallback(() => {
    if (!currentSong) return;

    clearPlaybackTimeout();
    player.localPause();

    setPhase('revealed');
    
    // Mark remaining segments as skipped
    const updatedSegments = roundState.segments.map((seg, idx) => {
      if (idx >= roundState.currentSegmentIndex) {
        return { ...seg, status: 'skipped' as const };
      }
      return seg;
    });

    setRoundState(prev => ({
      ...prev,
      segments: updatedSegments,
      isPlaying: false,
      isPaused: false,
      guessResult: {
        correct: false,
        actualTitle: currentSong.title,
        actualArtist: currentSong.artist,
      },
    }));

    setStats(prev => ({
      ...prev,
      streak: 0,
      roundsPlayed: prev.roundsPlayed + 1,
    }));
  }, [currentSong, roundState.currentSegmentIndex, roundState.segments, player, clearPlaybackTimeout]);

  // Handle input change and generate suggestions
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRoundState(prev => ({ ...prev, userGuess: value }));

    if (!value || value.length < 2) {
      setRoundState(prev => ({ ...prev, suggestions: [] }));
      return;
    }

    const inputLower = value.toLowerCase();
    const matchingSongs = allSongTitles.filter(song =>
      song.toLowerCase().includes(inputLower)
    );

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
      pauseSnippet,
      resumeSnippet,
      replaySnippet,
      handleSkip,
      submitGuess,
      giveUp,
      setRoundState,
      handleInputChange,
    },
  };
};

