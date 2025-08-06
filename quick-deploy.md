# 🚀 Quick Deployment Checklist

## Step 1: Deploy Backend First
1. Go to [Railway](https://railway.app) or [Render](https://render.com)
2. Connect your GitHub repo
3. Set root directory to `backend/`
4. **Get your backend URL** (e.g., `https://your-app.railway.app`)

## Step 2: Configure Backend Environment Variables
Add these to your backend deployment:
```bash
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
MONGODB_URI=mongodb+srv://your_username:your_password@your-cluster.mongodb.net/musicdb
REDIRECT_URI=https://your-backend-url.com/auth/callback
FRONTEND_URL=https://your-frontend-url.vercel.app
SESSION_SECRET=random_secret_string_here
```

## Step 3: Update Spotify App
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Select your app → Edit Settings
3. Add redirect URI: `https://your-backend-url.com/auth/callback`
4. Keep: `http://127.0.0.1:5000/auth/callback` (for development)

## Step 4: Deploy Frontend
1. Go to [Vercel](https://vercel.com)
2. Connect your GitHub repo
3. Set root directory to `frontend/`
4. Add environment variable: `REACT_APP_API_URL=https://your-backend-url.com/api`

## Step 5: Update Backend with Frontend URL
Go back to Railway/Render and update `FRONTEND_URL` with your Vercel URL.

## ✅ Test Your Deployment
1. Visit your Vercel URL
2. Click "Login with Spotify"
3. Should work perfectly!

---
**Remember**: Deploy backend first to get the URL, then update Spotify settings! 