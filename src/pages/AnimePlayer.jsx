import Hls from 'hls.js'
import { useEffect, useRef, useState } from 'react'
import {
  FiArrowLeft,
  FiChevronLeft,
  FiChevronRight,
  FiFilm,
  FiGrid,
  FiHeart,
  FiList,
  FiLoader,
  FiMaximize,
  FiMonitor,
  FiPause,
  FiPlay,
  FiServer,
  FiSettings,
  FiVolume2,
  FiVolumeX
} from 'react-icons/fi'

import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  getAnimeDetails,
  getEpisodes,
  getPosterUrl,
  getProxiedStreamUrl,
  getServers,
  getStreamLink
} from '../services/anime'

// Provider options
const PROVIDER_OPTIONS = [
  { id: 'hianime-scrap', label: 'HiAnime' },
  { id: 'animekai', label: 'AnimeKai' },
  { id: 'animepahe', label: 'AnimePahe' }
]

const AnimePlayerPage = () => {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const urlEpisode = searchParams.get('ep')
  const urlProvider = searchParams.get('provider')
  const initialEpisode = urlEpisode ? parseInt(urlEpisode) : 1
  
  const [anime, setAnime] = useState(null)
  const [episodes, setEpisodes] = useState([])
  const [episodesList, setEpisodesList] = useState([]) // Store real episode IDs from API
  const [servers, setServers] = useState({ sub: [], dub: [], raw: [] })
  const [currentEpisode, setCurrentEpisode] = useState(initialEpisode)
  const [episodeData, setEpisodeData] = useState(null)
  const [streamData, setStreamData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [loadingStream, setLoadingStream] = useState(false)
  const [selectedType, setSelectedType] = useState('sub')
  const [selectedServer, setSelectedServer] = useState(null)
  const [selectedProvider, setSelectedProvider] = useState(urlProvider || 'hianime-scrap')
  const [videoUrl, setVideoUrl] = useState(null)
  const [showEpisodes, setShowEpisodes] = useState(false)
  const [showServers, setShowServers] = useState(false)

  // Fetch anime details and episodes - only once on mount
  useEffect(() => { 
    const fetchAnimeDetails = async () => {
      try {
        setLoading(true)
        console.log(`[AnimePlayer] Fetching anime details for ID: ${id}`)
        const detailsData = await getAnimeDetails(id)
        console.log(`[AnimePlayer] Anime details received:`, detailsData.data)
        setAnime(detailsData.data)
        
        // Fetch episodes list to get real episode IDs
        console.log(`[AnimePlayer] Fetching episodes with provider: ${selectedProvider}`)
        const episodesData = await getEpisodes(id, selectedProvider)
        console.log(`[AnimePlayer] Episodes data received:`, episodesData)
        
        if (episodesData && episodesData.data) {
          setEpisodesList(episodesData.data)
          console.log(`[AnimePlayer] Episodes list set:`, episodesData.data)
          
          // Build episodes array from real data
          const eps = episodesData.data.map((ep, index) => ({
            number: ep.number || index + 1,
            id: ep.id // Use real episode ID from API
          }))
          console.log(`[AnimePlayer] Built episodes array:`, eps)
          setEpisodes(eps)
        } else {
          // Fallback: create episodes from total count
          console.warn(`[AnimePlayer] No episodes data received, using fallback`)
          const totalEps = detailsData.data.episodes?.eps || 0
          if (totalEps > 0) {
            const eps = Array.from({ length: totalEps }, (_, i) => ({
              number: i + 1,
              id: `${id}::ep=${i + 1}`
            }))
            console.log(`[AnimePlayer] Fallback episodes array:`, eps)
            setEpisodes(eps)
          }
        }
      } catch (err) {
        console.error(`[AnimePlayer] Error fetching anime details:`, err)
        setError(err.message || 'Failed to load anime')
      } finally {
        setLoading(false)
      }
    }
    
    fetchAnimeDetails()
  }, [id, selectedProvider])

  // Fetch servers - when episode or provider changes
  useEffect(() => {
    if (!id || !currentEpisode) {
      console.log(`[AnimePlayer] Skipping server fetch - missing id or currentEpisode`)
      return
    }

    // Don't fetch servers until we have the episodes list
    if (episodesList.length === 0) {
      console.log(`[AnimePlayer] Skipping server fetch - episodes list not loaded yet`)
      return
    }

    const fetchServers = async () => {
      try {
        // Get real episode ID from episodes list
        const currentEpData = episodesList.find(ep => ep.number === currentEpisode)
        const episodeId = currentEpData?.id || `${id}::ep=${currentEpisode}`
        
        console.log(`[AnimePlayer] Fetching servers for episode:`, {
          currentEpisode,
          episodeId,
          foundInList: !!currentEpData,
          episodesListLength: episodesList.length
        })
        
        const serversData = await getServers(episodeId)
        console.log(`[AnimePlayer] Servers data received:`, serversData)
        
        if (serversData && serversData.data) {
          const serverData = serversData.data
          const newServers = {
            sub: serverData.sub || [],
            dub: serverData.dub || [],
            raw: serverData.raw || []
          }
          setServers(newServers)
          console.log(`[AnimePlayer] Servers set:`, newServers)
          
          // Store episode data from API response
          setEpisodeData({
            episode: serverData.episode
          })

          // Auto-select first available server for current type
          const availableServers = newServers[selectedType] || newServers.sub || []
          if (availableServers.length > 0) {
            console.log(`[AnimePlayer] Auto-selecting server:`, availableServers[0])
            setSelectedServer(availableServers[0])
          } else {
            console.warn(`[AnimePlayer] No servers available for type: ${selectedType}`)
          }
        } else {
          console.warn(`[AnimePlayer] No servers data received`)
        }
      } catch (err) {
        console.error(`[AnimePlayer] Error fetching servers:`, err)
      }
    }

    fetchServers()
  }, [id, currentEpisode, selectedProvider, episodesList])

  // Fetch stream - only when server or type changes
  useEffect(() => {
    if (!id || !currentEpisode || !selectedServer) {
      console.log(`[AnimePlayer] Skipping stream fetch - missing required data:`, {
        hasId: !!id,
        hasCurrentEpisode: !!currentEpisode,
        hasSelectedServer: !!selectedServer
      })
      return
    }

    // Don't fetch stream until we have the episodes list
    if (episodesList.length === 0) {
      console.log(`[AnimePlayer] Skipping stream fetch - episodes list not loaded yet`)
      return
    }

    const fetchStream = async () => {
      setLoadingStream(true)
      try {
        // Get real episode ID from episodes list
        const currentEpData = episodesList.find(ep => ep.number === currentEpisode)
        const episodeId = currentEpData?.id || `${id}::ep=${currentEpisode}`
        
        const serverName = selectedServer.name || selectedServer
        
        console.log(`[AnimePlayer] Fetching stream:`, {
          episodeId,
          serverName,
          selectedType,
          selectedProvider,
          foundInList: !!currentEpData
        })
        
        const streamResponse = await getStreamLink(
          episodeId, 
          serverName, 
          selectedType, 
          selectedProvider
        )
        
        console.log(`[AnimePlayer] Stream response received:`, streamResponse)
        
        if (streamResponse && streamResponse.data) {
          setStreamData(streamResponse.data)
          
          // Get the video URL and proxy it
          const originalUrl = streamResponse.data.link?.file || streamResponse.data.link?.directUrl
          console.log(`[AnimePlayer] Original stream URL:`, originalUrl)
          
          if (originalUrl) {
            const proxiedUrl = getProxiedStreamUrl(originalUrl)
            console.log(`[AnimePlayer] Proxied stream URL:`, proxiedUrl)
            setVideoUrl(proxiedUrl)
          } else {
            console.error(`[AnimePlayer] No stream URL found in response`)
            setError('No stream URL available')
          }
        } else {
          console.error(`[AnimePlayer] No stream data received`)
          setError('Failed to load stream data')
        }
      } catch (err) {
        console.error(`[AnimePlayer] Error fetching stream:`, err)
        setError(`Failed to load stream: ${err.message}`)
      } finally {
        setLoadingStream(false)
      }
    }

    fetchStream()
  }, [id, currentEpisode, selectedType, selectedServer?.id || selectedServer, episodeData, episodesList])

  const handleEpisodeChange = (episodeNum) => {
    setCurrentEpisode(episodeNum)
    setEpisodeData(null)
    setVideoUrl(null)
    setStreamData(null)
    setShowEpisodes(false)
    navigate(`?ep=${episodeNum}&provider=${selectedProvider}`, { replace: true })
  }

  const handleServerChange = (server) => {
    setSelectedServer(server)
    setShowServers(false)
    setVideoUrl(null)
    setStreamData(null)
  }

  const handleTypeChange = (type) => {
    setSelectedType(type)
    // Find first server of new type
    const availableServers = servers[type] || []
    if (availableServers.length > 0) {
      setSelectedServer(availableServers[0])
    } else {
      setSelectedServer(null)
    }
    setVideoUrl(null)
    setStreamData(null)
  }

  const handleProviderChange = (provider) => {
    setSelectedProvider(provider)
    setSelectedServer(null)
    setEpisodeData(null)
    setVideoUrl(null)
    setStreamData(null)
    navigate(`?ep=${currentEpisode}&provider=${provider}`, { replace: true })
  }

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center">
      <div className="relative">
        <div className="absolute inset-0 bg-purple-500 blur-3xl opacity-20 rounded-full"></div>
        <FiLoader className="animate-spin text-purple-500 text-5xl relative z-10" />
      </div>
      <p className="mt-6 text-gray-400 text-lg animate-pulse">Loading anime...</p>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800/80 backdrop-blur-md border border-red-500/30 rounded-2xl p-8 max-w-md text-center shadow-2xl shadow-red-500/10">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <FiFilm className="text-red-500 text-3xl" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Failed to Load</h2>
        <p className="text-red-400 mb-6">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-300 hover:scale-105"
        >
          Try Again
        </button>
      </div>
    </div>
  )

  const posterUrl = getPosterUrl(anime?.poster)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Enhanced Header with Glassmorphism */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-md border-b border-white/10 p-4 shadow-lg">
        <div className="container mx-auto flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-300 hover:scale-105 group"
          >
            <FiArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> 
            <span className="font-medium">Back</span>
          </button>
          
          <div className="flex items-center gap-3 max-w-md">
            {posterUrl && (
              <img 
                src={posterUrl} 
                alt={anime?.title} 
                className="w-10 h-14 object-cover rounded-lg shadow-md hidden md:block"
              />
            )}
            <h1 className="font-bold text-lg md:text-xl truncate max-w-xs md:max-w-md text-white/90">
              {anime?.title}
            </h1>
          </div>
          
          <button className="p-2 rounded-full bg-white/10 hover:bg-red-500/20 hover:text-red-400 transition-all duration-300">
            <FiHeart size={20} />
          </button>
        </div>
      </div>

      <div className="pt-20">
        {/* Enhanced Video Player - Full Height */}
        <div className="relative bg-black aspect-video w-full shadow-2xl">
          {loadingStream ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
              <div className="relative">
                <div className="absolute inset-0 bg-purple-500 blur-2xl opacity-30 rounded-full animate-pulse"></div>
                <FiLoader className="animate-spin text-purple-500 text-5xl relative z-10" />
              </div>
              <p className="mt-4 text-gray-400 animate-pulse">Loading stream...</p>
            </div>
          ) : videoUrl ? (
            <VideoPlayer 
              src={videoUrl} 
              poster={posterUrl}
              tracks={streamData?.tracks || []}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
              <div className="text-center p-8 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-white/10">
                <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiFilm size={40} className="text-purple-400" />
                </div>
                <p className="text-gray-300 text-lg font-medium">
                  {selectedServer ? 'Preparing your stream...' : 'Select a server to start watching'}
                </p>
                <p className="text-gray-500 text-sm mt-2">Choose from available servers below</p>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Controls Bar */}
        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-6 border-t border-white/10 shadow-2xl">
          <div className="container mx-auto flex flex-wrap items-center justify-between gap-4">
            {/* Enhanced Episode Navigation */}
            <div className="flex items-center gap-3 bg-gray-800/80 backdrop-blur-sm rounded-xl p-2 border border-white/5">
              <button 
                disabled={currentEpisode <= 1}
                onClick={() => handleEpisodeChange(currentEpisode - 1)}
                className="p-3 bg-gray-700 hover:bg-purple-600 disabled:opacity-30 disabled:hover:bg-gray-700 rounded-lg transition-all duration-300 hover:scale-105 shadow-lg"
              >
                <FiChevronLeft size={20} />
              </button>
              <div className="px-4 py-2 bg-gray-900/50 rounded-lg border border-white/10">
                <span className="text-gray-400 text-xs uppercase tracking-wider">Episode</span>
                <p className="font-bold text-lg text-white">{currentEpisode} <span className="text-gray-500 text-sm font-normal">/ {episodes.length}</span></p>
              </div>
              <button 
                disabled={currentEpisode >= episodes.length}
                onClick={() => handleEpisodeChange(currentEpisode + 1)}
                className="p-3 bg-gray-700 hover:bg-purple-600 disabled:opacity-30 disabled:hover:bg-gray-700 rounded-lg transition-all duration-300 hover:scale-105 shadow-lg"
              >
                <FiChevronRight size={20} />
              </button>
            </div>

            {/* Enhanced Provider & Server Selection */}
            <div className="flex gap-3 flex-wrap">
              <div className="relative">
                <select
                  value={selectedProvider}
                  onChange={(e) => handleProviderChange(e.target.value)}
                  className="px-4 py-3 bg-gray-800/80 backdrop-blur-sm border border-white/10 rounded-xl text-white text-sm appearance-none pr-10 cursor-pointer hover:bg-gray-700/80 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                  {PROVIDER_OPTIONS.map(provider => (
                    <option key={provider.id} value={provider.id}>
                      {provider.label}
                    </option>
                  ))}
                </select>
                <FiServer className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
              </div>
              
              <button 
                onClick={() => setShowEpisodes(!showEpisodes)} 
                className={`flex items-center gap-2 px-5 py-3 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg border ${
                  showEpisodes 
                    ? 'bg-purple-600 border-purple-500 text-white' 
                    : 'bg-gray-800/80 backdrop-blur-sm border-white/10 hover:bg-gray-700/80'
                }`}
              >
                <FiGrid size={18} /> 
                <span className="font-medium">Episodes</span>
              </button>
              
              <button 
                onClick={() => setShowServers(!showServers)} 
                className={`flex items-center gap-2 px-5 py-3 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg border ${
                  showServers 
                    ? 'bg-purple-600 border-purple-500 text-white' 
                    : 'bg-gray-800/80 backdrop-blur-sm border-white/10 hover:bg-gray-700/80'
                }`}
              >
                <FiSettings size={18} /> 
                <span className="font-medium">Server</span>
              </button>
            </div>
            
            {/* Enhanced Type Selection (Sub/Dub/Raw) */}
            <div className="flex bg-gray-800/80 backdrop-blur-sm rounded-xl p-1.5 border border-white/10">
              {['sub', 'dub', 'raw'].map(type => (
                <button
                  key={type}
                  onClick={() => handleTypeChange(type)}
                  className={`px-5 py-2.5 rounded-lg capitalize font-medium transition-all duration-300 ${
                    selectedType === type 
                      ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/25' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Enhanced Episode Selector */}
          {showEpisodes && (
            <EpisodeSelector 
              episodes={episodes} 
              currentEpisode={currentEpisode} 
              onSelect={handleEpisodeChange} 
            />
          )}

          {/* Enhanced Server Selector */}
          {showServers && (
            <ServerSelector 
              servers={servers}
              selectedType={selectedType}
              selectedServer={selectedServer}
              onServerChange={handleServerChange}
              onTypeChange={handleTypeChange}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// Video Player Component with HLS support and fallback
const VideoPlayer = ({ src, poster, tracks = [] }) => {
  const videoRef = useRef(null)
  const hlsRef = useRef(null)
  const containerRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [error, setError] = useState(null)
  const [useDirectUrl, setUseDirectUrl] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  // Get effective URL (proxy or direct)
  const getEffectiveUrl = () => {
    if (useDirectUrl) {
      // Extract original URL from proxied URL
      try {
        const urlObj = new URL(src)
        const originalUrl = urlObj.searchParams.get('url')
        if (originalUrl) {
          console.log('[VideoPlayer] Using direct URL fallback:', originalUrl)
          return decodeURIComponent(originalUrl)
        }
      } catch (e) {
        console.error('[VideoPlayer] Error parsing proxy URL:', e)
      }
      return src
    }
    return src
  }

  // Initialize HLS player
  useEffect(() => {
    const video = videoRef.current
    const effectiveSrc = getEffectiveUrl()
    if (!video || !effectiveSrc) return

    console.log('[VideoPlayer] Initializing player with URL:', effectiveSrc)
    setError(null)

    // Cleanup existing HLS instance
    if (hlsRef.current) {
      hlsRef.current.detachMedia()
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    // Reset video element
    video.pause()
    video.removeAttribute('src')
    video.load()

    // Check if it's an HLS stream
    const isHLS = effectiveSrc.includes('.m3u8') || effectiveSrc.includes('playlist')

    if (isHLS && Hls.isSupported()) {
      // Use HLS.js for HLS streams with improved config
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
        manifestLoadingTimeOut: 10000,
        manifestLoadingMaxRetry: 3,
        levelLoadingTimeOut: 10000,
        levelLoadingMaxRetry: 3,
        fragLoadingTimeOut: 20000,
        fragLoadingMaxRetry: 3,
        xhrSetup: function(xhr, url) {
          // Add custom headers if needed for CORS
          xhr.withCredentials = false
        }
      })

      hls.loadSource(effectiveSrc)
      hls.attachMedia(video)
      hlsRef.current = hls

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        console.log('[VideoPlayer] Manifest parsed, levels:', data.levels.length)
        setError(null)
        video.play().catch((err) => {
          console.log('[VideoPlayer] Auto-play prevented:', err)
        })
      })

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('[VideoPlayer] HLS error:', data)
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('[VideoPlayer] Network error, attempting recovery...')
              if (retryCount < 2) {
                setRetryCount(prev => prev + 1)
                hls.startLoad()
              } else if (!useDirectUrl) {
                console.log('[VideoPlayer] Switching to direct URL fallback...')
                setUseDirectUrl(true)
                setRetryCount(0)
              } else {
                setError('Network error: Unable to load stream. Please try again later.')
                hls.destroy()
              }
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('[VideoPlayer] Media error, attempting recovery...')
              hls.recoverMediaError()
              break
            default:
              if (!useDirectUrl) {
                console.log('[VideoPlayer] Fatal error, trying direct URL...')
                setUseDirectUrl(true)
              } else {
                setError('Failed to load video stream. The stream may be unavailable.')
                hls.destroy()
              }
              break
          }
        }
      })
    } else {
      // Native playback for MP4 or Safari HLS
      console.log('[VideoPlayer] Using native playback for:', effectiveSrc)
      video.src = effectiveSrc
      video.load()
      video.play().catch((err) => {
        console.log('[VideoPlayer] Auto-play prevented:', err)
      })
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.detachMedia()
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [src, useDirectUrl, retryCount])

  // Handle play/pause
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    
    if (isPlaying) {
      video.play().catch(err => {
        console.error('Play error:', err)
        setIsPlaying(false)
      })
    } else {
      video.pause()
    }
  }, [isPlaying])

  const handleTimeUpdate = () => {
    const video = videoRef.current
    if (!video) return
    
    setCurrentTime(video.currentTime)
    setDuration(video.duration)
    if (video.duration > 0) {
      setProgress((video.currentTime / video.duration) * 100)
    }
  }

  const handleSeek = (e) => {
    const video = videoRef.current
    if (!video) return
    
    const time = (e.target.value / 100) * video.duration
    video.currentTime = time
    setProgress(e.target.value)
  }

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div
      ref={containerRef}
      className="relative group w-full h-full bg-black overflow-hidden flex items-center justify-center"
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {error ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-gray-900 text-red-500">
          <FiFilm size={48} className="mb-2" />
          <p>{error}</p>
          <div className="flex gap-2 mt-4">
            {!useDirectUrl && (
              <button
                onClick={() => {
                  setUseDirectUrl(true)
                  setError(null)
                  setRetryCount(0)
                }}
                className="px-4 py-2 bg-blue-600 rounded text-white hover:bg-blue-700"
              >
                Try Direct URL
              </button>
            )}
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-purple-600 rounded text-white hover:bg-purple-700"
            >
              Reload Player
            </button>
          </div>
        </div>
      ) : (
        <video
          ref={videoRef}
          className="w-full h-full"
          poster={poster}
          onTimeUpdate={handleTimeUpdate}
          onClick={() => setIsPlaying(!isPlaying)}
          muted={isMuted}
          playsInline
          crossOrigin="anonymous"
        >
          {/* Add subtitle tracks */}
          {tracks.map((track, index) => (
            <track
              key={index}
              kind={track.kind || 'subtitles'}
              src={track.file}
              srclang={track.lang || 'en'}
              label={track.label || 'Subtitles'}
              default={track.default || index === 0}
            />
          ))}
        </video>
      )}

      {/* Enhanced Controls Overlay */}
      <div 
        className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 flex flex-col justify-between transition-all duration-500 ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Top bar - spacer with gradient */}
        <div className="h-20 bg-gradient-to-b from-black/60 to-transparent" />

        {/* Center play button with enhanced styling */}
        <div className="flex-1 flex items-center justify-center">
          <button 
            onClick={() => setIsPlaying(!isPlaying)} 
            className="p-8 bg-purple-600/90 backdrop-blur-sm rounded-full text-white transform transition-all duration-300 hover:scale-125 hover:bg-purple-500 shadow-2xl shadow-purple-500/30 group"
          >
            {isPlaying ? (
              <FiPause size={40} className="group-hover:scale-110 transition-transform" />
            ) : (
              <FiPlay size={40} className="ml-1 group-hover:scale-110 transition-transform" />
            )}
          </button>
        </div>

        {/* Enhanced Bottom controls */}
        <div className="p-6 bg-gradient-to-t from-black via-black/80 to-transparent">
          {/* Enhanced Progress bar */}
          <div className="relative mb-5 group">
            <input
              type="range"
              className="w-full h-2 bg-gray-700/50 rounded-full appearance-none cursor-pointer accent-purple-500 hover:accent-purple-400 transition-all"
              min="0"
              max="100"
              value={progress || 0}
              onChange={handleSeek}
              style={{
                background: `linear-gradient(to right, #9333ea 0%, #a855f7 ${progress}%, rgba(55, 65, 81, 0.5) ${progress}%, rgba(55, 65, 81, 0.5) 100%)`
              }}
            />
            <div className="absolute -top-8 left-0 bg-gray-900/90 backdrop-blur-sm px-2 py-1 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity">
              {formatTime(currentTime)}
            </div>
          </div>
          
          {/* Enhanced Control buttons */}
          <div className="flex justify-between items-center">
            <div className="flex gap-5 items-center">
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-3 rounded-full bg-white/10 hover:bg-purple-600/80 transition-all duration-300 hover:scale-110"
              >
                {isPlaying ? <FiPause size={24} /> : <FiPlay size={24} />}
              </button>
              
              <button 
                onClick={() => setIsMuted(!isMuted)} 
                className="p-3 rounded-full bg-white/10 hover:bg-purple-600/80 transition-all duration-300 hover:scale-110"
              >
                {isMuted ? <FiVolumeX size={24} /> : <FiVolume2 size={24} />}
              </button>
              
              <div className="bg-gray-900/60 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/10">
                <span className="text-sm font-mono text-gray-300">
                  <span className="text-purple-400 font-semibold">{formatTime(currentTime)}</span>
                  <span className="mx-2 text-gray-500">/</span>
                  {formatTime(duration)}
                </span>
              </div>
            </div>
            
            <button 
              onClick={handleFullscreen} 
              className="p-3 rounded-full bg-white/10 hover:bg-purple-600/80 transition-all duration-300 hover:scale-110"
            >
              <FiMaximize size={24} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Enhanced Episode Selector Component
const EpisodeSelector = ({ episodes, currentEpisode, onSelect }) => (
  <div className="mt-6 bg-gray-900/80 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-2xl">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-white font-semibold flex items-center gap-2">
        <FiList className="text-purple-400" /> Select Episode
      </h3>
      <span className="text-gray-400 text-sm">{episodes.length} episodes available</span>
    </div>
    <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2 max-h-48 overflow-y-auto p-2 custom-scrollbar">
      {episodes.map(ep => (
        <button 
          key={ep.number} 
          onClick={() => onSelect(ep.number)}
          className={`p-3 text-sm rounded-xl transition-all duration-300 font-medium ${
            currentEpisode === ep.number 
              ? 'bg-gradient-to-br from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/30 scale-105' 
              : 'bg-gray-800 hover:bg-gray-700 hover:scale-105 text-gray-300 border border-white/5'
          }`}
        >
          {ep.number}
        </button>
      ))}
    </div>
  </div>
)

// Enhanced Server Selector Component
const ServerSelector = ({ servers, selectedType, selectedServer, onServerChange, onTypeChange }) => {
  const availableServers = servers[selectedType] || []
  
  return (
    <div className="mt-6 bg-gray-900/80 backdrop-blur-md rounded-2xl p-5 border border-white/10 shadow-2xl">
      {/* Enhanced Type tabs */}
      <div className="flex gap-2 mb-5">
        {['sub', 'dub', 'raw'].map(type => (
          <button
            key={type}
            onClick={() => onTypeChange(type)}
            className={`px-5 py-2.5 rounded-xl capitalize transition-all duration-300 font-medium flex items-center gap-2 ${
              selectedType === type 
                ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/25' 
                : 'bg-gray-800 hover:bg-gray-700 text-gray-400 border border-white/5'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-current"></span>
            {type} 
            <span className={`text-xs px-2 py-0.5 rounded-full ${selectedType === type ? 'bg-white/20' : 'bg-gray-700'}`}>
              {servers[type]?.length || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Enhanced Server list */}
      <div className="mb-3">
        <p className="text-sm text-gray-400 mb-3 flex items-center gap-2">
          <FiMonitor className="text-purple-400" /> Available Servers:
        </p>
        {availableServers.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {availableServers.map((server, index) => (
              <button
                key={server.name || index}
                onClick={() => onServerChange(server)}
                className={`px-5 py-3 text-sm rounded-xl transition-all duration-300 font-medium flex items-center gap-2 ${
                  selectedServer?.name === server.name 
                    ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/30 scale-105' 
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-white/5 hover:scale-105'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${selectedServer?.name === server.name ? 'bg-white' : 'bg-gray-500'}`}></span>
                {server.name || `Server ${index + 1}`}
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-gray-800/50 rounded-xl p-4 text-center border border-white/5">
            <p className="text-gray-500">No servers available for {selectedType}</p>
            <p className="text-gray-600 text-sm mt-1">Try switching to a different type</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default AnimePlayerPage
