# Vercel 404 Error Troubleshooting Guide

## Problem
You're getting a 404 error when accessing `/api/auth/login` on your Vercel deployment.

## Root Causes & Solutions

### 1. Updated vercel.json Configuration ✅ FIXED
I've updated your `vercel.json` to use the modern `rewrites` configuration instead of the deprecated `routes`:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "build"
      }
    },
    {
      "src": "api/package.json",
      "use": "@vercel/node"
    }
  ],
  "rewrites": [
    {
      "source": "/api/auth/(.*)",
      "destination": "/api/index.js"
    },
    {
      "source": "/api/music/(.*)",
      "destination": "/api/index.js"
    },
    {
      "source": "/api/playlist-tracks/(.*)",
      "destination": "/api/index.js"
    },
    {
      "source": "/api/search",
      "destination": "/api/index.js"
    },
    {
      "source": "/api/random-database-song",
      "destination": "/api/index.js"
    },
    {
      "source": "/api/search-and-add-to-playlist",
      "destination": "/api/index.js"
    },
    {
      "source": "/api/create-dynamic-playlist",
      "destination": "/api/index.js"
    },
    {
      "source": "/api/add-random-song-to-playlist",
      "destination": "/api/index.js"
    },
    {
      "source": "/api/add-specific-song-to-playlist",
      "destination": "/api/index.js"
    },
    {
      "source": "/api/test",
      "destination": "/api/index.js"
    },
    {
      "source": "/(.*)",
      "destination": "/frontend/$1"
    },
    {
      "source": "/api/(.*)",
      "destination": "/api/index.js"
    }
  ],
  "env": {
    "NODE_ENV": "production",
    "CI": "false"
  }
}
```

### 2. Environment Variables Check
Make sure these environment variables are set correctly in Vercel:

**Required Environment Variables:**
```
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
REDIRECT_URI=https://web-app-music-przybylektutorials-projects.vercel.app/api/auth/callback
FRONTEND_URL=https://web-app-music-przybylektutorials-projects.vercel.app
MONGODB_URI=your_mongodb_connection_string
SESSION_SECRET=your_session_secret_key
```

### 3. Spotify App Configuration
In your Spotify Developer Dashboard:
1. Go to https://developer.spotify.com/dashboard
2. Select your app
3. Go to **Settings**
4. Add this exact redirect URI: `https://web-app-music-przybylektutorials-projects.vercel.app/api/auth/callback`

### 4. Deployment Steps

1. **Commit and push the updated vercel.json:**
   ```bash
   git add vercel.json
   git commit -m "Update vercel.json to use rewrites instead of routes"
   git push
   ```

2. **Force a fresh deployment:**
   - Go to Vercel dashboard
   - Click on your project
   - Go to **Deployments**
   - Click **Redeploy** on the latest deployment

3. **Clear Vercel cache:**
   - In Vercel dashboard, go to **Settings** → **General**
   - Scroll down to **Build & Development Settings**
   - Click **Clear Build Cache**

### 5. Testing Steps

1. **Test the API endpoint directly:**
   - Visit: `https://web-app-music-przybylektutorials-projects.vercel.app/api/test`
   - Should return: `{"message": "Server is working!"}`

2. **Test the auth endpoint:**
   - Visit: `https://web-app-music-przybylektutorials-projects.vercel.app/api/auth/test`
   - Should return: `{"message": "Auth endpoints are working", "session": {}}`

3. **Test the main auth login:**
   - Visit: `https://web-app-music-przybylektutorials-projects.vercel.app/api/auth/login`
   - Should redirect to Spotify authorization

### 6. Debugging Steps

If you still get 404 errors:

1. **Check Vercel Function Logs:**
   - Go to Vercel dashboard
   - Click on your latest deployment
   - Go to **Functions** tab
   - Look for any errors in the `/api/index.js` function

2. **Check Build Logs:**
   - In the deployment, check the **Build Logs** tab
   - Look for any build errors

3. **Verify API Structure:**
   - Make sure `/api/index.js` exists and exports the Express app
   - Make sure `/api/package.json` exists with correct dependencies

### 7. Alternative Solutions

If the above doesn't work, try this simplified `vercel.json`:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "build"
      }
    },
    {
      "src": "api/package.json",
      "use": "@vercel/node"
    }
  ],
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/index.js"
    },
    {
      "source": "/(.*)",
      "destination": "/frontend/$1"
    }
  ]
}
```

### 8. Common Issues & Solutions

**Issue: "Function not found"**
- Solution: Make sure `api/index.js` exists and exports the app correctly

**Issue: "Module not found"**
- Solution: Check that all dependencies are in `api/package.json`

**Issue: "Environment variable not found"**
- Solution: Verify all environment variables are set in Vercel dashboard

**Issue: "Build failed"**
- Solution: Check build logs for specific error messages

### 9. Final Verification

After implementing all fixes:

1. **Wait for deployment to complete** (usually 1-2 minutes)
2. **Test the main flow:**
   - Go to: `https://web-app-music-przybylektutorials-projects.vercel.app/`
   - Click "Connect with Spotify"
   - Should redirect to Spotify authorization page

3. **If it works, test other API endpoints:**
   - `/api/music/search?q=test`
   - `/api/music/genres`
   - `/api/random-database-song`

## References

- [Vercel Project Configuration](https://vercel.com/docs/concepts/projects/project-configuration)
- [Custom 404 Page Guide](https://vercel.com/guides/custom-404-page)
- [Vercel Error Codes](https://vercel.com/docs/errors/NOT_FOUND)
