#!/bin/bash

# 🚀 Music Game App Deployment Script
# This script helps you deploy your music guessing app to the cloud

echo "🎵 Music Game App Deployment Helper"
echo "=================================="

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git repository not found. Please initialize git first:"
    echo "   git init"
    echo "   git add ."
    echo "   git commit -m 'Initial commit'"
    echo "   git remote add origin https://github.com/yourusername/your-repo.git"
    echo "   git push -u origin main"
    exit 1
fi

echo "✅ Git repository found"

# Check if .env files exist
if [ ! -f "backend/.env" ]; then
    echo "⚠️  Backend .env file not found. Please create backend/.env with:"
    echo "   SPOTIFY_CLIENT_ID=your_spotify_client_id"
    echo "   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret"
    echo "   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/musicdb"
    echo "   REDIRECT_URI=https://your-backend-url.com/auth/callback"
    echo "   FRONTEND_URL=https://your-frontend-url.com"
    echo "   SESSION_SECRET=your_random_secret_string"
fi

if [ ! -f "frontend/.env.production" ]; then
    echo "⚠️  Frontend .env.production file not found. Please create frontend/.env.production with:"
    echo "   REACT_APP_API_URL=https://your-backend-url.com/api"
fi

echo ""
echo "📋 Deployment Checklist:"
echo "1. ✅ Code is production-ready"
echo "2. ⏳ Set up MongoDB Atlas database"
echo "3. ⏳ Update Spotify app redirect URIs"
echo "4. ⏳ Deploy backend to Railway/Render"
echo "5. ⏳ Deploy frontend to Vercel"
echo "6. ⏳ Configure environment variables"
echo "7. ⏳ Test the deployment"

echo ""
echo "📖 Next Steps:"
echo "1. Read DEPLOYMENT_GUIDE.md for detailed instructions"
echo "2. Set up MongoDB Atlas: https://www.mongodb.com/atlas"
echo "3. Deploy backend to Railway: https://railway.app"
echo "4. Deploy frontend to Vercel: https://vercel.com"
echo "5. Update Spotify app settings: https://developer.spotify.com/dashboard"

echo ""
echo "🔗 Useful Links:"
echo "- MongoDB Atlas: https://www.mongodb.com/atlas"
echo "- Railway: https://railway.app"
echo "- Vercel: https://vercel.com"
echo "- Spotify Developer Dashboard: https://developer.spotify.com/dashboard"

echo ""
echo "🎉 Good luck with your deployment!" 