import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, WelcomeScreen } from '@auth';
import { useSpotifyPlayerContext, DynamicPlaylistManager, SPOTIFY_CONFIG, getPlaylistTracks } from '@music';
import { GameModeSelector, PlaylistSelector } from '@game';
import { getApiUrl } from '@/config';
import { PlayCircle, LogOut, Loader, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';

// TEST_MODE: Set to true to bypass Spotify SDK requirements for UI testing
const TEST_MODE = false;

const SetupPage: React.FC = () => {
  const navigate = useNavigate();
  const { accessToken, authLoading, logout, rememberMe } = useAuth();
  const player = useSpotifyPlayerContext();

  // Game setup state
  const [gameMode, setGameMode] = useState('normal');
  const [gameModeDuration, setGameModeDuration] = useState(30000);
  const [trackUris, setTrackUris] = useState<string[]>([]);
  const [allSongTitles, setAllSongTitles] = useState<string[]>([]);
  const [dynamicPlaylistId, setDynamicPlaylistId] = useState<string | null>(null);
  const [useDynamicPlaylist, setUseDynamicPlaylist] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // For testing: use mock data if TEST_MODE is enabled
  // Use isDeviceReady to ensure device is fully registered with Spotify API
  const hasPlayer = TEST_MODE || player.isDeviceReady;
  const isInitializing = !TEST_MODE && player.deviceId && !player.isDeviceReady;
  const hasTracks = TEST_MODE || trackUris.length > 0;

  // Cleanup dynamic playlist helper
  const cleanupDynamicPlaylist = useCallback(async (playlistId: string, token: string) => {
    if (!playlistId || !token) return;
    
    console.log('Cleaning up dynamic playlist:', playlistId);
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

  // Handle orphaned playlists on mount
  useEffect(() => {
    if (accessToken) {
      const storedPlaylistId = localStorage.getItem('dynamic_playlist_id');
      if (storedPlaylistId && !dynamicPlaylistId) {
        cleanupDynamicPlaylist(storedPlaylistId, accessToken);
      }
    }
  }, [accessToken, cleanupDynamicPlaylist, dynamicPlaylistId]);

  // Fetch playlist tracks
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
          items: tracks.map((track: any) => ({ 
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
        .filter((item: any) => item && item.track && item.track.uri && (item.track.name || item.track.title))
        .map((item: any) => ({
          uri: item.track.uri,
          name: item.track.name || item.track.title,
          artist: item.track.artist || item.track.artists?.[0]?.name || 'Unknown Artist',
          album: item.track.album || item.track.album?.name || 'Unknown Album'
        }));
      
      if (validTracks.length === 0) throw new Error('No valid tracks found');
      
      setTrackUris(validTracks.map((track: any) => track.uri));
      setAllSongTitles(validTracks.map((track: any) => track.name));
      
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

  const handleLogout = async () => {
    if (dynamicPlaylistId && accessToken) {
      await cleanupDynamicPlaylist(dynamicPlaylistId, accessToken);
    }
    logout();
  };

  const handleStartGame = () => {
    // In test mode, allow navigation even without player
    if (!TEST_MODE && (!accessToken || !player.isDeviceReady || trackUris.length === 0)) return;
    
    setIsLoading(true);
    
    // Use mock data in test mode if no real tracks
    const mockTracks = ['spotify:track:test1', 'spotify:track:test2', 'spotify:track:test3'];
    const mockTitles = ['Test Song 1', 'Test Song 2', 'Test Song 3'];
    
    // Navigate to game page with all necessary state
    navigate('/game', {
      state: {
        gameMode,
        gameModeDuration,
        trackUris: trackUris.length > 0 ? trackUris : (TEST_MODE ? mockTracks : []),
        allSongTitles: allSongTitles.length > 0 ? allSongTitles : (TEST_MODE ? mockTitles : []),
        dynamicPlaylistId,
        useDynamicPlaylist
      }
    });
  };

  return (
    <div className="max-w-[900px] mx-auto my-10 p-5 font-sans">
      <div className="bg-[var(--color-bg-card)] backdrop-blur-[var(--glass-blur)] rounded-[var(--radius-card)] p-10 shadow-[var(--shadow-soft)] border border-white/30">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-extrabold m-0 bg-gradient-to-r from-[#C7CEEA] to-[#FF9AA2] bg-clip-text text-transparent shadow-sm tracking-tighter flex items-center justify-center gap-2">
            Song Guess Game <Music className="text-[#FF9AA2]" size={48} />
          </h1>
          <p className="text-[var(--color-text-secondary)] text-xl mt-2 font-semibold">
            Test your music knowledge!
          </p>
        </div>

        {!accessToken ? (
          <WelcomeScreen authLoading={authLoading} />
        ) : (
          <>
            <div className="text-center mb-8 flex items-center justify-center gap-4 text-[var(--color-text-secondary)]">
              <span>✅ Connected to Spotify {rememberMe && ' (Auto-login)'}</span>
              <Button 
                onClick={handleLogout} 
                variant="destructive"
                size="sm"
                className="font-bold"
              >
                <LogOut size={16} className="mr-2" /> Logout
              </Button>
            </div>

            {/* Dynamic Playlist Manager */}
            <DynamicPlaylistManager 
              accessToken={accessToken}
              onPlaylistCreated={(playlistId: string) => {
                if (dynamicPlaylistId) {
                  cleanupDynamicPlaylist(dynamicPlaylistId, accessToken);
                }
                
                const stored = localStorage.getItem('dynamic_playlist_id');
                if (stored && stored !== playlistId && stored !== dynamicPlaylistId) {
                  cleanupDynamicPlaylist(stored, accessToken);
                }

                setDynamicPlaylistId(playlistId);
                localStorage.setItem('dynamic_playlist_id', playlistId);
                setUseDynamicPlaylist(true);
              }}
              onPlaylistUpdate={fetchTrackUris}
            />

            {/* Player Initialization Status */}
            {!hasPlayer && !isInitializing && (
              <div className="text-center p-5 text-gray-600 bg-white/50 rounded-2xl mb-5">
                <h3 className="font-bold mb-2">⏳ Initializing Spotify Player...</h3>
                <p>Waiting for Spotify Web Playback SDK to be ready.</p>
              </div>
            )}
            
            {/* Device Registering Status */}
            {isInitializing && (
              <div className="text-center p-5 text-blue-600 bg-blue-50 rounded-2xl mb-5 border border-blue-200">
                <h3 className="font-bold mb-2">🔄 Registering device with Spotify...</h3>
                <p>Almost ready! Verifying device availability.</p>
              </div>
            )}

            {/* Test Mode Indicator */}
            {TEST_MODE && (
              <div className="text-center p-3 text-amber-700 bg-amber-100 rounded-2xl mb-5 border border-amber-300">
                <p className="font-semibold">🧪 TEST MODE ENABLED - UI visible without Spotify SDK</p>
              </div>
            )}

            {/* Game Mode Selector */}
            {hasPlayer && hasTracks && (
              <GameModeSelector 
                gameMode={gameMode}
                setGameMode={setGameMode}
                duration={player.duration}
                setGameModeDuration={setGameModeDuration}
                disabled={false}
              />
            )}

            {/* Playlist Source Selector */}
            {hasPlayer && (
              <PlaylistSelector 
                useDynamicPlaylist={useDynamicPlaylist}
                setUseDynamicPlaylist={setUseDynamicPlaylist}
                dynamicPlaylistId={dynamicPlaylistId}
              />
            )}

            {/* Play Random Song Button */}
            {hasPlayer && hasTracks && (
              <div className="text-center mt-10">
                <Button 
                  onClick={handleStartGame}
                  disabled={isLoading}
                  variant="mint"
                  size="xl"
                  className="font-extrabold text-2xl px-12 py-8 h-auto shadow-[0_10px_25px_rgba(181,234,215,0.5)] hover:shadow-[0_15px_35px_rgba(181,234,215,0.6)] hover:-translate-y-1 transition-all"
                >
                  {isLoading ? <Loader className="animate-spin mr-3" size={28} /> : <PlayCircle size={32} className="mr-3" />}
                  {isLoading ? 'Loading...' : 'Play Random Song'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SetupPage;

