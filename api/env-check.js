// Environment check endpoint
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const envVars = {
      NODE_ENV: process.env.NODE_ENV,
      MONGODB_URI: process.env.MONGODB_URI ? 'SET' : 'NOT SET',
      DATABASE_NAME: process.env.DATABASE_NAME || 'musicApp',
      COLLECTION_NAME: process.env.COLLECTION_NAME || 'songs',
      SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID ? 'SET' : 'NOT SET',
      SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET ? 'SET' : 'NOT SET',
      SESSION_SECRET: process.env.SESSION_SECRET ? 'SET' : 'NOT SET',
      REDIRECT_URI: process.env.REDIRECT_URI || 'https://web-app-music-przybylektutorials-projects.vercel.app/api/auth/callback',
      FRONTEND_URL: process.env.FRONTEND_URL || 'https://web-app-music-przybylektutorials-projects.vercel.app'
    };

    res.json({ 
      message: 'Environment check',
      timestamp: new Date().toISOString(),
      environment: envVars,
      allRequiredSet: envVars.MONGODB_URI === 'SET' && envVars.SPOTIFY_CLIENT_ID === 'SET' && envVars.SPOTIFY_CLIENT_SECRET === 'SET'
    });
  } catch (error) {
    console.error('Environment check error:', error);
    res.status(500).json({ error: 'Environment check failed', message: error.message });
  }
};
