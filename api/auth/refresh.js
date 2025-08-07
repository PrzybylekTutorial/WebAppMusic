// API endpoint for refreshing Spotify access tokens
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const querystring = require('querystring');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    // Spotify app credentials
    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const client_secret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!client_id || !client_secret) {
      return res.status(500).json({ error: 'Spotify credentials not configured' });
    }

    // Request new access token using refresh token
    const authOptions = {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: querystring.stringify({
        grant_type: 'refresh_token',
        refresh_token: refresh_token
      })
    };

    const response = await fetch('https://accounts.spotify.com/api/token', authOptions);
    const data = await response.json();

    if (data.access_token) {
      res.json({
        access_token: data.access_token,
        expires_in: data.expires_in,
        token_type: data.token_type
      });
    } else {
      console.error('Token refresh failed:', data);
      res.status(400).json({ 
        error: 'Failed to refresh token',
        details: data
      });
    }

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};
