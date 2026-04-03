import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@auth';
import { useSpotifyPlayerContext, getTrackDetails, useProgress } from '@music';
import { 
  ScoreBoard, 
  GuessInput, 
  GameControls, 
  ProgressBar, 
  ResultDisplay 
} from '@game';
import SonglessGame from '@/game/modes/songless/SonglessGame';
import HeardleGame from '@/game/modes/heardle/HeardleGame';
import { getApiUrl } from '@/config';
import { RotateCcw, ArrowLeft, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Progressive mode step timings (0.1s, 0.5s, 2s, 4s, 8s, 16s)
const PROGRESSIVE_STEPS = [100, 500, 2000, 4000, 8000, 16000];

// TEST_MODE: Enable mock data to preview UI without Spotify SDK
const TEST_MODE = false;

// Mock song for testing UI
const MOCK_SONG = {
  id: 'mock-song-id',
  title: 'Bohemian Rhapsody',
  artist: 'Queen',
  album: 'A Night at the Opera',
  uri: 'spotify:track:mock'
};

interface LocationState {
  gameMode: string;
  gameModeDuration: number;
  trackUris: string[];
  allSongTitles: string[];
  dynamicPlaylistId: string | null;
  useDynamicPlaylist: boolean;
}

const GamePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { accessToken } = useAuth();
  const player = useSpotifyPlayerContext();

  // Get state from navigation
  const state = location.state as LocationState | null;
  
  // Redirect if no state (direct URL access)
  useEffect(() => {
    if (!state || !accessToken) {
      navigate('/', { replace: true });
    }
  }, [state, accessToken, navigate]);

  // Game state - initialize with mock data in TEST_MODE
  const [currentSong, setCurrentSong] = useState<any>(TEST_MODE ? MOCK_SONG : null);
  const [userGuess, setUserGuess] = useState('');
  const [guessResult, setGuessResult] = useState<any>(null);
  const [score, setScore] = useState(0);
  const [totalGuesses, setTotalGuesses] = useState(0);
  const [streak, setStreak] = useState(0);
  const [roundsPlayed, setRoundsPlayed] = useState(TEST_MODE ? 1 : 0);
  const [highScore, setHighScore] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [gameModeDuration, setGameModeDuration] = useState(
    TEST_MODE && state?.gameMode === 'progressive' 
      ? PROGRESSIVE_STEPS[0] 
      : (state?.gameModeDuration || 30000)
  );
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [playedSongs, setPlayedSongs] = useState<Set<string>>(new Set());
  const [revealArtist, setRevealArtist] = useState(false);
  const [revealAlbum, setRevealAlbum] = useState(false);
  
  // Mock progress for TEST_MODE
  const [mockProgress, setMockProgress] = useState(0);

  // Get values from state
  const gameMode = state?.gameMode || 'normal';
  const trackUris = state?.trackUris || [];
  const allSongTitles = state?.allSongTitles || [];
  const dynamicPlaylistId = state?.dynamicPlaylistId || null;

  // Mock playing state for TEST_MODE
  const [mockIsPlaying, setMockIsPlaying] = useState(false);

  // Mock progress simulation for TEST_MODE - stops at limit
  useEffect(() => {
    if (!TEST_MODE || !mockIsPlaying) return;
    
    const interval = setInterval(() => {
      setMockProgress(prev => {
        const next = prev + 50;
        // Stop at the duration limit
        if (next >= gameModeDuration) {
          setMockIsPlaying(false); // Auto-stop at limit
          return gameModeDuration;
        }
        return next;
      });
    }, 50);
    
    return () => clearInterval(interval);
  }, [gameModeDuration, mockIsPlaying]);

  // Note: In TEST_MODE, we do NOT auto-start playing.
  // The user must click "Play" to start the mock progress.
  // This ensures the initial state shows "Play" button as per requirements.

  // Subscribe to progress from external store (optimized - doesn't cause parent re-renders)
  const storeProgress = useProgress();
  
  // Use mock progress or real player progress from store
  const currentProgress = TEST_MODE ? mockProgress : storeProgress;

  // Timeout management for progressive mode
  const progressiveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Auto-stop timeout ref (defined early for cleanup effect)
  const autoStopTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearProgressiveTimeout = useCallback(() => {
    if (progressiveTimeoutRef.current) {
      clearTimeout(progressiveTimeoutRef.current);
      progressiveTimeoutRef.current = null;
    }
  }, []);
  
  // Clear auto-stop timeout (defined early for cleanup effect)
  const clearAutoStopTimeout = useCallback(() => {
    if (autoStopTimeoutRef.current) {
      clearTimeout(autoStopTimeoutRef.current);
      autoStopTimeoutRef.current = null;
    }
  }, []);

  const setProgressiveTimeout = useCallback((callback: () => void, delay: number) => {
    clearProgressiveTimeout();
    progressiveTimeoutRef.current = setTimeout(callback, delay);
  }, [clearProgressiveTimeout]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearProgressiveTimeout();
      clearAutoStopTimeout();
    };
  }, [clearProgressiveTimeout, clearAutoStopTimeout]);

  // Clear timeout when not in progressive mode
  useEffect(() => {
    if (gameMode !== 'progressive') {
      clearProgressiveTimeout();
    }
  }, [gameMode, clearProgressiveTimeout]);

  // Helper to cleanup dynamic playlist
  const cleanupDynamicPlaylist = useCallback(async (playlistId: string, token: string) => {
    if (!playlistId || !token) return;
    
    try {
      await fetch(getApiUrl(`/api/delete-playlist/${playlistId}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      localStorage.removeItem('dynamic_playlist_id');
    } catch (error) {
      console.error('Error cleaning up playlist:', error);
    }
  }, []);

  // Get random unplayed song
  const getRandomUnplayedSong = useCallback(() => {
    if (trackUris.length === 0) return null;
    const unplayedSongs = trackUris.filter(uri => !playedSongs.has(uri));
    
    if (unplayedSongs.length === 0) {
      console.log('All songs have been played, resetting session...');
      setPlayedSongs(new Set());
      return trackUris[Math.floor(Math.random() * trackUris.length)];
    }
    
    return unplayedSongs[Math.floor(Math.random() * unplayedSongs.length)];
  }, [trackUris, playedSongs]);

  // Auto-stop logic using timeout for precise stopping at duration limit
  const hasAutoStoppedRef = useRef(false);
  
  // Reset auto-stop flag when song changes or duration changes
  useEffect(() => {
    hasAutoStoppedRef.current = false;
    clearAutoStopTimeout();
  }, [currentSong?.id, gameModeDuration, clearAutoStopTimeout]);
  
  // Helper function to set up auto-stop timeout (called when playback starts)
  const setupAutoStopTimeout = useCallback(() => {
    // Don't auto-stop in endless mode or progressive (handled separately)
    if (gameMode === 'endless' || gameMode === 'progressive') return;
    
    clearAutoStopTimeout();
    hasAutoStoppedRef.current = false;
    
    autoStopTimeoutRef.current = setTimeout(async () => {
      if (!hasAutoStoppedRef.current) {
        hasAutoStoppedRef.current = true;
        
        // Use localPause for instant stopping
        if (player.localPause) {
          await player.localPause();
        } else {
          player.handlePause();
        }
        
        // Auto-fail if no guess yet
        if (currentSong && !guessResult) {
          setGuessResult({
            correct: false,
            actualTitle: currentSong.title
          });
          setStreak(0);
          setTotalGuesses(prev => prev + 1);
        }
      }
    }, gameModeDuration);
  }, [gameMode, gameModeDuration, currentSong, guessResult, player, clearAutoStopTimeout]);

  // Load random song (without playing - user must click Play)
  const loadRandomSong = useCallback(async () => {
    if (!accessToken || !player.isDeviceReady || trackUris.length === 0) return;
    setIsLoading(true);
    
    try {
      const randomUri = getRandomUnplayedSong();
      if (!randomUri) throw new Error('No unplayed songs');
      
      const trackId = randomUri.split(':')[2];
      const songData = await getTrackDetails(trackId, accessToken);
      
      if (!songData || !songData.name) throw new Error('Invalid track data');
      
      setCurrentSong({
        id: trackId,
        title: songData.name,
        artist: songData.artists?.map((a: any) => a.name).join(', ') || 'Unknown',
        album: songData.album?.name || 'Unknown',
        uri: randomUri
      });
      
      setPlayedSongs(prev => new Set([...prev, randomUri]));
      
      // Reset states for new song - but don't play yet
      setUserGuess('');
      setGuessResult(null);
      setRevealArtist(false);
      setRevealAlbum(false);
      player.setProgress(0);
      player.setIsPaused(true);
      player.setIsPlaying(false);
      
      setRoundsPlayed(prev => prev + 1);
      
      if (gameMode === 'endless') {
        setGameModeDuration(songData.duration_ms || 0);
      } else if (gameMode === 'progressive') {
        const initialStep = PROGRESSIVE_STEPS[0];
        setGameModeDuration(initialStep);
        setCurrentStepIndex(0);
      }
      
    } catch (error) {
      console.error('Error loading random song:', error);
      alert('Failed to load song. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, player, trackUris, getRandomUnplayedSong, gameMode]);

  // Start playing the current song (called by Play button)
  const startPlaying = useCallback(async () => {
    if (!currentSong || !accessToken || !player.isDeviceReady) return;
    
    try {
      hasAutoStoppedRef.current = false; // Reset auto-stop flag
      await player.handlePlay(currentSong.uri, currentSong.id);
      
      if (gameMode === 'progressive') {
        await new Promise(resolve => setTimeout(resolve, 100));
        setProgressiveTimeout(() => {
          if (player.localPause) player.localPause();
          else player.handlePause();
        }, gameModeDuration);
      } else if (gameMode !== 'endless') {
        // Set up auto-stop timeout for normal/timeAttack modes
        setupAutoStopTimeout();
      }
    } catch (error) {
      console.error('Error starting playback:', error);
    }
  }, [currentSong, accessToken, player, gameMode, gameModeDuration, setProgressiveTimeout, setupAutoStopTimeout]);

  // Toggle play/pause handler - extracted from inline JSX for performance
  const togglePlayPause = useCallback(async () => {
    if (TEST_MODE) {
      if (mockIsPlaying) {
        setMockIsPlaying(false);
      } else {
        if (mockProgress >= gameModeDuration) {
          setMockProgress(0);
        }
        setMockIsPlaying(true);
      }
      return;
    }
    
    if (player.isActionPending) return;
    
    // Currently playing -> Pause
    if (player.isPlaying && !player.isPaused) {
      clearProgressiveTimeout();
      clearAutoStopTimeout(); // Clear auto-stop timeout on manual pause
      await player.handlePause();
      return;
    }
    
    // Not started yet or at end of segment -> Start from beginning
    const currentProg = player.getProgress();
    const isAtStart = currentProg === 0 || currentProg < 50;
    const isAtEnd = currentProg >= gameModeDuration - 100;
    
    if (isAtStart || isAtEnd) {
      hasAutoStoppedRef.current = false; // Reset auto-stop flag
      await player.handlePlay(currentSong.uri, currentSong.id);
      
      if (gameMode === 'progressive') {
        await new Promise(resolve => setTimeout(resolve, 50));
        setProgressiveTimeout(() => {
          if (player.localPause) player.localPause();
          else player.handlePause();
        }, gameModeDuration);
      } else if (gameMode !== 'endless') {
        // Set up auto-stop timeout for normal/timeAttack modes
        setupAutoStopTimeout();
      }
    } else {
      // Resume from current position
      hasAutoStoppedRef.current = false; // Reset auto-stop flag
      await player.handleResume();
      
      if (gameMode === 'progressive') {
        const remainingTime = gameModeDuration - currentProg;
        if (remainingTime > 0) {
          setProgressiveTimeout(() => {
            if (player.localPause) player.localPause();
            else player.handlePause();
          }, remainingTime);
        }
      } else if (gameMode !== 'endless') {
        // Set up auto-stop timeout with remaining time for normal/timeAttack modes
        clearAutoStopTimeout();
        const remainingTime = gameModeDuration - currentProg;
        if (remainingTime > 0) {
          autoStopTimeoutRef.current = setTimeout(async () => {
            if (!hasAutoStoppedRef.current) {
              hasAutoStoppedRef.current = true;
              if (player.localPause) {
                await player.localPause();
              } else {
                player.handlePause();
              }
              // Auto-fail if no guess yet
              if (currentSong && !guessResult) {
                setGuessResult({
                  correct: false,
                  actualTitle: currentSong.title
                });
                setStreak(0);
                setTotalGuesses(prev => prev + 1);
              }
            }
          }, remainingTime);
        }
      }
    }
  }, [player, currentSong, gameMode, gameModeDuration, mockIsPlaying, mockProgress, clearProgressiveTimeout, setProgressiveTimeout, clearAutoStopTimeout, setupAutoStopTimeout, guessResult]);

  // Restart music handler - extracted from inline JSX for performance
  const restartMusic = useCallback(async () => {
    if (TEST_MODE) {
      setMockProgress(0);
      setMockIsPlaying(true);
      return;
    }
    
    hasAutoStoppedRef.current = false; // Reset auto-stop flag
    await player.handlePlay(currentSong.uri, currentSong.id);
    
    if (gameMode === 'progressive') {
      await new Promise(resolve => setTimeout(resolve, 50));
      setProgressiveTimeout(() => {
        if (player.localPause) player.localPause();
        else player.handlePause();
      }, gameModeDuration);
    } else if (gameMode !== 'endless') {
      // Set up auto-stop timeout for normal/timeAttack modes
      setupAutoStopTimeout();
    }
  }, [player, currentSong, gameMode, gameModeDuration, setProgressiveTimeout, setupAutoStopTimeout]);

  // Load first song on mount - wait for device to be fully ready (but don't play)
  useEffect(() => {
    if (accessToken && player.isDeviceReady && trackUris.length > 0 && !currentSong && !isLoading) {
      loadRandomSong();
    }
  }, [accessToken, player.isDeviceReady, trackUris.length]);

  // Check guess
  const checkGuess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSong || !userGuess.trim()) return;
    
    const isCorrect = userGuess.trim().toLowerCase() === currentSong.title.toLowerCase();
    setTotalGuesses(prev => prev + 1);
    
    if (isCorrect) {
      setScore(prev => {
        const newScore = prev + 1;
        if (newScore > highScore) setHighScore(newScore);
        return newScore;
      });
      setStreak(prev => {
        const newStreak = prev + 1;
        if (newStreak > bestStreak) setBestStreak(newStreak);
        return newStreak;
      });
      
      setGuessResult({
        correct: true,
        actualTitle: currentSong.title
      });
    } else {
      setStreak(0);
      
      if (gameMode === 'progressive') {
        const nextIndex = currentStepIndex + 1;
        if (nextIndex < PROGRESSIVE_STEPS.length) {
          setCurrentStepIndex(nextIndex);
          const newDuration = PROGRESSIVE_STEPS[nextIndex];
          setGameModeDuration(newDuration);
          
          hasAutoStoppedRef.current = false; // Reset auto-stop flag for new segment
          player.handlePlay(currentSong.uri, currentSong.id);
          
          setProgressiveTimeout(() => {
            if (player.localPause) player.localPause();
            else player.handlePause();
          }, newDuration);
          
          return;
        }
      }
      
      setGuessResult({
        correct: false,
        actualTitle: currentSong.title
      });
    }
  };

  // Skip song / Next step in progressive mode
  const skipSong = async () => {
    // TEST_MODE: Allow skipping without player
    if (!TEST_MODE && (!accessToken || !player.deviceId || trackUris.length === 0)) return;
    
    if (gameMode === 'progressive' && currentSong && !guessResult) {
      const nextIndex = currentStepIndex + 1;
      if (nextIndex < PROGRESSIVE_STEPS.length) {
        setCurrentStepIndex(nextIndex);
        const newDuration = PROGRESSIVE_STEPS[nextIndex];
        setGameModeDuration(newDuration);
        setMockProgress(0); // Reset mock progress for new step
        setMockIsPlaying(true); // Start playing the new step
        
        if (!TEST_MODE) {
          hasAutoStoppedRef.current = false; // Reset auto-stop flag for new segment
          await player.handlePlay(currentSong.uri, currentSong.id);
          
          setProgressiveTimeout(() => {
            if (player.localPause) player.localPause();
            else player.handlePause();
          }, newDuration);
        }
        
        return;
      }
    }

    // Skip to new song
    if (TEST_MODE) {
      // In test mode, just reset step
      setCurrentStepIndex(0);
      setGameModeDuration(gameMode === 'progressive' ? PROGRESSIVE_STEPS[0] : 30000);
      setMockProgress(0);
      return;
    }

    try {
      clearProgressiveTimeout();
      setCurrentSong(null);
      setUserGuess('');
      setGuessResult(null);
      player.setIsPlaying(false); 
      player.setIsPaused(true);
      player.setProgress(0);
      setStreak(0);
      
      await loadRandomSong();
    } catch (error) {
      console.error('Error skipping song:', error);
    }
  };

  // Next song (loads new song for next round)
  const playAgain = () => {
    clearProgressiveTimeout();
    setCurrentSong(null);
    player.setIsPlaying(false);
    player.setIsPaused(true);
    setUserGuess('');
    setGuessResult(null);
    loadRandomSong();
  };

  // Reset game
  const resetGame = async () => {
    clearProgressiveTimeout();
    
    if (dynamicPlaylistId && accessToken) {
      await cleanupDynamicPlaylist(dynamicPlaylistId, accessToken);
    }

    setScore(0);
    setTotalGuesses(0);
    setStreak(0);
    setRoundsPlayed(0);
    setCurrentSong(null);
    player.setIsPlaying(false);
    setUserGuess('');
    setGuessResult(null);
    setRevealArtist(false);
    setRevealAlbum(false);
    setPlayedSongs(new Set());
    setCurrentStepIndex(0);
  };

  // Go back to setup
  const handleBackToSetup = async () => {
    clearProgressiveTimeout();
    player.setIsPlaying(false);
    navigate('/');
  };

  // Generate suggestions
  const generateSuggestions = async (input: string) => {
    if (!input || input.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const inputLower = input.toLowerCase();
    let matchingSongs = allSongTitles.filter(song => song.toLowerCase().includes(inputLower));

    try {
      const response = await fetch(getApiUrl(`/api/search?q=${encodeURIComponent(input)}&limit=10`));
      if (response.ok) {
        const mongoResults = await response.json();
        const mongoSongs = mongoResults.map((song: any) => song.title);
        const allResults = [...new Set([...matchingSongs, ...mongoSongs])];
        const sortedSuggestions = allResults.sort((a, b) => {
          const aLower = a.toLowerCase();
          const bLower = b.toLowerCase();
          if (aLower === inputLower) return -1;
          if (bLower === inputLower) return 1;
          if (aLower.startsWith(inputLower)) return -1;
          if (bLower.startsWith(inputLower)) return 1;
          return aLower.localeCompare(bLower);
        });
        setSuggestions(sortedSuggestions.slice(0, 8));
        setShowSuggestions(sortedSuggestions.length > 0);
        return;
      }
    } catch (error) {
      console.log('MongoDB search failed', error);
    }

    if (allSongTitles.length === 0) {
      setSuggestions(['Loading songs...']);
      setShowSuggestions(true);
      return;
    }

    const sortedSuggestions = matchingSongs.sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      if (aLower === inputLower) return -1;
      if (bLower === inputLower) return 1;
      if (aLower.startsWith(inputLower)) return -1;
      if (bLower.startsWith(inputLower)) return 1;
      return aLower.localeCompare(bLower);
    });
    setSuggestions(sortedSuggestions.slice(0, 5));
    setShowSuggestions(sortedSuggestions.length > 0);
  };

  if (!state) {
    return null;
  }

  // Delegate to SonglessGame module for progressive mode
  if (gameMode === 'progressive') {
    return (
      <SonglessGame 
        currentSong={currentSong}
        onLoadNewSong={loadRandomSong}
        onExit={handleBackToSetup}
        trackUris={trackUris}
        allSongTitles={allSongTitles}
      />
    );
  }

  // Delegate to HeardleGame module for heardle mode
  if (gameMode === 'heardle') {
    return (
      <HeardleGame 
        currentSong={currentSong}
        onLoadNewSong={loadRandomSong}
        onExit={handleBackToSetup}
        trackUris={trackUris}
        allSongTitles={allSongTitles}
      />
    );
  }

  return (
    <div className="max-w-[900px] mx-auto my-10 p-5 font-sans">
      <div className="bg-[var(--color-bg-card)] backdrop-blur-[var(--glass-blur)] rounded-[var(--radius-card)] p-10 shadow-[var(--shadow-soft)] border border-white/30">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold m-0 bg-gradient-to-r from-[#C7CEEA] to-[#FF9AA2] bg-clip-text text-transparent tracking-tighter flex items-center justify-center gap-2">
            <Music className="text-[#FF9AA2]" size={36} />
            {gameMode === 'progressive' ? 'Songless Mode' : 'Song Guess Game'}
          </h1>
          <p className="text-[var(--color-text-secondary)] text-lg mt-2 font-semibold">
            {gameMode === 'progressive' 
              ? 'Guess the song with limited time!' 
              : gameMode === 'timeAttack' 
                ? 'Quick! 15 seconds to guess!' 
                : gameMode === 'endless' 
                  ? 'Full song, unlimited time' 
                  : 'Normal Mode - 30 seconds'}
          </p>
        </div>

        {/* Test Mode Indicator */}
        {TEST_MODE && (
          <div className="text-center p-3 text-amber-700 bg-amber-100 rounded-2xl mb-5 border border-amber-300">
            <p className="font-semibold">🧪 TEST MODE - Mock UI Preview (click "Reveal" to advance steps)</p>
          </div>
        )}

        {/* Back button */}
        <div className="mb-6">
          <Button 
            onClick={handleBackToSetup} 
            variant="ghost"
            size="sm"
            className="font-semibold"
          >
            <ArrowLeft size={16} className="mr-2" /> Back to Setup
          </Button>
        </div>

        {/* Reset Game Button */}
        {(score > 0 || totalGuesses > 0) && (
          <div className="text-center mb-6">
            <Button onClick={resetGame} variant="peach" className="font-semibold">
              <RotateCcw size={16} className="mr-2" />
              Reset Game
            </Button>
          </div>
        )}

        {/* Spotify Player Not Ready Message */}
        {!player.deviceId && !TEST_MODE && (
          <div className="bg-amber-50 border-2 border-amber-200 p-8 rounded-[25px] mb-8 text-center">
            <div className="text-5xl mb-4">⏳</div>
            <h3 className="text-xl font-bold text-amber-800 mb-3">
              Waiting for Spotify Player...
            </h3>
            {player.connectionError ? (
              <>
                <p className="text-red-600 mb-4 font-medium">
                  Error: {player.connectionError}
                </p>
                <p className="text-amber-700 mb-4 text-sm">
                  This often happens in Chrome due to DRM (Widevine) initialization issues.
                  Try the "Reconnect" button below or refresh the page.
                </p>
              </>
            ) : (
              <p className="text-amber-700 mb-4">
                The Spotify Web Playback SDK is initializing. This requires:
              </p>
            )}
            <ul className="text-amber-600 text-sm mb-6 space-y-1">
              <li>• Spotify Premium account</li>
              <li>• Browser with DRM support (Chrome, Edge, Firefox)</li>
              <li>• Spotify app may need to be closed</li>
              <li>• Chrome users: Try clearing cache if issues persist</li>
            </ul>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button 
                onClick={handleBackToSetup} 
                variant="outline"
                className="font-semibold"
              >
                <ArrowLeft size={16} className="mr-2" /> Back to Setup
              </Button>
              <Button 
                onClick={async () => {
                  if (player.reconnect) {
                    await player.reconnect();
                  }
                }} 
                variant="lavender"
                className="font-semibold"
              >
                <RotateCcw size={16} className="mr-2" /> Reconnect
              </Button>
              <Button 
                onClick={() => window.location.reload()} 
                variant="mint"
                className="font-semibold"
              >
                <RotateCcw size={16} className="mr-2" /> Refresh Page
              </Button>
            </div>
          </div>
        )}

        {/* Device Registering with Spotify API */}
        {player.deviceId && !player.isDeviceReady && !TEST_MODE && (
          <div className="bg-blue-50 border-2 border-blue-200 p-8 rounded-[25px] mb-8 text-center">
            <div className="text-5xl mb-4">🔄</div>
            <h3 className="text-xl font-bold text-blue-800 mb-3">
              Registering device with Spotify...
            </h3>
            <p className="text-blue-700 mb-4">
              Almost ready! Verifying device availability with Spotify servers.
            </p>
          </div>
        )}

        {/* Now Playing Section */}
        {currentSong && (
          <div className="bg-white/60 p-8 rounded-[25px] shadow-[var(--shadow-soft)] border-2 border-[var(--color-primary-mint)] mb-8">
            <h3 className="text-center mb-5 text-[var(--color-text-primary)] font-bold text-xl">
              Now Playing (Round {roundsPlayed})
            </h3>
            
            {/* Artist/Album Reveal */}
            <div className="text-center mb-5">
              <div className="flex flex-col gap-2.5 items-center justify-center">
                <p className="text-lg m-0 flex items-center gap-2.5 justify-center flex-wrap">
                  <strong>Artist:</strong> 
                  <span 
                    className={cn(
                      "bg-[#e0e0e0] text-transparent rounded-lg px-3 py-1 cursor-pointer select-none transition-all min-w-[120px] text-center relative overflow-hidden hover:bg-[#d0d0d0]",
                      revealArtist && "bg-transparent text-[var(--color-text-primary)] cursor-default select-text min-w-0 font-semibold",
                      !revealArtist && "after:content-['Click_to_reveal'] after:absolute after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:text-[#888] after:text-sm after:font-bold after:whitespace-nowrap"
                    )}
                    onClick={() => setRevealArtist(true)}
                  >
                    {revealArtist ? currentSong.artist : 'Click to reveal'}
                  </span>
                </p>
                <p className="text-lg m-0 flex items-center gap-2.5 justify-center flex-wrap">
                  <strong>Album:</strong> 
                  <span 
                    className={cn(
                      "bg-[#e0e0e0] text-transparent rounded-lg px-3 py-1 cursor-pointer select-none transition-all min-w-[120px] text-center relative overflow-hidden hover:bg-[#d0d0d0]",
                      revealAlbum && "bg-transparent text-[var(--color-text-primary)] cursor-default select-text min-w-0 font-semibold",
                      !revealAlbum && "after:content-['Click_to_reveal'] after:absolute after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:text-[#888] after:text-sm after:font-bold after:whitespace-nowrap"
                    )}
                    onClick={() => setRevealAlbum(true)}
                  >
                    {revealAlbum ? currentSong.album : 'Click to reveal'}
                  </span>
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <ProgressBar 
              progress={gameMode === 'progressive' ? Math.min(currentProgress, gameModeDuration) : currentProgress}
              duration={gameModeDuration}
              maxDuration={gameMode === 'progressive' ? PROGRESSIVE_STEPS[PROGRESSIVE_STEPS.length - 1] : null}
              markers={gameMode === 'progressive' ? PROGRESSIVE_STEPS : null}
              onSeek={TEST_MODE ? () => {} : player.handleSeek}
              isPlaying={TEST_MODE ? mockIsPlaying : (player.isPlaying && !player.isPaused)}
              gameMode={gameMode}
              currentStepIndex={currentStepIndex}
              progressiveSteps={PROGRESSIVE_STEPS}
            />

            {/* Game Controls - using extracted handlers for better performance */}
            <GameControls 
              isPaused={TEST_MODE ? !mockIsPlaying : (player.isPaused || (!player.isPlaying && storeProgress === 0))}
              togglePlayPause={togglePlayPause}
              restartMusic={restartMusic}
              skipSong={skipSong}
              progress={currentProgress}
              gameModeDuration={gameModeDuration}
              gameMode={gameMode}
              currentStepIndex={currentStepIndex}
              totalSteps={PROGRESSIVE_STEPS.length}
              progressiveSteps={PROGRESSIVE_STEPS}
              isActionPending={player.isActionPending}
            />

            {/* Guess Input */}
            <div className="mt-5">
              <GuessInput 
                onGuess={checkGuess}
                userGuess={userGuess}
                setUserGuess={setUserGuess}
                suggestions={suggestions}
                showSuggestions={showSuggestions}
                setShowSuggestions={setShowSuggestions}
                selectSuggestion={(val: string) => {
                  setUserGuess(val);
                  setShowSuggestions(false);
                }}
                onGuessChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setUserGuess(e.target.value);
                  generateSuggestions(e.target.value);
                }}
              />
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !currentSong && (
          <div className="text-center p-10">
            <div className="animate-spin w-12 h-12 border-4 border-[var(--color-primary-mint)] border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-[var(--color-text-secondary)] font-semibold">Loading song...</p>
          </div>
        )}

        {/* Result Display */}
        <ResultDisplay 
          result={guessResult}
          onPlayAgain={playAgain}
        />

        {/* Score Board */}
        <ScoreBoard 
          score={score} 
          totalGuesses={totalGuesses} 
          streak={streak} 
          bestStreak={bestStreak} 
          highScore={highScore} 
          playedCount={playedSongs.size}
          totalCount={trackUris.length}
        />
      </div>
    </div>
  );
};

export default GamePage;

