const { MongoClient } = require('mongodb');

// MongoDB configuration
const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_NAME = process.env.DATABASE_NAME || 'musicApp';
const COLLECTION_NAME = process.env.COLLECTION_NAME || 'songs';

class MongoService {
    constructor() {
        this.client = null;
        this.db = null;
        this.collection = null;
    }

    async connect() {
        try {
            if (!MONGODB_URI) {
                throw new Error('MONGODB_URI environment variable is required. Please set it in your .env file.');
            }
            
            if (!this.client) {
                this.client = new MongoClient(MONGODB_URI);
                await this.client.connect();
                this.db = this.client.db(DATABASE_NAME);
                this.collection = this.db.collection(COLLECTION_NAME);
                console.log('Connected to MongoDB successfully!');
            }
            
            // Ensure collection exists
            if (!this.collection) {
                this.collection = this.db.collection(COLLECTION_NAME);
            }
        } catch (error) {
            console.error('Error connecting to MongoDB:', error);
            throw error;
        }
    }

    async disconnect() {
        if (this.client) {
            await this.client.close();
            this.client = null;
            this.db = null;
            this.collection = null;
            console.log('Disconnected from MongoDB.');
        }
    }

    // Search songs by text query
    async searchSongs(query, limit = 50) {
        await this.connect();
        
        try {
            const searchQuery = {
                $or: [
                    { title: { $regex: query, $options: 'i' } },
                    { artist: { $regex: query, $options: 'i' } },
                    { genre: { $regex: query, $options: 'i' } }
                ]
            };

            const songs = await this.collection
                .find(searchQuery)
                .sort({ popularity: -1 })
                .limit(limit)
                .toArray();

            return songs;
        } catch (error) {
            console.error('Error searching songs:', error);
            throw error;
        }
    }

    



    // Get all genres
    async getAllGenres() {
        await this.connect();
        
        try {
            const genres = await this.collection.distinct('genre');
            return genres.sort();
        } catch (error) {
            console.error('Error getting genres:', error);
            throw error;
        }
    }

    // Get all artists
    async getAllArtists() {
        await this.connect();
        
        try {
            const artists = await this.collection.distinct('artist');
            return artists.sort();
        } catch (error) {
            console.error('Error getting artists:', error);
            throw error;
        }
    }



    // Advanced search with multiple filters
    async advancedSearch(filters = {}, limit = 50) {
        await this.connect();
        
        try {
            const query = {};

            // Add filters to query
            if (filters.title) {
                query.title = { $regex: filters.title, $options: 'i' };
            }
            if (filters.artist) {
                query.artist = { $regex: filters.artist, $options: 'i' };
            }
            if (filters.genre) {
                query.genre = { $regex: filters.genre, $options: 'i' };
            }
            if (filters.year) {
                query.year = parseInt(filters.year);
            }
            if (filters.yearRange) {
                query.year = {
                    $gte: parseInt(filters.yearRange.start),
                    $lte: parseInt(filters.yearRange.end)
                };
            }
            if (filters.minPopularity) {
                query.popularity = { $gte: parseInt(filters.minPopularity) };
            }

            const songs = await this.collection
                .find(query)
                .sort({ popularity: -1 })
                .limit(limit)
                .toArray();

            return songs;
        } catch (error) {
            console.error('Error in advanced search:', error);
            throw error;
        }
    }

    // Get random song with optional filters
    async getRandomSong(filters = {}) {
        await this.connect();
        
        try {
            const query = {};

            // Add filters to query
            if (filters.genre) {
                query.genre = { $regex: filters.genre, $options: 'i' };
            }
            if (filters.yearFrom || filters.yearTo) {
                query.year = {};
                if (filters.yearFrom) {
                    query.year.$gte = parseInt(filters.yearFrom);
                }
                if (filters.yearTo) {
                    query.year.$lte = parseInt(filters.yearTo);
                }
            }
            if (filters.artistGender) {
                query.artistGender = filters.artistGender;
            }
            if (filters.minPopularity) {
                query.popularity = { $gte: parseInt(filters.minPopularity) };
            }

            // Get total count for random selection
            const totalCount = await this.collection.countDocuments(query);
            
            if (totalCount === 0) {
                return null;
            }

            // Get random song using aggregation
            const randomSong = await this.collection.aggregate([
                { $match: query },
                { $sample: { size: 1 } }
            ]).toArray();

            return randomSong[0] || null;
        } catch (error) {
            console.error('Error getting random song:', error);
            throw error;
        }
    }
}

// Create a singleton instance
const mongoService = new MongoService();

module.exports = mongoService; 