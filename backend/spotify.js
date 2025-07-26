const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const qs = require('querystring');
require('dotenv').config({ path: __dirname + '/.env' });

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const PLAYLIST_ID = '6ttSx3ZVwaaoyz9qMuH3w7'; // Today's Top Hits
let accessToken = null;
let tokenExpires = 0;

console.log('CLIENT_ID:', process.env.SPOTIFY_CLIENT_ID);
console.log('CLIENT_SECRET:', process.env.SPOTIFY_CLIENT_SECRET);

async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpires) {
    return accessToken;
  }
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'),
    },
    body: qs.stringify({ grant_type: 'client_credentials' })
  });
  const data = await res.json();
  accessToken = data.access_token;
  tokenExpires = Date.now() + (data.expires_in - 60) * 1000; // refresh 1 min early
  return accessToken;
}

async function getPlaylistTracks(limit = 100) {
  if (limit < 1 || limit > 100) limit = 100; // Defensive: clamp to valid range
  const token = await getAccessToken();
  const res = await fetch(`https://api.spotify.com/v1/playlists/${PLAYLIST_ID}/tracks?limit=${limit}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  console.log('Spotify playlist API response:', data);
  if (!data.items) {
    throw new Error('Spotify API did not return items: ' + JSON.stringify(data));
  }
  const filtered = data.items
    .map(item => item.track)
    .filter(track => {
      console.log(track.name, track.preview_url); // Add this line
      return track && track.preview_url;
    });
  console.log('Tracks with preview:', filtered.length);
  return filtered;
}

async function playTrack(device_id, trackUri) {
  const token = await getAccessToken();
  await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${device_id}`, {
    method: 'PUT',
    body: JSON.stringify({ uris: [trackUri] }),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
}

module.exports = { getAccessToken, getPlaylistTracks, playTrack };