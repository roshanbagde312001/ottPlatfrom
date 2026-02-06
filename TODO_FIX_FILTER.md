# TODO: Fix Movies/TV Shows Filter

## Problem
The filter for Movies/TV Shows only works in search mode but not in discovery mode (when no search query is entered).

## Tasks
- [x] 1. Analyze the issue in BrowseMovies.jsx
- [x] 2. Check tmdb.js for discoverTV API
- [x] 3. Confirm the fix plan with user
- [x] 4. Update BrowseMovies.jsx - Fix fetchMovies to use discoverTV for TV shows
- [x] 5. Update BrowseMovies.jsx - Pass correct mediaType to GenreFilter
- [x] 6. Update BrowseMovies.jsx - Display TV shows from tvShows state
- [x] 7. Update BrowseMovies.jsx - Show correct genre names for TV shows
- [x] 8. Test the fix - Dev server running on http://ttt-mauve-rho.vercel.app/

## Changes Made
1. **fetchMovies function**: Now calls `discoverTV` API when `searchType === 'tv'` and no query exists
2. **GenreFilter prop**: Now uses `searchType` instead of URL `mediaType` param
3. **Results count**: Shows "TV shows found" when in TV mode
4. **Display logic**: Shows TV shows from `tvShows` state when in TV mode
5. **Empty state**: Shows "No TV shows found" when appropriate
6. **Active filters**: Shows correct genre names for TV genres



