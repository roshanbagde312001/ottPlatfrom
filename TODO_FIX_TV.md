# TV Show Click Fix - TODO List

## Issue: TV shows not working when clicked from search results

### Root Cause Analysis:
1. When clicking a TV show from search, it navigates to `/tv/:id` route
2. The MoviePlayer.jsx tries to fetch TV show details and generate vidsrcme.ru embed URL
3. The vidsrcme.ru embed URL requires an IMDB ID (`?imdb=tt0944947`)
4. If the TV show doesn't have an IMDB ID in TMDB response, the embed URL generation fails
5. The current code doesn't handle this case gracefully

### Solution Steps:

## Step 1: Update MoviePlayer.jsx ✅ COMPLETED
- [x] Add better error handling for missing IMDB ID
- [x] Add useSearchParams hook to read URL parameters
- [x] Show fallback error message when IMDB ID is missing
- [x] Improve the TV show season/episode selector
- [x] Update season/episode from URL params

## Step 2: Update MovieDetails.jsx ✅ COMPLETED
- [x] Add season/episode selector for TV shows
- [x] Pre-select the first episode when navigating to watch
- [x] Pass season/episode params in Watch Now link

## Step 3: Update BrowseMovies.jsx ✅ COMPLETED
- [x] Fix TV show result filtering from search
- [x] Use searchMulti for TV show results

## Step 4: Update helpers.js - NOT NEEDED
- [ ] Current implementation is sufficient

## Step 5: Testing
- [ ] Test with a TV show that has IMDB ID (e.g., Game of Thrones - tt0944947)
- [ ] Test with a TV show that doesn't have IMDB ID
- [ ] Test the season/episode selector

---

## Changes Made:

### MoviePlayer.jsx:
1. Added `useSearchParams` import
2. Added `watchError` state to track streaming errors
3. Updated `getVidsrcUrl()` to set error when IMDB ID is missing
4. Added error UI for missing IMDB ID case
5. Read season/episode from URL params
6. Initialize state from URL params

### MovieDetails.jsx:
1. Added `useState` for season/episode selection
2. Added season/episode dropdowns before Watch Now button
3. Updated Watch Now link to include season/episode params

### BrowseMovies.jsx:
1. Fixed TV show search to use searchMulti instead of filtering from movie results
2. Properly filter TV shows from multi-search results

---

## Expected Behavior After Fix:

1. When user clicks a TV show from search → navigates to TV details page
2. User can select season/episode from dropdowns
3. Click "Watch Now" → navigates to player with correct season/episode
4. If TV show has IMDB ID → vidsrcme.ru player loads
5. If TV show has no IMDB ID → shows error message

---

## Implementation Details:

### MoviePlayer.jsx changes:
```jsx
// Current code for vidsrc URL generation:
const getVidsrcUrl = () => {
  if (!movie?.imdb_id) return null
  return getVidsrcEmbedUrl(movie.imdb_id, type, vidsrcSeason, vidsrcEpisode)
}

// New code with better handling:
const getVidsrcUrl = () => {
  // Try to use imdb_id first
  if (movie?.imdb_id) {
    return getVidsrcEmbedUrl(movie.imdb_id, type, vidsrcSeason, vidsrcEpisode)
  }
  
  // If no imdb_id, show error message
  return null
}

// Add error UI when IMDB ID is missing
const NoIMDBError = () => (
  <div className="text-center py-16">
    <h2 className="text-2xl font-bold text-white mb-4">IMDB ID Required</h2>
    <p className="text-gray-400 mb-6">
      This TV show doesn't have an IMDB ID in our database, 
      so we can't generate a streaming link.
    </p>
    <p className="text-gray-500 text-sm">
      Try searching for the TV show by its IMDB ID manually.
    </p>
  </div>
)
```

### MovieDetails.jsx changes:
```jsx
// Add season/episode selector before "Watch Now" button
const [selectedSeason, setSelectedSeason] = useState(1)
const [selectedEpisode, setSelectedEpisode] = useState(1)

// In the UI, before Watch Now button:
{type === 'tv' && (
  <div className="flex gap-4 mb-4">
    <select
      value={selectedSeason}
      onChange={(e) => setSelectedSeason(Number(e.target.value))}
      className="bg-gray-800 text-white px-4 py-2 rounded-lg"
    >
      {details.seasons?.map((season) => (
        <option key={season.id} value={season.season_number}>
          Season {season.season_number}
        </option>
      ))}
    </select>
    <select
      value={selectedEpisode}
      onChange={(e) => setSelectedEpisode(Number(e.target.value))}
      className="bg-gray-800 text-white px-4 py-2 rounded-lg"
    >
      {[...Array(details.seasons?.[selectedSeason - 1]?.episode_count || 1)].map((_, i) => (
        <option key={i + 1} value={i + 1}>Episode {i + 1}</option>
      ))}
    </select>
  </div>
)}
```

---

## Files to Modify:
1. `/Users/roshanbagde/Desktop/shivam website/ottplatform/src/pages/MoviePlayer.jsx`
2. `/Users/roshanbagde/Desktop/shivam website/ottplatform/src/pages/MovieDetails.jsx`
3. `/Users/roshanbagde/Desktop/shivam website/ottplatform/src/pages/BrowseMovies.jsx`

## Estimated Time: 2-3 hours

