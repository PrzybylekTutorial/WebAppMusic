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

    // Cleanup function not needed for script tag as we check for ID, 
    // but we might want to disconnect player on unmount if we had access to the player instance.
    // For now, this simple implementation is sufficient.
  }, [accessToken]);

  const updateProgress = useCallback(async () => {
    if (!accessToken || !deviceId || !currentTrackId) return;
    
    try {
      const data = await getCurrentPlayback(accessToken);
      
      if (data && data.is_playing && data.item && data.item.id === currentTrackId) {
        setProgress(data.progress_ms || 0);
        setDuration(data.item.duration_ms || 0);
      }
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  }, [accessToken, deviceId, currentTrackId]);

  useEffect(() => {
    let interval = null;
    if (currentTrackId && isPlaying && !isPaused) {
      interval = setInterval(updateProgress, 1000);
    }
    return () => clearInterval(interval);
  }, [currentTrackId, isPlaying, isPaused, updateProgress]);

  const handlePlay = async (uri, trackId) => {
    if (!accessToken || !deviceId) return;
    try {
      await playTrack(accessToken, deviceId, uri);
      setIsPlaying(true);
      setIsPaused(false);
      setCurrentTrackId(trackId);
      setProgress(0);
    } catch (error) {
      console.error('Error playing track:', error);
      throw error;
    }
  };

  const handlePause = async () => {
    if (!accessToken || !deviceId) return;
    try {
      await pausePlayback(accessToken, deviceId);
      setIsPaused(true);
    } catch (error) {
      console.error('Error pausing:', error);
    }
  };

  const handleResume = async () => {
    if (!accessToken || !deviceId) return;
    try {
      await resumePlayback(accessToken, deviceId);
      setIsPaused(false);
    } catch (error) {
      console.error('Error resuming:', error);
    }
  };

  const handleSeek = async (position) => {
    if (!accessToken || !deviceId) return;
    try {
      await seekToPosition(accessToken, deviceId, position);
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

