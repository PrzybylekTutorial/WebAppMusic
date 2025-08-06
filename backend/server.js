// ===== BACKEND SERVER IMPORTS =====
// Import Express.js framework for creating HTTP server and API endpoints
const express = require('express');
// Import CORS middleware to allow cross-origin requests from frontend
const cors = require('cors');
// Import Node.js path module for file path operations
const path = require('path');
// Import Node.js file system module for reading/writing files
const fs = require('fs');
// Import custom Spotify configuration and utilities
const spotify = require('./spotify');

// Import MongoDB service for database operations
const mongoService = require('./mongoService');
// Import session management for user authentication state
const session = require('express-session');
// Import querystring module for parsing URL parameters
const querystring = require('querystring');
// Import fetch dynamically for making HTTP requests (ES6 module compatibility)
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// ===== HELPER FUNCTIONS =====
// Helper function to check if a track already exists in a Spotify playlist
// This prevents adding duplicate songs to the same playlist
async function checkPlaylistForDuplicate(playlistId, trackUri, token) {
  try {
    // Fetch all tracks from the playlist (up to 100 tracks)
    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`, {
      headers: { 'Authorization': `Bearer ${token}` } // Use user's access token for authentication
    });
    
    // If request was successful, check for duplicates
    if (response.ok) {
      const data = await response.json(); // Parse response JSON
      // Extract all track URIs from the playlist
      const existingUris = data.items.map(item => item.track.uri);
      // Check if the new track URI already exists in the playlist
      return existingUris.includes(trackUri);
    }
    // If request failed, assume no duplicate (safe default)
    return false;
  } catch (error) {
    // Log error and return false (safe default)
    console.error('Error checking for duplicates:', error);
    return false;
  }
}

// Helper function to find a unique random song for a playlist
// This function ensures we don't add duplicate songs to the same playlist
async function findUniqueRandomSong(playlistId, filters, token, maxAttempts = 10) {
  let attempts = 0; // Counter for tracking attempts
  
  // Try up to maxAttempts times to find a unique song
  while (attempts < maxAttempts) {
    attempts++;
    console.log(`Attempt ${attempts} to find unique song...`);
    
    // Get a random song from MongoDB database using provided filters
    const song = await mongoService.getRandomSong(filters);
    
    // If no song found with current filters, break out of loop
    if (!song) {
      console.log('No songs found with current filters');
      break;
    }
    
    // Try to find this song on Spotify
    try {
      // Search for the song on Spotify using multiple strategies
      const track = await searchSpotifyTrack(song, token);
      const trackUri = track.uri; // Extract Spotify track URI
      
      // Check if this track is already in the playlist
      const isDuplicate = await checkPlaylistForDuplicate(playlistId, trackUri, token);
      
      // If track is unique (not already in playlist), return it
      if (!isDuplicate) {
        console.log('Found unique song:', track.name, 'by', track.artists.map(a => a.name).join(', '));
        return { song, track }; // Return both database song and Spotify track
      } else {
        // If duplicate found, try another song
        console.log('Song already exists in playlist, trying another...');
      }
    } catch (error) {
      // If Spotify search failed, try another song
      console.log('Failed to find Spotify track for:', song.title);
      continue; // Continue to next attempt
    }
  }
  
  // Return null if no unique song found after all attempts
  return null;
}

// Helper function to search for a song on Spotify with multiple strategies
// This function tries different search queries to find the best match for a song from our database
async function searchSpotifyTrack(song, token) {
  // Define multiple search strategies to try in order of specificity
  const searchStrategies = [
    `${song.title} ${song.artist}`,           // Strategy 1: Full title + artist (most specific)
    `${song.title}`,                          // Strategy 2: Just title (if artist name is wrong)
    `${song.artist} ${song.title}`,           // Strategy 3: Artist + title (different order)
    song.title.replace(/\([^)]*\)/g, '').trim() + ` ${song.artist}`, // Strategy 4: Title without parentheses + artist
    song.artist.replace(/Collective|Duo|Trio|Orchestra/g, '').trim() + ` ${song.title}`, // Strategy 5: Clean artist name + title
    song.title.replace(/\([^)]*\)/g, '').trim() // Strategy 6: Just title without parentheses (least specific)
  ];
  
  // Try each search strategy until we find a good match
  for (const searchQuery of searchStrategies) {
    console.log(`Trying search: "${searchQuery}"`);
    
    // Make API request to Spotify search endpoint
    const searchResponse = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=5`, {
      headers: { 'Authorization': `Bearer ${token}` } // Use user's access token
    });
    
    // Parse the response JSON
    const searchData = await searchResponse.json();
    
    // Check if we got any results
    if (searchData.tracks && searchData.tracks.items && searchData.tracks.items.length > 0) {
      // Find the best match by comparing titles and artists
      const bestMatch = searchData.tracks.items.find(track => {
        // Normalize track data for comparison
        const trackTitle = track.name.toLowerCase();
        const trackArtist = track.artists.map(a => a.name.toLowerCase()).join(' ');
        const songTitle = song.title.toLowerCase();
        const songArtist = song.artist.toLowerCase();
        
        // Check if title and artist match reasonably well
        // Title match: check if either title contains the other (after cleaning)
        const titleMatch = trackTitle.includes(songTitle.replace(/\([^)]*\)/g, '').trim()) || 
                          songTitle.includes(trackTitle);
        // Artist match: check if either artist name contains the other (after cleaning)
        const artistMatch = trackArtist.includes(songArtist.replace(/Collective|Duo|Trio|Orchestra/g, '').trim()) ||
                           songArtist.includes(trackArtist);
        
        // Return true only if both title and artist match
        return titleMatch && artistMatch;
      });
      
      // If we found a good match, return it
      if (bestMatch) {
        console.log(`Found good match: "${bestMatch.name}" by "${bestMatch.artists.map(a => a.name).join(', ')}"`);
        return bestMatch;
      }
      
      // If no good match found, log all available results for debugging
      console.log(`No good match found for "${song.title}" by "${song.artist}". Available results:`);
      searchData.tracks.items.forEach((track, index) => {
        console.log(`  ${index + 1}. "${track.name}" by "${track.artists.map(a => a.name).join(', ')}"`);
      });
      
      // Don't return the first result if it doesn't match - continue to next strategy
      console.log(`❌ No suitable match found for "${song.title}" by "${song.artist}"`);
      continue; // Try the next search strategy
    }
  }
  
  // If no match found with any strategy, throw an error
  throw new Error(`No tracks found for "${song.title}" by "${song.artist}" with any search strategy`);
}

