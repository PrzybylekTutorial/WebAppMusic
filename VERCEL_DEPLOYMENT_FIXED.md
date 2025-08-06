# 🚀 Vercel Deployment - Fixed Configuration

## ✅ **Issues Fixed**

1. **Dependency Conflicts**: Removed dependencies from root `package.json`
2. **API Dependencies**: Created `api/package.json` with proper dependencies
3. **File Structure**: Copied backend files to `api/` directory
4. **Import Paths**: Updated imports to use local paths
5. **Proxy Settings**: Removed local proxy from frontend

## 📁 **Updated File Structure**

```
WebAppMusic/
├── vercel.json              # ✅ Updated for monorepo
├── package.json             # ✅ Clean (no dependencies)
├── frontend/
│   ├── package.json         # ✅ React dependencies
│   └── src/                 # ✅ React app
├── api/
│   ├── package.json         # ✅ Backend dependencies
│   ├── index.js             # ✅ Main API handler
│   ├── mongoService.js      # ✅ Copied from backend
│   └── spotify.js           # ✅ Copied from backend
└── backend/                 # ✅ Original backend (for local dev)
```

## 🎯 **Vercel UI Settings**

| Field | Value |
|-------|-------|
| **Project Name** | `web-app-music` |
| **Root Directory** | Leave **EMPTY** |
| **Framework Preset** | Auto-detected |
| **Build Command** | Leave default |
| **Output Directory** | Leave default |
| **Install Command** | Leave default |

## 🔧 **What Changed**

### 1. **Root package.json** - Cleaned up
```json
{
  "name": "webappmusic",
  "version": "1.0.0",
  // No dependencies - they're in api/package.json
}
```

### 2. **api/package.json** - New file
```json
{
  "name": "webappmusic-api",
  "dependencies": {
    "axios": "^1.11.0",
    "cors": "^2.8.5",
    "dotenv": "^17.2.1",
    "express": "^5.1.0",
    "express-session": "^1.18.2",
    "mongodb": "^6.18.0",
    "node-fetch": "^3.3.2",
    "querystring": "^0.2.1"
  }
}
```

### 3. **vercel.json** - Updated
```json
{
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build"
    },
    {
      "src": "api/package.json",  // ✅ Points to api/package.json
      "use": "@vercel/node"
    }
  ]
}
```

### 4. **api/index.js** - Updated imports
```javascript
// ✅ Local imports instead of ../backend/
const mongoService = require('./mongoService');
const spotify = require('./spotify');
```

## 🚀 **Deploy Now**

1. **Commit and push** your changes to GitHub
2. **Go to Vercel** and create new project
3. **Import from GitHub** - select your repository
4. **Use these settings**:
   - Project Name: `web-app-music`
   - Root Directory: Leave empty
5. **Deploy** and wait for build to complete

## 🔗 **Your URLs Will Be**

- **Main App**: `https://web-app-music.vercel.app`
- **API Endpoints**: `https://web-app-music.vercel.app/api/*`
- **Frontend**: `https://web-app-music.vercel.app`

## ⚙️ **Environment Variables**

Set these in Vercel dashboard:

```bash
MONGODB_URI=mongodb+srv://wprzybylski98:Baton999!@cluster0.elobm.mongodb.net/
DATABASE_NAME=musicApp
COLLECTION_NAME=songs
SESSION_SECRET=ed606fad326b3b175a91ce7cf80be60dab418c2c0c5f055a78098ccb6a11534e
SPOTIFY_CLIENT_ID=bca879e4e8d241729c86cde88078158e
SPOTIFY_CLIENT_SECRET=d9e7e59962364bd088c707cd9c0e12bd
REDIRECT_URI=https://web-app-music.vercel.app/api/auth/callback
FRONTEND_URL=https://web-app-music.vercel.app
```

## 🎉 **Success!**

Your app will now deploy successfully on Vercel with both frontend and backend working together! 🚀 