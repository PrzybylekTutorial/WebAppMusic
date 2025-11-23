import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  playTrack, 
  pausePlayback, 
  resumePlayback, 
  getCurrentPlayback, 
  seekToPosition 
} from '../spotifyService';

export const useSpotifyPlayer = (accessToken) => {
  const [deviceId, setDeviceId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTrackId, setCurrentTrackId] = useState(null);
  const playerRef = useRef(null);
  const lastStateRef = useRef({ position: 0, time: Date.now() });

  // Initialize Player
  useEffect(() => {
    if (!accessToken) return;

    const initializePlayer = () => {
      const player = new window.Spotify.Player({
        name: 'Web Playback SDK',
        getOAuthToken: cb => { cb(accessToken); },
        volume: 0.5
      });

      playerRef.current = player;

      player.addListener('ready', ({ device_id }) => {
        console.log('Ready with Device ID', device_id);
        setDeviceId(device_id);
      });

      player.addListener('not_ready', ({ device_id }) => {
        console.log('Device ID has gone offline', device_id);
        setDeviceId(null);
      });

      player.addListener('initialization_error', ({ message }) => {
        console.error('Failed to initialize', message);
      });

      player.addListener('authentication_error', ({ message }) => {
        console.error('Failed to authenticate', message);
      });

      player.addListener('account_error', ({ message }) => {
        console.error('Failed to validate Spotify account', message);
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
        
        // Update progress from state
        if (state.position !== undefined) {
            lastStateRef.current = { 
                position: state.position, 
                time: Date.now() 
            };
            setProgress(state.position);
        }
      });

      player.connect();
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
  }, [accessToken]);

  // Polling logic using requestAnimationFrame for smooth UI without conflicts
  useEffect(() => {
    let animationFrameId;
    
    const update = () => {
      if (isPlaying && !isPaused) {
        const now = Date.now();
        const { position, time } = lastStateRef.current;
        // Calculate estimated progress: Last confirmed position + time elapsed since then
        const estimatedProgress = position + (now - time);
        
        // Don't exceed duration
        const cappedProgress = duration > 0 ? Math.min(estimatedProgress, duration) : estimatedProgress;
        
        setProgress(cappedProgress);
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
  }, [isPlaying, isPaused, duration]);

  const [isActionPending, setIsActionPending] = useState(false);

  // Ref to track if we should be playing according to our local logic
  // This helps override SDK events that might come in out of order or delayed
  const expectedStateRef = useRef(null); // 'playing' | 'paused' | null

  const handlePlay = async (uri, trackId) => {
    if (!accessToken || !deviceId || isActionPending) return;
    try {
      setIsActionPending(true);
      expectedStateRef.current = 'playing';
      
      // Update local state immediately
      setIsPlaying(true);
      setIsPaused(false);
      
      await playTrack(accessToken, deviceId, uri);
      
      setCurrentTrackId(trackId);
      lastStateRef.current = { position: 0, time: Date.now() };
      setProgress(0);
    } catch (error) {
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
      
      lastStateRef.current = { position: progress, time: Date.now() };
    } catch (error) {
      console.error('Error resuming:', error);
      expectedStateRef.current = null;
      // Revert
      setIsPaused(true);
      setIsPlaying(false);
    } finally {
      setTimeout(() => setIsActionPending(false), 500);
    }
  };

  const handleSeek = async (position) => {
    if (!accessToken || !deviceId) return;
    try {
      await seekToPosition(accessToken, deviceId, position);
      lastStateRef.current = { position: position, time: Date.now() };
      setProgress(position);
    } catch (error) {
      console.error('Error seeking:', error);
    }
  };

  const localPause = async () => {
    if (playerRef.current) {
      await playerRef.current.pause();
      setIsPaused(true);
    }
  };

  return {
    deviceId,
    isPlaying,
    setIsPlaying,
    isPaused,
    setIsPaused,
    progress,
    setProgress,
    duration,
    setDuration,
    handlePlay,
    handlePause,
    handleResume,
    handleSeek,
    localPause
  };
};
