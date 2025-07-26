import React, { useEffect, useState, useCallback } from 'react';

function App() {
  const [trackUris, setTrackUris] = useState([]);
  const [deviceId, setDeviceId] = useState(null);
  const [currentSong, setCurrentSong] = useState(null);
  const [userGuess, setUserGuess] = useState('');
  const [guessResult, setGuessResult] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [totalGuesses, setTotalGuesses] = useState(0);
  const [streak, setStreak] = useState(0);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [gameMode, setGameMode] = useState('normal'); // 'normal', 'timeAttack', 'endless'
  const [roundsPlayed, setRoundsPlayed] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [gameModeDuration, setGameModeDuration] = useState(30000); // 30 seconds default
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allSongTitles, setAllSongTitles] = useState([]);

  const urlParams = new URLSearchParams(window.location.search);
  const accessToken = urlParams.get('access_token');


  const fetchTrackUris = async () => {
    if (!accessToken) return;
    
    try {
      console.log('Fetching playlist tracks...');
      // Use a public playlist instead
      const res = await fetch(
        // `https://api.spotify.com/v1/playlists/6ttSx3ZVwaaoyz9qMuH3w7/tracks`,
        `https://api.spotify.com/v1/track/5SuOikwiRyPMVoIQDJUgSV`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      
      if (!res.ok) {
        throw new Error(`Failed to fetch playlist: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('Playlist data received:', data);
      
      if (!data || !data.items) {
        throw new Error('Invalid playlist data received');
      }
      
      console.log('Number of tracks in playlist:', data.items.length);
      
      const uris = data.items
        .filter(item => item && item.track && item.track.uri)
        .map(item => item.track.uri);
      
      // Extract song titles for autocomplete
      const titles = data.items
        .filter(item => item && item.track && item.track.name)
        .map(item => item.track.name);
      
      console.log('Extracted URIs:', uris.length);
      console.log('Extracted titles:', titles.length);
      console.log('Sample titles:', titles.slice(0, 5));
      
      setTrackUris(uris);
      setAllSongTitles(titles);
      console.log('Loaded', titles.length, 'song titles for autocomplete');
      
    } catch (error) {
      console.error('Error fetching track URIs:', error);
      console.error('Access token:', accessToken ? 'Present' : 'Missing');
      console.error('Response status:', error.message);
      alert('Failed to load playlist. Please refresh the page and try logging in again.');
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
  }, [accessToken]);

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
      const response = await fetch('https://api.spotify.com/v1/me/player', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await response.json();
      
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
  }, [progress, gameModeDuration, isPlaying, currentSong, guessResult]);

  const seekTo = async (position) => {
    if (!accessToken || !deviceId || !currentSong) return;
    
    try {
      await fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${position}&device_id=${deviceId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setProgress(position);
    } catch (error) {
      console.error('Error seeking:', error);
    }
  };

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const playRandomSong = async () => {
    if (!accessToken || !deviceId || trackUris.length === 0) return;
    
    setIsLoading(true);
    
    try {
      const randomUri = trackUris[Math.floor(Math.random() * trackUris.length)];
      const trackId = randomUri.split(':')[2];
      
      const songRes = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (!songRes.ok) {
        throw new Error(`Failed to fetch track: ${songRes.status}`);
      }
      
      const songData = await songRes.json();
      
      // Add fallbacks for missing data
      if (!songData || !songData.name) {
        throw new Error('Invalid track data received');
      }
      
      setCurrentSong({
        id: trackId,
        title: songData.name || 'Unknown Title',
        artist: songData.artists && songData.artists.length > 0 
          ? songData.artists.map(a => a.name).join(', ') 
          : 'Unknown Artist',
        album: songData.album && songData.album.name 
          ? songData.album.name 
          : 'Unknown Album',
        uri: randomUri
      });
      
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        body: JSON.stringify({ uris: [randomUri] }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      setIsPlaying(true);
      setIsPaused(false);
      setUserGuess('');
      setGuessResult(null);
      setRoundsPlayed(prev => prev + 1);
      setProgress(0);
      setDuration(songData.duration_ms || 0);
      
      // Set game mode duration based on mode
      if (gameMode === 'endless') {
        setGameModeDuration(songData.duration_ms || 0);
      }
      
    } catch (error) {
      console.error('Error playing random song:', error);
      // You could add a user-friendly error message here
      alert('Failed to load song. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const checkGuess = (e) => {
    e.preventDefault();
    if (!currentSong || !userGuess.trim()) return;
    
    const isCorrect = userGuess.trim().toLowerCase() === currentSong.title.toLowerCase();
    
    // Update scoring
    setTotalGuesses(prev => prev + 1);
    if (isCorrect) {
      setScore(prev => {
        const newScore = prev + 1;
        if (newScore > highScore) {
          setHighScore(newScore);
        }
        return newScore;
      });
      setStreak(prev => {
        const newStreak = prev + 1;
        if (newStreak > bestStreak) {
          setBestStreak(newStreak);
        }
        return newStreak;
      });
    } else {
      setStreak(0);
    }
    
    setGuessResult({
      correct: isCorrect,
      actualTitle: currentSong.title
    });
  };

  const skipSong = async () => {
    await togglePlayPause(); // This will stop the music
    setCurrentSong(null);
    setIsPlaying(false);
    setUserGuess('');
    setGuessResult(null);
    setStreak(0);
    setProgress(0);
    setDuration(0);
    setIsPaused(false);
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
        await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
          method: 'PUT',
          body: JSON.stringify({ uris: [currentSong.uri] }),
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}` 
          }
        });
        setIsPaused(false);
        setProgress(0);
        return;
      } catch (error) {
        console.error('Error restarting song:', error);
        return;
      }
    }
    if (!accessToken || !deviceId) return;
    
    try {
      if (isPaused) {
        // Resume playback
        await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
        setIsPaused(false);
      } else {
        // Pause playback
        await fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
        setIsPaused(true);
      }
    } catch (error) {
      console.error('Error toggling play/pause:', error);
    }
  };

  const restartMusic = async () => {
    if (!accessToken || !deviceId || !currentSong) return;
    
    try {
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        body: JSON.stringify({ uris: [currentSong.uri] }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      setProgress(0);
      setIsPaused(false);
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
    // setTimerActive(false); // Removed timer-related state
  };

  const stopMusic = async () => {
    if (!accessToken || !deviceId) return;
    
    try {
      await fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      setIsPaused(true);
    } catch (error) {
      console.error('Error stopping music:', error);
    }
  };

    const generateSuggestions = (input) => {
    if (!input || input.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const inputLower = input.toLowerCase();
    
    // Search through actual song titles from the playlist
    let matchingSongs = allSongTitles.filter(song => 
      song.toLowerCase().includes(inputLower)
    );

    // If no songs loaded yet, show some basic suggestions
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
    generateSuggestions(value);
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

        {/* Login Button */}
        {!accessToken && (
          <div style={{ textAlign: 'center', marginBottom: 30 }}>
            <a href="http://127.0.0.1:5000/auth/login" style={{ textDecoration: 'none' }}>
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
          </div>
        )}

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
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
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
