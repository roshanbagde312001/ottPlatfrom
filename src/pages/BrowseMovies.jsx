import { useCallback, useEffect, useState } from 'react'
import { FiGrid, FiList } from 'react-icons/fi'
import { useSearchParams } from 'react-router-dom'
import { MovieCard } from '../components/movie/MovieCard'
import { GenreFilter, RatingFilter, SortOptions, YearFilter } from '../components/search/GenreFilter'
import { SearchBar } from '../components/search/SearchBar'
import { SkeletonCard } from '../components/ui/Skeleton'
import * as tmdbService from '../services/tmdb'
import { GENRES } from '../utils/constants'

// Browse Movies Page
const BrowseMoviesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [movies, setMovies] = useState([])
  const [tvShows, setTvShows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [viewMode, setViewMode] = useState('grid') // grid | list
  const [searchType, setSearchType] = useState('all') // all | movie | tv
  
  // Filter states
  const query = searchParams.get('q') || ''
  const mediaType = searchParams.get('type') || 'movie'
  const genreId = searchParams.get('genre') ? parseInt(searchParams.get('genre')) : null
  const sortBy = searchParams.get('sort') || 'popularity.desc'
  const year = searchParams.get('year') ? parseInt(searchParams.get('year')) : null
  const rating = searchParams.get('rating') ? parseInt(searchParams.get('rating')) : null
  
  // Fetch movies
  const fetchMovies = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      let response
      
      if (query) {
        // Search mode - search both movies and TV shows
        const [movieResults, multiResults] = await Promise.all([
          tmdbService.searchMovies(query),
          tmdbService.searchMulti(query)
        ])
        
        if (searchType === 'movie') {
          setMovies(movieResults.results || [])
          setTvShows([])
        } else if (searchType === 'tv') {
          // For TV shows, filter from multi search results
          setMovies([])
          setTvShows(multiResults.results?.filter(item => item.media_type === 'tv') || [])
        } else {
          // All - combine results from both APIs
          const allMovies = movieResults.results || []
          const allTv = multiResults.results?.filter(item => item.media_type === 'tv') || []
          
          // Merge and sort by popularity
          const combined = [...allMovies, ...allTv]
            .sort((a, b) => b.popularity - a.popularity)
          
          setMovies(combined)
          setTvShows([])
        }
      } else {
        // Discovery mode with filters
        const params = {
          page: 1,
          sort_by: sortBy,
          include_adult: false,
          language: 'en-US',
        }
        
        if (genreId) {
          params.with_genres = genreId
        }
        if (year) {
          params.primary_release_year = year
        }
        if (rating) {
          params.vote_average_gte = rating
        }
        
        response = await tmdbService.discoverMovies(params)
        setMovies(response.results || [])
        setTvShows([])
      }
    } catch (err) {
      console.error('Error fetching movies:', err)
      setError(err.message || 'Failed to load movies')
    } finally {
      setLoading(false)
    }
  }, [query, genreId, sortBy, year, rating, searchType])
  
  useEffect(() => {
    fetchMovies()
  }, [fetchMovies])
  
  // Update URL with filters
  const updateFilter = (key, value) => {
    const newParams = new URLSearchParams(searchParams)
    if (value === null || value === '' || (key === 'genre' && value === null)) {
      newParams.delete(key)
    } else {
      newParams.set(key, value)
    }
    setSearchParams(newParams)
  }
  
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800/50 border-b border-gray-800">
        <div className="container mx-auto px-4 py-6">
          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-6">
            {query ? `Search Results for "${query}"` : 'Browse Movies & TV Shows'}
          </h1>
          
          {/* Search */}
          <div className="mb-6">
            <SearchBar />
          </div>
          
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Media Type Filter */}
            <div className="flex items-center bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setSearchType('all')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  searchType === 'all' 
                    ? 'bg-netflix-red text-white' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSearchType('movie')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  searchType === 'movie' 
                    ? 'bg-netflix-red text-white' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Movies
              </button>
              <button
                onClick={() => setSearchType('tv')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  searchType === 'tv' 
                    ? 'bg-netflix-red text-white' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                TV Shows
              </button>
            </div>
            
            <GenreFilter
              mediaType={mediaType}
              selectedGenre={genreId}
              onGenreChange={(id) => updateFilter('genre', id)}
            />
            
            <SortOptions
              selectedOption={sortBy}
              onSortChange={(id) => updateFilter('sort', id)}
            />
            
            <YearFilter
              selectedYear={year}
              onYearChange={(y) => updateFilter('year', y)}
            />
            
            <RatingFilter
              selectedRating={rating}
              onRatingChange={(r) => updateFilter('rating', r)}
            />
            
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-netflix-red text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <FiGrid size={20} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-netflix-red text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <FiList size={20} />
              </button>
            </div>
          </div>
          
          {/* Active Filters */}
          {(genreId || year || rating) && (
            <div className="flex flex-wrap gap-2 mt-4">
              {genreId && (
                <button
                  onClick={() => updateFilter('genre', null)}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-netflix-red text-white text-sm rounded-full hover:bg-red-700 transition-colors"
                >
                  {GENRES.MOVIE.find(g => g.id === genreId)?.name}
                  <span className="ml-1">×</span>
                </button>
              )}
              {year && (
                <button
                  onClick={() => updateFilter('year', null)}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-netflix-red text-white text-sm rounded-full hover:bg-red-700 transition-colors"
                >
                  {year}
                  <span className="ml-1">×</span>
                </button>
              )}
              {rating && (
                <button
                  onClick={() => updateFilter('rating', null)}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-netflix-red text-white text-sm rounded-full hover:bg-red-700 transition-colors"
                >
                  {rating}+ Rating
                  <span className="ml-1">×</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Results Count */}
        <p className="text-gray-400 mb-6">
          {loading ? 'Loading...' : `${movies.length} results found`}
        </p>
        
        {/* Loading State */}
        {loading && (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4'
            : 'space-y-4'
          }>
            {[...Array(12)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}
        
        {/* Error State */}
        {!loading && error && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-netflix-red text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
        
        {/* Empty State */}
        {!loading && !error && movies.length === 0 && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <p className="text-gray-400 text-lg mb-4">No movies found</p>
              <p className="text-gray-500 text-sm">Try adjusting your filters</p>
            </div>
          </div>
        )}
        
        {/* Movies Grid/List */}
        {!loading && !error && movies.length > 0 && (
          <div className={viewMode === 'grid'
            ? 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4'
            : 'space-y-4'
          }>
            {movies.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                size={viewMode === 'grid' ? 'md' : 'lg'}
                showInfoOnHover={viewMode === 'grid'}
              />
            ))}
          </div>
        )}
        
        {/* Load More */}
        {!loading && movies.length > 0 && movies.length >= 20 && (
          <div className="flex justify-center mt-8">
            <button
              className="px-8 py-3 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Load More
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default BrowseMoviesPage

