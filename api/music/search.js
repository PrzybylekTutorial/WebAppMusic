// API endpoint for music search
const mongoService = require('../mongoService');

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
    res.status(500).json({ error: 'Failed to search database', message: error.message });
  }
};
