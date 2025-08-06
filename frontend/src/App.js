// Import React hooks for state management and side effects
import React, { useState, useEffect, useCallback } from 'react';
// Import Spotify service functions for API interactions (playback control, playlist management, etc.)
import { 
  SPOTIFY_CONFIG,           // Configuration object with playlist IDs and API settings
  getPlaylistTracks,        // Function to fetch tracks from Spotify playlists
  getTrackDetails,          // Function to get detailed track information
  playTrack,                // Function to start playing a specific track
  pausePlayback,            // Function to pause current playback
  resumePlayback,           // Function to resume paused playback
  getCurrentPlayback,       // Function to get current playback state
  seekToPosition            // Function to seek to specific position in track
} from './spotifyService';
// Import the DynamicPlaylistManager component for playlist creation and management
import DynamicPlaylistManager from './DynamicPlaylistManager';

function App() {
  // ===== STATE MANAGEMENT =====
  // Array of Spotify track URIs (unique identifiers) for the game
  const [trackUris, setTrackUris] = useState([]);
  // Spotify device ID for controlling playback (required for Web Playback SDK)
  const [deviceId, setDeviceId] = useState(null);
  // Currently playing song object with metadata (title, artist, album, etc.)
  const [currentSong, setCurrentSong] = useState(null);
  // User's current guess input text
  const [userGuess, setUserGuess] = useState('');
  // Result of the last guess attempt ('correct', 'incorrect', or null)
  const [guessResult, setGuessResult] = useState(null);
  // Boolean indicating if music is currently playing
  const [isPlaying, setIsPlaying] = useState(false);
  // Player's current score (increases by 10 for each correct guess)
  const [score, setScore] = useState(0);
  // Total number of guesses made (correct and incorrect)
  const [totalGuesses, setTotalGuesses] = useState(0);
  // Current streak of correct guesses (resets to 0 on incorrect guess)
  const [streak, setStreak] = useState(0);
  // Current playback position in milliseconds (for progress bar)
  const [progress, setProgress] = useState(0);
  // Total song duration in milliseconds (for progress bar)
  const [duration, setDuration] = useState(0);
  // Current game mode ('normal', 'timeAttack', 'endless')
  const [gameMode, setGameMode] = useState('normal');
  // Number of rounds/songs played in current session
  const [roundsPlayed, setRoundsPlayed] = useState(0);
  // Player's highest score achieved (persisted across sessions)
  const [highScore, setHighScore] = useState(0);
  // Player's longest streak achieved (persisted across sessions)
  const [bestStreak, setBestStreak] = useState(0);
  // Duration limit for time attack mode in milliseconds (30 seconds default)
  const [gameModeDuration, setGameModeDuration] = useState(30000);
  // Boolean indicating if playback is paused (separate from isPlaying)
  const [isPaused, setIsPaused] = useState(false);
  // Loading state for API calls and operations
  const [isLoading, setIsLoading] = useState(false);
  // Array of autocomplete suggestions for user input
  const [suggestions, setSuggestions] = useState([]);
  // Boolean to show/hide the suggestions dropdown
  const [showSuggestions, setShowSuggestions] = useState(false);
  // Array of all song titles for autocomplete functionality
  const [allSongTitles, setAllSongTitles] = useState([]);
  // ID of the current dynamic playlist (created from MongoDB database)
  const [dynamicPlaylistId, setDynamicPlaylistId] = useState(null);
  // Boolean to use dynamic playlist vs static Spotify playlist
  const [useDynamicPlaylist, setUseDynamicPlaylist] = useState(false);
  // Set of track URIs that have been played in current session (prevents duplicates)
  const [playedSongs, setPlayedSongs] = useState(new Set());

  // ===== URL PARAMETER EXTRACTION =====
  // Extract URL parameters from the current page (used for OAuth callback)
  const urlParams = new URLSearchParams(window.location.search);
  // Get the Spotify access token from URL parameters (passed after OAuth authentication)
  const accessToken = urlParams.get('access_token');

  // ===== HELPER FUNCTIONS =====
  // Helper function to get a random song that hasn't been played yet in current session
  const getRandomUnplayedSong = () => {
    // Return null if no tracks are available
    if (trackUris.length === 0) return null;
    
    // Filter out songs that have already been played in this session
    // playedSongs is a Set for O(1) lookup performance
    const unplayedSongs = trackUris.filter(uri => !playedSongs.has(uri));
    
    // If all songs have been played, reset the session and start fresh
    if (unplayedSongs.length === 0) {
      console.log('All songs have been played, resetting session...');
      // Clear the played songs set to allow all songs to be played again
      setPlayedSongs(new Set());
      // Return a random song from the entire playlist
      return trackUris[Math.floor(Math.random() * trackUris.length)];
    }
    
    // Return a random song from the unplayed songs
    // Math.floor(Math.random() * length) generates a random index
    return unplayedSongs[Math.floor(Math.random() * unplayedSongs.length)];
  };

  // ===== CORE FUNCTIONS =====
  // Main function to fetch track URIs from either dynamic or static playlists
  const fetchTrackUris = async () => {
    // Check if user is authenticated with Spotify
    if (!accessToken) {
      console.log('No access token available');
      return;
    }
    
    console.log('Fetching playlist tracks...');
    
    try {
      // Variables to store playlist data and ID
      let playlistData;
      let playlistId;
      
      // Check if user wants to use dynamic playlist (created from MongoDB database)
      if (useDynamicPlaylist && dynamicPlaylistId) {
        // Use dynamic playlist created by the user
        playlistId = dynamicPlaylistId;
        console.log(`Using dynamic playlist: ${playlistId}`);
        
        // Fetch tracks from our backend API (which gets them from Spotify)
        const response = await fetch(`/api/playlist-tracks/${playlistId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}` // Send user's token for authentication
          }
        });
        // Check if the request was successful
        if (!response.ok) {
          throw new Error('Failed to fetch dynamic playlist');
        }
        
        // Parse the response and transform data to match expected format
        const { tracks } = await response.json();
        // Transform tracks to match the format expected by the rest of the app
        playlistData = { items: tracks.map(track => ({ track })) };
        
      } else {
        // Use original static playlist logic (pre-defined Spotify playlists)
        playlistId = SPOTIFY_CONFIG.PLAYLIST_ID; // Get playlist ID from config
        
        try {
          // Try to fetch from primary playlist first
          playlistData = await getPlaylistTracks(playlistId, accessToken, SPOTIFY_CONFIG.MAX_TRACKS);
          console.log(`Successfully fetched primary playlist: ${playlistId}`);
          
        } catch (primaryError) {
          // If primary playlist fails, log the error and try fallback
          console.warn('Primary playlist failed, trying fallback:', primaryError.message);
          
          // Fallback to secondary/public playlist as backup
          playlistId = SPOTIFY_CONFIG.FALLBACK_PLAYLIST_ID;
          playlistData = await getPlaylistTracks(playlistId, accessToken, SPOTIFY_CONFIG.MAX_TRACKS);
          console.log(`Successfully fetched fallback playlist: ${playlistId}`);
        }
      }
      
      // Validate that we received proper playlist data structure
      if (!playlistData || !playlistData.items) {
        throw new Error('Invalid playlist data structure received');
      }
      
      console.log('Number of tracks in playlist:', playlistData.items.length);
      
      // ===== TRACK DATA EXTRACTION AND VALIDATION =====
      // Filter and transform playlist items to extract valid track data
      const validTracks = playlistData.items
        // Filter out invalid items (missing track, URI, or name)
        .filter(item => item && item.track && item.track.uri && (item.track.name || item.track.title))
        // Transform each item to standardized format
        .map(item => ({
          uri: item.track.uri, // Spotify track URI (unique identifier)
          name: item.track.name || item.track.title, // Handle different data structures
          artist: item.track.artist || item.track.artists?.[0]?.name || 'Unknown Artist', // Extract artist name
          album: item.track.album || item.track.album?.name || 'Unknown Album' // Extract album name
        }));
      
      // Debug logging to help troubleshoot data structure issues
      console.log('Raw playlist items:', playlistData.items.length);
      console.log('Valid tracks after filtering:', validTracks.length);
      console.log('Sample raw item:', playlistData.items[0]);
      
      // Check if we have any valid tracks after filtering
      if (validTracks.length === 0) {
        console.error('No valid tracks found. Raw items:', playlistData.items);
        throw new Error('No valid tracks found in playlist. Please check if the playlist contains any tracks.');
      }
      
      // Log successful extraction for debugging
      console.log('Valid tracks extracted:', validTracks.length);
      console.log('Sample tracks:', validTracks.slice(0, 3).map(t => `${t.name} by ${t.artist}`));
      
      // ===== STATE UPDATE =====
      // Update track URIs for game functionality
      setTrackUris(validTracks.map(track => track.uri));
      // Update song titles for autocomplete functionality
      setAllSongTitles(validTracks.map(track => track.name));
      
      console.log(`Successfully loaded ${validTracks.length} tracks for autocomplete`);
      
    } catch (error) {
      console.error('Error fetching playlist tracks:', error);
      setTrackUris([]);
      setAllSongTitles([]);
      
      // Show user-friendly error message
      let errorMessage = 'Failed to load playlist. Please try again later.';
      
      if (error.message.includes('401')) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error.message.includes('404')) {
        errorMessage = 'Playlist not found. Please check your playlist ID.';
      } else if (error.message.includes('403')) {
        errorMessage = 'Access denied. Please check playlist permissions.';
      }
      
      alert(errorMessage);
    }
  };

  useEffect(() => {
    if (accessToken) {
      console.log('Access token found, fetching track URIs...');
      fetchTrackUris();
    } else {
      console.log('No access token available');
    }
    // eslint-disable-next-line
  }, [accessToken, useDynamicPlaylist, dynamicPlaylistId || '']);

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
        setDeviceId(device_id); // Save device ID to state
      });
      player.connect();
    };

    return () => {
      delete window.onSpotifyWebPlaybackSDKReady;
    };
  }, [accessToken]);

  useEffect(() => {
    console.log('accessToken:', accessToken);
    console.log('deviceId:', deviceId);
    console.log('trackUris:', trackUris);
  }, [accessToken, deviceId, trackUris]);

  const updateProgress = useCallback(async () => {
    if (!accessToken || !deviceId || !currentSong) return;
    
    try {
      const data = await getCurrentPlayback(accessToken);
      
      if (data && data.is_playing && data.item && data.item.id === currentSong.id) {
        setProgress(data.progress_ms || 0);
        setDuration(data.item.duration_ms || 0);
      }
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  }, [accessToken, deviceId, currentSong]);

  useEffect(() => {
    let interval = null;
    if (currentSong && isPlaying && !isPaused) {
      interval = setInterval(updateProgress, 1000);
    }
    return () => clearInterval(interval);
  }, [currentSong, isPlaying, isPaused, accessToken, deviceId, updateProgress]);

  // Add this new useEffect to handle auto-stop
  useEffect(() => {
    if (progress >= gameModeDuration && isPlaying) {
      stopMusic();
      // Auto-submit empty guess (incorrect) if no guess was made
      if (currentSong && !guessResult) {
        setGuessResult({
          correct: false,
          actualTitle: currentSong.title
        });
        setStreak(0);
        setTotalGuesses(prev => prev + 1);
      }
    }
  }, [progress, gameModeDuration, isPlaying, currentSong, guessResult, stopMusic]);

  const seekTo = async (position) => {
    if (!accessToken || !deviceId) return;
    
    try {
      await seekToPosition(accessToken, deviceId, position);
      setProgress(position);
    } catch (error) {
      console.error('Error seeking to position:', error);
    }
  };

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // ===== GAMEPLAY FUNCTIONS =====
  // Main function to play a random unplayed song from the playlist
  const playRandomSong = async () => {
    // Validate that all required data is available before proceeding
    if (!accessToken || !deviceId || trackUris.length === 0) {
      console.log('Missing required data:', { accessToken: !!accessToken, deviceId, trackUrisLength: trackUris.length });
      return;
    }
    
    // Set loading state to show user that something is happening
    setIsLoading(true);
    
    try {
      // Get a random song that hasn't been played yet in this session
      const randomUri = getRandomUnplayedSong();
      if (!randomUri) {
        throw new Error('No unplayed songs available');
      }
      
      // Extract track ID from Spotify URI (format: spotify:track:TRACK_ID)
      const trackId = randomUri.split(':')[2];
      
      // Fetch detailed track information from Spotify API
      const songData = await getTrackDetails(trackId, accessToken);
      
      // Validate that we received proper track data
      if (!songData || !songData.name) {
        throw new Error('Invalid track data received');
      }
      
      // Update current song state with track details
      setCurrentSong({
        id: trackId, // Spotify track ID
        title: songData.name || 'Unknown Title', // Song title
        artist: songData.artists && songData.artists.length > 0 ? songData.artists.map(a => a.name).join(', ') : 'Unknown Artist', // Artist names (handle multiple artists)
        album: songData.album && songData.album.name ? songData.album.name : 'Unknown Album', // Album name
        uri: randomUri // Full Spotify URI
      });
      
      // Mark this song as played to prevent it from being selected again
      setPlayedSongs(prev => {
        const newSet = new Set([...prev, randomUri]); // Add current URI to set
        console.log(`Song marked as played: ${songData.name} (${newSet.size}/${trackUris.length} total played)`);
        return newSet;
      });
      
      // Start playing the track using Spotify Web Playback SDK
      await playTrack(accessToken, deviceId, randomUri);
      
      // ===== UPDATE GAME STATE =====
      setIsPlaying(true); // Set playing state
      setIsPaused(false); // Ensure not paused
      setUserGuess(''); // Clear previous guess
      setGuessResult(null); // Clear previous result
      setRoundsPlayed(prev => prev + 1); // Increment rounds counter
      setProgress(0); // Reset progress bar
      setDuration(songData.duration_ms || 0); // Set total duration
      
      // Special handling for endless mode - set duration limit
      if (gameMode === 'endless') {
        setGameModeDuration(songData.duration_ms || 0);
      }
      
    } catch (error) {
      console.error('Error playing random song:', error);
      alert('Failed to load song. Please try again.');
    } finally {
      // Always clear loading state, even if there was an error
      setIsLoading(false);
    }
  };

  // Function to validate user's guess against the current song
  const checkGuess = (e) => {
    // Prevent form submission default behavior (page reload)
    e.preventDefault();
    
    // Validate that we have a current song and user input
    if (!currentSong || !userGuess.trim()) return;
    
    // Compare user's guess with song title (case-insensitive)
    const isCorrect = userGuess.trim().toLowerCase() === currentSong.title.toLowerCase();
    
    // ===== UPDATE SCORING SYSTEM =====
    // Increment total guesses counter (for statistics)
    setTotalGuesses(prev => prev + 1);
    
    if (isCorrect) {
      // ===== CORRECT GUESS HANDLING =====
      // Update score (increment by 1 for correct guess)
      setScore(prev => {
        const newScore = prev + 1;
        // Check if this is a new high score
        if (newScore > highScore) {
          setHighScore(newScore); // Update high score if beaten
        }
        return newScore;
      });
      
      // Update streak (increment by 1 for correct guess)
      setStreak(prev => {
        const newStreak = prev + 1;
        // Check if this is a new best streak
        if (newStreak > bestStreak) {
          setBestStreak(newStreak); // Update best streak if beaten
        }
        return newStreak;
      });
    } else {
      // ===== INCORRECT GUESS HANDLING =====
      // Reset streak to 0 for incorrect guess
      setStreak(0);
    }
    
    // Set guess result for UI feedback
    setGuessResult({
      correct: isCorrect,
      actualTitle: currentSong.title
    });
  };

  const playNextSong = async () => {
    if (!accessToken || !deviceId || trackUris.length === 0) return;
    
    try {
      const randomUri = getRandomUnplayedSong();
      if (!randomUri) {
        throw new Error('No unplayed songs available');
      }
      
      const trackId = randomUri.split(':')[2];
      
      // Get track details using the service
      const songData = await getTrackDetails(trackId, accessToken);
      
      if (!songData || !songData.name) {
        throw new Error('Invalid track data received');
      }
      
      setCurrentSong({
        id: trackId,
        title: songData.name || 'Unknown Title',
        artist: songData.artists && songData.artists.length > 0 ? songData.artists.map(a => a.name).join(', ') : 'Unknown Artist',
        album: songData.album && songData.album.name ? songData.album.name : 'Unknown Album',
        uri: randomUri
      });
      
      // Mark this song as played
      setPlayedSongs(prev => {
        const newSet = new Set([...prev, randomUri]);
        console.log(`Song marked as played: ${songData.name} (${newSet.size}/${trackUris.length} total played)`);
        return newSet;
      });
      
      // Play the new track
      await playTrack(accessToken, deviceId, randomUri);
      
      setIsPlaying(true);
      setIsPaused(false);
      setUserGuess('');
      setGuessResult(null);
      setRoundsPlayed(prev => prev + 1);
      setProgress(0);
      setDuration(songData.duration_ms || 0);
      
      if (gameMode === 'endless') {
        setGameModeDuration(songData.duration_ms || 0);
      }
      
    } catch (error) {
      console.error('Error playing next song:', error);
    }
  };

  const skipSong = async () => {
    if (!accessToken || !deviceId || trackUris.length === 0) return;
    
    try {
      // Stop current playback
      await pausePlayback(accessToken, deviceId);
      
      // Reset current song and guess states
      setCurrentSong(null);
      setUserGuess('');
      setGuessResult(null);
      setIsPlaying(false);
      setIsPaused(false);
      setProgress(0);
      
      // Reset streak (penalty for skipping)
      setStreak(0);
      
      // Automatically play the next song
      await playNextSong();
      
    } catch (error) {
      console.error('Error skipping song:', error);
    }
  };

  const playAgain = () => {
    setCurrentSong(null);
    setIsPlaying(false);
    setUserGuess('');
    setGuessResult(null);
    playRandomSong();
  };

  const togglePlayPause = async () => {
    if (!accessToken || !deviceId || !currentSong) return;
    
    // If song has reached the end of game mode duration, start playing from beginning
    if (progress >= gameModeDuration && gameMode !== 'endless') {
      try {
        await playTrack(accessToken, deviceId, currentSong.uri);
        setIsPaused(false);
        setProgress(0);
        return;
      } catch (error) {
        console.error('Error restarting song:', error);
        return;
      }
    }
    
    try {
      if (isPaused) {
        // Resume playback
        await resumePlayback(accessToken, deviceId);
        setIsPaused(false);
      } else {
        // Pause playback
        await pausePlayback(accessToken, deviceId);
        setIsPaused(true);
      }
    } catch (error) {
      console.error('Error toggling play/pause:', error);
    }
  };

  const restartMusic = async () => {
    if (!accessToken || !deviceId || !currentSong) return;
    
    try {
      // Restart the current song from the beginning
      await playTrack(accessToken, deviceId, currentSong.uri);
      setIsPaused(false);
      setProgress(0);
    } catch (error) {
      console.error('Error restarting music:', error);
    }
  };

  const resetGame = () => {
    setScore(0);
    setTotalGuesses(0);
    setStreak(0);
    setRoundsPlayed(0);
    setCurrentSong(null);
    setIsPlaying(false);
    setUserGuess('');
    setGuessResult(null);
    setPlayedSongs(new Set()); // Reset played songs for new game session
    // setTimerActive(false); // Removed timer-related state
  };

  const stopMusic = async () => {
    if (!accessToken || !deviceId) return;
    
    try {
      await pausePlayback(accessToken, deviceId);
      setIsPaused(true);
    } catch (error) {
      console.error('Error stopping music:', error);
    }
  };

    const generateSuggestions = async (input) => {
    if (!input || input.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const inputLower = input.toLowerCase();
    
    // Search through actual song titles from the playlist (Spotify)
    let matchingSongs = allSongTitles.filter(song => 
      song.toLowerCase().includes(inputLower)
    );

    // Search through MongoDB database
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(input)}&limit=10`);
      if (response.ok) {
        const mongoResults = await response.json();
        const mongoSongs = mongoResults.map(song => song.title);
        
        // Combine Spotify and MongoDB results
        const allResults = [...new Set([...matchingSongs, ...mongoSongs])];
        
        // Sort by relevance (exact matches first, then partial matches)
        const sortedSuggestions = allResults.sort((a, b) => {
          const aLower = a.toLowerCase();
          const bLower = b.toLowerCase();
          
          // Exact match gets highest priority
          if (aLower === inputLower) return -1;
          if (bLower === inputLower) return 1;
          
          // Starts with input gets second priority
          if (aLower.startsWith(inputLower)) return -1;
          if (bLower.startsWith(inputLower)) return 1;
          
          // Otherwise, sort alphabetically
          return aLower.localeCompare(bLower);
        });

        // Limit to 8 suggestions (more since we have more data)
        const suggestions = sortedSuggestions.slice(0, 8);
        
        console.log(`Search for "${input}" found ${allResults.length} total matches (Spotify: ${matchingSongs.length}, MongoDB: ${mongoSongs.length}), showing ${suggestions.length}`);
        
        setSuggestions(suggestions);
        setShowSuggestions(suggestions.length > 0);
        return;
      }
    } catch (error) {
      console.log('MongoDB search failed, using only Spotify results:', error.message);
    }

    // Fallback to Spotify-only search if MongoDB fails
    if (allSongTitles.length === 0) {
      const basicSuggestions = [
        'Loading songs from playlist...',
        'Try refreshing the page',
        'Check your Spotify connection'
      ];
      setSuggestions(basicSuggestions);
      setShowSuggestions(true);
      return;
    }

    // Sort by relevance (exact matches first, then partial matches)
    const sortedSuggestions = matchingSongs.sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      
      // Exact match gets highest priority
      if (aLower === inputLower) return -1;
      if (bLower === inputLower) return 1;
      
      // Starts with input gets second priority
      if (aLower.startsWith(inputLower)) return -1;
      if (bLower.startsWith(inputLower)) return 1;
      
      // Otherwise, sort alphabetically
      return aLower.localeCompare(bLower);
    });

    // Limit to 5 suggestions
    const suggestions = sortedSuggestions.slice(0, 5);
    
    console.log(`Search for "${input}" found ${matchingSongs.length} matches, showing ${suggestions.length}`);
    
    setSuggestions(suggestions);
    setShowSuggestions(suggestions.length > 0);
  };

  const handleGuessChange = (e) => {
    const value = e.target.value;
    setUserGuess(value);
    generateSuggestions(value); // This is now async but we don't need to await it
  };

  const selectSuggestion = (suggestion) => {
    setUserGuess(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ 
        maxWidth: 800, 
        margin: '0 auto', 
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 20,
        padding: 30,
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(10px)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <h1 style={{ 
            fontSize: '3rem', 
            fontWeight: 'bold', 
            background: 'linear-gradient(45deg, #667eea, #764ba2)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
            textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
          }}>
             Song Guess Game 🎵
          </h1>
          <p style={{ color: '#666', fontSize: '1.1rem', marginTop: 10 }}>
            Test your music knowledge!
          </p>
        </div>

        {/* Login/Logout Buttons */}
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          {!accessToken ? (
            <a href="/api/auth/login" style={{ textDecoration: 'none' }}>
              <button style={{
                padding: '15px 30px',
                fontSize: '1.2rem',
                backgroundColor: '#1DB954',
                color: 'white',
                border: 'none',
                borderRadius: 50,
                cursor: 'pointer',
                boxShadow: '0 8px 16px rgba(29, 185, 84, 0.3)',
                transition: 'all 0.3s ease',
                fontWeight: 'bold'
              }} onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 12px 20px rgba(29, 185, 84, 0.4)';
              }} onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 8px 16px rgba(29, 185, 84, 0.3)';
              }}>
                🎧 Connect with Spotify
              </button>
            </a>
          ) : (
            <div style={{ display: 'flex', gap: 15, justifyContent: 'center', flexWrap: 'wrap' }}>
              <div style={{ color: '#666', fontSize: '1rem', display: 'flex', alignItems: 'center' }}>
                ✅ Connected to Spotify
              </div>
              <a href="/api/auth/logout" style={{ textDecoration: 'none' }}>
                <button style={{
                  padding: '10px 20px',
                  fontSize: '1rem',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: 25,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  fontWeight: 'bold'
                }} onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-1px)';
                }} onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                }}>
                  🚪 Logout & Re-authenticate
                </button>
              </a>
            </div>
          )}
        </div>

        {/* Score Dashboard */}
        {accessToken && (
          <div style={{ 
            backgroundColor: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            padding: 20,
            borderRadius: 15,
            marginBottom: 30,
            boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ textAlign: 'center', margin: '0 0 15px 0', color: 'white' }}>
              🏆 Game Statistics
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 15 }}>
              <div style={{ textAlign: 'center', color: 'white' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{score}/{totalGuesses}</div>
                <div style={{ fontSize: '0.9rem' }}>Score</div>
              </div>
              <div style={{ textAlign: 'center', color: 'white' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {totalGuesses > 0 ? Math.round((score/totalGuesses)*100) : 0}%
                </div>
                <div style={{ fontSize: '0.9rem' }}>Accuracy</div>
              </div>
              <div style={{ textAlign: 'center', color: 'white' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{streak}</div>
                <div style={{ fontSize: '0.9rem' }}>Current Streak</div>
              </div>
              <div style={{ textAlign: 'center', color: 'white' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{bestStreak}</div>
                <div style={{ fontSize: '0.9rem' }}>Best Streak</div>
              </div>
              <div style={{ textAlign: 'center', color: 'white' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{highScore}</div>
                <div style={{ fontSize: '0.9rem' }}>High Score</div>
              </div>
              <div style={{ textAlign: 'center', color: 'white' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{playedSongs.size}/{trackUris.length}</div>
                <div style={{ fontSize: '0.9rem' }}>Songs Played</div>
              </div>
            </div>
          </div>
        )}

        {/* Session Progress Bar */}
        {accessToken && trackUris.length > 0 && (
          <div style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: 15,
            borderRadius: 10,
            marginBottom: 20,
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.9rem', color: '#666', fontWeight: 'bold' }}>
                🎵 Session Progress: {playedSongs.size} of {trackUris.length} songs played
              </span>
              <span style={{ fontSize: '0.8rem', color: '#888' }}>
                {trackUris.length - playedSongs.size} songs remaining
              </span>
            </div>
            <div style={{ 
              width: '100%', 
              height: 8, 
              backgroundColor: '#e9ecef', 
              borderRadius: 4,
              overflow: 'hidden'
            }}>
              <div style={{ 
                width: `${(playedSongs.size / trackUris.length) * 100}%`, 
                height: '100%', 
                backgroundColor: '#1DB954',
                transition: 'width 0.3s ease'
              }} />
            </div>
            {playedSongs.size === trackUris.length && (
              <div style={{ 
                textAlign: 'center', 
                marginTop: 8, 
                padding: 8, 
                backgroundColor: '#d4edda', 
                color: '#155724', 
                borderRadius: 5,
                fontSize: '0.9rem',
                fontWeight: 'bold'
              }}>
                🎉 All songs played! Session will reset on next song.
              </div>
            )}
          </div>
        )}

        {/* Dynamic Playlist Manager */}
        {accessToken && (
          <DynamicPlaylistManager 
            accessToken={accessToken}
            onPlaylistCreated={(playlistId) => {
              setDynamicPlaylistId(playlistId);
              setUseDynamicPlaylist(true);
            }}
          />
        )}

        {/* Playlist Selection */}
        {accessToken && deviceId && (
          <div style={{ marginBottom: 30 }}>
            <h3 style={{ textAlign: 'center', marginBottom: 20, color: '#333' }}>
              🎵 Choose Your Music Source
            </h3>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 15, flexWrap: 'wrap' }}>
              <button 
                onClick={() => setUseDynamicPlaylist(false)}
                style={{ 
                  padding: '12px 20px',
                  backgroundColor: !useDynamicPlaylist ? '#28a745' : '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: 25,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
                }}
              >
                📻 Original Playlist
              </button>
              <button 
                onClick={() => setUseDynamicPlaylist(true)}
                disabled={!dynamicPlaylistId}
                style={{ 
                  padding: '12px 20px',
                  backgroundColor: useDynamicPlaylist && dynamicPlaylistId ? '#007bff' : '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: 25,
                  cursor: dynamicPlaylistId ? 'pointer' : 'not-allowed',
                  transition: 'all 0.3s ease',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
                }}
              >
                🎲 Dynamic Database ({dynamicPlaylistId ? 'Ready' : 'Create First'})
              </button>
            </div>
          </div>
        )}

        {/* Game Mode Selection */}
        {accessToken && deviceId && trackUris.length > 0 && (
          <div style={{ marginBottom: 30 }}>
            <h3 style={{ textAlign: 'center', marginBottom: 20, color: '#333' }}>
              🎮 Select Game Mode
            </h3>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 15, flexWrap: 'wrap' }}>
              {[
                { mode: 'normal', label: 'Normal Mode', time: '30s', color: '#28a745' },
                { mode: 'timeAttack', label: 'Time Attack', time: '15s', color: '#dc3545' },
                { mode: 'endless', label: 'Endless Mode', time: 'Full Song', color: '#007bff' }
              ].map(({ mode, label, time, color }) => (
                <button 
                  key={mode}
                  onClick={() => {
                    setGameMode(mode);
                    if (mode === 'normal') setGameModeDuration(30000);
                    else if (mode === 'timeAttack') setGameModeDuration(15000);
                    else setGameModeDuration(duration);
                  }} 
                  style={{ 
                    padding: '12px 20px',
                    backgroundColor: gameMode === mode ? color : '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: 25,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  {label} ({time})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Play Button */}
        {accessToken && deviceId && trackUris.length > 0 && (
          <div style={{ textAlign: 'center', marginBottom: 30 }}>
            <button 
              onClick={playRandomSong}
              disabled={isLoading}
              style={{
                padding: '20px 40px',
                fontSize: '1.3rem',
                backgroundColor: isLoading ? '#6c757d' : '#1DB954',
                color: 'white',
                border: 'none',
                borderRadius: 50,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                boxShadow: '0 8px 16px rgba(29, 185, 84, 0.3)',
                transition: 'all 0.3s ease',
                fontWeight: 'bold'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 12px 20px rgba(29, 185, 84, 0.4)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 8px 16px rgba(29, 185, 84, 0.3)';
              }}
            >
              {isLoading ? '🔄 Loading...' : '🎵 Play Random Song'}
            </button>
          </div>
        )}

        {/* Reset Button */}
        {accessToken && (score > 0 || totalGuesses > 0) && (
          <div style={{ textAlign: 'center', marginBottom: 30 }}>
            <button 
              onClick={resetGame} 
              style={{
                padding: '10px 20px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: 25,
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
              }}
            >
              🔄 Reset Game
            </button>
          </div>
        )}

        {/* Game Interface */}
        {currentSong && isPlaying && (
          <div style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: 25,
            borderRadius: 15,
            boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
            border: '2px solid #1DB954'
          }}>
            <h3 style={{ textAlign: 'center', margin: '0 0 20px 0', color: '#333' }}>
               Now Playing (Round {roundsPlayed})
            </h3>
            
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <p style={{ fontSize: '1.1rem', margin: '5px 0' }}>
                <strong>Artist:</strong> {currentSong.artist}
              </p>
              <p style={{ fontSize: '1.1rem', margin: '5px 0' }}>
                <strong>Album:</strong> {currentSong.album}
              </p>
              <p style={{ fontSize: '1.2rem', fontStyle: 'italic', color: '#1DB954', fontWeight: 'bold' }}>
                🎯 Guess the song title!
              </p>
            </div>

            {/* Progress Bar */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: '12px', color: '#666', minWidth: '35px' }}>
                  {formatTime(Math.min(progress, gameModeDuration))}
                </span>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    type="range"
                    min="0"
                    max={gameModeDuration}
                    value={Math.min(progress, gameModeDuration)}
                    onChange={(e) => {
                      setProgress(parseInt(e.target.value));
                    }}
                    onMouseUp={(e) => {
                      seekTo(parseInt(e.target.value));
                    }}
                    onTouchEnd={(e) => {
                      seekTo(parseInt(e.target.value));
                    }}
                    style={{ 
                      width: '100%',
                      height: '8px',
                      borderRadius: '4px',
                      background: `linear-gradient(to right, #1db954 0%, #1db954 ${(Math.min(progress, gameModeDuration) / gameModeDuration) * 100}%, #e9ecef ${(Math.min(progress, gameModeDuration) / gameModeDuration) * 100}%, #e9ecef 100%)`,
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      backgroundColor: 'white',
                      border: '1px solid #e1e5e9',
                      borderRadius: '10px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      zIndex: 1000,
                      maxHeight: '200px',
                      overflowY: 'auto',
                      marginTop: '5px'
                    }}>
                      {suggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          onClick={() => selectSuggestion(suggestion)}
                          style={{
                            padding: '10px 16px',
                            cursor: 'pointer',
                            borderBottom: index < suggestions.length - 1 ? '1px solid #f0f0f0' : 'none',
                            fontSize: '14px',
                            color: '#333',
                            transition: 'background-color 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                        >
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: '12px', color: '#666', minWidth: '35px' }}>
                  {formatTime(gameModeDuration)}
                </span>
              </div>
              
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button 
                  onClick={togglePlayPause} 
                  style={{ 
                    padding: '10px 20px',
                    backgroundColor: isPaused ? '#28a745' : '#dc3545', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: 25,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    fontWeight: 'bold'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = 'translateY(-1px)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  {progress >= gameModeDuration && gameMode !== 'endless' ? '▶️ Play' : (isPaused ? '▶️ Play' : '⏸️ Pause')}
                </button>
                <button 
                  onClick={restartMusic} 
                  style={{ 
                    padding: '10px 20px',
                    backgroundColor: '#007bff', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: 25,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    fontWeight: 'bold'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = 'translateY(-1px)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  🔄 Replay
                </button>
                <button 
                  onClick={skipSong} 
                  style={{ 
                    padding: '10px 20px',
                    backgroundColor: '#ffc107', 
                    color: 'black', 
                    border: 'none', 
                    borderRadius: 25,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    fontWeight: 'bold'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = 'translateY(-1px)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  ⏭️ Skip
                </button>
              </div>
            </div>

            {/* Guessing Form */}
            <form onSubmit={checkGuess} style={{ textAlign: 'center' }}>
              <input
                type="text"
                value={userGuess}
                onChange={handleGuessChange}
                placeholder="Enter song title..."
                style={{ 
                  padding: '12px 20px',
                  width: '60%',
                  border: '2px solid #ddd',
                  borderRadius: 25,
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.3s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#1DB954';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#ddd';
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
              />
              <button 
                type="submit" 
                style={{ 
                  padding: '12px 25px',
                  marginLeft: 10,
                  backgroundColor: '#1DB954',
                  color: 'white',
                  border: 'none',
                  borderRadius: 25,
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 8px rgba(29, 185, 84, 0.3)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                🎯 Submit Guess
              </button>
            </form>
          </div>
        )}

        {/* Result Display */}
        {guessResult && (
          <div style={{ 
            marginTop: 20, 
            padding: 20, 
            borderRadius: 15, 
            backgroundColor: guessResult.correct ? 'rgba(40, 167, 69, 0.1)' : 'rgba(220, 53, 69, 0.1)',
            border: `2px solid ${guessResult.correct ? '#28a745' : '#dc3545'}`,
            textAlign: 'center'
          }}>
            {guessResult.correct ? (
              <div style={{ color: '#28a745' }}>
                <div style={{ fontSize: '2rem', marginBottom: 10 }}>🎉</div>
                <p style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0 }}>
                  Correct! The song is "{guessResult.actualTitle}"
                </p>
              </div>
            ) : (
              <div style={{ color: '#dc3545' }}>
                <div style={{ fontSize: '2rem', marginBottom: 10 }}>❌</div>
                <p style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0 }}>
                  Incorrect. The song is "{guessResult.actualTitle}"
                </p>
              </div>
            )}
            
            <button 
              onClick={playAgain} 
              style={{ 
                padding: '12px 25px',
                backgroundColor: '#1DB954',
                color: 'white',
                border: 'none',
                borderRadius: 25,
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 'bold',
                marginTop: 15,
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 4px 8px rgba(29, 185, 84, 0.3)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
               Play Another Song
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