// ===== EXPRESS APP SETUP =====
// Create Express application instance
const app = express();
// Set port from environment variable or default to 5000
const PORT = process.env.PORT || 5000;

// ===== MIDDLEWARE CONFIGURATION =====
// Enable CORS (Cross-Origin Resource Sharing) to allow requests from frontend
app.use(cors());
// Parse JSON request bodies (for API endpoints that receive JSON data)
app.use(express.json());
// Serve static files from the 'public' directory (CSS, JS, images, etc.)
app.use('/public', express.static(path.join(__dirname, 'public')));

// ===== SESSION CONFIGURATION =====
// Configure session management for user authentication state
app.use(session({
  secret: 'your_secret_key', // Secret key for signing session cookies (should be secure in production)
  resave: false, // Don't save session if nothing changed
  saveUninitialized: true // Save new sessions even if they're empty
}));

// ===== BASIC ROUTES =====
// Basic test route to verify server is running
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// ===== SPOTIFY OAUTH CONFIGURATION =====
// OAuth redirect URI (must match exactly what's configured in Spotify app settings)
const redirect_uri = 'http://127.0.0.1:5000/auth/callback';
// Spotify app credentials (should be stored in environment variables)
const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
// Required Spotify API scopes for the application
const scope = 'streaming user-read-email user-read-private user-modify-playback-state user-read-playback-state playlist-read-private playlist-read-collaborative playlist-modify-public playlist-modify-private';

app.get('/auth/login', (req, res) => {
  const params = querystring.stringify({
    response_type: 'code',
    client_id,
    scope,
    redirect_uri
  });
  res.redirect('https://accounts.spotify.com/authorize?' + params);
});

