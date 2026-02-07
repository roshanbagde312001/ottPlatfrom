import { useCallback, useEffect, useState } from 'react'
import {
  FiCalendar,
  FiClock,
  FiHeart,
  FiInfo,
  FiList,
  FiPlay,
  FiSearch,
  FiStar,
  FiTrendingUp
} from 'react-icons/fi'
import { Link } from 'react-router-dom'
import {
  browseByQuery,
  getHomeData,
  getPosterUrl,
  searchAnime
} from '../services/anime'

// API Base
const API_BASE = 'https://api.animo.qzz.io/api/v1'

// Provider options
const PROVIDER_OPTIONS = [
  { id: 'hianime-scrap', label: 'HiAnime' },
  { id: 'animekai', label: 'AnimeKai' },
  { id: 'animepahe', label: 'AnimePahe' },
  {id: 'hianime-scrap' ,label: "hianime-scrap"}
]

// Browse categories
const BROWSE_CATEGORIES = [
  { id: 'top-airing', label: 'Top Airing', icon: <FiTrendingUp /> },
  { id: 'most-popular', label: 'Most Popular', icon: <FiStar /> },
  { id: 'most-favorite', label: 'Most Favorite', icon: <FiHeart /> },
  { id: 'completed', label: 'Completed', icon: <FiList /> },
  { id: 'recently-added', label: 'Recently Added', icon: <FiClock /> },
  { id: 'top-upcoming', label: 'Top Upcoming', icon: <FiCalendar /> },
  { id: 'subbed-anime', label: 'Subbed Anime', icon: <FiPlay /> },
  { id: 'dubbed-anime', label: 'Dubbed Anime', icon: <FiPlay /> },
]

