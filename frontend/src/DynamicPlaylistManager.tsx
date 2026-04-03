import React, { useState, useEffect, useCallback } from 'react';
import { getApiUrl } from './config';
import { 
  Music, 
  Search, 
  Filter, 
  ListMusic,
  Shuffle,
  RefreshCw, 
  Trash2, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  AlertCircle, 
  Loader 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// Constants
const API_BASE_URL = '/api';
const SPOTIFY_API_URL = 'https://api.spotify.com/v1';

// Utility functions
const validateToken = async (token: string) => {
  const response = await fetch(`${SPOTIFY_API_URL}/me`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.ok;
};

const handleApiError = async (response: Response) => {
  let errorMessage;
  try {
    const errorData = await response.json();
    errorMessage = errorData.error || 'API request failed';
  } catch (e) {
    try {
      const text = await response.text();
      errorMessage = `Server error: ${response.status} - ${text}`;
    } catch (textError) {
      errorMessage = `Server error: ${response.status}`;
    }
  }
  throw new Error(errorMessage);
};

// Reusable components
const Message = ({ message, type = 'success' }: { message: string, type?: 'success' | 'error' }) => (
  <div className={cn(
    "p-4 mb-5 rounded-[15px] text-center font-semibold animate-in slide-in-from-top-2 fade-in duration-300",
    type === 'error' 
      ? "bg-[var(--color-state-active)] text-[#7A2E2E] border border-[#FF9AA2]/50" 
      : "bg-[var(--color-primary-mint)] text-[#2E5C48] border border-[#B5EAD7]/50"
  )}>
    <div className="flex items-center justify-center gap-2">
      {type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
      {message}
    </div>
  </div>
);

interface DynamicPlaylistManagerProps {
  accessToken: string;
  onPlaylistCreated?: (id: string) => void;
  onPlaylistUpdate?: () => void;
}

const DynamicPlaylistManager: React.FC<DynamicPlaylistManagerProps> = ({ accessToken, onPlaylistCreated, onPlaylistUpdate }) => {
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [currentPlaylistId, setCurrentPlaylistId] = useState<string | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<any[]>([]);
  const [filters, setFilters] = useState({ genre: '', yearFrom: '', yearTo: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);
  const [isLoadingGenres, setIsLoadingGenres] = useState(false);
  const [availableArtists, setAvailableArtists] = useState<string[]>([]);
  const [isLoadingArtists, setIsLoadingArtists] = useState(false);
  const [searchFilters, setSearchFilters] = useState({ genre: '', artist: '' });
  const [showPlaylistTracks, setShowPlaylistTracks] = useState(false);

  // API functions
  const loadPlaylistTracks = useCallback(async () => {
    if (!currentPlaylistId || !accessToken) return;

    try {
      const response = await fetch(getApiUrl(`/api/playlist-tracks/${currentPlaylistId}`), {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      if (response.ok) {
        const { tracks } = await response.json();
        setPlaylistTracks(tracks);
      }
    } catch (error) {
      console.error('Error loading playlist tracks:', error);
    }
  }, [currentPlaylistId, accessToken]);

  const createDynamicPlaylist = useCallback(async () => {
    if (!accessToken) {
      setMessage('Please connect to Spotify first');
      return;
    }

    try {
      const isValid = await validateToken(accessToken);
      if (!isValid) {
        setMessage('Spotify token is invalid or expired. Please reconnect to Spotify.');
        return;
      }

      setIsLoading(true);
      setMessage('Creating playlist with random song from database...');

      const requestBody = {
        genre: filters.genre || null,
        yearFrom: filters.yearFrom || null,
        yearTo: filters.yearTo || null,
        playlistName: 'Dynamic Music Game Playlist'
      };

      const response = await fetch(getApiUrl('/api/create-dynamic-playlist'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        await handleApiError(response);
      }

      const result = await response.json();
      setCurrentPlaylistId(result.playlist.id);
      setMessage('Playlist created successfully!');
      
      if (onPlaylistCreated) {
        onPlaylistCreated(result.playlist.id);
      }

      loadPlaylistTracks();
    } catch (error: any) {
      console.error('Error creating playlist:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, filters, onPlaylistCreated, loadPlaylistTracks]);

  const addRandomSongFromDatabase = useCallback(async () => {
    if (!currentPlaylistId) {
      setMessage('Please create a playlist first');
      return;
    }

    setIsLoading(true);
    setMessage('Adding random song from database...');

    try {
      const response = await fetch(getApiUrl('/api/add-random-song-to-playlist'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          playlistId: currentPlaylistId,
          genre: filters.genre || null,
          yearFrom: filters.yearFrom || null,
          yearTo: filters.yearTo || null
        })
      });

      if (!response.ok) {
        await handleApiError(response);
      }

      await response.json();
      setMessage('Song has been added to playlist!');
      loadPlaylistTracks();
      if (onPlaylistUpdate) onPlaylistUpdate();
    } catch (error: any) {
      console.error('Error adding song:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [currentPlaylistId, accessToken, filters, loadPlaylistTracks, onPlaylistUpdate]);

  const searchSongs = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const params = new URLSearchParams();
      params.append('q', query);
      params.append('limit', '10');
      
      if (searchFilters.genre) params.append('genre', searchFilters.genre);
      if (searchFilters.artist) params.append('artist', searchFilters.artist);

      const response = await fetch(getApiUrl(`/api/search?${params.toString()}`));
      
      if (!response.ok) {
        throw new Error('Search failed');
      }

      const results = await response.json();
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchFilters]);

  const removeTrack = useCallback(async (trackUri: string) => {
    if (!accessToken || !currentPlaylistId) return;

    if (!window.confirm('Are you sure you want to remove this track?')) return;

    try {
      const response = await fetch(`${SPOTIFY_API_URL}/playlists/${currentPlaylistId}/tracks`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tracks: [{ uri: trackUri }]
        })
      });

      if (response.ok) {
        setMessage('Track removed successfully');
        loadPlaylistTracks();
        if (onPlaylistUpdate) onPlaylistUpdate();
      } else {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to remove track');
      }
    } catch (error: any) {
      console.error('Error removing track:', error);
      setMessage(`Error: ${error.message}`);
    }
  }, [accessToken, currentPlaylistId, loadPlaylistTracks, onPlaylistUpdate]);

  const addSpecificSongToPlaylist = useCallback(async (song: any) => {
    if (!currentPlaylistId || !accessToken) {
      setMessage('Please create a playlist first');
      return;
    }

    setIsLoading(true);
    setMessage(`Adding "${song.title}" by ${song.artist}...`);

    try {
      const response = await fetch(getApiUrl('/api/add-specific-song-to-playlist'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ playlistId: currentPlaylistId, song })
      });

      if (!response.ok) {
        await handleApiError(response);
      }

      await response.json();
      setMessage('Song has been added to playlist!');
      setSearchQuery('');
      setSearchResults([]);
      loadPlaylistTracks();
      if (onPlaylistUpdate) onPlaylistUpdate();
    } catch (error: any) {
      console.error('Error adding specific song:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [currentPlaylistId, accessToken, loadPlaylistTracks, onPlaylistUpdate]);

  const loadAvailableGenres = useCallback(async () => {
    setIsLoadingGenres(true);
    try {
      const response = await fetch(getApiUrl('/api/music/genres'));
      
      if (!response.ok) {
        throw new Error('Failed to load genres');
      }

      const data = await response.json();
      const genres = data.genres || data;
      
      if (Array.isArray(genres)) {
        setAvailableGenres(genres);
      } else {
        console.error('Genres response is not an array:', genres);
        setAvailableGenres([]);
        setMessage('Error: Invalid genres data received');
      }
    } catch (error) {
      console.error('Error loading genres:', error);
      setAvailableGenres([]);
      setMessage('Error loading genres from database');
    } finally {
      setIsLoadingGenres(false);
    }
  }, []);

  const loadAvailableArtists = useCallback(async () => {
    setIsLoadingArtists(true);
    try {
      const response = await fetch(getApiUrl('/api/music/artists'));
      
      if (!response.ok) {
        throw new Error('Failed to load artists');
      }

      const data = await response.json();
      const artists = data.artists || data;
      
      if (Array.isArray(artists)) {
        setAvailableArtists(artists);
      } else {
        console.error('Artists response is not an array:', artists);
        setAvailableArtists([]);
        setMessage('Error: Invalid artists data received');
      }
    } catch (error) {
      console.error('Error loading artists:', error);
      setAvailableArtists([]);
      setMessage('Error loading artists from database');
    } finally {
      setIsLoadingArtists(false);
    }
  }, []);

  const handleSearchFilterChange = useCallback((filterType: string, value: string) => {
    setSearchFilters(prev => ({ ...prev, [filterType]: value }));
    if (searchQuery.trim()) {
      searchSongs(searchQuery);
    }
  }, [searchQuery, searchSongs]);

  const clearSearchFilters = useCallback(() => {
    setSearchFilters({ genre: '', artist: '' });
    if (searchQuery.trim()) {
      searchSongs(searchQuery);
    }
  }, [searchQuery, searchSongs]);

  const resetPlaylist = useCallback(() => {
    setCurrentPlaylistId(null);
    setPlaylistTracks([]);
    setMessage('Ready to create a new playlist');
  }, []);

  // Effects
  useEffect(() => {
    if (currentPlaylistId) {
      loadPlaylistTracks();
    }
  }, [currentPlaylistId, loadPlaylistTracks]);

  useEffect(() => {
    loadAvailableGenres();
    loadAvailableArtists();
  }, [loadAvailableGenres, loadAvailableArtists]);

  return (
    <div className="bg-white/65 backdrop-blur-[var(--glass-blur)] p-8 rounded-[var(--radius-card)] mb-8 shadow-[var(--shadow-soft)] border border-white/40 max-md:p-5 max-md:mx-2">
      <h3 className="text-center mb-6 text-[var(--color-text-primary)] font-[var(--font-headers)] text-3xl flex items-center justify-center gap-2.5 max-md:text-2xl max-md:flex-col">
        <Music size={28} className="animate-bounce" /> Dynamic Playlist Manager
      </h3>

      {/* Create Playlist Buttons */}
      <div className="text-center mb-6">
        <div className="flex gap-4 justify-center flex-wrap max-md:flex-col max-md:gap-2.5">
          <Button
            onClick={createDynamicPlaylist}
            disabled={isLoading}
            variant="mint"
            className="w-auto max-md:w-full font-bold"
          >
            {isLoading ? <Loader className="animate-spin mr-2" size={18} /> : <ListMusic size={18} className="mr-2" />}
            {isLoading ? 'Creating...' : 'Create New Playlist'}
          </Button>
          
          {currentPlaylistId && (
            <Button
              onClick={resetPlaylist}
              variant="peach"
              className="w-auto max-md:w-full font-bold"
            >
              <RefreshCw size={18} className="mr-2" /> Start Fresh
            </Button>
          )}
        </div>
      </div>

      {/* Search Section */}
      {currentPlaylistId && (
        <div className="bg-white/40 border-2 border-white/50 rounded-[25px] p-6 mb-8 shadow-inner hover:bg-white/55 hover:border-[var(--color-accent-lavender)] transition-all max-md:p-4">
          <h4 className="flex items-center gap-2.5 text-[var(--color-text-primary)] text-xl font-bold mb-5 border-b-2 border-white/50 pb-2.5 w-fit max-md:text-lg max-md:whitespace-normal">
            <Search size={18} /> Search & Add
          </h4>
          
          {/* Search Filters */}
          <div className="mb-4">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4 max-md:grid-cols-1 max-md:gap-2.5">
              <select
                className="p-3 border-2 border-transparent rounded-2xl text-[0.95rem] bg-white/80 text-[var(--color-text-primary)] transition-all outline-none shadow-sm w-full focus:border-[var(--color-accent-lavender)] focus:bg-white focus:shadow-md"
                value={searchFilters.genre}
                onChange={(e) => handleSearchFilterChange('genre', e.target.value)}
              >
                <option value="">All Genres</option>
                {availableGenres.map((genre, index) => (
                  <option key={index} value={genre}>{genre}</option>
                ))}
              </select>
              
              <select
                className="p-3 border-2 border-transparent rounded-2xl text-[0.95rem] bg-white/80 text-[var(--color-text-primary)] transition-all outline-none shadow-sm w-full focus:border-[var(--color-accent-lavender)] focus:bg-white focus:shadow-md"
                value={searchFilters.artist}
                onChange={(e) => handleSearchFilterChange('artist', e.target.value)}
              >
                <option value="">All Artists</option>
                {availableArtists.map((artist, index) => (
                  <option key={index} value={artist}>{artist}</option>
                ))}
              </select>
              
              <Button
                variant="ghost"
                onClick={clearSearchFilters}
                className="bg-white/50 text-[var(--color-text-secondary)] hover:bg-[var(--color-state-error)] hover:text-white max-md:w-full max-md:mt-1"
              >
                <Trash2 size={16} className="mr-2" /> Clear Filters
              </Button>
            </div>
          </div>
          
          <div className="mb-4">
            <Input
              type="text"
              placeholder="Search by title, artist..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value.trim()) {
                  searchSongs(e.target.value);
                } else {
                  setSearchResults([]);
                }
              }}
              className="p-3 rounded-2xl text-[0.95rem] bg-white/80 border-2 border-transparent focus-visible:ring-0 focus-visible:border-[var(--color-accent-lavender)] mb-2.5 shadow-sm"
            />
            {isSearching && (
              <div className="text-center text-[var(--color-text-secondary)] text-sm mt-2.5 flex items-center justify-center gap-2">
                <Loader className="animate-spin" size={16} /> Searching...
              </div>
            )}
            
            {/* Active Filters Indicator */}
            {(searchFilters.genre || searchFilters.artist) && (
              <div className="px-4 py-2.5 bg-[var(--color-accent-lime)] rounded-2xl mb-4 text-sm text-[var(--color-text-primary)] flex items-center gap-2.5 flex-wrap">
                <strong>Active Filters:</strong>
                {searchFilters.genre && <span>🎵 {searchFilters.genre}</span>}
                {searchFilters.artist && <span>🎤 {searchFilters.artist}</span>}
              </div>
            )}
          </div>
          
          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="max-h-[300px] overflow-y-auto bg-white/40 rounded-2xl p-2.5 border border-white/50 scrollbar-thin scrollbar-thumb-[var(--color-accent-lavender)] scrollbar-track-transparent">
              {searchResults.map((song, index) => (
                <div
                  key={song._id || index}
                  className="p-3 mb-2 bg-white/70 rounded-2xl transition-all cursor-pointer border border-transparent flex flex-col md:flex-row md:items-center justify-between gap-2 hover:bg-white hover:translate-x-1 hover:border-[var(--color-accent-lavender)] hover:shadow-sm"
                  onClick={() => addSpecificSongToPlaylist(song)}
                >
                  <div>
                    <div className="font-bold text-[var(--color-text-primary)] mb-1">
                      {song.title}
                    </div>
                    <div className="text-[var(--color-text-secondary)] text-sm mb-0.5">
                      {song.artist}
                    </div>
                    <div className="text-[#888] text-xs">
                      {song.genre} • {song.year}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      {currentPlaylistId && (
        <div className="bg-white/40 border-2 border-white/50 rounded-[25px] p-6 mb-8 shadow-inner hover:bg-white/55 hover:border-[var(--color-accent-lavender)] transition-all max-md:p-4">
          <h4 className="flex items-center gap-2.5 text-[var(--color-text-primary)] text-xl font-bold mb-5 border-b-2 border-white/50 pb-2.5 w-fit max-md:text-lg max-md:whitespace-normal">
            <Filter size={18} /> Song Filters (Random Add)
          </h4>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4 mb-5 max-md:grid-cols-1">
            <select
              className="p-3 border-2 border-transparent rounded-2xl text-[0.95rem] bg-white/80 text-[var(--color-text-primary)] transition-all outline-none shadow-sm w-full focus:border-[var(--color-accent-lavender)] focus:bg-white focus:shadow-md"
              value={filters.genre}
              onChange={(e) => setFilters(prev => ({ ...prev, genre: e.target.value }))}
            >
              <option value="">Select Genre (All)</option>
              {isLoadingGenres ? (
                <option disabled>Loading...</option>
              ) : (
                availableGenres.map((genre, index) => (
                  <option key={index} value={genre}>{genre}</option>
                ))
              )}
            </select>
            <Input
              type="number"
              placeholder="Year From (e.g., 1980)"
              value={filters.yearFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, yearFrom: e.target.value }))}
              className="p-3 rounded-2xl text-[0.95rem] bg-white/80 border-2 border-transparent focus-visible:ring-0 focus-visible:border-[var(--color-accent-lavender)] shadow-sm h-auto"
            />
            <Input
              type="number"
              placeholder="Year To (e.g., 2000)"
              value={filters.yearTo}
              onChange={(e) => setFilters(prev => ({ ...prev, yearTo: e.target.value }))}
              className="p-3 rounded-2xl text-[0.95rem] bg-white/80 border-2 border-transparent focus-visible:ring-0 focus-visible:border-[var(--color-accent-lavender)] shadow-sm h-auto"
            />
          </div>

          {/* Add More Songs Button */}
          <div className="text-center mb-0">
            <Button
              variant="lavender"
              onClick={addRandomSongFromDatabase}
              disabled={isLoading}
              className="w-auto max-md:w-full font-bold"
            >
              {isLoading ? <Loader className="animate-spin mr-2" size={18} /> : <Shuffle size={18} className="mr-2" />}
              {isLoading ? 'Adding...' : 'Add Random Song (Filtered)'}
            </Button>
          </div>
        </div>
      )}

      {/* Message Display */}
      {message && (
        <Message 
          message={message} 
          type={message.includes('Error') ? 'error' : 'success'} 
        />
      )}

      {/* Playlist Tracks Display */}
      {playlistTracks.length > 0 && (
        <div>
          <div 
            className="flex justify-between items-center mb-4 cursor-pointer p-2.5 rounded-2xl hover:bg-white/30 transition-colors max-md:flex-col max-md:items-start max-md:gap-2.5" 
            onClick={() => setShowPlaylistTracks(!showPlaylistTracks)}
          >
            <h4 className="m-0 text-[var(--color-text-primary)] flex items-center gap-2 font-bold">
              <ListMusic size={18} /> Playlist Tracks ({playlistTracks.length})
            </h4>
            <Button variant="ghost" size="sm" className="bg-[var(--color-accent-lavender)] text-[var(--color-text-primary)] rounded-full max-md:w-full">
              {showPlaylistTracks ? <><EyeOff size={14} className="mr-1.5" /> Hide</> : <><Eye size={14} className="mr-1.5" /> Show</>}
            </Button>
          </div>
          
          {showPlaylistTracks && (
            <div className="max-h-[300px] overflow-y-auto bg-white/40 rounded-2xl p-2.5 border border-white/50 scrollbar-thin scrollbar-thumb-[var(--color-accent-lavender)] scrollbar-track-transparent">
              {playlistTracks.map((track, index) => (
                <div key={track.id} className="p-3 mb-2 bg-white/70 rounded-2xl transition-all cursor-default border border-transparent flex items-center justify-between hover:bg-white hover:translate-x-1 hover:border-[var(--color-accent-lavender)] hover:shadow-sm relative max-md:flex-col max-md:items-start max-md:gap-2 max-md:pr-12">
                  <div className="flex-1">
                    <div className="font-bold text-[var(--color-text-primary)] text-[0.95rem] max-md:text-[0.9rem] max-md:leading-snug">
                      {index + 1}. {track.title}
                    </div>
                    <div className="text-[var(--color-text-secondary)] text-[0.85rem] mt-0.5">
                      {track.artist} • {track.album}
                    </div>
                  </div>
                  <button 
                    className="bg-transparent text-[var(--color-text-secondary)] border-none cursor-pointer p-2 rounded-full transition-all flex items-center justify-center hover:bg-[var(--color-state-error)] hover:text-white hover:scale-110 max-md:absolute max-md:top-1/2 max-md:right-2.5 max-md:-translate-y-1/2 max-md:p-2.5 max-md:bg-white/50"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTrack(track.uri);
                    }}
                    title="Remove track"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DynamicPlaylistManager;
