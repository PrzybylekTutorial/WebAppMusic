# Rock, Alternative, and Metal Music Data Collection

This directory contains scripts to collect real music data from rock, alternative, and metal genres using various APIs and sources.

## Available Scripts

### 1. `collectRockMetalData.js`
Collects data from **MusicBrainz API** only. This is the recommended starting point as it doesn't require additional API keys.

**Features:**
- Collects data from 100+ real rock, alternative, and metal artists
- Filters for target genres (rock, metal, alternative, etc.)
- Includes detailed metadata (artist, album, year, genre, popularity)
- Respects API rate limits

### 2. `collectFromMultipleSources.js`
Collects data from multiple sources including MusicBrainz and Last.fm (requires API key).

**Features:**
- MusicBrainz data (no API key required)
- Last.fm data (requires API key)
- Combines data from multiple sources
- More comprehensive dataset

### 3. `runDataCollection.js`
Simple runner script to execute data collection with different options.

## How to Use

### Option 1: Quick Start (MusicBrainz Only)
```bash
cd data
node runDataCollection.js musicbrainz
```

### Option 2: Multiple Sources (Requires Last.fm API Key)
1. Get a Last.fm API key from: https://www.last.fm/api/account/create
2. Edit `collectFromMultipleSources.js` and replace `YOUR_LASTFM_API_KEY` with your actual key
3. Run:
```bash
cd data
node runDataCollection.js multiple
```

### Option 3: Direct Script Execution
```bash
# MusicBrainz only
node collectRockMetalData.js

# Multiple sources (if API key configured)
node collectFromMultipleSources.js
```

## Target Genres

The scripts collect data for these genres:
- **Rock**: Classic Rock, Hard Rock, Progressive Rock, Indie Rock, Post-Rock
- **Metal**: Heavy Metal, Thrash Metal, Death Metal, Black Metal, Power Metal, Progressive Metal, Nu Metal, Metalcore, Deathcore, Folk Metal
- **Alternative**: Alternative Rock, Grunge, Post-Grunge, Industrial, Shoegaze

## Artists Included

The scripts include real artists from various subgenres:

### Classic Rock
- Led Zeppelin, The Rolling Stones, Pink Floyd, The Who, Jimi Hendrix
- Cream, The Doors, The Beatles, Queen, AC/DC, Aerosmith, Van Halen

### Metal
- Iron Maiden, Judas Priest, Metallica, Megadeth, Slayer, Anthrax
- Pantera, Sepultura, Testament, Death, Obituary, Cannibal Corpse
- Mayhem, Burzum, Darkthrone, Emperor, Immortal, Helloween
- Blind Guardian, Gamma Ray, Stratovarius, Rhapsody, Sonata Arctica

### Alternative/Grunge
- Nirvana, Pearl Jam, Soundgarden, Alice in Chains, Stone Temple Pilots
- Red Hot Chili Peppers, Foo Fighters, Green Day, Blink-182, Linkin Park
- Radiohead, The Smashing Pumpkins, Nine Inch Nails, Rage Against the Machine

### Progressive
- Dream Theater, Tool, Porcupine Tree, Opeth, Mastodon
- Between the Buried and Me, Haken, Leprous, Caligula's Horse

## Output Files

The scripts generate the following JSON files:

- `realRockMetalDatabase.json` - Data from MusicBrainz only
- `multiSourceRockMetalDatabase.json` - Combined data from multiple sources

## Data Structure

Each song entry contains:
```json
{
  "id": "song_1",
  "title": "Song Title",
  "artist": "Artist Name",
  "year": 1991,
  "genre": "Heavy Metal",
  "popularity": 85,
  "artistGender": "unknown",
  "album": "Album Name",
  "source": "MusicBrainz",
  "tags": ["metal", "heavy metal", "classic"]
}
```

## Rate Limiting

The scripts include built-in rate limiting to respect API limits:
- MusicBrainz: 1 second delay between requests
- Last.fm: 0.5 second delay between requests
- 2-3 second delay between artists

## Troubleshooting

### Common Issues

1. **"Artist not found" messages**: This is normal for some artists that may not be in the database
2. **Rate limiting errors**: The scripts handle this automatically, but you may see some delays
3. **Empty results**: Check your internet connection and API availability

### API Limits

- **MusicBrainz**: No API key required, but has rate limits
- **Last.fm**: Requires API key, 5000 requests per day limit

## Data Quality

The collected data includes:
- ✅ Real artist names and song titles
- ✅ Actual release years
- ✅ Genre classification
- ✅ Popularity scoring based on multiple factors
- ✅ Album information
- ✅ Tags and metadata

## Next Steps

After collecting the data:
1. Review the generated JSON files
2. Use the data in your music search application
3. Consider running the collection periodically to get updated data
4. Customize the artist lists to focus on specific subgenres

## Customization

You can modify the scripts to:
- Add more artists to the collection lists
- Adjust genre filtering
- Change popularity calculation algorithms
- Add more data sources
- Modify rate limiting settings 