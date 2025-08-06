# Environment Setup Guide

## Security Notice ⚠️

**IMPORTANT**: Never commit sensitive credentials like database passwords, API keys, or access tokens to version control. Always use environment variables for sensitive data.

## Required Environment Variables

Create a `.env` file in the `backend/` directory with the following variables:

### Session Secret (REQUIRED)
The `SESSION_SECRET` is used to sign and encrypt session cookies. It should be:
- **At least 32 characters long**
- **Random and unpredictable**
- **Different for each environment** (development, staging, production)
- **Never shared or committed to version control**

You can generate a secure session secret using:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

```env
# MongoDB Configuration
MONGODB_URI=mongodb+srv://your_username:your_password@cluster0.elobm.mongodb.net/
DATABASE_NAME=musicApp
COLLECTION_NAME=songs

# Session Configuration (REQUIRED for security)
SESSION_SECRET=your_very_long_random_secret_key_here

# Spotify API Configuration (if using Spotify features)
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
```

## How to Set Up

1. **Create the .env file**:
   ```bash
   cd backend
   touch .env
   ```

2. **Add your credentials** to the `.env` file using the format above

3. **Verify the .env file is in .gitignore** (it should already be there)

4. **Restart your server** after making changes to environment variables

## Security Best Practices

- ✅ Use environment variables for all sensitive data
- ✅ Keep `.env` files out of version control
- ✅ Use different credentials for development and production
- ✅ Regularly rotate your passwords and API keys
- ❌ Never hardcode credentials in source code
- ❌ Never commit `.env` files to git

## Troubleshooting

If you get an error like "MONGODB_URI environment variable is required", make sure:
1. Your `.env` file exists in the `backend/` directory
2. The `MONGODB_URI` variable is properly set
3. There are no extra spaces or quotes around the values
4. You've restarted the server after creating/modifying the `.env` file 