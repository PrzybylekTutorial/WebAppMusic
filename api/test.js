// Simple test API endpoint for Vercel
module.exports = (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Test endpoint
  if (req.method === 'GET') {
    res.json({ 
      message: 'API is working!',
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      headers: req.headers
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};
