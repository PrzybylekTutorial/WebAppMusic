// Simple test API for Vercel debugging
module.exports = (req, res) => {
  res.status(200).json({ 
    message: 'Test API is working!',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    headers: req.headers
  });
};
