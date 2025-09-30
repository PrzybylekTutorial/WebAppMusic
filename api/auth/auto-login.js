// Auto-login endpoint for pre-authenticated Spotify account
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const querystring = require('querystring');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Check if we have stored app credentials
    const appAccessToken = process.env.SPOTIFY_APP_ACCESS_TOKEN;
    const appRefreshToken = process.env.SPOTIFY_APP_REFRESH_TOKEN;
    
    if (!appAccessToken && !appRefreshToken) {
      return res.status(500).json({ 
        error: 'App Spotify credentials not configured. Please set SPOTIFY_APP_ACCESS_TOKEN and SPOTIFY_APP_REFRESH_TOKEN in environment variables.',
        setup_required: true
      });
    }

    // If we have a valid access token, return it
    if (appAccessToken) {
      // Test if the token is still valid
      try {
        const testResponse = await fetch('https://api.spotify.com/v1/me', {
          headers: { 'Authorization': `Bearer ${appAccessToken}` }
        });
        
        if (testResponse.ok) {
          return res.json({
            access_token: appAccessToken,
            token_type: 'Bearer',
            expires_in: 3600,
            auto_login: true,
            message: 'Using pre-authenticated app account'
          });
        }
      } catch (error) {
        console.log('Stored token is invalid, attempting refresh...');
      }
    }

    // If no valid token, try to refresh using the refresh token
    if (appRefreshToken) {
      const client_id = process.env.SPOTIFY_CLIENT_ID;
      const client_secret = process.env.SPOTIFY_CLIENT_SECRET;

      if (!client_id || !client_secret) {
        return res.status(500).json({ 
          error: 'Spotify app credentials not configured',
          setup_required: true
        });
      }

      const authOptions = {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: querystring.stringify({
          grant_type: 'refresh_token',
          refresh_token: appRefreshToken
        })
      };

      const response = await fetch('https://accounts.spotify.com/api/token', authOptions);
      const data = await response.json();

      if (data.access_token) {
        // Store the new access token (you might want to update your environment variables)
        console.log('Successfully refreshed app access token');
        
        return res.json({
          access_token: data.access_token,
          expires_in: data.expires_in,
          token_type: data.token_type,
          auto_login: true,
          message: 'Successfully authenticated with app account'
        });
      } else {
        console.error('Token refresh failed:', data);
        return res.status(400).json({ 
          error: 'Failed to refresh app token',
          details: data,
          setup_required: true
        });
      }
    }

    return res.status(500).json({ 
      error: 'No valid app credentials available',
      setup_required: true
    });

  } catch (error) {
    console.error('Auto-login error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message,
      setup_required: true
    });
  }
};


