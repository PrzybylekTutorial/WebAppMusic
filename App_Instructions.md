# 🎵 Music Guessing Game - Application Instructions

## 📋 Overview
This is a React-based music guessing game that integrates with Spotify API and MongoDB to create dynamic playlists from a local music database. Players can guess songs while listening to music from their own database through Spotify.

---

## 🏗️ Project Structure

### Root Directory
```
WebAppMusic/
├── backend/           # Express.js server
├── frontend/          # React application
├── data/             # Database files and scripts
├── package.json      # Root dependencies
└── App_Instructions.md # This file
```

---

## 🎯 Frontend Files (`frontend/`)

### 📁 `frontend/src/App.js`
**Main Application Component**
- **Purpose**: Core React component that manages the entire application state
- **Key Features**:
  - Spotify authentication and token management
  - Game state management (score, current track, game status)
  - Integration with DynamicPlaylistManager
  - Session-based duplicate prevention for songs
  - Playback control (play, pause, skip, next)
  - Score tracking and game statistics
- **State Management**:
  - `accessToken`: Spotify authentication token
  - `trackUris`: Array of track URIs for the game
  - `currentTrackIndex`: Current playing track index
  - `playedSongs`: Set of songs already played in current session
  - `score`: Player's current score
  - `useDynamicPlaylist`: Boolean to use dynamic playlist vs static
- **Key Functions**:
  - `playRandomSong()`: Plays a random unplayed song
  - `playNextSong()`: Plays the next song in sequence
  - `getRandomUnplayedSong()`: Selects a song that hasn't been played
  - `resetGame()`: Resets all game state
  - `fetchTrackUris()`: Loads tracks from playlist

### 📁 `frontend/src/DynamicPlaylistManager.js`
**Dynamic Playlist Management Component**
- **Purpose**: Manages creation and manipulation of Spotify playlists from MongoDB database
- **Key Features**:
  - Create new playlists with random songs from database
  - Add random songs to existing playlists
  - Search and add specific songs from database
  - Genre and artist filtering
  - Collapsible playlist tracks display
  - Real-time search with filters
- **State Management**:
  - `currentPlaylistId`: Active playlist ID
  - `playlistTracks`: Array of tracks in current playlist
  - `filters`: Genre, year range filters
  - `searchFilters`: Search-specific filters
  - `availableGenres/Artists`: Dropdown options from database
  - `showPlaylistTracks`: Toggle for tracks display
- **Key Functions**:
  - `createDynamicPlaylist()`: Creates new playlist with random song
  - `addRandomSongFromDatabase()`: Adds random song to playlist
  - `searchSongs()`: Searches database with filters
  - `addSpecificSongToPlaylist()`: Adds specific song to playlist
  - `loadAvailableGenres/Artists()`: Loads filter options

### 📁 `frontend/src/spotifyService.js`
**Spotify API Service Layer**
- **Purpose**: Centralized service for all Spotify API interactions
- **Key Functions**:
  - `getCurrentUser()`: Fetches current Spotify user profile
  - `createPlaylist()`: Creates new Spotify playlist
  - `addTracksToPlaylist()`: Adds tracks to existing playlist
  - `getPlaylistTracks()`: Retrieves tracks from playlist
- **Usage**: Used by DynamicPlaylistManager for Spotify operations

### 📁 `frontend/src/index.js`
**Application Entry Point**
- **Purpose**: Renders the main App component
- **Features**: React 18 with concurrent features

### 📁 `frontend/public/index.html`
**HTML Template**
- **Purpose**: Main HTML template for the React app
- **Features**: Meta tags, title, favicon, and root div

---

## 🔧 Backend Files (`backend/`)

