import Hls from 'hls.js'
import { useEffect, useRef, useState } from 'react'
import {
  FiArrowLeft,
  FiChevronLeft,
  FiChevronRight,
  FiChevronUp,
  FiFilm,
  FiHeart,
  FiList,
  FiLoader,
  FiPause,
  FiPlay,
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
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <FiLoader className="animate-spin text-purple-500 text-4xl" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center text-red-500">
      {error}
    </div>
  )

  const posterUrl = getPosterUrl(anime?.poster)

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/90 to-transparent p-4">
        <div className="container mx-auto flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 hover:text-purple-400">
            <FiArrowLeft size={20} /> <span>Back</span>
          </button>
          <h1 className="font-semibold truncate max-w-xs md:max-w-md">{anime?.title}</h1>
          <FiHeart className="cursor-pointer hover:text-red-500" size={20} />
        </div>
      </div>

      <div className="pt-16">
        {/* Video Player */}
        <div className="relative bg-black aspect-video max-h-[75vh] w-full">
          {loadingStream ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <FiLoader className="animate-spin text-purple-500 text-4xl" />
            </div>
          ) : videoUrl ? (
            <VideoPlayer 
              src={videoUrl} 
              poster={posterUrl}
              tracks={streamData?.tracks || []}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <FiFilm size={48} className="mx-auto mb-4" />
                <p>{selectedServer ? 'Loading stream...' : 'Select a server to start watching'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Controls Bar */}
        <div className="bg-gray-800 p-4 border-t border-gray-700">
          <div className="container mx-auto flex flex-wrap items-center justify-between gap-4">
            {/* Episode Navigation */}
            <div className="flex items-center gap-2">
              <button 
                disabled={currentEpisode <= 1}
                onClick={() => handleEpisodeChange(currentEpisode - 1)}
                className="p-2 bg-gray-700 rounded disabled:opacity-50 hover:bg-gray-600"
              ><FiChevronLeft /></button>
              <span className="font-medium">Ep {currentEpisode}</span>
              <button 
                disabled={currentEpisode >= episodes.length}
                onClick={() => handleEpisodeChange(currentEpisode + 1)}
                className="p-2 bg-gray-700 rounded disabled:opacity-50 hover:bg-gray-600"
              ><FiChevronRight /></button>
            </div>

            {/* Provider & Server Selection */}
            <div className="flex gap-2">
              <select
                value={selectedProvider}
                onChange={(e) => handleProviderChange(e.target.value)}
                className="px-3 py-2 bg-gray-700 rounded text-white text-sm"
              >
                {PROVIDER_OPTIONS.map(provider => (
                  <option key={provider.id} value={provider.id}>
                    {provider.label}
                  </option>
                ))}
              </select>
              <button 
                onClick={() => setShowEpisodes(!showEpisodes)} 
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
              >
                <FiList /> Episodes
              </button>
              <button 
                onClick={() => setShowServers(!showServers)} 
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
              >
                <FiSettings /> Server
              </button>
            </div>
            
            {/* Type Selection (Sub/Dub/Raw) */}
            <div className="flex bg-gray-700 rounded p-1">
              {['sub', 'dub', 'raw'].map(type => (
                <button
                  key={type}
                  onClick={() => handleTypeChange(type)}
                  className={`px-4 py-1 rounded capitalize ${selectedType === type ? 'bg-purple-600' : ''}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Episode Selector */}
          {showEpisodes && (
            <EpisodeSelector 
              episodes={episodes} 
              currentEpisode={currentEpisode} 
              onSelect={handleEpisodeChange} 
            />
          )}

          {/* Server Selector */}
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

      {/* Controls Overlay */}
      <div 
        className={`absolute inset-0 bg-black/40 flex flex-col justify-between transition-opacity duration-300 ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Top bar - spacer */}
        <div className="h-16" />

        {/* Center play button */}
        <div className="flex-1 flex items-center justify-center">
          <button 
            onClick={() => setIsPlaying(!isPlaying)} 
            className="p-6 bg-purple-600/90 rounded-full text-white transform transition-transform hover:scale-110"
          >
            {isPlaying ? <FiPause size={32} /> : <FiPlay size={32} className="ml-1" />}
          </button>
        </div>

        {/* Bottom controls */}
        <div className="p-4 bg-gradient-to-t from-black via-black/60 to-transparent">
          {/* Progress bar */}
          <input
            type="range"
            className="w-full h-1 mb-4 accent-purple-500 cursor-pointer"
            min="0"
            max="100"
            value={progress || 0}
            onChange={handleSeek}
          />
          
          {/* Control buttons */}
          <div className="flex justify-between items-center">
            <div className="flex gap-4 items-center">
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="hover:text-purple-400"
              >
                {isPlaying ? <FiPause size={20} /> : <FiPlay size={20} />}
              </button>
              
              <button 
                onClick={() => setIsMuted(!isMuted)} 
                className="hover:text-purple-400"
              >
                {isMuted ? <FiVolumeX size={20} /> : <FiVolume2 size={20} />}
              </button>
              
              <span className="text-xs font-mono text-gray-300">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
            
            <button 
              onClick={handleFullscreen} 
              className="hover:text-purple-400"
            >
              <FiChevronUp size={24} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Episode Selector Component
const EpisodeSelector = ({ episodes, currentEpisode, onSelect }) => (
  <div className="mt-4 grid grid-cols-6 sm:grid-cols-10 gap-2 max-h-40 overflow-y-auto p-2 bg-gray-900 rounded">
    {episodes.map(ep => (
      <button 
        key={ep.number} 
        onClick={() => onSelect(ep.number)}
        className={`p-2 text-sm rounded transition ${
          currentEpisode === ep.number 
            ? 'bg-purple-600 text-white' 
            : 'bg-gray-700 hover:bg-gray-600'
        }`}
      >
        {ep.number}
      </button>
    ))}
  </div>
)

// Server Selector Component
const ServerSelector = ({ servers, selectedType, selectedServer, onServerChange, onTypeChange }) => {
  const availableServers = servers[selectedType] || []
  
  return (
    <div className="mt-4 p-4 bg-gray-900 rounded">
      {/* Type tabs */}
      <div className="flex gap-2 mb-4">
        {['sub', 'dub', 'raw'].map(type => (
          <button
            key={type}
            onClick={() => onTypeChange(type)}
            className={`px-4 py-2 rounded capitalize transition ${
              selectedType === type 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {type} ({servers[type]?.length || 0})
          </button>
        ))}
      </div>

      {/* Server list */}
      <p className="text-sm text-gray-400 mb-2">Available Servers:</p>
      {availableServers.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {availableServers.map((server, index) => (
            <button
              key={server.name || index}
              onClick={() => onServerChange(server)}
              className={`px-4 py-2 text-sm rounded transition ${
                selectedServer?.name === server.name 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {server.name || `Server ${index + 1}`}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No servers available for {selectedType}</p>
      )}
    </div>
  )
}

export default AnimePlayerPage
