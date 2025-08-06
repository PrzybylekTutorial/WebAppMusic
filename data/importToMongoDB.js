// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

const { MongoClient } = require('mongodb');
const fs = require('fs').promises;
const path = require('path');

// MongoDB connection configuration
const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_NAME = process.env.DATABASE_NAME || 'musicApp';
const COLLECTION_NAME = process.env.COLLECTION_NAME || 'songs';

async function importDataToMongoDB() {
    let client;
    
    try {
        if (!MONGODB_URI) {
            throw new Error('MONGODB_URI environment variable is required. Please set it in your backend/.env file.');
        }
        
        console.log('Connecting to MongoDB...');
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        
        console.log('Connected to MongoDB successfully!');
        
        const db = client.db(DATABASE_NAME);
        const collection = db.collection(COLLECTION_NAME);
        
        // Read the JSON file
        console.log('Reading realRockMetalDatabase.json...');
        const jsonFilePath = path.join(__dirname, 'realRockMetalDatabase.json');
        const jsonData = await fs.readFile(jsonFilePath, 'utf8');
        const songs = JSON.parse(jsonData);
        
        console.log(`Found ${songs.length} songs to import`);
        
        // Clear existing data (optional - comment out if you want to keep existing data)
        console.log('Clearing existing data...');
        await collection.deleteMany({});
        
        // Insert the data
        console.log('Inserting songs into MongoDB...');
        const result = await collection.insertMany(songs);
        
        console.log(`Successfully imported ${result.insertedCount} songs into MongoDB!`);
        
        // Create indexes for better performance
        console.log('Creating indexes...');
        await collection.createIndex({ title: 1 });
        await collection.createIndex({ artist: 1 });
        await collection.createIndex({ genre: 1 });
        await collection.createIndex({ year: 1 });
        await collection.createIndex({ popularity: -1 });
        await collection.createIndex({ 
            title: "text", 
            artist: "text", 
            genre: "text" 
        });
        
        console.log('Indexes created successfully!');
        
        // Get some statistics
        const totalSongs = await collection.countDocuments();
        const genres = await collection.distinct('genre');
        const artists = await collection.distinct('artist');
        
        console.log('\n=== MongoDB Import Statistics ===');
        console.log(`Total songs: ${totalSongs}`);
        console.log(`Unique genres: ${genres.length}`);
        console.log(`Unique artists: ${artists.length}`);
        console.log('================================\n');
        
        // Show sample data
        const sampleSongs = await collection.find({}).limit(5).toArray();
        console.log('Sample songs in database:');
        sampleSongs.forEach((song, index) => {
            console.log(`${index + 1}. ${song.title} by ${song.artist} (${song.year}) - ${song.genre}`);
        });
        
    } catch (error) {
        console.error('Error importing data to MongoDB:', error);
        throw error;
    } finally {
        if (client) {
            await client.close();
            console.log('MongoDB connection closed.');
        }
    }
}

// Run the import
if (require.main === module) {
    importDataToMongoDB()
        .then(() => {
            console.log('Import completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Import failed:', error);
            process.exit(1);
        });
}

module.exports = { importDataToMongoDB }; 