### 📁 `backend/server.js`
**Main Express.js Server**
- **Purpose**: Handles all API requests and Spotify integration
- **Key Endpoints**:
  - `POST /api/create-playlist-with-song`: Creates playlist with random song
  - `POST /api/add-random-song-to-playlist`: Adds random song to playlist
  - `POST /api/add-specific-song-to-playlist`: Adds specific song to playlist
  - `GET /api/search`: Searches MongoDB database
  - `GET /api/music/genres`: Gets unique genres from database
  - `GET /api/music/artists`: Gets unique artists from database
  - `GET /api/playlist-tracks/:id`: Gets tracks from Spotify playlist
  - `GET /auth/spotify`: Spotify OAuth endpoint
  - `GET /auth/callback`: Spotify OAuth callback
  - `GET /auth/logout`: Logout endpoint
- **Key Features**:
  - Spotify OAuth authentication
  - MongoDB integration via mongoService
  - Smart song matching with multiple search strategies
  - Duplicate prevention in playlists
  - Error handling and logging
- **Helper Functions**:
  - `searchSpotifyTrack()`: Finds songs on Spotify with multiple strategies
  - `checkPlaylistForDuplicate()`: Prevents duplicate songs
  - `findUniqueRandomSong()`: Finds unique songs with retry logic

### 📁 `backend/mongoService.js`
**MongoDB Database Service**
- **Purpose**: Handles all database operations
- **Key Functions**:
  - `connect()`: Establishes MongoDB connection
  - `disconnect()`: Closes database connection
  - `getRandomSong()`: Gets random song with filters
  - `searchSongs()`: Searches songs by title/artist
  - `advancedSearch()`: Advanced search with multiple filters
  - `getAllGenres()`: Gets unique genres
  - `getAllArtists()`: Gets unique artists
  - `getDatabaseStats()`: Gets database statistics
- **Collection**: Uses "songs" collection
- **Features**: Connection pooling, error handling, aggregation queries

### 📁 `backend/musicSearchLocal.js`
**Legacy Local JSON Database Service**
- **Purpose**: Fallback for local JSON files (largely deprecated)
- **Usage**: Used when MongoDB is unavailable
- **Files**: `realRockMetalDatabase.json`

---

## 📊 Data Files (`data/`)

### 📁 `data/realRockMetalDatabase.json`
**Main Music Database**
- **Purpose**: Contains song data for the application
- **Format**: JSON array of song objects
- **Fields**: title, artist, year, genre, album, popularity, tags
- **Usage**: Imported into MongoDB via import script

### 📁 `data/importToMongoDB.js`
**Database Import Script**
- **Purpose**: Imports JSON data into MongoDB
- **Usage**: Run to populate MongoDB with song data
- **Features**: Batch processing, error handling, progress logging

### 📁 `data/README_ROCK_METAL_DATA.md`
**Database Documentation**
- **Purpose**: Documents the structure and content of the music database
- **Content**: Field descriptions, data format, usage instructions

---

## ⚙️ Configuration Files

### 📁 `package.json` (Root)
**Root Dependencies**
- **Purpose**: Defines project dependencies and scripts
- **Key Dependencies**: Express, React, MongoDB driver
- **Scripts**: Development and production commands

### 📁 `frontend/package.json`
**Frontend Dependencies**
- **Purpose**: React app dependencies
- **Key Dependencies**: React, React-DOM, Spotify Web Playback SDK
- **Scripts**: Start, build, test commands

---

## 🚀 How to Run the Application

### Prerequisites
1. **Node.js** (v14 or higher)
2. **MongoDB** (running locally or cloud instance)
3. **Spotify Developer Account** with registered application

### Environment Setup
1. **Spotify API Credentials**:
   - Create app at https://developer.spotify.com/dashboard
   - Get Client ID and Client Secret
   - Set redirect URI to `http://localhost:5000/auth/callback`

2. **MongoDB Setup**:
   - Install and start MongoDB
   - Create database and "songs" collection
   - Import data using `data/importToMongoDB.js`

### Installation Steps
```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install

# Import database
cd ../data
node importToMongoDB.js

# Start backend server (from root)
cd ..
node backend/server.js

# Start frontend (in new terminal)
cd frontend
npm start
```

