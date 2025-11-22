// Vercel API Routes - Main handler
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const querystring = require('querystring');

// Import fetch dynamically for making HTTP requests (ES6 module compatibility)
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Load environment variables
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_secret_key_change_in_production',
  resave: false,
  saveUninitialized: true
}));

// Import your existing server logic
const mongoService = require('./mongoService');
const spotify = require('./spotify');

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
    console.log(`Attempt ${attempts} to find unique song with filters:`, filters);
    
    try {
      // Get a random song from MongoDB database using provided filters
      const song = await mongoService.getRandomSong(filters);
      
      // If no song found with current filters, try without filters
      if (!song) {
        console.log('No songs found with current filters, trying without filters...');
        if (Object.keys(filters).some(key => filters[key])) {
          // Try without any filters
          const songWithoutFilters = await mongoService.getRandomSong({});
          if (songWithoutFilters) {
            console.log('Found song without filters:', songWithoutFilters.title);
            const track = await searchSpotifyTrack(songWithoutFilters, token);
            const trackUri = track.uri;
            const isDuplicate = await checkPlaylistForDuplicate(playlistId, trackUri, token);
            if (!isDuplicate) {
              return { song: songWithoutFilters, track };
            }
          }
        }
        console.log('No songs found in database at all');
        break;
      }
      
      console.log('Found song from database:', song.title, 'by', song.artist);
      
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
        console.log('Failed to find Spotify track for:', song.title, 'Error:', error.message);
        continue; // Continue to next attempt
      }
    } catch (dbError) {
      console.error('Database error:', dbError);
      break;
    }
  }
  
  // Return null if no unique song found after all attempts
  console.log('No unique song found after', maxAttempts, 'attempts');
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
        const trackTitle = track.name.toLowerCase();
        const trackArtist = track.artists.map(a => a.name.toLowerCase()).join(' ');
        const songTitle = song.title.toLowerCase();
        const songArtist = song.artist.toLowerCase();
        
        // Check if title and artist match (allowing for some variation)
        return (trackTitle.includes(songTitle) || songTitle.includes(trackTitle)) &&
               (trackArtist.includes(songArtist) || songArtist.includes(trackArtist));
      });
      
      if (bestMatch) {
        console.log(`Found good match: "${bestMatch.name}" by "${bestMatch.artists.map(a => a.name).join(', ')}"`);
        return bestMatch;
      }
    }
  }
  
  // If no good match found, return the first result from the first strategy
  const fallbackResponse = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(searchStrategies[0])}&type=track&limit=1`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const fallbackData = await fallbackResponse.json();
  if (fallbackData.tracks && fallbackData.tracks.items && fallbackData.tracks.items.length > 0) {
    return fallbackData.tracks.items[0];
  }
  
  throw new Error(`No Spotify track found for: ${song.title} by ${song.artist}`);
}

// Set port from environment variable or default to 5000
const PORT = process.env.PORT || 5000;

// Enable CORS (Cross-Origin Resource Sharing) to allow requests from frontend
app.use(cors());

// Serve static files from backend/public directory
app.use('/public', express.static(path.join(__dirname, '../backend/public')));

// ===== SESSION CONFIGURATION =====
// Configure session management for user authentication state
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_secret_key_change_in_production', // Secret key for signing session cookies
  resave: false, // Don't save session if nothing changed
  saveUninitialized: true // Save new sessions even if they're empty
}));

// ===== BASIC ROUTES =====
// Basic test route to verify server is running
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// Also handle the /api/test route for Vercel
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// ===== SPOTIFY OAUTH CONFIGURATION =====
// OAuth redirect URI (must match exactly what's configured in Spotify app settings)
const redirect_uri = process.env.REDIRECT_URI || 'https://web-app-music-przybylektutorials-projects.vercel.app/api/auth/callback';
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

// Also handle the /api/auth/login route for Vercel
app.get('/api/auth/login', (req, res) => {
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
    const frontendUrl = process.env.FRONTEND_URL || 'https://web-app-music-przybylektutorials-projects.vercel.app';
    res.redirect(frontendUrl + '/?access_token=' + data.access_token);
  } else {
    res.status(400).json(data);
  }
});

// Also handle the /api/auth/callback route for Vercel
app.get('/api/auth/callback', async (req, res) => {
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

    // Redirect to frontend with both access and refresh tokens for automatic login
    const frontendUrl = process.env.FRONTEND_URL || 'https://web-app-music-przybylektutorials-projects.vercel.app';
    res.redirect(frontendUrl + '/?access_token=' + data.access_token + '&refresh_token=' + data.refresh_token);
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
      const frontendUrl = process.env.FRONTEND_URL || 'https://web-app-music-przybylektutorials-projects.vercel.app';
      res.redirect(frontendUrl);
    }
  });
});

// Test endpoint to check if server is working
app.get('/auth/test', (req, res) => {
  res.json({ message: 'Auth endpoints are working', session: req.session });
});

// Also handle the /api/auth/test route for Vercel
app.get('/api/auth/test', (req, res) => {
  res.json({ message: 'Auth endpoints are working', session: req.session });
});

// Load songs data
console.log('Loading server...');
const songsPath = path.join(__dirname, '../backend/data/songs.json');
let songs = [];
if (fs.existsSync(songsPath)) {
  songs = JSON.parse(fs.readFileSync(songsPath, 'utf-8'));
}

// Music Search API endpoints
app.get('/api/music/search', async (req, res) => {
    try {
        const { q, limit = 10 } = req.query;
        
        if (!q || q.trim().length === 0) {
            return res.status(400).json({ error: 'Search query is required' });
        }
        
        const { genre, artist } = req.query;
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

// Get all genres
app.get('/api/music/genres', async (req, res) => {
    try {
        const genres = await mongoService.getAllGenres();
        res.json({ genres });
    } catch (error) {
        console.error('Get genres error:', error);
        res.status(500).json({ error: 'Failed to get genres' });
    }
});

// Get all artists
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
    const { 
      name = 'Dynamic Music Game Playlist', 
      description = 'Auto-generated playlist for music guessing game',
      genre = null,
      yearFrom = null,
      yearTo = null,
      playlistName = null
    } = req.body;
    
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
    
    // Use playlistName if provided, otherwise use name
    const playlistNameToUse = playlistName || name;
    
    // Create new playlist
    const createResponse = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: playlistNameToUse,
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
    const playlistId = playlistData.id;
    
    // Always try to add a random song, even without filters
    try {
      console.log('Adding random song to new playlist with filters:', { genre, yearFrom, yearTo });
      
      const filters = {
        genre: genre || null,
        yearFrom: yearFrom || null,
        yearTo: yearTo || null
      };
      
      // Find a unique random song for the playlist
      const uniqueSongData = await findUniqueRandomSong(playlistId, filters, token, 10);
      
      if (uniqueSongData) {
        const { song, track } = uniqueSongData;
        const trackUri = track.uri;
        
        // Add track to the new playlist
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
        
        if (addTrackResponse.ok) {
          console.log('Successfully added random song to new playlist:', track.name);
          
          res.json({
            success: true,
            playlist: {
              id: playlistData.id,
              name: playlistData.name,
              description: playlistData.description,
              uri: playlistData.uri
            },
            addedSong: {
              id: track.id,
              title: track.name,
              artist: track.artists.map(a => a.name).join(', '),
              album: track.album.name,
              uri: track.uri,
              preview_url: track.preview_url
            },
            originalSong: song,
            message: 'Playlist created successfully with random song from database'
          });
        } else {
          const errorData = await addTrackResponse.json();
          console.error('Failed to add song to playlist:', errorData);
          
          // Try to add a popular song as fallback
          const fallbackResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              uris: ['spotify:track:4iV5W9uYEdYUVa79Axb7Rh'] // "Imagine" by John Lennon as fallback
            })
          });
          
          if (fallbackResponse.ok) {
            console.log('Added fallback song to playlist');
            res.json({
              success: true,
              playlist: {
                id: playlistData.id,
                name: playlistData.name,
                description: playlistData.description,
                uri: playlistData.uri
              },
              message: 'Playlist created successfully with fallback song'
            });
          } else {
            res.json({
              success: true,
              playlist: {
                id: playlistData.id,
                name: playlistData.name,
                description: playlistData.description,
                uri: playlistData.uri
              },
              message: 'Playlist created successfully (failed to add songs)'
            });
          }
        }
      } else {
        // No song found from database, try fallback
        console.log('No suitable song found for filters, trying fallback song');
        
        const fallbackResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            uris: ['spotify:track:4iV5W9uYEdYUVa79Axb7Rh'] // "Imagine" by John Lennon as fallback
          })
        });
        
        if (fallbackResponse.ok) {
          console.log('Added fallback song to playlist');
          res.json({
            success: true,
            playlist: {
              id: playlistData.id,
              name: playlistData.name,
              description: playlistData.description,
              uri: playlistData.uri
            },
            message: 'Playlist created successfully with fallback song'
          });
        } else {
          res.json({
            success: true,
            playlist: {
              id: playlistData.id,
              name: playlistData.name,
              description: playlistData.description,
              uri: playlistData.uri
            },
            message: 'Playlist created successfully (no songs added)'
          });
        }
      }
    } catch (songError) {
      console.error('Error adding song to new playlist:', songError);
      
      // Try fallback song
      try {
        const fallbackResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            uris: ['spotify:track:4iV5W9uYEdYUVa79Axb7Rh'] // "Imagine" by John Lennon as fallback
          })
        });
        
        if (fallbackResponse.ok) {
          console.log('Added fallback song to playlist after error');
          res.json({
            success: true,
            playlist: {
              id: playlistData.id,
              name: playlistData.name,
              description: playlistData.description,
              uri: playlistData.uri
            },
            message: 'Playlist created successfully with fallback song'
          });
        } else {
          res.json({
            success: true,
            playlist: {
              id: playlistData.id,
              name: playlistData.name,
              description: playlistData.description,
              uri: playlistData.uri
            },
            message: 'Playlist created successfully (failed to add songs)'
          });
        }
      } catch (fallbackError) {
        console.error('Fallback song also failed:', fallbackError);
        res.json({
          success: true,
          playlist: {
            id: playlistData.id,
            name: playlistData.name,
            description: playlistData.description,
            uri: playlistData.uri
          },
          message: 'Playlist created successfully (failed to add songs)'
        });
      }
    }
    
  } catch (error) {
    console.error('Create playlist error:', error);
    res.status(500).json({ error: 'Failed to create playlist' });
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

// Export for Vercel - Serverless function format
module.exports = (req, res) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(200).end();
    return;
  }

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle the request through Express app
  app(req, res);
}; 