import React, { useState, useEffect, useCallback } from 'react';


// Constants
const API_BASE_URL = '/api';
const SPOTIFY_API_URL = 'https://api.spotify.com/v1';

// Styles
const styles = {
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 25,
    borderRadius: 15,
    marginBottom: 20,
    boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
    border: '2px solid #1DB954'
  },
  title: {
    textAlign: 'center',
    margin: '0 0 20px 0',
    color: '#333'
  },
  buttonContainer: {
    textAlign: 'center',
    marginBottom: 20
  },
  buttonRow: {
    display: 'flex',
    gap: 15,
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  primaryButton: {
    padding: '15px 30px',
    fontSize: '1.1rem',
    backgroundColor: '#1DB954',
    color: 'white',
    border: 'none',
    borderRadius: 25,
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'all 0.3s ease'
  },
  secondaryButton: {
    padding: '15px 30px',
    fontSize: '1.1rem',
    backgroundColor: '#ffc107',
    color: 'black',
    border: 'none',
    borderRadius: 25,
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'all 0.3s ease'
  },
  disabledButton: {
    backgroundColor: '#6c757d',
    cursor: 'not-allowed'
  },
  sectionTitle: {
    margin: '0 0 15px 0',
    color: '#333'
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 15
  },
  select: {
    padding: '10px 15px',
    border: '2px solid #ddd',
    borderRadius: 10,
    fontSize: '1rem',
    backgroundColor: 'white',
    cursor: 'pointer'
  },
  input: {
    padding: '10px 15px',
    border: '2px solid #ddd',
    borderRadius: 10,
    fontSize: '1rem'
  },
  searchInput: {
    width: '100%',
    padding: '12px 15px',
    border: '2px solid #ddd',
    borderRadius: 10,
    fontSize: '1rem',
    marginBottom: 10
  },
  smallSelect: {
    padding: '8px 12px',
    border: '2px solid #ddd',
    borderRadius: 8,
    fontSize: '0.9rem',
    backgroundColor: 'white',
    cursor: 'pointer'
  },
  clearButton: {
    padding: '8px 12px',
    border: '2px solid #ddd',
    borderRadius: 8,
    fontSize: '0.9rem',
    backgroundColor: '#f8f9fa',
    color: '#666',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  addButton: {
    padding: '12px 25px',
    fontSize: '1rem',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: 20,
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'all 0.3s ease'
  },
  message: {
    padding: 15,
    marginBottom: 20,
    borderRadius: 10,
    textAlign: 'center',
    fontWeight: 'bold'
  },
  successMessage: {
    backgroundColor: 'rgba(40, 167, 69, 0.1)',
    border: '2px solid #28a745',
    color: '#28a745'
  },
  errorMessage: {
    backgroundColor: 'rgba(220, 53, 69, 0.1)',
    border: '2px solid #dc3545',
    color: '#dc3545'
  },
  playlistHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    cursor: 'pointer'
  },
  toggleButton: {
    padding: '8px 12px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 'bold',
    transition: 'all 0.2s ease'
  },
  tracksContainer: {
    maxHeight: 300,
    overflowY: 'auto',
    border: '1px solid #ddd',
    borderRadius: 8,
    padding: 10,
    backgroundColor: 'rgba(248, 249, 250, 0.8)'
  },
  trackItem: {
    padding: 10,
    marginBottom: 5,
    backgroundColor: 'rgba(29, 185, 84, 0.1)',
    borderRadius: 8,
    border: '1px solid #1DB954',
    transition: 'all 0.2s ease'
  },
  searchResultsContainer: {
    maxHeight: 300,
    overflowY: 'auto',
    border: '1px solid #ddd',
    borderRadius: 10
  },
  searchResultItem: {
    padding: 12,
    borderBottom: '1px solid #eee',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  activeFilters: {
    padding: '8px 12px',
    backgroundColor: '#e3f2fd',
    border: '1px solid #2196f3',
    borderRadius: 8,
    marginBottom: 10,
    fontSize: '0.9rem',
    color: '#1976d2'
  }
};

// Utility functions
const validateToken = async (token) => {
  const response = await fetch(`${SPOTIFY_API_URL}/me`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.ok;
};

const handleApiError = async (response) => {
  let errorData;
  try {
    errorData = await response.json();
  } catch (e) {
    const text = await response.text();
    throw new Error(`Server error: ${response.status} - ${text}`);
  }
  throw new Error(errorData.error || 'API request failed');
};

// Reusable components
const Button = ({ children, onClick, disabled, style, ...props }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      ...style,
      ...(disabled && styles.disabledButton)
    }}
    {...props}
  >
    {children}
  </button>
);

