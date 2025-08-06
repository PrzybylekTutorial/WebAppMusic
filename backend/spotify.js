// ===== SPOTIFY API CONFIGURATION MODULE =====
// This module handles Spotify API authentication and basic API operations
// Uses client credentials flow for server-to-server authentication

// Import fetch dynamically for making HTTP requests (ES6 module compatibility)
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
// Import querystring module for URL parameter encoding
const qs = require('querystring');
// Load environment variables from .env file
require('dotenv').config({ path: __dirname + '/.env' });

// ===== SPOTIFY CREDENTIALS =====
// Get Spotify app credentials from environment variables
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

// ===== TOKEN MANAGEMENT =====
// Cache for access token to avoid repeated authentication
let accessToken = null;
// Timestamp when token expires (for automatic refresh)
let tokenExpires = 0;

// ===== AUTHENTICATION FUNCTIONS =====
// Function to get Spotify access token using client credentials flow
// Implements token caching to avoid repeated authentication requests
async function getAccessToken() {
  // Check if we have a valid cached token (not expired)
  if (accessToken && Date.now() < tokenExpires) {
    return accessToken; // Return cached token if still valid
  }
  
  // Make authentication request to Spotify
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded', // Required for form data
      'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'), // Base64 encoded credentials
    },
    body: qs.stringify({ grant_type: 'client_credentials' }) // Client credentials flow
  });
  
  // Parse the response
  const data = await res.json();
  // Cache the new access token
  accessToken = data.access_token;
  // Set expiration time (refresh 1 minute early to avoid edge cases)
  tokenExpires = Date.now() + (data.expires_in - 60) * 1000;
  
  return accessToken;
}

// ===== MODULE EXPORTS =====
// Export functions for use in other modules
module.exports = { 
  getAccessToken    // Get Spotify access token
};