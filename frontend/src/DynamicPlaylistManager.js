import React, { useState, useEffect, useCallback } from 'react';
import { getApiUrl } from './config';
import './DynamicPlaylistManager.css';
import { 
  Music, 
  Search, 
  Filter, 
  PlusCircle, 
  RefreshCw, 
  Trash2, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  AlertCircle, 
  Loader, 
  ListMusic,
  Shuffle
} from 'lucide-react';

// Constants
const API_BASE_URL = '/api';
const SPOTIFY_API_URL = 'https://api.spotify.com/v1';

// Utility functions
const validateToken = async (token) => {
  const response = await fetch(`${SPOTIFY_API_URL}/me`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.ok;
};

const handleApiError = async (response) => {
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
const Message = ({ message, type = 'success' }) => (
  <div className={`message-box ${type === 'error' ? 'message-error' : 'message-success'}`}>
    {type === 'error' ? <AlertCircle size={18} style={{marginRight: 8}}/> : <CheckCircle size={18} style={{marginRight: 8}}/>}
    {message}
  </div>
);

const DynamicPlaylistManager = ({ accessToken, onPlaylistCreated, onPlaylistUpdate }) => {
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [currentPlaylistId, setCurrentPlaylistId] = useState(null);
  const [playlistTracks, setPlaylistTracks] = useState([]);
  const [filters, setFilters] = useState({ genre: '', yearFrom: '', yearTo: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [availableGenres, setAvailableGenres] = useState([]);
  const [isLoadingGenres, setIsLoadingGenres] = useState(false);
  const [availableArtists, setAvailableArtists] = useState([]);
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
    } catch (error) {
      console.error('Error creating playlist:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, filters, onPlaylistCreated]);

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
    } catch (error) {
      console.error('Error adding song:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [currentPlaylistId, accessToken, filters, loadPlaylistTracks]);

  const searchSongs = useCallback(async (query) => {
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

  const addSpecificSongToPlaylist = useCallback(async (song) => {
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
    } catch (error) {
      console.error('Error adding specific song:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [currentPlaylistId, accessToken, loadPlaylistTracks]);

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

  const handleSearchFilterChange = useCallback((filterType, value) => {
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
    <div className="playlist-manager-container">
      <h3 className="playlist-manager-title">
        <Music size={28} className="icon-bounce" /> Dynamic Playlist Manager
      </h3>

      {/* Create Playlist Buttons */}
      <div className="button-container">
        <div className="button-row">
          <button
            className="btn btn-primary"
            onClick={createDynamicPlaylist}
            disabled={isLoading}
          >
            {isLoading ? <Loader className="spin" size={18} /> : <ListMusic size={18} />}
            {isLoading ? 'Creating...' : 'Create New Playlist'}
          </button>
          
          {currentPlaylistId && (
            <button
              className="btn btn-secondary"
              onClick={resetPlaylist}
            >
              <RefreshCw size={18} /> Start Fresh
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      {currentPlaylistId && (
        <div className="grouped-section">
          <h4 className="section-title"><Filter size={18} /> Song Filters</h4>
          <div className="filter-grid">
            <select
              className="form-select"
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
            <input
              className="form-input"
              type="number"
              placeholder="Year From (e.g., 1980)"
              value={filters.yearFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, yearFrom: e.target.value }))}
            />
            <input
              className="form-input"
              type="number"
              placeholder="Year To (e.g., 2000)"
              value={filters.yearTo}
              onChange={(e) => setFilters(prev => ({ ...prev, yearTo: e.target.value }))}
            />
          </div>
        </div>
      )}

      {/* Search Section */}
      {currentPlaylistId && (
        <div className="grouped-section">
          <h4 className="section-title"><Search size={18} /> Search & Add</h4>
          
          {/* Search Filters */}
          <div style={{ marginBottom: 15 }}>
            <div className="filter-grid">
              <select
                className="form-select-small"
                value={searchFilters.genre}
                onChange={(e) => handleSearchFilterChange('genre', e.target.value)}
              >
                <option value="">All Genres</option>
                {availableGenres.map((genre, index) => (
                  <option key={index} value={genre}>{genre}</option>
                ))}
              </select>
              
              <select
                className="form-select-small"
                value={searchFilters.artist}
                onChange={(e) => handleSearchFilterChange('artist', e.target.value)}
              >
                <option value="">All Artists</option>
                {availableArtists.map((artist, index) => (
                  <option key={index} value={artist}>{artist}</option>
                ))}
              </select>
              
              <button
                className="btn-clear"
                onClick={clearSearchFilters}
              >
                <Trash2 size={16} /> Clear Filters
              </button>
            </div>
          </div>
          
          <div style={{ marginBottom: 15 }}>
            <input
              className="search-input"
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
            />
            {isSearching && (
              <div className="searching-indicator">
                <Loader className="spin" size={16} /> Searching...
              </div>
            )}
            
            {/* Active Filters Indicator */}
            {(searchFilters.genre || searchFilters.artist) && (
              <div className="active-filters">
                <strong>Active Filters:</strong>
                {searchFilters.genre && <span>🎵 {searchFilters.genre}</span>}
                {searchFilters.artist && <span>🎤 {searchFilters.artist}</span>}
              </div>
            )}
          </div>
          
          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="search-results-container">
              {searchResults.map((song, index) => (
                <div
                  key={song._id || index}
                  className="search-result-item"
                  onClick={() => addSpecificSongToPlaylist(song)}
                >
                  <div style={{ fontWeight: 'bold', color: 'var(--color-text-primary)', marginBottom: 4 }}>
                    {song.title}
                  </div>
                  <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: 2 }}>
                    {song.artist}
                  </div>
                  <div style={{ color: '#888', fontSize: '0.8rem' }}>
                    {song.genre} • {song.year}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add More Songs Button */}
      {currentPlaylistId && (
        <div className="button-container">
          <button
            className="btn btn-add"
            onClick={addRandomSongFromDatabase}
            disabled={isLoading}
          >
            {isLoading ? <Loader className="spin" size={18} /> : <Shuffle size={18} />}
            {isLoading ? 'Adding...' : 'Add Random Song'}
          </button>
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
          <div className="playlist-header" onClick={() => setShowPlaylistTracks(!showPlaylistTracks)}>
            <h4 style={{ margin: 0, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ListMusic size={18} /> Playlist Tracks ({playlistTracks.length})
            </h4>
            <button className="btn-toggle">
              {showPlaylistTracks ? <><EyeOff size={14} style={{marginRight: 5}} /> Hide</> : <><Eye size={14} style={{marginRight: 5}} /> Show</>}
            </button>
          </div>
          
          {showPlaylistTracks && (
            <div className="tracks-container">
              {playlistTracks.map((track, index) => (
                <div key={track.id} className="track-item">
                  <div className="track-item-title">
                    {index + 1}. {track.title}
                  </div>
                  <div className="track-item-artist">
                    {track.artist} • {track.album}
                  </div>
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
