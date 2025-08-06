# 🚀 Single Vercel Project Deployment Guide

Deploy your entire music app (frontend + backend) as **ONE Vercel project** - everything in one place!

## 🎯 Why This Approach is Better

### ✅ **Single Project Benefits**
- **One URL** for everything
- **One dashboard** to manage
- **One deployment** process
- **Easier environment variables** management
- **Simpler domain setup**
- **Better for small to medium apps**

### 🏗️ **How It Works**
- **Frontend**: Served as static files
- **Backend**: Runs as serverless functions
- **All in one project**: Single repository, single deployment

## 📁 Step 1: Restructure Your Project

### 1.1 Create Vercel Configuration
Create `vercel.json` in your root directory:

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
      "src": "backend/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "backend/server.js"
    },
    {
      "src": "/(.*)",
      "dest": "frontend/$1"
    }
  ]
}
```

### 1.2 Update Frontend API URLs
In your frontend code, change all API calls from:
```javascript
const API_BASE_URL = 'http://localhost:5000/api';
```
To:
```javascript
const API_BASE_URL = '/api';
```

### 1.3 Update Backend Redirect URLs
In your backend, update the redirect URI to use the same domain:
```javascript
const redirect_uri = process.env.REDIRECT_URI || 'https://your-app.vercel.app/auth/callback';
```

## 🚀 Step 2: Deploy to Vercel

### 2.1 Connect to Vercel
1. Go to [Vercel](https://vercel.com)
2. Sign up with GitHub
3. Click "New Project"
4. Import your GitHub repository

### 2.2 Configure Project Settings
- **Framework Preset**: `Other`
- **Root Directory**: `/` (root of your project)
- **Build Command**: Leave empty (handled by vercel.json)
- **Output Directory**: Leave empty (handled by vercel.json)

### 2.3 Set Environment Variables
Add these in Vercel project settings:

```bash
# MongoDB Configuration
MONGODB_URI=mongodb+srv://your_username:your_password@cluster0.elobm.mongodb.net/
DATABASE_NAME=musicApp
COLLECTION_NAME=songs

# Session Configuration
SESSION_SECRET=your_very_long_random_secret_key_here

# Spotify API Configuration
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# App Configuration
REDIRECT_URI=https://your-app.vercel.app/auth/callback
FRONTEND_URL=https://your-app.vercel.app
```

### 2.4 Deploy
1. Click "Deploy"
2. Wait for deployment to complete
3. **Copy your app URL** (e.g., `https://your-app.vercel.app`)

## 🎵 Step 3: Update Spotify Settings

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Select your app
3. Click "Edit Settings"
4. In "Redirect URIs", add:
   ```
   https://your-app.vercel.app/auth/callback
   ```
5. Keep your local one for development:
   ```
   http://127.0.0.1:5000/auth/callback
   ```
6. Click "Save"

## 🧪 Step 4: Test Your Deployment

### Test Backend API
Visit: `https://your-app.vercel.app/api/test`
Should return: `{"message": "Server is working!"}`

### Test Frontend
Visit: `https://your-app.vercel.app`
Should load your music app

### Test Spotify Login
Click "Login with Spotify" - should work seamlessly

## 🔧 Step 5: Update Frontend Code

You need to update your frontend to use relative API URLs. Here are the files to update:

### Update `frontend/src/DynamicPlaylistManager.js`
```javascript
// Change from:
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// To:
const API_BASE_URL = '/api';
```

### Update `frontend/src/App.js`
```javascript
// Change all API calls from:
fetch(`http://localhost:5000/api/...`)

// To:
fetch(`/api/...`)
```

## 📊 Benefits of This Approach

### ✅ **Single Project**
- One URL: `https://your-app.vercel.app`
- One dashboard to manage
- One deployment process
- Simpler environment variables

### ✅ **Better Performance**
- No CORS issues (same domain)
- Faster API calls (no cross-origin requests)
- Better caching

### ✅ **Easier Management**
- One set of environment variables
- One domain to configure
- One SSL certificate
- One analytics dashboard

## 🚨 Troubleshooting

### Common Issues

1. **Build Errors**
   - Check that both `frontend/package.json` and `backend/package.json` exist
   - Verify all dependencies are listed
   - Check build logs in Vercel dashboard

2. **API Routes Not Working**
   - Make sure `vercel.json` is in the root directory
   - Check that routes are configured correctly
   - Verify environment variables are set

3. **Frontend Not Loading**
   - Check that frontend build is successful
   - Verify static file serving is configured
   - Check for JavaScript errors in browser console

## 🎉 Result

After deployment, you'll have:
- **One URL**: `https://your-app.vercel.app`
- **Frontend**: Served at the root
- **Backend API**: Available at `/api/*`
- **Everything in one place**: Single project, single deployment

Your users can visit one URL and everything works seamlessly!

---

**Need Help?**
- Check Vercel documentation: https://vercel.com/docs
- Monitor usage in Vercel dashboard
- Check deployment logs for any errors
- Test each component individually 