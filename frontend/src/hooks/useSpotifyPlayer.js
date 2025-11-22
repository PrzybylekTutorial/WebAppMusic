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
        
        const isNowPlaying = !state.paused;
        setIsPlaying(isNowPlaying);
        setIsPaused(state.paused);
        
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
        
        // Only update state if significantly changed (e.g. every 100ms) or use css for animation
        // But we need to drive the logic.
        // Let's just rely on the fact that we are clamping in the UI
        // and maybe update less frequently to save React renders?
        // Actually, 60fps state update is fine in React 18 usually.
        // But to be super smooth we might want to decouple visual from logic.
        
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

  const handlePlay = async (uri, trackId) => {
    if (!accessToken || !deviceId) return;
    try {
      // Optimistic update
      setIsPlaying(true);
      setIsPaused(false);
      
      await playTrack(accessToken, deviceId, uri);
      
      setCurrentTrackId(trackId);
      // Reset interpolation state
      lastStateRef.current = { position: 0, time: Date.now() };
      setProgress(0);
    } catch (error) {
      console.error('Error playing track:', error);
      // Revert optimistic update on error
      setIsPlaying(false);
      setIsPaused(true);
      throw error;
    }
  };

  const handlePause = async () => {
    if (!accessToken || !deviceId) return;
    try {
      // Optimistic update
      setIsPaused(true);
      setIsPlaying(false);
      
      await pausePlayback(accessToken, deviceId);
    } catch (error) {
      console.error('Error pausing:', error);
      // Revert
      setIsPaused(false);
      setIsPlaying(true);
    }
  };

  const handleResume = async () => {
    if (!accessToken || !deviceId) return;
    try {
      // Optimistic update
      setIsPaused(false);
      setIsPlaying(true);
      
      await resumePlayback(accessToken, deviceId);
      
      // Update reference time to avoid jumps on resume
      lastStateRef.current = { position: progress, time: Date.now() };
    } catch (error) {
      console.error('Error resuming:', error);
      // Revert
      setIsPaused(true);
      setIsPlaying(false);
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
