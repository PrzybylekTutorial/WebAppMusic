// ===== SPOTIFY API SERVICE MODULE =====
// Centralized API calls for better maintainability and reusability
// This module provides all Spotify API interactions for the frontend

// Base URL for all Spotify Web API endpoints
const BASE_URL = 'https://api.spotify.com/v1';

// ===== CONFIGURATION =====
// Configuration object for playlist IDs and limits
export const SPOTIFY_CONFIG = {
  PLAYLIST_ID: '6ttSx3ZVwaaoyz9qMuH3w7', // Primary playlist ID (Today's Top Hits)
  FALLBACK_PLAYLIST_ID: '37i9dQZF1DX186v583rmzp', // Fallback playlist ID (Top 50 Global)
  MAX_TRACKS: 100 // Maximum number of tracks to fetch from playlists
};

// ===== UTILITY FUNCTIONS =====
// Generic authenticated fetch function for all Spotify API calls
// Handles authentication headers and error responses consistently
export async function fetchWithAuth(endpoint, accessToken) {
  // Make authenticated request to Spotify API
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`, // Include access token for authentication
      'Content-Type': 'application/json' // Specify JSON content type
    }
  });
  
  // Check if request was successful
  if (!response.ok) {
    throw new Error(`Spotify API error: ${response.status} - ${response.statusText}`);
  }
  
  // Parse and return JSON response
  return response.json();
}

// ===== PLAYLIST AND TRACK FUNCTIONS =====
// Get tracks from a specific playlist
export async function getPlaylistTracks(playlistId, accessToken, limit = 100) {
  return fetchWithAuth(`/playlists/${playlistId}/tracks?limit=${limit}`, accessToken);
}

// Get detailed information about a specific track
export async function getTrackDetails(trackId, accessToken) {
  return fetchWithAuth(`/tracks/${trackId}`, accessToken);
}

// ===== SEARCH FUNCTIONS =====
// Search for tracks by title or artist
export async function searchTracks(query, accessToken, limit = 10) {
  return fetchWithAuth(`/search?type=track&q=${encodeURIComponent(query)}&limit=${limit}`, accessToken);
}

// ===== USER FUNCTIONS =====
// Get current user's profile information
export async function getCurrentUser(accessToken) {
  return fetchWithAuth('/me', accessToken);
}

// ===== PLAYLIST MANAGEMENT FUNCTIONS =====
// Create a new playlist for the current user
export async function createPlaylist(userId, name, description, accessToken) {
  const response = await fetch(`${BASE_URL}/users/${userId}/playlists`, {
    method: 'POST', // POST method for creating new resource
    headers: {
      'Authorization': `Bearer ${accessToken}`, // User authentication required
      'Content-Type': 'application/json' // JSON content type
    },
    body: JSON.stringify({
      name, // Playlist name
      description, // Playlist description
      public: false // Make playlist private by default
    })
  });
  
  // Check if playlist creation was successful
  if (!response.ok) {
    throw new Error(`Create playlist error: ${response.status} - ${response.statusText}`);
  }
  
  // Return the created playlist data
  return response.json();
}

// Add tracks to an existing playlist
export async function addTracksToPlaylist(playlistId, trackUris, accessToken) {
  const response = await fetch(`${BASE_URL}/playlists/${playlistId}/tracks`, {
    method: 'POST', // POST method for adding tracks
    headers: {
      'Authorization': `Bearer ${accessToken}`, // User authentication required
      'Content-Type': 'application/json' // JSON content type
    },
    body: JSON.stringify({
      uris: trackUris // Array of Spotify track URIs
    })
  });
  
  // Check if track addition was successful
  if (!response.ok) {
    throw new Error(`Add tracks error: ${response.status} - ${response.statusText}`);
  }
  
  // Return the response data
  return response.json();
}



// ===== PLAYBACK CONTROL FUNCTIONS =====
// Start playing a specific track on a device
export async function playTrack(accessToken, deviceId, trackUri) {
  const response = await fetch(`${BASE_URL}/me/player/play?device_id=${deviceId}`, {
    method: 'PUT', // PUT method for starting playback
    headers: {
      'Authorization': `Bearer ${accessToken}`, // User authentication required
      'Content-Type': 'application/json' // JSON content type
    },
    body: JSON.stringify({ uris: [trackUri] }) // Array of track URIs to play
  });
  
  // Check if playback started successfully
  if (!response.ok) {
    throw new Error(`Playback error: ${response.status} - ${response.statusText}`);
  }
}

// Pause current playback on a device
export async function pausePlayback(accessToken, deviceId) {
  const response = await fetch(`${BASE_URL}/me/player/pause?device_id=${deviceId}`, {
    method: 'PUT', // PUT method for pausing playback
    headers: {
      'Authorization': `Bearer ${accessToken}` // User authentication required
    }
  });
  
  // Check if pause was successful
  if (!response.ok) {
    throw new Error(`Pause error: ${response.status} - ${response.statusText}`);
  }
}

// Resume paused playback on a device
export async function resumePlayback(accessToken, deviceId) {
  const response = await fetch(`${BASE_URL}/me/player/play?device_id=${deviceId}`, {
    method: 'PUT', // PUT method for resuming playback
    headers: {
      'Authorization': `Bearer ${accessToken}` // User authentication required
    }
  });
  
  // Check if resume was successful
  if (!response.ok) {
    throw new Error(`Resume error: ${response.status} - ${response.statusText}`);
  }
}

// Get current playback state and information
export async function getCurrentPlayback(accessToken) {
  return fetchWithAuth('/me/player', accessToken);
}

// Seek to a specific position in the current track
export async function seekToPosition(accessToken, deviceId, positionMs) {
  const response = await fetch(`${BASE_URL}/me/player/seek?device_id=${deviceId}&position_ms=${positionMs}`, {
    method: 'PUT', // PUT method for seeking
    headers: {
      'Authorization': `Bearer ${accessToken}` // User authentication required
    }
  });
  
  // Check if seek was successful
  if (!response.ok) {
    throw new Error(`Seek error: ${response.status} - ${response.statusText}`);
  }
} 