// ===== LOCAL MUSIC SEARCH MODULE =====
// This module provides local JSON-based music search functionality
// It's used as a fallback when MongoDB is not available (legacy system)

// Import Node.js file system promises API for async file operations
const fs = require('fs').promises;
// Import Node.js path module for cross-platform file path handling
const path = require('path');

// ===== MODULE STATE =====
// Cache for loaded music data to avoid repeated file reads
let musicData = null;

// ===== DATA LOADING FUNCTIONS =====
// Main function to load music data from JSON files
// Implements fallback logic: tries mega database first, then rock/metal database
async function loadMusicData() {
    // Only load data if not already cached (singleton pattern)
    if (!musicData) {
        try {
            // Try to load the mega database first (larger, more comprehensive)
            let dataPath = path.join(__dirname, '..', 'data', 'megaMusicDatabase.json');
            try {
                // Read and parse the mega database JSON file
                musicData = JSON.parse(await fs.readFile(dataPath, 'utf8'));
                console.log(`📚 Loaded ${musicData.length} songs from megaMusicDatabase.json`);
            } catch (megaError) {
                // If mega database fails, fallback to rock/metal database
                console.log('Mega database not found, trying rock/metal database...');
                dataPath = path.join(__dirname, '..', 'data', 'realRockMetalDatabase.json');
                // Read and parse the rock/metal database JSON file
                musicData = JSON.parse(await fs.readFile(dataPath, 'utf8'));
                console.log(`📚 Loaded ${musicData.length} songs from realRockMetalDatabase.json`);
            }
        } catch (error) {
            // Log and re-throw any file reading or parsing errors
            console.error('Error loading music data:', error);
            throw error;
        }
    }
    // Return cached data (or newly loaded data)
    return musicData;
}

// ===== SEARCH FUNCTIONS =====
// Basic search function for finding songs by title or artist
// Performs case-insensitive substring matching
async function searchSongs(query, limit = 10) {
    try {
        // Load music data from JSON files
        const data = await loadMusicData();
        
        // Validate search query (must be at least 2 characters)
        if (!query || query.trim().length < 2) {
            return [];
        }
        
        // Normalize search term for case-insensitive comparison
        const searchTerm = query.trim().toLowerCase();
        
        // Filter songs that match the search term in title or artist
        const results = data.filter(song => 
            song.title.toLowerCase().includes(searchTerm) || // Check song title
            song.artist.toLowerCase().includes(searchTerm)   // Check artist name
        );
        
        // Sort results by popularity (descending) and then alphabetically by title
        return results
            .sort((a, b) => {
                // Primary sort: popularity (higher popularity first)
                if (b.popularity !== a.popularity) {
                    return b.popularity - a.popularity;
                }
                // Secondary sort: alphabetical by title
                return a.title.localeCompare(b.title);
            })
            .slice(0, limit); // Limit results to specified number
    } catch (error) {
        console.error('Error searching songs:', error);
        throw error;
    }
}