### Access Points
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Spotify Auth**: http://localhost:5000/auth/spotify

---

## 🎮 Game Features

### Core Gameplay
1. **Authentication**: Login with Spotify account
2. **Playlist Creation**: Create dynamic playlist from database
3. **Song Guessing**: Listen and guess song titles/artists
4. **Score Tracking**: Earn points for correct guesses
5. **Session Management**: Prevent duplicate songs in same session

### Advanced Features
1. **Dynamic Playlists**: Create playlists from local database
2. **Smart Search**: Search songs with genre/artist filters
3. **Random Selection**: Add random songs with filters
4. **Duplicate Prevention**: Avoid adding same song twice
5. **Collapsible UI**: Hide/show playlist tracks
6. **Real-time Search**: Instant search results with filters

---

## 🔧 Technical Architecture

### Frontend Architecture
- **React 18** with functional components and hooks
- **State Management**: React useState and useEffect
- **Styling**: Inline styles with organized style objects
- **API Integration**: Fetch API for backend communication
- **Spotify Integration**: Web Playback SDK for music control

### Backend Architecture
- **Express.js** server with RESTful API
- **MongoDB** with Mongoose-like service layer
- **Spotify API** integration with OAuth
- **Error Handling**: Comprehensive error catching and logging
- **Middleware**: CORS, JSON parsing, session management

### Data Flow
1. **User Authentication** → Spotify OAuth → Access Token
2. **Database Query** → MongoDB → Song Selection
3. **Spotify Search** → API Call → Track Matching
4. **Playlist Creation** → Spotify API → Playlist Management
5. **Game Play** → Web Playback SDK → Music Control

---

## 🐛 Troubleshooting

### Common Issues
1. **Spotify Authentication Errors**:
   - Check redirect URI in Spotify app settings
   - Verify Client ID/Secret in environment
   - Clear browser cookies and retry

2. **MongoDB Connection Issues**:
   - Ensure MongoDB is running
   - Check connection string
   - Verify database and collection exist

3. **API Errors**:
   - Check server is running on port 5000
   - Verify CORS settings
   - Check network connectivity

4. **Playback Issues**:
   - Ensure Spotify Premium account
   - Check browser permissions
   - Verify device is active in Spotify

### Debug Mode
- Enable console logging in browser
- Check server logs for detailed error messages
- Use browser network tab to monitor API calls

---

## 🔄 Recent Optimizations

### Code Improvements
1. **Extracted Styles**: Moved inline styles to organized objects
2. **Reusable Components**: Created Button and Message components
3. **useCallback Hooks**: Optimized function performance
4. **Constants**: Centralized API URLs and configuration
5. **Error Handling**: Improved error management and user feedback
6. **Code Organization**: Better separation of concerns

### Performance Enhancements
1. **Memoization**: Used useCallback for expensive operations
2. **Reduced Re-renders**: Optimized dependency arrays
3. **Efficient State Updates**: Minimized unnecessary state changes
4. **API Optimization**: Reduced redundant API calls

---

## 📝 Development Notes

### Best Practices Implemented
- **Component Composition**: Reusable, modular components
- **Error Boundaries**: Comprehensive error handling
- **Loading States**: User feedback during operations
- **Responsive Design**: Mobile-friendly interface
- **Accessibility**: Keyboard navigation and screen reader support

### Future Enhancements
1. **User Accounts**: Persistent user profiles
2. **Leaderboards**: Global and friend-based scoring
3. **Custom Playlists**: Save and share playlists
4. **Advanced Filters**: More sophisticated search options
5. **Offline Mode**: Cached song data for offline play
6. **Social Features**: Share scores and playlists

---

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review server logs for error details
3. Verify all dependencies are installed
4. Ensure MongoDB and Spotify services are running
5. Check network connectivity and firewall settings

---

*Last Updated: 06 08 2025*
*Version: 1.0.0* 