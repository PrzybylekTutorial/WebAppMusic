import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from 'react';
import { 
  playTrack, 
  pausePlayback, 
  resumePlayback, 
  seekToPosition,
  transferPlayback
} from '../services/spotifyService';

type ExpectedState = 'playing' | 'paused' | null;

// Detect Chrome browser (uses Widevine DRM which needs special handling)
const isChrome = /Chrome/.test(navigator.userAgent) && !/Edg/.test(navigator.userAgent);

// Module-level tracking to prevent double initialization in StrictMode
// This persists across component remounts
let globalInitializationInProgress = false;
let globalPlayerInstance: any = null;

// ====== PROGRESS STORE (external store for useSyncExternalStore) ======
// This allows progress updates without causing re-renders in the main hook
// Components that need progress can subscribe independently
type ProgressListener = () => void;

let progressValue = 0;
let progressListeners: Set<ProgressListener> = new Set();

const progressStore = {
  getSnapshot: () => progressValue,
  subscribe: (listener: ProgressListener) => {
    progressListeners.add(listener);
    return () => progressListeners.delete(listener);
  },
  emit: (value: number) => {
    progressValue = value;
    progressListeners.forEach(listener => listener());
  }
};

// Hook for components that need to subscribe to progress updates
export const useProgress = () => {
  return useSyncExternalStore(progressStore.subscribe, progressStore.getSnapshot);
};