// Advanced search function with multiple filter options
// Supports text search combined with various filters (genre, year, artist gender, popularity)
async function searchSongsAdvanced(query, filters = {}, limit = 10) {
    try {
        // Load music data from JSON files
        const data = await loadMusicData();
        
        // Start with all songs and apply filters progressively
        let results = data;
        
        // ===== TEXT SEARCH FILTER =====
        // Apply text search if query is provided
        if (query && query.trim()) {
            const searchTerm = query.trim().toLowerCase();
            results = results.filter(song => 
                song.title.toLowerCase().includes(searchTerm) || // Check song title
                song.artist.toLowerCase().includes(searchTerm)   // Check artist name
            );
        }
        
        // ===== GENRE FILTER =====
        // Filter by genre (case-insensitive substring matching)
        if (filters.genre) {
            const genreTerm = filters.genre.toLowerCase();
            results = results.filter(song => 
                song.genre.toLowerCase().includes(genreTerm)
            );
        }
        
        // ===== YEAR RANGE FILTER =====
        // Filter by year range (from year to year)
        if (filters.yearFrom || filters.yearTo) {
            results = results.filter(song => {
                // Check if song year is before the minimum year
                if (filters.yearFrom && song.year < parseInt(filters.yearFrom)) return false;
                // Check if song year is after the maximum year
                if (filters.yearTo && song.year > parseInt(filters.yearTo)) return false;
                // Song year is within the specified range
                return true;
            });
        }
        
        // ===== ARTIST GENDER FILTER =====
        // Filter by artist gender (exact match)
        if (filters.artistGender) {
            results = results.filter(song => 
                song.artistGender === filters.artistGender
            );
        }
        
        // ===== MINIMUM POPULARITY FILTER =====
        // Filter by minimum popularity score
        if (filters.minPopularity) {
            results = results.filter(song => 
                song.popularity >= parseInt(filters.minPopularity)
            );
        }
        
        // Sort results by popularity (descending) and then alphabetically by title
        return results
            .sort((a, b) => {
                // Primary sort: popularity (higher popularity first)
                if (b.popularity !== a.popularity) {
                    return b.popularity - a.popularity;
                }
                // Secondary sort: alphabetical by title
                return a.title.localeCompare(b.title);
            })
            .slice(0, limit); // Limit results to specified number
    } catch (error) {
        console.error('Error in advanced search:', error);
        throw error;
    }
}

// Function to get a random song with optional filters
// Useful for game functionality where random song selection is needed
async function getRandomSong(filters = {}) {
    try {
        // Load music data from JSON files
        const data = await loadMusicData();
        
        // Start with all songs and apply filters progressively
        let results = data;
        
        // ===== APPLY FILTERS =====
        // Filter by genre (case-insensitive substring matching)
        if (filters.genre) {
            const genreTerm = filters.genre.toLowerCase();
            results = results.filter(song => 
                song.genre.toLowerCase().includes(genreTerm)
            );
        }
        
        // Filter by year range (from year to year)
        if (filters.yearFrom || filters.yearTo) {
            results = results.filter(song => {
                // Check if song year is before the minimum year
                if (filters.yearFrom && song.year < parseInt(filters.yearFrom)) return false;
                // Check if song year is after the maximum year
                if (filters.yearTo && song.year > parseInt(filters.yearTo)) return false;
                // Song year is within the specified range
                return true;
            });
        }
        
        // Filter by artist gender (exact match)
        if (filters.artistGender) {
            results = results.filter(song => 
                song.artistGender === filters.artistGender
            );
        }
        
        // Filter by minimum popularity score
        if (filters.minPopularity) {
            results = results.filter(song => 
                song.popularity >= parseInt(filters.minPopularity)
            );
        }
        
        // Check if any songs match the filters
        if (results.length === 0) {
            return null; // No songs match the criteria
        }
        
        // Select a random song from the filtered results
        const randomIndex = Math.floor(Math.random() * results.length);
        return results[randomIndex];
    } catch (error) {
        console.error('Error getting random song:', error);
        throw error;
    }
}

// ===== UTILITY FUNCTIONS =====
// Function to get all unique genres from the music database
// Returns a sorted array of genre names for dropdown menus
async function getGenres() {
    try {
        // Load music data from JSON files
        const data = await loadMusicData();
        // Extract unique genres using Set and convert back to array
        const genres = [...new Set(data.map(song => song.genre))];
        // Return sorted alphabetically
        return genres.sort();
    } catch (error) {
        console.error('Error getting genres:', error);
        throw error;
    }
}



// ===== MODULE EXPORTS =====
// Export all functions for use in other modules
module.exports = {
  searchSongs,        // Basic search by title/artist
  searchSongsAdvanced, // Advanced search with multiple filters
  getRandomSong,      // Get random song with optional filters
  getGenres           // Get all unique genres
}; 