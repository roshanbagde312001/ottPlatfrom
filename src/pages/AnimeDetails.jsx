import { useCallback, useEffect, useState } from 'react';
import { FiArrowLeft, FiExternalLink, FiList, FiLoader, FiPlay, FiStar } from 'react-icons/fi';
import { Link, useParams } from 'react-router-dom';

// API Base
const API_BASE = 'http://ttt-mauve-rho.vercel.app';

// Anime Details Page
const AnimeDetailsPage = () => {
  const { id } = useParams()
  const [details, setDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedEpisode, setSelectedEpisode] = useState(1)
  const [servers, setServers] = useState([])
  const [loadingServers, setLoadingServers] = useState(false)
  const [episodes, setEpisodes] = useState([])

  // Fetch anime details
  const fetchDetails = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(
        `${API_BASE}/anime/info/${id}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to get anime details')
      }
      
      const data = await response.json()
      setDetails(data)
      
      // Generate episode list if available
      if (data.episodes && data.episodes.length > 0) {
        setEpisodes(data.episodes)
      } else if (data.totalEpisodes) {
        // Generate episode list from totalEpisodes
        const eps = []
        for (let i = 1; i <= Math.min(data.totalEpisodes, 100); i++) {
          eps.push({ number: i, id: `${id}-episode-${i}` })
        }
        setEpisodes(eps)
      }
    } catch (err) {
      console.error('Details error:', err)
      setError(err.message || 'Failed to load anime details')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchDetails()
  }, [fetchDetails])

  // Fetch servers for selected episode
  const fetchServers = useCallback(async () => {
    setLoadingServers(true)
    setServers([])
    
    try {
      const response = await fetch(
        `${API_BASE}/anime/watch/${id}/${selectedEpisode}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to get servers')
      }
      
      const data = await response.headers.get('content-type')?.includes('application/json') 
        ? await response.json() 
        : { sources: [], data }
      
      // Extract sources from response
      if (data.sources && data.sources.length > 0) {
        setServers(data.sources)
      } else if (Array.isArray(data)) {
        setServers(data)
      } else {
        setServers([])
      }
    } catch (err) {
      console.error('Servers error:', err)
      // If server fetch fails, still show the anime details
      setServers([])
    } finally {
      setLoadingServers(false)
    }
  }, [id, selectedEpisode])

  useEffect(() => {
    if (details) {
      fetchServers()
    }
  }, [selectedEpisode, details, fetchServers])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <FiLoader className="animate-spin text-purple-500 text-4xl mx-auto mb-4" />
          <p className="text-gray-400">Loading anime details...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-red-500 text-lg mb-4">{error}</p>
          <Link
            to="/anime"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <FiArrowLeft size={20} />
            Back to Anime
          </Link>
        </div>
      </div>
    )
  }

  if (!details) {
    return null
  }

  const anime = details

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Hero Section */}
      <div className="relative">
        {/* Backdrop */}
        {anime.cover && (
          <div className="absolute inset-0 h-[50vh] overflow-hidden">
            <img
              src={anime.cover}
              alt={anime.title}
              className="w-full h-full object-cover opacity-20"
              onError={(e) => {
                e.target.style.display = 'none'
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-gray-900/50 to-gray-900" />
          </div>
        )}
        
        {/* Back Button */}
        <div className="relative z-10 container mx-auto px-4 py-6">
          <Link
            to="/anime"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <FiArrowLeft size={20} />
            Back to Anime
          </Link>
        </div>
        
        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 pb-8">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Poster */}
            <div className="flex-shrink-0">
              <img
                src={anime.image || anime.poster || 'https://via.placeholder.com/300x450?text=No+Image'}
                alt={anime.title}
                className="w-full max-w-[300px] rounded-xl shadow-2xl"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/300x450?text=No+Image'
                }}
              />
            </div>
            
            {/* Info */}
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
                {anime.title || 'Unknown Title'}
              </h1>
              
              {anime.japaneseTitle && (
                <p className="text-gray-400 text-lg mb-4">
                  {anime.japaneseTitle}
                </p>
              )}
              
              {/* Rating */}
              {anime.rating && (
                <div className="flex items-center gap-2 mb-4">
                  <FiStar className="text-yellow-500" />
                  <span className="text-yellow-500 font-bold">{anime.rating.toFixed(1)}</span>
                  <span className="text-gray-400">/ 10</span>
                </div>
              )}
              
              {/* Meta */}
              <div className="flex flex-wrap gap-4 mb-6">
                {anime.type && (
                  <span className="px-3 py-1 bg-purple-600 text-white rounded-full text-sm">
                    {anime.type}
                  </span>
                )}
                {anime.status && (
                  <span className="px-3 py-1 bg-gray-700 text-white rounded-full text-sm">
                    {anime.status}
                  </span>
                )}
                {anime.releaseDate && (
                  <span className="px-3 py-1 bg-gray-700 text-white rounded-full text-sm">
                    {anime.releaseDate}
                  </span>
                )}
                {anime.totalEpisodes && (
                  <span className="px-3 py-1 bg-gray-700 text-white rounded-full text-sm">
                    {anime.totalEpisodes} Episodes
                  </span>
                )}
              </div>
              
              {/* Genres */}
              {anime.genres && anime.genres.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-gray-400 text-sm mb-2">Genres</h3>
                  <div className="flex flex-wrap gap-2">
                    {anime.genres.map((genre, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gray-800 text-purple-400 rounded-full text-sm"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Description */}
              {anime.description && (
                <div className="mb-6">
                  <h3 className="text-gray-400 text-sm mb-2">Synopsis</h3>
                  <p className="text-gray-300 leading-relaxed">
                    {anime.description}
                  </p>
                </div>
              )}
              
              {/* External Link */}
              {anime.url && (
                <a
                  href={anime.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  <FiExternalLink size={18} />
                  View on Source
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Episodes & Servers Section */}
      <div className="container mx-auto px-4 py-8 border-t border-gray-800">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Episodes List */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <FiList />
              Episodes
            </h2>
            
            {/* Episode Selector */}
            {episodes.length > 0 && (
              <div className="mb-6">
                <label className="text-gray-400 text-sm mb-2 block">
                  Select Episode: Episode {selectedEpisode}
                </label>
              </div>
            )}
            
            {/* Episodes Grid */}
            {episodes.length > 0 ? (
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                {episodes.map((ep) => (
                  <button
                    key={ep.number || ep.id}
                    onClick={() => setSelectedEpisode(ep.number)}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      selectedEpisode === ep.number
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    {ep.number}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No episode information available</p>
            )}
          </div>
          
          {/* Servers */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <FiPlay />
              Watch Episode {selectedEpisode}
            </h2>
            
            {/* Loading Servers */}
            {loadingServers ? (
              <div className="flex items-center justify-center py-8">
                <FiLoader className="animate-spin text-purple-500 text-2xl" />
              </div>
            ) : servers.length > 0 ? (
              <div className="space-y-3">
                {servers.map((server, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-800 rounded-xl hover:bg-gray-700 transition-colors"
                  >
                    <div>
                      <span className="text-white font-medium">
                        {server.quality || server.label || server.name || `Server ${index + 1}`}
                      </span>
                      {server.size && (
                        <span className="ml-2 text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded">
                          {server.size}
                        </span>
                      )}
                    </div>
                    <a
                      href={server.url || server.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                    >
                      <FiPlay size={16} />
                      Watch
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-800/50 rounded-xl">
                <p className="text-gray-400 mb-4">No streaming sources available for this episode</p>
                <p className="text-gray-500 text-sm mb-4">
                  Try selecting a different episode
                </p>
                {anime.url && (
                  <a
                    href={anime.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                  >
                    <FiExternalLink size={18} />
                    Watch on Source Site
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Related Anime */}
      {anime.related && anime.related.length > 0 && (
        <div className="container mx-auto px-4 py-8 border-t border-gray-800">
          <h2 className="text-2xl font-bold text-white mb-6">
            Related Anime
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {anime.related.slice(0, 6).map((rel) => (
              <Link
                key={rel.id}
                to={`/anime/${rel.id}`}
                className="group bg-gray-800 rounded-xl overflow-hidden hover:ring-2 hover:ring-purple-500 transition-all"
              >
                <div className="aspect-[2/3] overflow-hidden">
                  <img
                    src={rel.image || rel.poster || 'https://via.placeholder.com/200x300?text=No+Image'}
                    alt={rel.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/200x300?text=No+Image'
                    }}
                  />
                </div>
                <div className="p-3">
                  <h3 className="text-white text-sm truncate group-hover:text-purple-400">
                    {rel.title}
                  </h3>
                  {rel.type && (
                    <p className="text-gray-500 text-xs mt-1">{rel.type}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default AnimeDetailsPage