// Anime Browse Page
const AnimeBrowsePage = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [homeData, setHomeData] = useState(null)
  const [metaInfo, setMetaInfo] = useState(null)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeSection, setActiveSection] = useState('trending')
  const [currentCategory, setCurrentCategory] = useState('trending')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchMode, setSearchMode] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState('hianime-scrap')

  // Fetch home data on page load
  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const [home, meta] = await Promise.all([
          getHomeData(),
          // getMetaInfo()
        ])
        
        setHomeData(home.data)
        // setMetaInfo(meta.data)
        
        // Set initial results to trending
        if (home.data.trending && home.data.trending.length > 0) {
          setResults(home.data.trending)
        } else if (home.data.topAiring && home.data.topAiring.length > 0) {
          setResults(home.data.topAiring)
        }
      } catch (err) {
        console.error('Home data error:', err)
        setError('Failed to load anime data')
      } finally {
        setLoading(false)
      }
    }

    fetchHomeData()
  }, [])

  // Handle category selection
  const handleCategorySelect = async (categoryId) => {
    setSearchMode(false)
    setCurrentCategory(categoryId)
    setPage(1)
    setLoading(true)
    setError(null)

    try {
      const data = await browseByQuery(categoryId, 1)
      
      if (data.data && data.data.response) {
        setResults(data.data.response)
        setTotalPages(data.data.pageInfo?.totalPages || 1)
      } else {
        // Use home data sections
        if (homeData) {
          const sectionData = homeData[categoryId] || homeData.topAiring || []
          setResults(sectionData)
        }
      }
    } catch (err) {
      console.error('Category fetch error:', err)
      setError('Failed to load category')
    } finally {
      setLoading(false)
    }
  }

  // Search handler
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchMode(false)
      return
    }

    setLoading(true)
    setError(null)
    setSearchMode(true)

    try {
      const data = await searchAnime(searchQuery.trim(), 1, selectedProvider)

      if (data.data && data.data.response) {
        setResults(data.data.response)
        setTotalPages(data.data.pageInfo?.totalPages || 1)
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
  }, [searchQuery, selectedProvider])

  // Handle Enter key
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  // Load more results
  const loadMore = async () => {
    if (page >= totalPages) return
    
    setLoading(true)
    
    try {
      let newResults
      if (searchMode) {
        const data = await searchAnime(searchQuery.trim(), page + 1)
        if (data.data?.response) {
          newResults = [...results, ...data.data.response]
        }
      } else {
        const data = await browseByQuery(currentCategory, page + 1)
        if (data.data?.response) {
          newResults = [...results, ...data.data.response]
        }
      }
      
      if (newResults) {
        setResults(newResults)
        setPage(page + 1)
      }
    } catch (err) {
      console.error('Load more error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Clear search and reset
  const clearSearch = () => {
    setSearchQuery('')
    setSearchMode(false)
    setPage(1)
    if (homeData) {
      const sectionData = homeData[currentCategory] || homeData.topAiring || []
      setResults(sectionData)
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
              Hinaime Anime
            </h1>
          </div>
          
          {/* Provider Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Anime Provider
            </label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
            >
              {PROVIDER_OPTIONS.map(provider => (
                <option key={provider.id} value={provider.id}>
                  {provider.label}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="max-w-2xl mb-6">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Search anime (e.g., Naruto, One Piece, Attack on Titan)..."
                className="w-full px-5 py-4 pr-14 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
              />
              <button
                onClick={handleSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <FiSearch size={20} />
              </button>
            </div>
            {searchMode && (
              <button
                onClick={clearSearch}
                className="mt-2 text-sm text-gray-400 hover:text-white"
              >
                Clear search
              </button>
            )}
          </div>
          
          {/* Browse Categories */}
          <div className="flex flex-wrap gap-2">
            {BROWSE_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => handleCategorySelect(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentCategory === cat.id && !searchMode
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                {cat.icon}
                <span className="hidden sm:inline">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Section Title */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            {searchMode ? (
              <>
                <FiSearch className="text-purple-500" />
                Search Results for "{searchQuery}"
              </>
            ) : (
              <>
                {currentCategory === 'top-airing' && <FiTrendingUp className="text-purple-500" />}
                {currentCategory === 'most-popular' && <FiStar className="text-yellow-500" />}
                {currentCategory === 'most-favorite' && <FiHeart className="text-red-500" />}
                {BROWSE_CATEGORIES.find(c => c.id === currentCategory)?.label || 'Anime'}
              </>
            )}
          </h2>
          <span className="text-gray-400">
            {results.length} results
          </span>
        </div>

        {/* Error State */}
        {error && !loading && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={searchMode ? handleSearch : () => handleCategorySelect(currentCategory)}
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
              <AnimeSkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && results.length === 0 && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="text-6xl mb-4">😔</div>
              <h2 className="text-2xl font-bold text-white mb-2">
                No Results Found
              </h2>
              <p className="text-gray-400 mb-4">
                {searchMode 
                  ? `No anime found for "${searchQuery}"`
                  : 'No anime found in this category'
                }
              </p>
              <p className="text-gray-500 text-sm">
                Try a different search term or category
              </p>
            </div>
          </div>
        )}

        {/* Results Grid */}
        {!loading && !error && results.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {results.map((anime) => (
                <AnimeCard key={anime.id} anime={anime} provider={selectedProvider} />
              ))}
            </div>

            {/* Load More */}
            {page < totalPages && (
              <div className="text-center mt-8">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="px-8 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Anime Card Component
const AnimeCard = ({ anime }) => {
  return (
    <Link
      to={`/anime/${encodeURIComponent(anime.id)}`}
      className="group relative bg-gray-800 rounded-xl overflow-hidden hover:ring-2 hover:ring-purple-500 transition-all duration-300"
    >
      {/* Poster Image */}
      <div className="aspect-[2/3] overflow-hidden">
        <img
          src={getPosterUrl(anime.poster)}
          alt={anime.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          onError={(e) => {
            e.target.src = 'https://via.placeholder.com/200x300?text=No+Image'
          }}
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <Link
              to={`/watch/anime/${encodeURIComponent(anime.id)}?ep=1`}
              className="w-full flex items-center justify-center gap-2 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors mb-2"
              onClick={(e) => e.stopPropagation()}
            >
              <FiPlay size={16} />
              Watch
            </Link>
            <Link
              to={`/anime/${encodeURIComponent(anime.id)}`}
              className="w-full flex items-center justify-center gap-2 py-2 bg-gray-700/80 hover:bg-gray-600 text-white rounded-lg transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <FiInfo size={16} />
              Details
            </Link>
          </div>
        </div>
        
        {/* Episode Count Badge */}
        {anime.episodes && (
          <div className="absolute top-2 right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded">
            {anime.episodes.eps || anime.episodes.sub || 0} eps
          </div>
        )}
        
        {/* Type Badge */}
        {anime.type && (
          <div className="absolute top-2 left-2 bg-gray-900/80 text-gray-300 text-xs px-2 py-1 rounded">
            {anime.type}
          </div>
        )}
      </div>
      
      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-white text-sm truncate group-hover:text-purple-400 transition-colors">
          {anime.title}
        </h3>
        {anime.alternativeTitle && (
          <p className="text-gray-500 text-xs mt-1 truncate">
            {anime.alternativeTitle}
          </p>
        )}
        {anime.rank && (
          <div className="flex items-center gap-1 mt-1 text-yellow-500 text-xs">
            <FiStar size={12} />
            <span>#{anime.rank}</span>
          </div>
        )}
      </div>
    </Link>
  )
}

// Skeleton Card
const AnimeSkeletonCard = () => {
  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden animate-pulse">
      <div className="aspect-[2/3] bg-gray-700" />
      <div className="p-3">
        <div className="h-4 bg-gray-700 rounded w-3/4 mb-2" />
        <div className="h-3 bg-gray-700 rounded w-1/2" />
      </div>
    </div>
  )
}

export default AnimeBrowsePage

