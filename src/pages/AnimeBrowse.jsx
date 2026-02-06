import { useCallback, useEffect, useState } from 'react'
import { FiInfo, FiPlay, FiSearch } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { SkeletonCard } from '../components/ui/Skeleton'
import { getTopAiringAnime } from '../services/anime'

// API Base
const API_BASE = 'https://ttt-mauve-rho.vercel.app/anime/animekai';

// Anime Browse Page
const AnimeBrowsePage = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [hasSearched, setHasSearched] = useState(true)

  // Fetch top airing anime on page load
  useEffect(() => {
    const fetchTopAiringAnime = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await getTopAiringAnime()
        if (data.results && data.results.length > 0) {
          setResults(data.results)
        } else {
          setResults([])
        }
      } catch (err) {
        console.error('Top airing anime error:', err)
        setError('Failed to load top airing anime')
      } finally {
        setLoading(false)
      }
    }

    fetchTopAiringAnime()
  }, [])

  // Search handler
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a search term')
      return
    }

    setLoading(true)
    setError(null)
    setHasSearched(true)

    try {
      const response = await fetch(`${API_BASE}/${encodeURIComponent(searchQuery.trim())}`)
      
      if (!response.ok) {
        throw new Error('Failed to search anime')
      }
      
      const data = await response.json()
      
      if (data.results && data.results.length > 0) {
        setResults(data.results)
      } else {
        setResults([])
      }
    } catch (err) {
      console.error('Search error:', err)
      setError(err.message || 'Failed to search anime')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [searchQuery])

  // Handle Enter key
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  // Clear search and reload top airing anime
  const clearSearch = async () => {
    setSearchQuery('')
    setHasSearched(true)
    setError(null)
    
    try {
      setLoading(true)
      const data = await getTopAiringAnime()
      if (data.results && data.results.length > 0) {
        setResults(data.results)
      } else {
        setResults([])
      }
    } catch (err) {
      console.error('Top airing anime error:', err)
      setError('Failed to load top airing anime')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/80 to-gray-900/80 border-b border-gray-800">
        <div className="container mx-auto px-4 py-8">
          {/* Title */}
          <div className="flex items-center gap-3 mb-6">
            <span className="text-4xl">🎌</span>
            <h1 className="text-3xl md:text-4xl font-bold text-white">
              AnimeFlix
            </h1>
          </div>
          
          {/* Search */}
          <div className="max-w-2xl">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Search anime (e.g., Naruto, Attack on Titan, One Piece)..."
                className="w-full px-5 py-4 pr-14 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
              />
              <button
                onClick={handleSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <FiSearch size={20} />
              </button>
            </div>
            <p className="mt-3 text-gray-400 text-sm">
              Powered by AnimeKai • Search thousands of anime titles
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Results Header */}
        {results.length > 0 && (
          <div className="flex items-center justify-between mb-6">
            <p className="text-gray-400">
              {loading ? 'Loading...' : 
                hasSearched && searchQuery ? 
                  `${results.length} results for "${searchQuery}"` : 
                  'Top Airing Anime'}
            </p>
            {hasSearched && searchQuery && (
              <button
                onClick={clearSearch}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors"
              >
                Show Top Airing
              </button>
            )}
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[...Array(12)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Initial State - Top Airing Anime */}
        {!loading && !error && !hasSearched && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-4">🎌</div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Top Airing Anime
              </h2>
              <p className="text-gray-400">
                Discover the most popular anime currently airing
              </p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && hasSearched && results.length === 0 && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="text-6xl mb-4">😔</div>
              <h2 className="text-2xl font-bold text-white mb-2">
                No Results Found
              </h2>
              <p className="text-gray-400 mb-4">
                No anime found for "{searchQuery}"
              </p>
              <p className="text-gray-500 text-sm">
                Try a different search term
              </p>
            </div>
          </div>
        )}

        {/* Results Grid */}
        {!loading && !error && results.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {results.map((anime) => (
              <AnimeCard key={anime.id} anime={anime} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Anime Card Component
const AnimeCard = ({ anime }) => {
  return (
    <Link
      to={`/anime/${encodeURIComponent(anime.id)}?title=${encodeURIComponent(anime.title)}`}
      className="group relative bg-gray-800 rounded-xl overflow-hidden hover:ring-2 hover:ring-purple-500 transition-all duration-300"
    >
      {/* Poster Image */}
      <div className="aspect-[2/3] overflow-hidden">
        <img
          src={anime.image || 'https://via.placeholder.com/200x300?text=No+Image'}
          alt={anime.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          onError={(e) => {
            e.target.src = 'https://via.placeholder.com/200x300?text=No+Image'
          }}
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <button
              onClick={(e) => {
                e.preventDefault()
                window.open(anime.url, '_blank')
              }}
              className="w-full flex items-center justify-center gap-2 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors mb-2"
            >
              <FiPlay size={16} />
              Watch
            </button>
            <Link
              to={`/anime/${encodeURIComponent(anime.id)}?title=${encodeURIComponent(anime.title)}`}
              className="w-full flex items-center justify-center gap-2 py-2 bg-gray-700/80 hover:bg-gray-600 text-white rounded-lg transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <FiInfo size={16} />
              Details
            </Link>
          </div>
        </div>
      </div>
      
      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-white text-sm truncate group-hover:text-purple-400 transition-colors">
          {anime.title}
        </h3>
        {anime.releaseDate && (
          <p className="text-gray-400 text-xs mt-1">
            {anime.releaseDate}
          </p>
        )}
      </div>
    </Link>
  )
}

export default AnimeBrowsePage

