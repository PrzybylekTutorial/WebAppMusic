const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const spotify = require('./spotify');
const session = require('express-session');
const querystring = require('querystring');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'your_secret_key', // Change this to a secure random string!
  resave: false,
  saveUninitialized: true
}));

const redirect_uri = 'http://127.0.0.1:5000/auth/callback'; // Must match your Spotify app settings
const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const scope = 'streaming user-read-email user-read-private user-modify-playback-state user-read-playback-state playlist-read-private playlist-read-collaborative';

app.get('/auth/login', (req, res) => {
  const params = querystring.stringify({
    response_type: 'code',
    client_id,
    scope,
    redirect_uri
  });
  res.redirect('https://accounts.spotify.com/authorize?' + params);
});

app.get('/auth/callback', async (req, res) => {
  const code = req.query.code || null;
  if (!code) return res.status(400).send('No code provided');
  const authOptions = {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: querystring.stringify({
      code,
      redirect_uri,
      grant_type: 'authorization_code'
    })
  };
  const response = await fetch('https://accounts.spotify.com/api/token', authOptions);
  const data = await response.json();
  if (data.access_token) {
    req.session.access_token = data.access_token;
    req.session.refresh_token = data.refresh_token;
    // Redirect to frontend with token in query (for demo, you can improve this later)
    res.redirect('http://localhost:3000/?access_token=' + data.access_token);
  } else {
    res.status(400).json(data);
  }
});

// Load songs data
const songsPath = path.join(__dirname, 'data', 'songs.json');
let songs = [];
if (fs.existsSync(songsPath)) {
  songs = JSON.parse(fs.readFileSync(songsPath, 'utf-8'));
}

// Example: Top 50 Global playlist ID
const PLAYLIST_ID = '37i9dQZF1DXcBWIGoYBM5M';

app.get('/api/random-song', async (req, res) => {
  try {
    const tracks = await spotify.getPlaylistTracks();
    if (!Array.isArray(tracks) || !tracks.length) {
      console.error('Spotify returned:', tracks);
      return res.status(500).json({ error: 'No tracks with preview available', details: tracks });
    }
    const idx = Math.floor(Math.random() * tracks.length);
    const track = tracks[idx];
    res.json({
      id: track.id,
      artist: track.artists.map(a => a.name).join(', '),
      preview: track.preview_url
    });
  } catch (e) {
    console.error('Spotify error:', e);
    res.status(500).json({ error: 'Spotify error', details: e.message });
  }
});

// Checks the user's guess
app.post('/api/check-guess', async (req, res) => {
  const { id, guess } = req.body;
  if (!id || !guess) return res.status(400).json({ error: 'Invalid request' });
  try {
    const token = await spotify.getAccessToken();
    const response = await fetch(`https://api.spotify.com/v1/tracks/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const track = await response.json();
    if (!track || !track.name) return res.status(404).json({ error: 'Track not found' });
    const correct = track.name.trim().toLowerCase() === guess.trim().toLowerCase();
    res.json({ correct, answer: track.name });
  } catch (e) {
    res.status(500).json({ error: 'Spotify error', details: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});