app.get('/auth/callback', async (req, res) => {
  const code = req.query.code || null;
  if (!code) return res.status(400).send('No code provided');
  const authOptions = {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: querystring.stringify({
      code,
      redirect_uri,
      grant_type: 'authorization_code'
    })
  };
  const response = await fetch('https://accounts.spotify.com/api/token', authOptions);
  const data = await response.json();
  if (data.access_token) {
    req.session.access_token = data.access_token;
    req.session.refresh_token = data.refresh_token;
    // Redirect to frontend with token in query (for demo, you can improve this later)
    res.redirect('http://localhost:3000/?access_token=' + data.access_token);
  } else {
    res.status(400).json(data);
  }
});

// Add logout endpoint to clear session
app.get('/auth/logout', (req, res) => {
  console.log('Logout endpoint called');
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      res.status(500).json({ error: 'Failed to logout' });
    } else {
      console.log('Session destroyed successfully');
      res.redirect('http://localhost:3000');
    }
  });
});

// Test endpoint to check if server is working
app.get('/auth/test', (req, res) => {
  res.json({ message: 'Auth endpoints are working', session: req.session });
});

// Load songs data
console.log('Loading server...');
const songsPath = path.join(__dirname, 'data', 'songs.json');
let songs = [];
if (fs.existsSync(songsPath)) {
  songs = JSON.parse(fs.readFileSync(songsPath, 'utf-8'));
}



// Example: Top 50 Global playlist ID