export const useSpotifyPlayer = (accessToken: string | null) => {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isDeviceReady, setIsDeviceReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  // Progress is now managed via external store - no state here
  const progressRef = useRef(0);
  const [duration, setDuration] = useState(0);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const playerRef = useRef<any>(null); // Spotify.Player type not available globally
  const lastStateRef = useRef({ position: 0, time: Date.now() });
  const connectAttemptRef = useRef(0);
  const isInitializingRef = useRef(false); // Guard against double initialization
  const maxConnectAttempts = 3;
  
  // Helper to update progress (both ref and external store)
  const updateProgress = useCallback((value: number) => {
    progressRef.current = value;
    progressStore.emit(value);
  }, []);

  // Initialize Player
  useEffect(() => {
    if (!accessToken) return;
    
    // Prevent double initialization (React StrictMode calls useEffect twice)
    // Use global tracking to persist across component remounts
    if (globalInitializationInProgress) {
      console.log('Player initialization already in progress globally, skipping...');
      // If there's an existing player, reuse it
      if (globalPlayerInstance) {
        playerRef.current = globalPlayerInstance;
      }
      return;
    }
    
    // If we already have a working player with device ID, reuse it
    if (globalPlayerInstance && deviceId) {
      console.log('Reusing existing player instance...');
      playerRef.current = globalPlayerInstance;
      return;
    }
    
    globalInitializationInProgress = true;
    isInitializingRef.current = true;
    connectAttemptRef.current = 0; // Reset connect attempts for fresh initialization

    const initializePlayer = async () => {
      // If player already exists but no device ID, disconnect and recreate
      if (globalPlayerInstance && !deviceId) {
        try {
          console.log('Disconnecting stale player...');
          globalPlayerInstance.disconnect();
          globalPlayerInstance = null;
          playerRef.current = null;
        } catch (e) {
          console.warn('Error disconnecting existing player:', e);
        }
      }
      
      const player = new window.Spotify.Player({
        name: 'Web Playback SDK',
        getOAuthToken: cb => { cb(accessToken); },
        volume: 0.5
      });

      playerRef.current = player;
      globalPlayerInstance = player;

      // Track if we've received the ready event
      let readyReceived = false;
      let currentDeviceId: string | null = null;

      player.addListener('ready', async ({ device_id }) => {
        console.log('Ready with Device ID', device_id);
        readyReceived = true;
        currentDeviceId = device_id;
        setDeviceId(device_id);
        
        // Chrome specific: Pre-activate the device via transfer to ensure Widevine DRM is ready
        // This prevents 404 errors on first play attempt
        if (isChrome && accessToken) {
          console.log('Chrome detected: Pre-activating device for Widevine DRM...');
          try {
            await transferPlayback(accessToken, device_id, false);
            console.log('Device pre-activated successfully');
            // Wait a bit for Chrome's Widevine to fully initialize
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (e) {
            console.warn('Pre-activation failed (may already be active):', e);
          }
        }
        
        setIsDeviceReady(true);
        setConnectionError(null);
        console.log('Device ready for playback');
      });

      player.addListener('not_ready', ({ device_id }) => {
        console.log('Device ID has gone offline', device_id);
        setDeviceId(null);
        setIsDeviceReady(false);
      });

      player.addListener('initialization_error', ({ message }) => {
        console.error('Failed to initialize', message);
        setConnectionError(`Initialization error: ${message}`);
      });

      player.addListener('authentication_error', ({ message }) => {
        console.error('Failed to authenticate', message);
        setConnectionError(`Authentication error: ${message}`);
      });

      player.addListener('account_error', ({ message }) => {
        console.error('Failed to validate Spotify account', message);
        setConnectionError(`Account error: ${message}`);
      });

      player.addListener('player_state_changed', state => {
        if (!state) return;
        
        // If we have a pending action or expected state, rely on that primarily
        // to prevent jitter from old/delayed SDK events
        if (expectedStateRef.current) {
            const isSDKPaused = state.paused;
            const expectedPaused = expectedStateRef.current === 'paused';
            
            // Only sync if SDK matches expectation or if enough time has passed
            if (isSDKPaused === expectedPaused) {
                const isNowPlaying = !state.paused;
                setIsPlaying(isNowPlaying);
                setIsPaused(state.paused);
            }
        } else {
            // No pending expectation, sync freely
            const isNowPlaying = !state.paused;
            setIsPlaying(isNowPlaying);
            setIsPaused(state.paused);
        }
        
        // Update track info if changed
        if (state.track_window?.current_track) {
            const track = state.track_window.current_track;
            setCurrentTrackId(track.id);
            setDuration(state.duration);
        }
        
        // Update progress from state - use ref + external store (no re-render)
        if (state.position !== undefined) {
            lastStateRef.current = { 
                position: state.position, 
                time: Date.now() 
            };
            updateProgress(state.position);
        }
      });

      // Connect with retry logic - critical for Chrome
      const connectWithRetry = async (): Promise<boolean> => {
        while (connectAttemptRef.current < maxConnectAttempts) {
          connectAttemptRef.current++;
          console.log(`Spotify SDK connect attempt ${connectAttemptRef.current}/${maxConnectAttempts}...`);
          
          try {
            const connected = await player.connect();
            
            if (connected) {
              console.log('Spotify SDK connected successfully');
              
              // Wait for ready event with timeout (longer for Chrome due to Widevine)
              const readyTimeout = isChrome ? 10000 : 5000;
              const startTime = Date.now();
              
              while (!readyReceived && (Date.now() - startTime) < readyTimeout) {
                await new Promise(resolve => setTimeout(resolve, 100));
              }
              
              if (readyReceived) {
                console.log('Ready event received, player fully initialized');
                return true;
              } else {
                console.warn('Connected but ready event not received within timeout');
                // Still return true - the ready event might come later
                return true;
              }
            } else {
              console.warn(`Connect attempt ${connectAttemptRef.current} failed`);
              // Wait before retry (exponential backoff)
              const delay = Math.min(1000 * Math.pow(2, connectAttemptRef.current - 1), 5000);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          } catch (error) {
            console.error(`Connect attempt ${connectAttemptRef.current} error:`, error);
            const delay = Math.min(1000 * Math.pow(2, connectAttemptRef.current - 1), 5000);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
        
        console.error('All connect attempts failed');
        setConnectionError('Failed to connect to Spotify after multiple attempts');
        globalInitializationInProgress = false;
        return false;
      };

      const success = await connectWithRetry();
      if (success) {
        // Keep globalInitializationInProgress true until cleanup to prevent re-init
        // It will be set to false only on actual cleanup
      } else {
        globalInitializationInProgress = false;
      }
    };

    if (window.Spotify) {
      initializePlayer();
    } else {
      window.onSpotifyWebPlaybackSDKReady = initializePlayer;
      
      if (!document.getElementById('spotify-player-script')) {
        const script = document.createElement('script');
        script.id = 'spotify-player-script';
        script.src = 'https://sdk.scdn.co/spotify-player.js';
        script.async = true;
        document.body.appendChild(script);
      }
    }

    // Cleanup
    return () => {
      isInitializingRef.current = false;
      connectAttemptRef.current = 0;
      if (playerRef.current) {
        try {
          playerRef.current.disconnect();
        } catch (e) {
          console.warn('Error during player cleanup:', e);
        }
        playerRef.current = null;
      }
    };
  }, [accessToken]);

  // Polling logic using requestAnimationFrame for smooth UI without conflicts
  // Progress updates go to external store - no re-renders in this hook
  useEffect(() => {
    let animationFrameId: number;
    
    const update = () => {
      if (isPlaying && !isPaused) {
        const now = Date.now();
        const { position, time } = lastStateRef.current;
        // Calculate estimated progress: Last confirmed position + time elapsed since then
        const estimatedProgress = position + (now - time);
        
        // Don't exceed duration
        const cappedProgress = duration > 0 ? Math.min(estimatedProgress, duration) : estimatedProgress;
        
        // Update via external store - only subscribers re-render
        updateProgress(cappedProgress);
        animationFrameId = requestAnimationFrame(update);
      }
    };

    if (isPlaying && !isPaused) {
      animationFrameId = requestAnimationFrame(update);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isPlaying, isPaused, duration, updateProgress]);

  const [isActionPending, setIsActionPending] = useState(false);

  // Ref to track if we should be playing according to our local logic
  // This helps override SDK events that might come in out of order or delayed
  const expectedStateRef = useRef<ExpectedState>(null);

  const handlePlay = async (uri: string, trackId: string, seekPosition = 0) => {
    if (!accessToken || !deviceId || isActionPending) return;
    try {
      setIsActionPending(true);
      expectedStateRef.current = 'playing';
      
      // Update local state immediately
      setIsPlaying(true);
      setIsPaused(false);
      
      await playTrack(accessToken, deviceId, uri);
      
      // Explicitly seek to the start position for accurate timing
      if (seekPosition === 0) {
        await seekToPosition(accessToken, deviceId, 0);
      }
      
      setCurrentTrackId(trackId);
      lastStateRef.current = { position: 0, time: Date.now() };
      updateProgress(0);
    } catch (error: any) {
      // AbortError is expected when play() is interrupted by pause() - not a real error
      if (error?.name === 'AbortError') {
        console.log('Play interrupted (AbortError) - this is expected behavior');
        return;
      }
      console.error('Error playing track:', error);
      expectedStateRef.current = null;
      // Revert on error
      setIsPlaying(false);
      setIsPaused(true);
      throw error;
    } finally {
      setTimeout(() => setIsActionPending(false), 500);
    }
  };

  const handlePause = async () => {
    // #region agent log
    console.log('[DBG-2b6f2d] handlePause called:', JSON.stringify({hasToken:!!accessToken,hasDevice:!!deviceId,isActionPending}));
    // #endregion
    if (!accessToken || !deviceId || isActionPending) return;
    try {
      setIsActionPending(true);
      expectedStateRef.current = 'paused';
      
      setIsPaused(true);
      setIsPlaying(false);
      
      await pausePlayback(accessToken, deviceId);
    } catch (error) {
      console.error('Error pausing:', error);
      expectedStateRef.current = null;
      // Revert
      setIsPaused(false);
      setIsPlaying(true);
    } finally {
      setTimeout(() => setIsActionPending(false), 500);
    }
  };

  const handleResume = async () => {
    if (!accessToken || !deviceId || isActionPending) return;
    try {
      setIsActionPending(true);
      expectedStateRef.current = 'playing';
      
      setIsPaused(false);
      setIsPlaying(true);
      
      await resumePlayback(accessToken, deviceId);
      
      lastStateRef.current = { position: progressRef.current, time: Date.now() };
    } catch (error: any) {
      // AbortError is expected when resume is interrupted - not a real error
      if (error?.name === 'AbortError') {
        console.log('Resume interrupted (AbortError) - this is expected behavior');
        return;
      }
      console.error('Error resuming:', error);
      expectedStateRef.current = null;
      // Revert
      setIsPaused(true);
      setIsPlaying(false);
    } finally {
      setTimeout(() => setIsActionPending(false), 500);
    }
  };

  const handleSeek = async (position: number) => {
    if (!accessToken || !deviceId) return;
    try {
      await seekToPosition(accessToken, deviceId, position);
      lastStateRef.current = { position: position, time: Date.now() };
      updateProgress(position);
    } catch (error) {
      console.error('Error seeking:', error);
    }
  };

  // ====== LOCAL SDK METHODS (instant, no HTTP API calls) ======
  
  // Get current SDK state (instant, no API)
  const getCurrentState = useCallback(async () => {
    const player = playerRef.current;
    if (!player) return null;
    return await player.getCurrentState();
  }, []);

  // Local pause (instant, no isActionPending blocking)
  const localPause = useCallback(async () => {
    const player = playerRef.current;
    if (player) {
      await player.pause();
      setIsPaused(true);
      setIsPlaying(false);
    }
  }, []);

  // Local seek (instant)
  const localSeek = useCallback(async (positionMs: number) => {
    const player = playerRef.current;
    if (player) {
      await player.seek(positionMs);
      lastStateRef.current = { position: positionMs, time: Date.now() };
      updateProgress(positionMs);
    }
  }, [updateProgress]);

  // Optimized play for snippets - handles both cached and new tracks
  // Uses local SDK when track is already loaded (instant), falls back to single API call for new tracks
  const playLocalSnippet = useCallback(async (uri: string, trackId: string) => {
    const player = playerRef.current;
    if (!player) return false;

    // Helper: Wait for playback to actually start (for new tracks)
    const waitForPlayback = async (maxWait = 2000): Promise<boolean> => {
      const start = Date.now();
      while (Date.now() - start < maxWait) {
        const currentState = await player.getCurrentState();
        if (currentState && !currentState.paused) {
          return true; // Playback confirmed
        }
        await new Promise(r => setTimeout(r, 50));
      }
      return false; // Timeout
    };

    // Helper: Wait for seek to complete (position should be near 0)
    const waitForSeekComplete = async (maxWait = 500): Promise<boolean> => {
      const start = Date.now();
      while (Date.now() - start < maxWait) {
        const currentState = await player.getCurrentState();
        if (currentState && currentState.position < 50 && !currentState.paused) {
          return true;
        }
        await new Promise(r => setTimeout(r, 20));
      }
      return false;
    };

    try {
      const state = await player.getCurrentState();
      
      // If track is already loaded, use local SDK only (instant, no API calls)
      if (state?.track_window?.current_track?.uri === uri) {
        await player.seek(0);
        await player.resume();
        // Wait for seek to complete before returning
        await waitForSeekComplete();
        setIsPlaying(true);
        setIsPaused(false);
        lastStateRef.current = { position: 0, time: Date.now() };
        updateProgress(0);
        return true;
      }
      
      // Track not loaded - make a SINGLE API call to load and play
      if (!accessToken || !deviceId) return false;
      
      // Single API call - playTrack only (no seekToPosition call needed)
      await playTrack(accessToken, deviceId, uri);
      
      // Wait for playback to actually start before seeking
      const playbackStarted = await waitForPlayback();
      
      if (playbackStarted) {
        // Now seek to beginning (audio is confirmed playing)
        await player.seek(0);
        // Wait for seek to complete - ensures player is stable before timeout starts
        await waitForSeekComplete();
      }
      
      // Now we're sure: playing + at position 0 → safe to return
      lastStateRef.current = { position: 0, time: Date.now() };
      updateProgress(0);
      setCurrentTrackId(trackId);
      setIsPlaying(true);
      setIsPaused(false);
      return true;
    } catch (error) {
      console.error('Error in playLocalSnippet:', error);
      return false;
    }
  }, [accessToken, deviceId, updateProgress]);

  // Manual reconnect function - useful when Chrome's Widevine needs a retry
  const reconnect = useCallback(async () => {
    console.log('Manual reconnect requested...');
    setConnectionError(null);
    setIsDeviceReady(false);
    setDeviceId(null);
    
    const player = playerRef.current;
    if (player) {
      try {
        // First try to reconnect the existing player
        const success = await player.connect();
        if (success) {
          console.log('Reconnect successful');
          // Wait a bit for ready event
          await new Promise(resolve => setTimeout(resolve, 2000));
          return true;
        }
      } catch (e) {
        console.warn('Reconnect failed:', e);
      }
      
      // If reconnect failed, try to disconnect and the useEffect will recreate
      try {
        player.disconnect();
        playerRef.current = null;
        isInitializingRef.current = false;
        connectAttemptRef.current = 0;
      } catch (e) {
        console.warn('Disconnect during reconnect failed:', e);
      }
    }
    
    return false;
  }, []);

  // Getter for current progress value (for components that don't use useProgress hook)
  const getProgress = useCallback(() => progressRef.current, []);
  
  // Setter for progress (for external control, e.g., GamePage reset)
  const setProgress = useCallback((value: number) => {
    updateProgress(value);
  }, [updateProgress]);

  return {
    deviceId,
    isDeviceReady,
    isPlaying,
    setIsPlaying,
    isPaused,
    setIsPaused,
    // progress is now accessed via useProgress hook or getProgress()
    progress: progressRef.current, // For backward compatibility - but won't trigger re-renders
    getProgress, // Function to get current progress
    setProgress,
    duration,
    setDuration,
    handlePlay,
    handlePause,
    handleResume,
    handleSeek,
    // Local SDK methods (instant, no HTTP API latency)
    localPause,
    localSeek,
    playLocalSnippet,
    getCurrentState,
    isActionPending,
    connectionError,
    reconnect
  };
};
