import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useSpotifyPlayer } from './hooks/useSpotifyPlayer';
import { 
  SPOTIFY_CONFIG, 
  getPlaylistTracks, 
  getTrackDetails 
} from './spotifyService';
import { getApiUrl } from './config';

// Components
import WelcomeScreen from './components/WelcomeScreen';
import ScoreBoard from './components/ScoreBoard';
import PlaylistSelector from './components/PlaylistSelector';
import GameModeSelector from './components/GameModeSelector';
import GuessInput from './components/GuessInput';
import GameControls from './components/GameControls';
import ProgressBar from './components/ProgressBar';
import ResultDisplay from './components/ResultDisplay';
import DynamicPlaylistManager from './DynamicPlaylistManager';

function App() {
  const { accessToken, authLoading, logout, rememberMe } = useAuth();
  const player = useSpotifyPlayer(accessToken);

  // ===== CONSTANTS =====
  const PROGRESSIVE_STEPS = [100, 500, 1000, 2000, 4000, 7000, 11000, 16000, 22000, 30000];

  // ===== STATE MANAGEMENT =====
  const [trackUris, setTrackUris] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [userGuess, setUserGuess] = useState('');
  const [guessResult, setGuessResult] = useState(null);
  const [score, setScore] = useState(0);
  const [totalGuesses, setTotalGuesses] = useState(0);
  const [streak, setStreak] = useState(0);
  const [gameMode, setGameMode] = useState('normal');
  const [roundsPlayed, setRoundsPlayed] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [gameModeDuration, setGameModeDuration] = useState(30000);
  const [currentStepIndex, setCurrentStepIndex] = useState(0); // For progressive/songless mode
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allSongTitles, setAllSongTitles] = useState([]);
  const [dynamicPlaylistId, setDynamicPlaylistId] = useState(null);
  const [useDynamicPlaylist, setUseDynamicPlaylist] = useState(false);
  const [playedSongs, setPlayedSongs] = useState(new Set());

  // ===== HELPER FUNCTIONS =====
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

  // ===== CORE FUNCTIONS =====
  const fetchTrackUris = useCallback(async () => {
    if (!accessToken) return;
    
    console.log('Fetching playlist tracks...');
    try {
      let playlistData;
      let playlistId;
      
      if (useDynamicPlaylist && dynamicPlaylistId) {
        playlistId = dynamicPlaylistId;
        const response = await fetch(getApiUrl(`/api/playlist-tracks/${playlistId}`), {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!response.ok) throw new Error('Failed to fetch dynamic playlist');
        const { tracks } = await response.json();
        playlistData = { 
          items: tracks.map(track => ({ 
            track: {
              uri: track.uri,
              name: track.title,
              artist: track.artist,
              album: track.album
            }
          }))
        };
      } else {
        playlistId = SPOTIFY_CONFIG.PLAYLIST_ID;
        try {
          playlistData = await getPlaylistTracks(playlistId, accessToken, SPOTIFY_CONFIG.MAX_TRACKS);
        } catch (primaryError) {
          console.warn('Primary playlist failed, trying fallback');
          playlistId = SPOTIFY_CONFIG.FALLBACK_PLAYLIST_ID;
          playlistData = await getPlaylistTracks(playlistId, accessToken, SPOTIFY_CONFIG.MAX_TRACKS);
        }
      }
      
      if (!playlistData || !playlistData.items) throw new Error('Invalid playlist data');
      
      const validTracks = playlistData.items
        .filter(item => item && item.track && item.track.uri && (item.track.name || item.track.title))
        .map(item => ({
          uri: item.track.uri,
          name: item.track.name || item.track.title,
          artist: item.track.artist || item.track.artists?.[0]?.name || 'Unknown Artist',
          album: item.track.album || item.track.album?.name || 'Unknown Album'
        }));
      
      if (validTracks.length === 0) throw new Error('No valid tracks found');
      
      setTrackUris(validTracks.map(track => track.uri));
      setAllSongTitles(validTracks.map(track => track.name));
      
    } catch (error) {
      console.error('Error fetching playlist tracks:', error);
      setTrackUris([]);
      setAllSongTitles([]);
      alert('Failed to load playlist. Please try again later.');
    }
  }, [accessToken, useDynamicPlaylist, dynamicPlaylistId]);

  useEffect(() => {
    if (accessToken) fetchTrackUris();
  }, [accessToken, fetchTrackUris]);

  // Auto-stop logic
  useEffect(() => {
    if (player.progress >= gameModeDuration && player.isPlaying) {
      player.handlePause();
      if (gameMode !== 'progressive' && currentSong && !guessResult) {
        setGuessResult({
          correct: false,
          actualTitle: currentSong.title
        });
        setStreak(0);
        setTotalGuesses(prev => prev + 1);
      }
    }
  }, [player.progress, gameModeDuration, player.isPlaying, currentSong, guessResult, player, gameMode]);

  // ===== GAMEPLAY FUNCTIONS =====
  const playProgressiveSnippet = useCallback(async (durationMs) => {
    if (!player.deviceId) return;
    
    // We use handlePlay to ensure it starts from beginning or use seek if already loaded?
    // handlePlay with URI restarts it. 
    // But we need to handle the pause timing.
    
    // For consistency, we'll rely on the fact that handlePlay (or restart) was called.
    // But here we are just handling the "Play" button action for progressive mode?
    // Actually, this function is for "Replaying" or "Playing" the snippet.
    
    // Wait, playRandomSong sets up the NEW song.
    // This function is for when we need to play the current snippet again.
  }, [player]);

  const playRandomSong = async () => {
    if (!accessToken || !player.deviceId || trackUris.length === 0) return;
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
        artist: songData.artists?.map(a => a.name).join(', ') || 'Unknown',
        album: songData.album?.name || 'Unknown',
        uri: randomUri
      });
      
      setPlayedSongs(prev => new Set([...prev, randomUri]));
      await player.handlePlay(randomUri, trackId);
      
      setUserGuess('');
      setGuessResult(null);
      setRoundsPlayed(prev => prev + 1);
      
      if (gameMode === 'endless') {
        setGameModeDuration(songData.duration_ms || 0);
      } else if (gameMode === 'progressive') {
        const initialStep = PROGRESSIVE_STEPS[0];
        setGameModeDuration(initialStep);
        setCurrentStepIndex(0);
        
        setTimeout(() => {
          if (player.localPause) player.localPause();
          else player.handlePause();
        }, initialStep);
      }
      
    } catch (error) {
      console.error('Error playing random song:', error);
      alert('Failed to load song. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const checkGuess = (e) => {
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
          // Advance to next step
          setCurrentStepIndex(nextIndex);
          const newDuration = PROGRESSIVE_STEPS[nextIndex];
          setGameModeDuration(newDuration);
          
          // Automatically play the new longer snippet
          player.handlePlay(currentSong.uri, currentSong.id).then(() => {
            setTimeout(() => {
              if (player.localPause) player.localPause();
              else player.handlePause();
            }, newDuration);
          });
          
          // Don't show result yet, just feedback that it was wrong? 
          // Or maybe we should show "Wrong, +1s added" toast? 
          // For now, just expanding the time is the feedback.
          return;
        }
      }
      
      setGuessResult({
        correct: false,
        actualTitle: currentSong.title
      });
    }
  };

  const skipSong = async () => {
    if (!accessToken || !player.deviceId || trackUris.length === 0) return;
    
    if (gameMode === 'progressive' && currentSong && !guessResult) {
      const nextIndex = currentStepIndex + 1;
      if (nextIndex < PROGRESSIVE_STEPS.length) {
        // Advance to next step instead of skipping song
        setCurrentStepIndex(nextIndex);
        const newDuration = PROGRESSIVE_STEPS[nextIndex];
        setGameModeDuration(newDuration);
        
        // Play new longer snippet
        await player.handlePlay(currentSong.uri, currentSong.id);
        setTimeout(() => {
          if (player.localPause) player.localPause();
          else player.handlePause();
        }, newDuration);
        return;
      }
      // If last step, fall through to normal skip (which reveals/fails)
    }

    try {
      // We don't need to explicitly pause, playRandomSong will handle the new track
      // await player.handlePause(); 
      
      // Reset states but keep "isPlaying" logic ready for the next song
      setCurrentSong(null);
      setUserGuess('');
      setGuessResult(null);
      player.setIsPlaying(false); 
      player.setIsPaused(false);
      player.setProgress(0);
      setStreak(0); // Penalty for skipping
      
      // Play the next random song
      await playRandomSong();
    } catch (error) {
      console.error('Error skipping song:', error);
    }
  };

  const playAgain = () => {
    setCurrentSong(null);
    player.setIsPlaying(false);
    setUserGuess('');
    setGuessResult(null);
    playRandomSong();
  };

  const resetGame = () => {
    setScore(0);
    setTotalGuesses(0);
    setStreak(0);
    setRoundsPlayed(0);
    setCurrentSong(null);
    player.setIsPlaying(false);
    setUserGuess('');
    setGuessResult(null);
    setPlayedSongs(new Set());
    setCurrentStepIndex(0);
  };

  // Search/Suggestions logic
  const generateSuggestions = async (input) => {
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
        const mongoSongs = mongoResults.map(song => song.title);
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

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #FFDEE9 0%, #B5FFFC 100%)',
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      color: '#555555'
    }}>
      <div style={{ 
        maxWidth: 800, 
        margin: '0 auto', 
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        borderRadius: 20,
        padding: 30,
        boxShadow: '0 20px 40px rgba(0,0,0,0.05)',
        backdropFilter: 'blur(15px)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <h1 style={{ 
            fontSize: '3rem', 
            fontWeight: 'bold', 
            background: 'linear-gradient(45deg, #C7CEEA, #FF9AA2)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
            textShadow: '2px 2px 4px rgba(0,0,0,0.05)'
          }}>
             Song Guess Game 🎵
          </h1>
          <p style={{ color: '#666', fontSize: '1.1rem', marginTop: 10 }}>
            Test your music knowledge!
          </p>
        </div>

        {!accessToken ? (
          <WelcomeScreen authLoading={authLoading} />
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: 30 }}>
              <div style={{ color: '#666', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                ✅ Connected to Spotify {rememberMe && ' (Auto-login enabled)'}
                <button 
                  onClick={logout}
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.9rem',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: 20,
                    cursor: 'pointer'
                  }}
                >
                  Logout
                </button>
              </div>
            </div>

            <ScoreBoard 
              score={score} 
              totalGuesses={totalGuesses} 
              streak={streak} 
              bestStreak={bestStreak} 
              highScore={highScore} 
              playedCount={playedSongs.size}
              totalCount={trackUris.length}
            />

            {accessToken && (
              <DynamicPlaylistManager 
                accessToken={accessToken}
                onPlaylistCreated={(playlistId) => {
                  setDynamicPlaylistId(playlistId);
                  setUseDynamicPlaylist(true);
                }}
                onPlaylistUpdate={fetchTrackUris}
              />
            )}

            {accessToken && !player.deviceId && (
              <div style={{ textAlign: 'center', padding: '20px', color: '#666', backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: '10px', marginBottom: '20px' }}>
                <h3>⏳ Initializing Spotify Player...</h3>
                <p>Waiting for Spotify Web Playback SDK to be ready.</p>
                <p style={{ fontSize: '0.9rem', marginTop: '10px' }}>
                  ⚠️ If this takes too long, please check if your browser supports DRM (Widevine). 
                  <br/>Note: This may not work in embedded browsers or some private windows.
                </p>
              </div>
            )}

            {player.deviceId && trackUris.length > 0 && (
              <GameModeSelector 
                gameMode={gameMode}
                setGameMode={setGameMode}
                duration={player.duration}
                setGameModeDuration={setGameModeDuration}
                disabled={roundsPlayed > 0 || currentSong !== null}
              />
            )}

            {player.deviceId && (
              <PlaylistSelector 
                useDynamicPlaylist={useDynamicPlaylist}
                setUseDynamicPlaylist={setUseDynamicPlaylist}
                dynamicPlaylistId={dynamicPlaylistId}
              />
            )}

            {player.deviceId && trackUris.length > 0 && (
              <div style={{ textAlign: 'center', marginBottom: 30 }}>
                <button 
                  onClick={playRandomSong}
                  disabled={isLoading}
                  style={{
                    padding: '20px 40px',
                    fontSize: '1.3rem',
                    backgroundColor: isLoading ? '#d3d3d3' : '#B5EAD7',
                    color: isLoading ? '#888' : '#555555',
                    border: 'none',
                    borderRadius: 50,
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 8px 16px rgba(181, 234, 215, 0.4)',
                    transition: 'all 0.3s ease',
                    fontWeight: 'bold'
                  }}
                >
                  {isLoading ? '🔄 Loading...' : '🎵 Play Random Song'}
                </button>
              </div>
            )}

            {(score > 0 || totalGuesses > 0) && (
              <div style={{ textAlign: 'center', marginBottom: 30 }}>
                <button 
                  onClick={resetGame} 
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#FFDAC1',
                    color: '#555555',
                    border: 'none',
                    borderRadius: 25,
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  🔄 Reset Game
                </button>
              </div>
            )}

            {currentSong && player.isPlaying && (
              <div style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                padding: 25,
                borderRadius: 15,
                boxShadow: '0 8px 16px rgba(0,0,0,0.05)',
                border: '2px solid #B5EAD7'
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
                </div>

                <ProgressBar 
                  progress={player.progress}
                  duration={gameModeDuration}
                  onSeek={player.handleSeek}
                />

                <GameControls 
                  isPaused={player.isPaused}
                  togglePlayPause={async () => {
                    if (player.isPaused) {
                      if (gameMode === 'progressive' && player.progress >= gameModeDuration) {
                         // If we are at the end of the snippet, replay from start
                         await player.handlePlay(currentSong.uri, currentSong.id);
                         setTimeout(() => {
                           if (player.localPause) player.localPause();
                           else player.handlePause();
                         }, gameModeDuration);
                      } else {
                        player.handleResume();
                      }
                    } else {
                      player.handlePause();
                    }
                  }}
                  restartMusic={() => {
                    player.handlePlay(currentSong.uri, currentSong.id);
                    if (gameMode === 'progressive') {
                      setTimeout(() => {
                        if (player.localPause) player.localPause();
                        else player.handlePause();
                      }, gameModeDuration);
                    }
                  }}
                  skipSong={skipSong}
                  progress={player.progress}
                  gameModeDuration={gameModeDuration}
                  gameMode={gameMode}
                  currentStepIndex={currentStepIndex}
                  totalSteps={PROGRESSIVE_STEPS.length}
                  progressiveSteps={PROGRESSIVE_STEPS}
                />

                <div style={{ marginTop: 20 }}>
                  <GuessInput 
                    onGuess={checkGuess}
                    userGuess={userGuess}
                    setUserGuess={setUserGuess}
                    suggestions={suggestions}
                    showSuggestions={showSuggestions}
                    setShowSuggestions={setShowSuggestions}
                    selectSuggestion={(val) => {
                      setUserGuess(val);
                      setShowSuggestions(false);
                    }}
                    onGuessChange={(e) => {
                      setUserGuess(e.target.value);
                      generateSuggestions(e.target.value);
                    }}
                  />
                </div>
              </div>
            )}

            <ResultDisplay 
              result={guessResult}
              onPlayAgain={playAgain}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default App;
