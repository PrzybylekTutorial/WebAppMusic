import { useState, useEffect, useCallback } from 'react';
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

  // Initialize Player
  useEffect(() => {
    if (!accessToken) return;

    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new window.Spotify.Player({
        name: 'Web Playback SDK',
        getOAuthToken: cb => { cb(accessToken); },
        volume: 0.5
      });
      player.addListener('ready', ({ device_id }) => {
        console.log('Ready with Device ID', device_id);
        setDeviceId(device_id);
      });
      player.connect();
    };

    return () => {
      delete window.onSpotifyWebPlaybackSDKReady;
    };
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
    handleSeek
  };
};