const Message = ({ message, type = 'success' }) => (
  <div style={{
    ...styles.message,
    ...(type === 'error' ? styles.errorMessage : styles.successMessage)
  }}>
    {message}
  </div>
);

const DynamicPlaylistManager = ({ accessToken, onPlaylistCreated }) => {
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

      const response = await fetch(`${API_BASE_URL}/create-playlist-with-song`, {
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
      setMessage('✅ Playlist created successfully!');
      
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
      const response = await fetch(`${API_BASE_URL}/add-random-song-to-playlist`, {
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
      setMessage('✅ Song has been added to playlist!');
      loadPlaylistTracks();
    } catch (error) {
      console.error('Error adding song:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [currentPlaylistId, accessToken, filters, loadPlaylistTracks]);

  const loadPlaylistTracks = useCallback(async () => {
    if (!currentPlaylistId || !accessToken) return;

    try {
      const response = await fetch(`${API_BASE_URL}/playlist-tracks/${currentPlaylistId}`, {
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

      const response = await fetch(`${API_BASE_URL}/search?${params.toString()}`);
      
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
      const response = await fetch(`${API_BASE_URL}/add-specific-song-to-playlist`, {
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
      setMessage('✅ Song has been added to playlist!');
      setSearchQuery('');
      setSearchResults([]);
      loadPlaylistTracks();
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
      const response = await fetch(`${API_BASE_URL}/music/genres`);
      
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
      const response = await fetch(`${API_BASE_URL}/music/artists`);
      
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
    <div style={styles.container}>
      <h3 style={styles.title}>🎵 Dynamic Playlist Manager</h3>

      {/* Create Playlist Buttons */}
      <div style={styles.buttonContainer}>
        <div style={styles.buttonRow}>
          <Button
            onClick={createDynamicPlaylist}
            disabled={isLoading}
            style={styles.primaryButton}
          >
            {isLoading ? '🔄 Creating...' : '🎲 Create New Playlist'}
          </Button>
          
          {currentPlaylistId && (
            <Button
              onClick={resetPlaylist}
              style={styles.secondaryButton}
            >
              🆕 Start Fresh
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      {currentPlaylistId && (
        <div style={{ marginBottom: 20 }}>
          <h4 style={styles.sectionTitle}>🎯 Song Filters</h4>
          <div style={styles.filterGrid}>
            <select
              value={filters.genre}
              onChange={(e) => setFilters(prev => ({ ...prev, genre: e.target.value }))}
              style={styles.select}
            >
              <option value="">🎵 Select Genre (All Genres)</option>
              {isLoadingGenres ? (
                <option disabled>🔄 Loading genres...</option>
              ) : (
                availableGenres.map((genre, index) => (
                  <option key={index} value={genre}>{genre}</option>
                ))
              )}
            </select>
            <input
              type="number"
              placeholder="Year From (e.g., 1980)"
              value={filters.yearFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, yearFrom: e.target.value }))}
              style={styles.input}
            />
            <input
              type="number"
              placeholder="Year To (e.g., 2000)"
              value={filters.yearTo}
              onChange={(e) => setFilters(prev => ({ ...prev, yearTo: e.target.value }))}
              style={styles.input}
            />
          </div>
        </div>
      )}

      {/* Search Section */}
      {currentPlaylistId && (
        <div style={{ marginBottom: 20 }}>
          <h4 style={styles.sectionTitle}>🔍 Search & Add Specific Songs</h4>
          
          {/* Search Filters */}
          <div style={{ marginBottom: 15 }}>
            <div style={styles.filterGrid}>
              <select
                value={searchFilters.genre}
                onChange={(e) => handleSearchFilterChange('genre', e.target.value)}
                style={styles.smallSelect}
              >
                <option value="">🎵 All Genres</option>
                {isLoadingGenres ? (
                  <option disabled>🔄 Loading...</option>
                ) : (
                  availableGenres.map((genre, index) => (
                    <option key={index} value={genre}>{genre}</option>
                  ))
                )}
              </select>
              
              <select
                value={searchFilters.artist}
                onChange={(e) => handleSearchFilterChange('artist', e.target.value)}
                style={styles.smallSelect}
              >
                <option value="">🎤 All Artists</option>
                {isLoadingArtists ? (
                  <option disabled>🔄 Loading...</option>
                ) : (
                  availableArtists.map((artist, index) => (
                    <option key={index} value={artist}>{artist}</option>
                  ))
                )}
              </select>
              
              <Button
                onClick={clearSearchFilters}
                style={styles.clearButton}
                onMouseOver={(e) => e.target.style.backgroundColor = '#e9ecef'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#f8f9fa'}
              >
                🗑️ Clear Filters
              </Button>
            </div>
          </div>
          
          <div style={{ marginBottom: 15 }}>
            <input
              type="text"
              placeholder="Search for songs by title, artist, or genre..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value.trim()) {
                  searchSongs(e.target.value);
                } else {
                  setSearchResults([]);
                }
              }}
              style={styles.searchInput}
            />
            {isSearching && (
              <div style={{ textAlign: 'center', color: '#666', fontSize: '0.9rem' }}>
                🔍 Searching...
              </div>
            )}
            
            {/* Active Filters Indicator */}
            {(searchFilters.genre || searchFilters.artist) && (
              <div style={styles.activeFilters}>
                <strong>Active Filters:</strong>
                {searchFilters.genre && <span style={{ marginLeft: 8 }}>🎵 {searchFilters.genre}</span>}
                {searchFilters.artist && <span style={{ marginLeft: 8 }}>🎤 {searchFilters.artist}</span>}
              </div>
            )}
          </div>
          
          {/* Search Results */}
          {searchResults.length > 0 && (
            <div style={styles.searchResultsContainer}>
              {searchResults.map((song, index) => (
                <div
                  key={song._id || index}
                  style={{
                    ...styles.searchResultItem,
                    borderBottom: index < searchResults.length - 1 ? '1px solid #eee' : 'none'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  onClick={() => addSpecificSongToPlaylist(song)}
                >
                  <div style={{ fontWeight: 'bold', color: '#333', marginBottom: 4 }}>
                    {song.title}
                  </div>
                  <div style={{ color: '#666', fontSize: '0.9rem', marginBottom: 2 }}>
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
        <div style={styles.buttonContainer}>
          <Button
            onClick={addRandomSongFromDatabase}
            disabled={isLoading}
            style={styles.addButton}
          >
            {isLoading ? '🔄 Adding...' : '➕ Add More Songs to Playlist'}
          </Button>
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
          <div style={styles.playlistHeader} onClick={() => setShowPlaylistTracks(!showPlaylistTracks)}>
            <h4 style={{ margin: 0, color: '#333' }}>
              📋 Playlist Tracks ({playlistTracks.length})
            </h4>
            <Button
              style={styles.toggleButton}
              onMouseOver={(e) => e.target.style.backgroundColor = '#0056b3'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#007bff'}
            >
              {showPlaylistTracks ? '👁️ Hide Tracks' : '👁️ Show Tracks'}
            </Button>
          </div>
          
          {showPlaylistTracks && (
            <div style={styles.tracksContainer}>
              {playlistTracks.map((track, index) => (
                <div
                  key={track.id}
                  style={styles.trackItem}
                  onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(29, 185, 84, 0.2)'}
                  onMouseOut={(e) => e.target.style.backgroundColor = 'rgba(29, 185, 84, 0.1)'}
                >
                  <div style={{ fontWeight: 'bold', color: '#333' }}>
                    {index + 1}. {track.title}
                  </div>
                  <div style={{ color: '#666', fontSize: '0.9rem' }}>
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