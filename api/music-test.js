// Test endpoint for music API
const mongoService = require('./mongoService');

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

  try {
    // Test MongoDB connection
    await mongoService.connect();
    
    // Test getting genres
    const genres = await mongoService.getAllGenres();
    
    // Test getting artists
    const artists = await mongoService.getAllArtists();
    
    res.json({ 
      message: 'Music API test successful!',
      timestamp: new Date().toISOString(),
      genresCount: genres.length,
      artistsCount: artists.length,
      sampleGenres: genres.slice(0, 5),
      sampleArtists: artists.slice(0, 5),
      mongodbConnected: true
    });
  } catch (error) {
    console.error('Music API test error:', error);
    res.status(500).json({ 
      error: 'Music API test failed',
      message: error.message,
      mongodbConnected: false
    });
  }
};
