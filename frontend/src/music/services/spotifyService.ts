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



// ===== DEVICE MANAGEMENT FUNCTIONS =====

// Get list of available devices
export async function getAvailableDevices(accessToken) {
  const response = await fetch(`${BASE_URL}/me/player/devices`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  if (!response.ok) {
    // Return empty array if no devices or error
    return { devices: [] };
  }
  
  return response.json();
}

// Check if a specific device is available
export async function isDeviceAvailable(accessToken, deviceId) {
  try {
    const { devices } = await getAvailableDevices(accessToken);
    return devices.some(device => device.id === deviceId);
  } catch {
    return false;
  }
}

// Wait for device to become available (polling with timeout)
export async function waitForDeviceReady(accessToken, deviceId, maxWaitMs = 10000, pollIntervalMs = 500) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    const isAvailable = await isDeviceAvailable(accessToken, deviceId);
    if (isAvailable) {
      console.log('Device is now available in Spotify API');
      return true;
    }
    
    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }
  
  console.warn('Device not available after timeout');
  return false;
}

// ===== PLAYBACK CONTROL FUNCTIONS =====

// Transfer playback to a specific device (activate it)
export async function transferPlayback(accessToken, deviceId, play = false) {
  const response = await fetch(`${BASE_URL}/me/player`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      device_ids: [deviceId],
      play: play
    })
  });
  
  // 204 No Content is success for transfer
  if (!response.ok && response.status !== 204) {
    throw new Error(`Transfer playback error: ${response.status} - ${response.statusText}`);
  }
}

// Start playing a specific track on a device with exponential backoff retry
export async function playTrack(accessToken, deviceId, trackUri) {
  console.log('playTrack: Starting playback request...');
  
  // Pre-check: wait for device to appear in Spotify API (max 3 seconds)
  // This prevents immediate 404s when SDK reports "ready" before API registers device
  const deviceInList = await waitForDeviceReady(accessToken, deviceId, 3000, 500);
  if (deviceInList) {
    console.log('playTrack: Device confirmed in API, proceeding with play');
  } else {
    console.warn('playTrack: Device not in API list after 3s, attempting play anyway');
  }
  
  // Activate device via transfer - required for Chrome (Widevine DRM)
  // Edge (PlayReady) may not need this, but it doesn't hurt
  try {
    await transferPlayback(accessToken, deviceId, false);
    console.log('playTrack: Device activated via transfer');
    // Small delay to let transfer complete
    await new Promise(resolve => setTimeout(resolve, 200));
  } catch (e) {
    console.warn('playTrack: Transfer failed (may already be active), proceeding anyway');
  }
  
  // Retry delays for additional resilience
  const retryDelays = [0, 1000, 2000]; // Initial + 2 retries (reduced since we did pre-check)
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < retryDelays.length; attempt++) {
    // Wait before retry (0 for first attempt)
    if (retryDelays[attempt] > 0) {
      console.log(`playTrack: Retry ${attempt}/${retryDelays.length - 1}, waiting ${retryDelays[attempt]}ms...`);
      await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
    }
    
    try {
      const response = await fetch(`${BASE_URL}/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ uris: [trackUri] })
      });
      
      // Success (200 or 204)
      if (response.ok || response.status === 204) {
        console.log('playTrack: Playback started successfully');
        return;
      }
      
      // 404 means device not ready yet - retry
      if (response.status === 404) {
        console.log(`playTrack: Device not ready (404), attempt ${attempt + 1}/${retryDelays.length}`);
        lastError = new Error(`Device not ready: 404`);
        continue;
      }
      
      // 502 Bad Gateway - temporary Spotify issue, retry
      if (response.status === 502) {
        console.log(`playTrack: Spotify temporary error (502), attempt ${attempt + 1}/${retryDelays.length}`);
        lastError = new Error(`Spotify error: 502`);
        continue;
      }
      
      // Other errors - throw immediately
      const errorText = await response.text().catch(() => '');
      throw new Error(`Playback error: ${response.status} - ${response.statusText} ${errorText}`);
    } catch (error: any) {
      // Network errors - retry
      if (error.name === 'TypeError' || error.message.includes('fetch')) {
        console.log(`playTrack: Network error, attempt ${attempt + 1}/${retryDelays.length}`);
        lastError = error;
        continue;
      }
      throw error;
    }
  }
  
  // All retries exhausted
  console.error('playTrack: All retries exhausted');
  throw lastError || new Error('Playback failed after all retries');
}

// Pause current playback on a device
export async function pausePlayback(accessToken, deviceId) {
  const response = await fetch(`${BASE_URL}/me/player/pause?device_id=${deviceId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  // 204 No Content and 403 (already paused) are acceptable
  if (!response.ok && response.status !== 204 && response.status !== 403) {
    throw new Error(`Pause error: ${response.status} - ${response.statusText}`);
  }
}

// Resume paused playback on a device with retry
export async function resumePlayback(accessToken, deviceId) {
  const retryDelays = [0, 500, 1000];
  
  for (let attempt = 0; attempt < retryDelays.length; attempt++) {
    if (retryDelays[attempt] > 0) {
      await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
    }
    
    const response = await fetch(`${BASE_URL}/me/player/play?device_id=${deviceId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    // Success
    if (response.ok || response.status === 204) {
      return;
    }
    
    // 404 - device not ready, retry
    if (response.status === 404) {
      console.log(`Resume: device not ready (404), attempt ${attempt + 1}/${retryDelays.length}`);
      continue;
    }
    
    // Other errors - throw
    throw new Error(`Resume error: ${response.status} - ${response.statusText}`);
  }
  
  throw new Error('Resume failed after all retries');
}

// Get current playback state and information
export async function getCurrentPlayback(accessToken) {
  return fetchWithAuth('/me/player', accessToken);
}

// Seek to a specific position in the current track
export async function seekToPosition(accessToken, deviceId, positionMs) {
  const response = await fetch(`${BASE_URL}/me/player/seek?device_id=${deviceId}&position_ms=${positionMs}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  // 204 No Content is success, 404 means no active device (ignore for seek)
  if (!response.ok && response.status !== 204 && response.status !== 404) {
    throw new Error(`Seek error: ${response.status} - ${response.statusText}`);
  }
} 