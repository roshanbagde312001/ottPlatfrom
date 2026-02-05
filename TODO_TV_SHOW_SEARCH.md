# TODO - TV Show Search Implementation

## Goal
When search results contain TV shows, fetch detailed TV show info using the `/tv/{id}` endpoint instead of relying on limited search results.

## Changes Needed

### Step 1: Update tmdb.js
- [x] Add `searchTVShow(tvId)` function to fetch detailed TV show using `/tv/{id}?api_key=...&language=en-US`
- [x] This function will provide complete TV show info (seasons, episodes, full credits, etc.)

### Step 2: Update BrowseMovies.jsx
- [x] Modify search logic to fetch detailed TV show info for TV show results
- [x] This will enrich TV show data with complete details before displaying

### Step 3: Test the implementation
- [ ] Search for a TV show (e.g., "Game of Thrones", "Breaking Bad")
- [ ] Verify detailed TV show info is displayed

## Implementation Details

### tmdb.js - New function:
```javascript
// Search TV show by ID for detailed info (uses /tv/{id} endpoint)
export const searchTVShow = async (tvId) => {
  return fetchFromTMDB(API_ENDPOINTS.TV_DETAILS(tvId))
}
```

### BrowseMovies.jsx - Updated logic:
When `searchType === 'tv'` or `'all'`, fetch detailed TV show info for each TV show result:
```javascript
// For TV shows, filter from multi search results and fetch detailed info
const tvResultsFromMulti = multiResults.results?.filter(item => item.media_type === 'tv') || []

// Fetch detailed TV show info using /tv/{id} endpoint for each TV show
const tvDetailsPromises = tvResultsFromMulti.map(tv => tmdbService.searchTVShow(tv.id))
const tvDetails = await Promise.all(tvDetailsPromises)

// Merge detailed info with search results
const enrichedTvShows = tvResultsFromMulti.map((tv, index) => ({
  ...tv,
  ...tvDetails[index], // Complete TV show data from /tv/{id}
  media_type: 'tv', // Ensure media_type is set correctly
}))
```

## API Endpoint Used
- URL: `https://api.themoviedb.org/3/tv/{tv_id}?api_key={api_key}&language=en-US`
- Example: `https://api.themoviedb.org/3/tv/1399?api_key=ae8f38ac8103ad7b493819986ede706b&language=en-US`

## Status: COMPLETED ✅