// Music Search API endpoints
app.get('/api/music/search', async (req, res) => {
    try {
        const { q, limit = 10 } = req.query;
        
        if (!q || q.trim().length < 2) {
            return res.json({ suggestions: [] });
        }
        
        const results = await mongoService.searchSongs(q.trim(), parseInt(limit));
        const suggestions = results.map(song => ({
            title: song.title,
            artist: song.artist,
            year: song.year,
            genre: song.genre,
            popularity: song.popularity
        }));
        
        res.json({ suggestions });
    } catch (error) {
        console.error('Music search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});





app.get('/api/music/genres', async (req, res) => {
    try {
        const genres = await mongoService.getAllGenres();
        res.json({ genres });
    } catch (error) {
        console.error('Get genres error:', error);
        res.status(500).json({ error: 'Failed to get genres' });
    }
});

app.get('/api/music/artists', async (req, res) => {
    try {
        const artists = await mongoService.getAllArtists();
        res.json({ artists });
    } catch (error) {
        console.error('Get artists error:', error);
        res.status(500).json({ error: 'Failed to get artists' });
    }
});



// Search endpoint for MongoDB database
app.get('/api/search', async (req, res) => {
    try {
        const { q, limit = 10, genre, artist } = req.query;
        
        if (!q || q.trim().length === 0) {
            return res.status(400).json({ error: 'Search query is required' });
        }
        
        console.log(`Searching MongoDB for: "${q}" with filters - genre: ${genre || 'none'}, artist: ${artist || 'none'}, limit: ${limit}`);
        
        // Build filters object
        const filters = {};
        if (genre) filters.genre = genre;
        if (artist) filters.artist = artist;
        
        // Search for songs in MongoDB with filters
        const songs = await mongoService.advancedSearch({
            ...filters,
            title: q // Use the search query as title filter
        }, parseInt(limit));
        
        console.log(`Found ${songs.length} songs matching "${q}" with applied filters`);
        
        res.json(songs);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Failed to search database' });
    }
});

// New API endpoints for dynamic playlist management
app.get('/api/random-database-song', async (req, res) => {
  try {
    const { genre, yearFrom, yearTo } = req.query;
    
    // Get random song from MongoDB with optional filters
    const song = await mongoService.getRandomSong({
      genre: genre || null,
      yearFrom: yearFrom || null,
      yearTo: yearTo || null
    });
    
    if (!song) {
      return res.status(404).json({ error: 'No songs found with the specified filters' });
    }
    
    res.json({ song });
  } catch (error) {
    console.error('Random database song error:', error);
    res.status(500).json({ error: 'Failed to get random song from database' });
  }
});

app.post('/api/search-and-add-to-playlist', async (req, res) => {
  try {
    const { title, artist, playlistId } = req.body;
    
    if (!title || !artist) {
      return res.status(400).json({ error: 'Title and artist are required' });
    }
    
    // Search for the song on Spotify
    const searchQuery = `${title} ${artist}`;
    
    // Use user's access token from Authorization header
    const authHeader = req.headers.authorization;
    let token = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    } else {
      // Fallback to session token
      token = req.session.access_token;
    }
    
    if (!token) {
      return res.status(401).json({ error: 'User not authenticated with Spotify. Please log in first.' });
    }
    
    const searchResponse = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=1`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const searchData = await searchResponse.json();
    
    if (!searchData.tracks || !searchData.tracks.items || searchData.tracks.items.length === 0) {
      return res.status(404).json({ error: 'Song not found on Spotify', searchQuery });
    }
    
    const track = searchData.tracks.items[0];
    const trackUri = track.uri;
    
    // Add track to playlist
    const playlistResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uris: [trackUri]
      })
    });
    
    if (!playlistResponse.ok) {
      const errorData = await playlistResponse.json();
      return res.status(playlistResponse.status).json({ 
        error: 'Failed to add track to playlist', 
        details: errorData 
      });
    }
    
    res.json({
      success: true,
      track: {
        id: track.id,
        title: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        album: track.album.name,
        uri: track.uri,
        preview_url: track.preview_url
      },
      message: 'Track added to playlist successfully'
    });
    
  } catch (error) {
    console.error('Search and add to playlist error:', error);
    res.status(500).json({ error: 'Failed to search and add track to playlist' });
  }
});

app.post('/api/create-dynamic-playlist', async (req, res) => {
  try {
    const { name = 'Dynamic Music Game Playlist', description = 'Auto-generated playlist for music guessing game' } = req.body;
    
    // Use user's access token from Authorization header
    const authHeader = req.headers.authorization;
    let token = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    } else {
      // Fallback to session token
      token = req.session.access_token;
    }
    
    if (!token) {
      return res.status(401).json({ error: 'User not authenticated with Spotify. Please log in first.' });
    }
    
    // Get user ID first
    const userResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const userData = await userResponse.json();
    const userId = userData.id;
    
    // Create new playlist
    const createResponse = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        description,
        public: false
      })
    });
    
    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      return res.status(createResponse.status).json({ 
        error: 'Failed to create playlist', 
        details: errorData 
      });
    }
    
    const playlistData = await createResponse.json();
    
    res.json({
      success: true,
      playlist: {
        id: playlistData.id,
        name: playlistData.name,
        description: playlistData.description,
        uri: playlistData.uri
      },
      message: 'Playlist created successfully'
    });
    
  } catch (error) {
    console.error('Create playlist error:', error);
    res.status(500).json({ error: 'Failed to create playlist' });
  }
});

app.post('/api/create-playlist-with-song', async (req, res) => {
  try {
    console.log('Creating playlist with song...');
    const { genre, yearFrom, yearTo, playlistName = 'Dynamic Music Game Playlist' } = req.body;
    console.log('Filters:', { genre, yearFrom, yearTo, playlistName });
    
    // Get random song from MongoDB
    console.log('Getting random song from MongoDB...');
    const song = await mongoService.getRandomSong({
      genre: genre || null,
      yearFrom: yearFrom || null,
      yearTo: yearTo || null
    });
    
    console.log('Random song found:', song);
    
    if (!song) {
      return res.status(404).json({ error: 'No songs found with the specified filters' });
    }
    
    // Use user's access token from Authorization header
    const authHeader = req.headers.authorization;
    let token = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    } else {
      // Fallback to session token
      token = req.session.access_token;
    }
    
    console.log('Got user access token:', token ? 'Yes' : 'No');
    
    if (!token) {
      return res.status(401).json({ error: 'User not authenticated with Spotify. Please log in first.' });
    }
    
    // Search for the song on Spotify using improved search strategy
    let track;
    try {
      console.log('Searching for song on Spotify:', song.title, 'by', song.artist);
      track = await searchSpotifyTrack(song, token);
      console.log('Found track on Spotify:', track.name, 'by', track.artists.map(a => a.name).join(', '));
    } catch (error) {
      console.error('Spotify search error:', error);
      return res.status(404).json({ 
        error: 'Song not found on Spotify', 
        originalSong: song,
        searchError: error.message
      });
    }
    const trackUri = track.uri;
    
    // Get current user
    console.log('Fetching user profile from Spotify...');
    const userResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('User profile response status:', userResponse.status);
    
    if (!userResponse.ok) {
      let errorData;
      try {
        errorData = await userResponse.json();
      } catch (e) {
        errorData = { message: 'Could not parse error response' };
      }
      console.error('Error getting user profile:', errorData);
      console.error('Response status:', userResponse.status);
      console.error('Response headers:', Object.fromEntries(userResponse.headers.entries()));
      
      return res.status(userResponse.status).json({ 
        error: 'Failed to get user profile', 
        details: errorData,
        status: userResponse.status
      });
    }
    
    const userData = await userResponse.json();
    const userId = userData.id;
    console.log('User ID:', userId);
    
    // Create playlist with the song
    const createResponse = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: playlistName,
        description: `Auto-generated playlist for music guessing game - ${song.title} by ${song.artist}`,
        public: false
      })
    });
    
    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      return res.status(createResponse.status).json({ 
        error: 'Failed to create playlist', 
        details: errorData 
      });
    }
    
    const playlistData = await createResponse.json();
    const playlistId = playlistData.id;
    
    // Add the track to the playlist
    const addTrackResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uris: [trackUri]
      })
    });
    
    if (!addTrackResponse.ok) {
      const errorData = await addTrackResponse.json();
      return res.status(addTrackResponse.status).json({ 
        error: 'Failed to add track to playlist', 
        details: errorData 
      });
    }
    
    res.json({
      success: true,
      playlist: {
        id: playlistId,
        name: playlistData.name,
        description: playlistData.description,
        uri: playlistData.uri
      },
      track: {
        id: track.id,
        title: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        album: track.album.name,
        uri: track.uri,
        preview_url: track.preview_url
      },
      originalSong: song,
      message: 'Playlist created successfully with song from database'
    });
    
  } catch (error) {
    console.error('Create playlist with song error:', error);
    res.status(500).json({ error: 'Failed to create playlist with song' });
  }
});

app.get('/api/playlist-tracks/:playlistId', async (req, res) => {
  try {
    const { playlistId } = req.params;
    const { limit = 50 } = req.query;
    
    // Use user's access token from Authorization header
    const authHeader = req.headers.authorization;
    let token = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    } else {
      // Fallback to session token
      token = req.session.access_token;
    }
    
    if (!token) {
      return res.status(401).json({ error: 'User not authenticated with Spotify. Please log in first.' });
    }
    
    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=${limit}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch playlist tracks' });
    }
    
    const data = await response.json();
    
    const tracks = data.items.map(item => ({
      id: item.track.id,
      title: item.track.name,
      artist: item.track.artists.map(a => a.name).join(', '),
      album: item.track.album.name,
      uri: item.track.uri,
      preview_url: item.track.preview_url
    }));
    
    res.json({ tracks });
    
  } catch (error) {
    console.error('Get playlist tracks error:', error);
    res.status(500).json({ error: 'Failed to get playlist tracks' });
  }
});

// New endpoint to add random song from database to existing playlist
app.post('/api/add-random-song-to-playlist', async (req, res) => {
  try {
    const { playlistId, genre, yearFrom, yearTo } = req.body;
    
    if (!playlistId) {
      return res.status(400).json({ error: 'Playlist ID is required' });
    }
    
    console.log('Adding random song to existing playlist...');
    console.log('Filters:', { genre, yearFrom, yearTo });
    
    // Use user's access token from Authorization header
    const authHeader = req.headers.authorization;
    let token = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    } else {
      // Fallback to session token
      token = req.session.access_token;
    }
    
    console.log('Got user access token:', token ? 'Yes' : 'No');
    
    if (!token) {
      return res.status(401).json({ error: 'User not authenticated with Spotify. Please log in first.' });
    }
    
    // Find a unique random song for the playlist
    const filters = {
      genre: genre || null,
      yearFrom: yearFrom || null,
      yearTo: yearTo || null
    };
    
    console.log('Finding unique random song for playlist...');
    const uniqueSongData = await findUniqueRandomSong(playlistId, filters, token, 10);
    
    if (!uniqueSongData) {
      return res.status(409).json({ 
        error: 'Could not find a unique song to add. Playlist may be full or all matching songs are already in the playlist.',
        attempts: 10
      });
    }
    
    const { song, track } = uniqueSongData;
    const trackUri = track.uri;
    console.log('Found unique song:', track.name, 'by', track.artists.map(a => a.name).join(', '));
    
    // Add track to existing playlist
    const addTrackResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uris: [trackUri]
      })
    });
    
    if (!addTrackResponse.ok) {
      const errorData = await addTrackResponse.json();
      return res.status(addTrackResponse.status).json({ 
        error: 'Failed to add track to playlist', 
        details: errorData 
      });
    }
    
    res.json({
      success: true,
      track: {
        id: track.id,
        title: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        album: track.album.name,
        uri: track.uri,
        preview_url: track.preview_url
      },
      originalSong: song,
      message: 'Song added successfully to playlist'
    });
    
  } catch (error) {
    console.error('Add random song to playlist error:', error);
    res.status(500).json({ error: 'Failed to add random song to playlist' });
  }
});

// New endpoint to add a specific song from database to playlist
app.post('/api/add-specific-song-to-playlist', async (req, res) => {
  try {
    const { playlistId, song } = req.body;
    
    if (!playlistId || !song) {
      return res.status(400).json({ error: 'Playlist ID and song are required' });
    }
    
    console.log('Adding specific song to playlist:', song.title, 'by', song.artist);
    
    // Use user's access token from Authorization header
    const authHeader = req.headers.authorization;
    let token = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    } else {
      // Fallback to session token
      token = req.session.access_token;
    }
    
    console.log('Got user access token:', token ? 'Yes' : 'No');
    
    if (!token) {
      return res.status(401).json({ error: 'User not authenticated with Spotify. Please log in first.' });
    }
    
    // Search for the song on Spotify using improved search strategy
    let track;
    try {
      console.log('Searching for song on Spotify:', song.title, 'by', song.artist);
      track = await searchSpotifyTrack(song, token);
      console.log('Found track on Spotify:', track.name, 'by', track.artists.map(a => a.name).join(', '));
    } catch (error) {
      console.error('Spotify search error:', error);
      return res.status(404).json({ 
        error: 'Song not found on Spotify', 
        originalSong: song,
        searchError: error.message
      });
    }
    
    const trackUri = track.uri;
    console.log('Found Spotify track:', track.name, 'by', track.artists.map(a => a.name).join(', '));
    
    // Check if track already exists in playlist to prevent duplicates
    console.log('Checking for duplicates in playlist...');
    const isDuplicate = await checkPlaylistForDuplicate(playlistId, trackUri, token);
    
    if (isDuplicate) {
      return res.status(409).json({ 
        error: 'This song is already in the playlist',
        track: {
          id: track.id,
          title: track.name,
          artist: track.artists.map(a => a.name).join(', '),
          album: track.album.name,
          uri: track.uri
        }
      });
    }
    
    // Add track to existing playlist
    const addTrackResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uris: [trackUri]
      })
    });
    
    if (!addTrackResponse.ok) {
      const errorData = await addTrackResponse.json();
      return res.status(addTrackResponse.status).json({ 
        error: 'Failed to add track to playlist', 
        details: errorData 
      });
    }
    
    res.json({
      success: true,
      track: {
        id: track.id,
        title: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        album: track.album.name,
        uri: track.uri,
        preview_url: track.preview_url
      },
      originalSong: song,
      message: 'Song added successfully to playlist'
    });
    
  } catch (error) {
    console.error('Add specific song error:', error);
    res.status(500).json({ error: 'Failed to add track to playlist' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}).on('error', (error) => {
  console.error('Server error:', error);
});