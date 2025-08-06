# Vercel Deployment Fix for Spotify Authentication

## Problem Summary
Your app was getting a 404 error when trying to access `/api/auth/login` because:
1. The `vercel.json` routing configuration wasn't properly set up
2. Environment variables were pointing to localhost instead of production URLs
3. Missing environment variables in Vercel dashboard

## Changes Made

### 1. Fixed `vercel.json` Routing
Updated the routing configuration to properly handle all API endpoints:

```json
{
  "routes": [
    {
      "src": "/api/auth/(.*)",
      "dest": "/api/index.js"
    },
    {
      "src": "/api/music/(.*)",
      "dest": "/api/index.js"
    },
    {
      "src": "/api/playlist-tracks/(.*)",
      "dest": "/api/index.js"
    },
    {
      "src": "/api/search",
      "dest": "/api/index.js"
    },
    {
      "src": "/api/random-database-song",
      "dest": "/api/index.js"
    },
    {
      "src": "/api/search-and-add-to-playlist",
      "dest": "/api/index.js"
    },
    {
      "src": "/api/create-dynamic-playlist",
      "dest": "/api/index.js"
    },
    {
      "src": "/api/add-random-song-to-playlist",
      "dest": "/api/index.js"
    },
    {
      "src": "/api/add-specific-song-to-playlist",
      "dest": "/api/index.js"
    },
    {
      "src": "/api/test",
      "dest": "/api/index.js"
    },
    {
      "src": "/(.*)",
      "dest": "frontend/$1"
    }
  ]
}
```

### 2. Updated Environment Variables in Code
Changed the default redirect URI from localhost to your Vercel domain:
- `REDIRECT_URI`: `https://web-app-music-przybylektutorials-projects.vercel.app/api/auth/callback`
- `FRONTEND_URL`: `https://web-app-music-przybylektutorials-projects.vercel.app`

## Required Environment Variables in Vercel

You need to set these environment variables in your Vercel dashboard:

### Go to Vercel Dashboard:
1. Navigate to your project: https://vercel.com/dashboard
2. Click on your project: `web-app-music-przybylektutorials-projects`
3. Go to **Settings** → **Environment Variables**

### Add these environment variables:

```
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
REDIRECT_URI=https://web-app-music-przybylektutorials-projects.vercel.app/api/auth/callback
FRONTEND_URL=https://web-app-music-przybylektutorials-projects.vercel.app
MONGODB_URI=your_mongodb_connection_string
SESSION_SECRET=your_session_secret_key
```

### Spotify App Configuration:
1. Go to https://developer.spotify.com/dashboard
2. Select your app
3. Go to **Settings**
4. Add this redirect URI: `https://web-app-music-przybylektutorials-projects.vercel.app/api/auth/callback`

## Deployment Steps

1. **Commit and push your changes:**
   ```bash
   git add .
   git commit -m "Fix Vercel routing and environment variables"
   git push
   ```

2. **Set environment variables in Vercel dashboard** (as described above)

3. **Redeploy your app:**
   - Vercel will automatically redeploy when you push to your main branch
   - Or manually trigger a redeploy from the Vercel dashboard

4. **Test the authentication:**
   - Go to: https://web-app-music-przybylektutorials-projects.vercel.app/
   - Click "Connect with Spotify"
   - Should now redirect to Spotify authorization

## Troubleshooting

### If you still get 404 errors:
1. Check that all environment variables are set correctly in Vercel
2. Verify the redirect URI in your Spotify app settings matches exactly
3. Check Vercel deployment logs for any errors

### To check deployment logs:
1. Go to Vercel dashboard
2. Click on your latest deployment
3. Check the "Functions" tab for any API errors

### Test API endpoints:
- Test endpoint: `https://web-app-music-przybylektutorials-projects.vercel.app/api/test`
- Auth test: `https://web-app-music-przybylektutorials-projects.vercel.app/api/auth/test`

## Important Notes

- **Session Management**: Vercel serverless functions don't maintain sessions between requests by default. You might need to implement a different session strategy (like JWT tokens) for production.
- **MongoDB Connection**: Make sure your MongoDB Atlas cluster allows connections from Vercel's IP ranges.
- **Rate Limiting**: Be aware of Vercel's function execution limits and timeouts.

## Next Steps

After fixing the authentication:
1. Test all API endpoints
2. Implement proper session management for production
3. Add error handling and logging
4. Consider implementing refresh token logic
