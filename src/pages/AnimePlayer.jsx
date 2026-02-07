import Hls from 'hls.js'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FiAlertCircle,
  FiArrowLeft,
  FiChevronLeft,
  FiChevronRight,
  FiFastForward,
  FiFilm,
  FiGrid,
  FiHeart,
  FiList,
  FiLoader,
  FiMaximize,
  FiMinimize,
  FiMonitor,
  FiPause,
  FiPlay,
  FiRewind,
  FiServer,
  FiSettings,
  FiSkipForward,
  FiVolume1,
  FiVolume2,
  FiVolumeX,
  FiZoomIn
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
  const [episodesList, setEpisodesList] = useState([])
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

  // Fetch anime details and episodes
  useEffect(() => { 
    const fetchAnimeDetails = async () => {
      try {
        setLoading(true)
        const detailsData = await getAnimeDetails(id)
        setAnime(detailsData.data)
        
        const episodesData = await getEpisodes(id, selectedProvider)
        
        if (episodesData && episodesData.data) {
          setEpisodesList(episodesData.data)
          
          const eps = episodesData.data.map((ep, index) => ({
            number: ep.number || ep.episodeNumber || index + 1,
            id: ep.id,
            title: ep.title || ep.alternativeTitle || `Episode ${ep.number || ep.episodeNumber || index + 1}`,
            isFiller: ep.isFiller || false
          }))
          setEpisodes(eps)
        } else {
          const totalEps = detailsData.data.episodes?.eps || 0
          if (totalEps > 0) {
            const eps = Array.from({ length: totalEps }, (_, i) => ({
              number: i + 1,
              id: `${id}::ep=${i + 1}`
            }))
            setEpisodes(eps)
          }
        }
      } catch (err) {
        setError(err.message || 'Failed to load anime')
      } finally {
        setLoading(false)
      }
    }
    
    fetchAnimeDetails()
  }, [id, selectedProvider])

  // Fetch servers
  useEffect(() => {
    if (!id || !currentEpisode || episodesList.length === 0) return

    const fetchServers = async () => {
      try {
        const currentEpData = episodesList.find(ep => ep.number === currentEpisode)
        const episodeId = currentEpData?.id || `${id}::ep=${currentEpisode}`
        
        const serversData = await getServers(episodeId)
        
        if (serversData && serversData.data) {
          const serverData = serversData.data
          const newServers = {
            sub: serverData.sub || [],
            dub: serverData.dub || [],
            raw: serverData.raw || []
          }
          setServers(newServers)
          setEpisodeData({ episode: serverData.episode })

          const availableServers = newServers[selectedType] || newServers.sub || []
          if (availableServers.length > 0) {
            setSelectedServer(availableServers[0])
          }
        }
      } catch (err) {
        console.error('Error fetching servers:', err)
      }
    }

    fetchServers()
  }, [id, currentEpisode, selectedProvider, episodesList])

  // Fetch stream
  useEffect(() => {
    if (!id || !currentEpisode || !selectedServer || episodesList.length === 0) return

    const fetchStream = async () => {
      setLoadingStream(true)
      try {
        const currentEpData = episodesList.find(ep => ep.number === currentEpisode)
        const episodeId = currentEpData?.id || `${id}::ep=${currentEpisode}`
        const serverName = selectedServer.name || selectedServer
        
        const streamResponse = await getStreamLink(episodeId, serverName, selectedType, selectedProvider)
        
        if (streamResponse && streamResponse.data) {
          setStreamData(streamResponse.data)
          const originalUrl = streamResponse.data.link?.file || streamResponse.data.link?.directUrl
          
          if (originalUrl) {
            const proxiedUrl = getProxiedStreamUrl(originalUrl)
            setVideoUrl(proxiedUrl)
          } else {
            setError('No stream URL available')
          }
        } else {
          setError('Failed to load stream data')
        }
      } catch (err) {
        setError(`Failed to load stream: ${err.message}`)
      } finally {
        setLoadingStream(false)
      }
    }

    fetchStream()
  }, [id, currentEpisode, selectedType, selectedServer, episodeData, episodesList])

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

  const handleNextEpisode = () => {
    if (currentEpisode < episodes.length) {
      handleEpisodeChange(currentEpisode + 1)
    }
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
      {/* Header */}
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
        {/* Video Player */}
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
              animeId={id}
              episodeNumber={currentEpisode}
              onNextEpisode={handleNextEpisode}
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

        {/* Controls Bar */}
        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-6 border-t border-white/10 shadow-2xl">
          <div className="container mx-auto flex flex-wrap items-center justify-between gap-4">
            {/* Episode Navigation */}
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

            {/* Provider & Server Selection */}
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
            
            {/* Type Selection */}
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

// Enhanced Video Player Component
const VideoPlayer = ({ src, poster, tracks = [], animeId, episodeNumber, onNextEpisode }) => {
  const videoRef = useRef(null)
  const hlsRef = useRef(null)
  const containerRef = useRef(null)
  const controlsTimeoutRef = useRef(null)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const touchStartTime = useRef(0)
  
  // Basic states
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [progress, setProgress] = useState(0)
  const [bufferProgress, setBufferProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [error, setError] = useState(null)
  const [useDirectUrl, setUseDirectUrl] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  
  // Enhanced states
  const [playbackRate, setPlaybackRate] = useState(1)
  const [quality, setQuality] = useState('auto')
  const [availableQualities, setAvailableQualities] = useState([])
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true)
  const [theaterMode, setTheaterMode] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [activeTooltip, setActiveTooltip] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showSkipOverlay, setShowSkipOverlay] = useState(false)
  const [autoPlayCountdown, setAutoPlayCountdown] = useState(null)
  const [isBuffering, setIsBuffering] = useState(false)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)

  // Get effective URL
  const getEffectiveUrl = () => {
    if (useDirectUrl) {
      try {
        const urlObj = new URL(src)
        const originalUrl = urlObj.searchParams.get('url')
        if (originalUrl) {
          return decodeURIComponent(originalUrl)
        }
      } catch (e) {
        console.error('Error parsing proxy URL:', e)
      }
      return src
    }
    return src
  }

  // Load watch progress
  useEffect(() => {
    if (animeId && episodeNumber) {
      const key = `watch-progress-${animeId}-${episodeNumber}`
      const saved = localStorage.getItem(key)
      if (saved) {
        const { time, timestamp } = JSON.parse(saved)
        const daysSince = (Date.now() - timestamp) / (1000 * 60 * 60 * 24)
        if (daysSince < 30 && time > 10) {
          const video = videoRef.current
          if (video) {
            video.currentTime = time
            setCurrentTime(time)
          }
        }
      }
    }
  }, [animeId, episodeNumber])

  // Save watch progress
  useEffect(() => {
    if (!animeId || !episodeNumber || !currentTime) return
    
    const interval = setInterval(() => {
      const key = `watch-progress-${animeId}-${episodeNumber}`
      localStorage.setItem(key, JSON.stringify({
        time: currentTime,
        duration: duration,
        timestamp: Date.now()
      }))
    }, 5000)
    
    return () => clearInterval(interval)
  }, [animeId, episodeNumber, currentTime, duration])

  // Load saved preferences
  useEffect(() => {
    const savedVolume = localStorage.getItem('player-volume')
    const savedRate = localStorage.getItem('player-playback-rate')
    const savedQuality = localStorage.getItem('player-quality')
    
    if (savedVolume) setVolume(parseFloat(savedVolume))
    if (savedRate) setPlaybackRate(parseFloat(savedRate))
    if (savedQuality) setQuality(savedQuality)
  }, [])

  // Initialize HLS player
  useEffect(() => {
    const video = videoRef.current
    const effectiveSrc = getEffectiveUrl()
    if (!video || !effectiveSrc) return

    setError(null)

    if (hlsRef.current) {
      hlsRef.current.detachMedia()
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    video.pause()
    video.removeAttribute('src')
    video.load()

    const isHLS = effectiveSrc.includes('.m3u8') || effectiveSrc.includes('playlist')

    if (isHLS && Hls.isSupported()) {
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
        xhrSetup: function(xhr) {
          xhr.withCredentials = false
        }
      })

      hls.loadSource(effectiveSrc)
      hls.attachMedia(video)
      hlsRef.current = hls

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        const qualities = data.levels.map((level, index) => ({
          index,
          height: level.height,
          width: level.width,
          bitrate: level.bitrate,
          label: level.height ? `${level.height}p` : `Quality ${index + 1}`
        })).sort((a, b) => (b.height || 0) - (a.height || 0))
        
        setAvailableQualities([{ index: -1, label: 'Auto' }, ...qualities])
        
        if (quality !== 'auto' && hls) {
          const targetQuality = qualities.find(q => q.label === quality)
          if (targetQuality) {
            hls.currentLevel = targetQuality.index
          }
        }
        
        video.play().catch(() => {})
      })

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (retryCount < 2) {
                setRetryCount(prev => prev + 1)
                hls.startLoad()
              } else if (!useDirectUrl) {
                setUseDirectUrl(true)
                setRetryCount(0)
              } else {
                setError('Network error: Unable to load stream.')
                hls.destroy()
              }
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError()
              break
            default:
              if (!useDirectUrl) {
                setUseDirectUrl(true)
              } else {
                setError('Failed to load video stream.')
                hls.destroy()
              }
              break
          }
        }
      })
    } else {
      video.src = effectiveSrc
      video.load()
      video.play().catch(() => {})
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

  // Handle volume
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.volume = volume
    video.muted = isMuted || volume === 0
    localStorage.setItem('player-volume', volume.toString())
  }, [volume, isMuted])

  // Handle playback rate
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.playbackRate = playbackRate
    localStorage.setItem('player-playback-rate', playbackRate.toString())
  }, [playbackRate])

  // Handle quality change
  const handleQualityChange = useCallback((newQuality) => {
    setQuality(newQuality)
    localStorage.setItem('player-quality', newQuality)
    
    if (hlsRef.current) {
      if (newQuality === 'auto') {
        hlsRef.current.currentLevel = -1
      } else {
        const target = availableQualities.find(q => q.label === newQuality)
        if (target && target.index >= 0) {
          hlsRef.current.currentLevel = target.index
        }
      }
    }
  }, [availableQualities])

  // Toggle subtitles
  const toggleSubtitles = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    
    const textTracks = video.textTracks
    for (let i = 0; i < textTracks.length; i++) {
      textTracks[i].mode = subtitlesEnabled ? 'hidden' : 'showing'
    }
    setSubtitlesEnabled(!subtitlesEnabled)
  }, [subtitlesEnabled])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      
      const video = videoRef.current
      if (!video) return
      
      switch(e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault()
          setIsPlaying(prev => !prev)
          break
        case 'arrowleft':
        case 'j':
          e.preventDefault()
          video.currentTime = Math.max(0, video.currentTime - 10)
          showSkipFeedback('backward')
          break
        case 'arrowright':
        case 'l':
          e.preventDefault()
          video.currentTime = Math.min(video.duration, video.currentTime + 10)
          showSkipFeedback('forward')
          break
        case 'arrowup':
          e.preventDefault()
          setVolume(prev => Math.min(1, prev + 0.1))
          break
        case 'arrowdown':
          e.preventDefault()
          setVolume(prev => Math.max(0, prev - 0.1))
          break
        case 'f':
          e.preventDefault()
          handleFullscreen()
          break
        case 'm':
          e.preventDefault()
          setIsMuted(prev => !prev)
          break
        case 't':
          e.preventDefault()
          setTheaterMode(prev => !prev)
          break
        case '0': case '1': case '2': case '3': case '4':
        case '5': case '6': case '7': case '8': case '9':
          e.preventDefault()
          const percent = parseInt(e.key) * 10
          video.currentTime = (percent / 100) * video.duration
          break
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Fullscreen listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Touch gestures
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    touchStartTime.current = Date.now()
  }

  const handleTouchEnd = (e) => {
    const touchEndX = e.changedTouches[0].clientX
    const touchEndY = e.changedTouches[0].clientY
    const touchDuration = Date.now() - touchStartTime.current
    
    const deltaX = touchEndX - touchStartX.current
    const deltaY = touchEndY - touchStartY.current
    
    // Double tap
    if (touchDuration < 300 && Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
      const video = videoRef.current
      if (video) {
        const rect = video.getBoundingClientRect()
        const touchX = touchStartX.current - rect.left
        
        if (touchX < rect.width / 2) {
          video.currentTime = Math.max(0, video.currentTime - 10)
          showSkipFeedback('backward')
        } else {
          video.currentTime = Math.min(video.duration, video.currentTime + 10)
          showSkipFeedback('forward')
        }
      }
      return
    }
    
    // Horizontal swipe
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      const video = videoRef.current
      if (video) {
        const seekAmount = (deltaX / window.innerWidth) * video.duration * 0.5
        video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seekAmount))
      }
    }
    
    // Vertical swipe
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 50) {
      const volumeChange = -(deltaY / window.innerHeight) * 0.5
      setVolume(prev => Math.max(0, Math.min(1, prev + volumeChange)))
    }
  }

  // Show skip feedback
  const showSkipFeedback = (direction) => {
    setShowSkipOverlay(direction)
    setTimeout(() => setShowSkipOverlay(false), 800)
  }

  // Auto-play next episode
  useEffect(() => {
    if (!onNextEpisode || !duration) return
    
    const video = videoRef.current
    if (!video) return
    
    const checkAutoPlay = () => {
      const timeLeft = duration - video.currentTime
      if (timeLeft < 15 && timeLeft > 0 && !autoPlayCountdown) {
        setAutoPlayCountdown(Math.ceil(timeLeft))
      } else if (timeLeft <= 0 && autoPlayCountdown) {
        onNextEpisode()
      }
    }
    
    const interval = setInterval(checkAutoPlay, 1000)
    return () => clearInterval(interval)
  }, [duration, onNextEpisode, autoPlayCountdown])

  // Countdown timer
  useEffect(() => {
    if (autoPlayCountdown === null || autoPlayCountdown <= 0) return
    
    const timer = setTimeout(() => {
      setAutoPlayCountdown(prev => prev > 1 ? prev - 1 : 0)
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [autoPlayCountdown])

  const handleTimeUpdate = () => {
    const video = videoRef.current
    if (!video) return
    
    setCurrentTime(video.currentTime)
    setDuration(video.duration)
    if (video.duration > 0) {
      setProgress((video.currentTime / video.duration) * 100)
    }
    
    if (video.buffered.length > 0) {
      const bufferedEnd = video.buffered.end(video.buffered.length - 1)
      setBufferProgress((bufferedEnd / video.duration) * 100)
    }
  }

  const handleWaiting = () => setIsBuffering(true)
  const handleCanPlay = () => setIsBuffering(false)

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

  const handleDoubleClick = (e) => {
    e.preventDefault()
    handleFullscreen()
  }

  const skipForward = () => {
    const video = videoRef.current
    if (video) {
      video.currentTime = Math.min(video.duration, video.currentTime + 10)
      showSkipFeedback('forward')
    }
  }

  const skipBackward = () => {
    const video = videoRef.current
    if (video) {
      video.currentTime = Math.max(0, video.currentTime - 10)
      showSkipFeedback('backward')
    }
  }

  const cancelAutoPlay = () => {
    setAutoPlayCountdown(null)
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
      className={`relative group w-full bg-black overflow-hidden flex items-center justify-center transition-all duration-300 ${
        theaterMode ? 'h-[85vh]' : 'h-full'
      }`}
      onMouseMove={() => {
        setShowControls(true)
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
        if (isPlaying) {
          controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000)
        }
      }}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onDoubleClick={handleDoubleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
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
          onWaiting={handleWaiting}
          onCanPlay={handleCanPlay}
          onClick={() => setIsPlaying(!isPlaying)}
          muted={isMuted || volume === 0}
          playsInline
          crossOrigin="anonymous"
        >
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

      {/* Buffering Indicator */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10 pointer-events-none">
          <div className="relative">
            <div className="absolute inset-0 bg-purple-500 blur-2xl opacity-30 rounded-full animate-pulse"></div>
            <FiLoader className="animate-spin text-purple-500 text-5xl relative z-10" />
          </div>
        </div>
      )}

      {/* Skip Feedback Overlay */}
      {showSkipOverlay && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="bg-black/70 backdrop-blur-sm rounded-2xl p-6 transform transition-all duration-300 scale-100 opacity-100">
            {showSkipOverlay === 'forward' ? (
              <div className="flex items-center gap-3 text-white">
                <FiFastForward size={40} className="text-purple-400" />
                <span className="text-2xl font-bold">+10s</span>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-white">
                <FiRewind size={40} className="text-purple-400" />
                <span className="text-2xl font-bold">-10s</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Auto-play Countdown Overlay */}
      {autoPlayCountdown !== null && onNextEpisode && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-30">
          <div className="text-center">
            <p className="text-white text-xl mb-4">Next episode in</p>
            <div className="text-6xl font-bold text-purple-400 mb-6">{autoPlayCountdown}</div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={cancelAutoPlay}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={onNextEpisode}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white transition-all flex items-center gap-2"
              >
                <FiSkipForward /> Play Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Controls Overlay */}
      <div 
        className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/40 flex flex-col justify-between transition-all duration-300 ${
          showControls || !isPlaying || showSettings ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Top bar with title and theater mode */}
        <div className="p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-3">
            {poster && (
              <img src={poster} alt="" className="w-12 h-16 object-cover rounded-lg shadow-lg hidden sm:block" />
            )}
            <div>
              <p className="text-white/90 font-semibold text-sm sm:text-base line-clamp-1">
                Episode {episodeNumber}
              </p>
              <p className="text-white/50 text-xs">
                {formatTime(currentTime)} / {formatTime(duration)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheaterMode(!theaterMode)}
              className={`p-2 rounded-lg transition-all duration-300 group relative ${theaterMode ? 'bg-purple-600 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}
              onMouseEnter={() => setActiveTooltip('theater')}
              onMouseLeave={() => setActiveTooltip(null)}
            >
              <FiZoomIn size={20} />
              {activeTooltip === 'theater' && (
                <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/90 text-white text-xs rounded whitespace-nowrap">
                  Theater Mode (T)
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Center play button */}
        <div className="flex-1 flex items-center justify-center">
          {!isPlaying && !isBuffering && (
            <button 
              onClick={() => setIsPlaying(true)} 
              className="p-8 bg-purple-600/90 backdrop-blur-sm rounded-full text-white transform transition-all duration-300 hover:scale-125 hover:bg-purple-500 shadow-2xl shadow-purple-500/30 group"
            >
              <FiPlay size={40} className="ml-1 group-hover:scale-110 transition-transform" />
            </button>
          )}
        </div>

        {/* Bottom controls */}
        <div className="p-4 sm:p-6 bg-gradient-to-t from-black via-black/90 to-transparent">
          {/* Progress bar with buffer indicator */}
          <div className="relative mb-4 group">
            <div 
              className="absolute top-1/2 -translate-y-1/2 left-0 h-1.5 bg-gray-600/50 rounded-full pointer-events-none"
              style={{ width: `${bufferProgress}%` }}
            />
            <input
              type="range"
              className="relative z-10 w-full h-1.5 bg-gray-700/30 rounded-full appearance-none cursor-pointer accent-purple-500 hover:accent-purple-400 transition-all"
              min="0"
              max="100"
              value={progress || 0}
              onChange={handleSeek}
              style={{
                background: `linear-gradient(to right, #9333ea 0%, #a855f7 ${progress}%, transparent ${progress}%, transparent 100%)`
              }}
            />
            <div className="absolute -top-8 left-0 bg-gray-900/90 backdrop-blur-sm px-2 py-1 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {formatTime(currentTime)}
            </div>
          </div>
          
          {/* Control buttons row */}
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4">
            {/* Left controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2.5 sm:p-3 rounded-full bg-white/10 hover:bg-purple-600/80 transition-all duration-300 hover:scale-110 group relative"
                onMouseEnter={() => setActiveTooltip('play')}
                onMouseLeave={() => setActiveTooltip(null)}
              >
                {isPlaying ? <FiPause size={20} /> : <FiPlay size={20} />}
                {activeTooltip === 'play' && (
                  <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/90 text-white text-xs rounded whitespace-nowrap">
                    {isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                  </span>
                )}
              </button>
              
              <button 
                onClick={skipBackward}
                className="p-2 sm:p-2.5 rounded-full bg-white/10 hover:bg-purple-600/80 transition-all duration-300 hover:scale-110 group relative hidden sm:block"
                onMouseEnter={() => setActiveTooltip('back')}
                onMouseLeave={() => setActiveTooltip(null)}
              >
                <FiRewind size={18} />
                {activeTooltip === 'back' && (
                  <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/90 text-white text-xs rounded whitespace-nowrap">
                    -10s (←)
                  </span>
                )}
              </button>
              
              <button 
                onClick={skipForward}
                className="p-2 sm:p-2.5 rounded-full bg-white/10 hover:bg-purple-600/80 transition-all duration-300 hover:scale-110 group relative hidden sm:block"
                onMouseEnter={() => setActiveTooltip('forward')}
                onMouseLeave={() => setActiveTooltip(null)}
              >
                <FiFastForward size={18} />
                {activeTooltip === 'forward' && (
                  <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/90 text-white text-xs rounded whitespace-nowrap">
                    +10s (→)
                  </span>
                )}
              </button>
              
              <div 
                className="flex items-center gap-2 bg-white/10 rounded-full p-1.5 sm:p-2 hover:bg-white/20 transition-all group/volume"
                onMouseEnter={() => setShowVolumeSlider(true)}
                onMouseLeave={() => setShowVolumeSlider(false)}
              >
                <button 
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-1 rounded-full hover:bg-white/10 transition-all"
                >
                  {isMuted || volume === 0 ? <FiVolumeX size={18} /> : volume < 0.5 ? <FiVolume1 size={18} /> : <FiVolume2 size={18} />}
                </button>
                
                <div className={`overflow-hidden transition-all duration-300 ${showVolumeSlider ? 'w-24 opacity-100' : 'w-0 opacity-0'}`}>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-full h-1 bg-gray-600 rounded-full appearance-none cursor-pointer accent-purple-500"
                  />
                </div>
              </div>
              
              <div className="bg-gray-900/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10 hidden sm:block">
                <span className="text-sm font-mono text-gray-300">
                  <span className="text-purple-400 font-semibold">{formatTime(currentTime)}</span>
                  <span className="mx-1 text-gray-500">/</span>
                  <span className="text-gray-400">{formatTime(duration)}</span>
                </span>
              </div>
            </div>
            
            {/* Right controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Settings button */}
              <div className="relative">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`p-2.5 rounded-full transition-all duration-300 group relative ${showSettings ? 'bg-purple-600 text-white' : 'bg-white/10 hover:bg-purple-600/80 text-white'}`}
                  onMouseEnter={() => setActiveTooltip('settings')}
                  onMouseLeave={() => setActiveTooltip(null)}
                >
                  <FiSettings size={20} />
                  {activeTooltip === 'settings' && (
                    <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/90 text-white text-xs rounded whitespace-nowrap">
                      Settings
                    </span>
                  )}
                </button>
                
                {/* Settings menu */}
                {showSettings && (
                  <div className="absolute bottom-full mb-2 right-0 w-48 bg-gray-900/95 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl p-3 z-50">
                    <div className="space-y-3">
                      {/* Playback speed */}
                      <div>
                        <p className="text-xs text-gray-400 mb-1.5">Speed</p>
                        <select
                          value={playbackRate}
                          onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                          className="w-full px-2 py-1.5 bg-gray-800 rounded-lg text-sm text-white border border-white/10 focus:outline-none focus:border-purple-500"
                        >
                          <option value={0.5}>0.5x</option>
                          <option value={0.75}>0.75x</option>
                          <option value={1}>1x</option>
                          <option value={1.25}>1.25x</option>
                          <option value={1.5}>1.5x</option>
                          <option value={2}>2x</option>
                        </select>
                      </div>
                      
                      {/* Quality selector */}
                      {availableQualities.length > 1 && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1.5">Quality</p>
                          <select
                            value={quality}
                            onChange={(e) => handleQualityChange(e.target.value)}
                            className="w-full px-2 py-1.5 bg-gray-800 rounded-lg text-sm text-white border border-white/10 focus:outline-none focus:border-purple-500"
                          >
                            {availableQualities.map((q) => (
                              <option key={q.label} value={q.label}>
                                {q.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      
                      {/* Subtitle toggle */}
                      {tracks.length > 0 && (
                        <button
                          onClick={toggleSubtitles}
                          className="w-full flex items-center justify-between px-2 py-1.5 bg-gray-800 rounded-lg text-sm text-white hover:bg-gray-700 transition-all"
                        >
                          <span>Subtitles</span>
                          <span className={`w-2 h-2 rounded-full ${subtitlesEnabled ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Fullscreen button */}
              <button
                onClick={handleFullscreen}
                className="p-2.5 rounded-full bg-white/10 hover:bg-purple-600/80 transition-all duration-300 group relative"
                onMouseEnter={() => setActiveTooltip('fullscreen')}
                onMouseLeave={() => setActiveTooltip(null)}
              >
                {isFullscreen ? <FiMinimize size={20} /> : <FiMaximize size={20} />}
                {activeTooltip === 'fullscreen' && (
                  <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/90 text-white text-xs rounded whitespace-nowrap">
                    Fullscreen (F)
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Episode Selector Component
const EpisodeSelector = ({ episodes, currentEpisode, onSelect }) => {
  const fillerCount = episodes.filter(ep => ep.isFiller).length;

  return (
    <div className="mt-6 bg-gray-800/40 rounded-2xl p-6 border border-gray-700/50 shadow-2xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <FiList className="text-purple-400" /> Select Episode
        </h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="text-gray-400">{episodes.length} Episodes Total</div>
          {fillerCount > 0 && (
            <div className="flex items-center gap-2 text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
              <FiAlertCircle className="w-4 h-4" />
              <span className="font-medium">{fillerCount} Filler</span>
            </div>
          )}
        </div>
      </div>
      
      {fillerCount > 0 && (
        <div className="mb-4 p-3 bg-amber-400/5 border border-amber-400/10 rounded-lg flex items-start gap-2 text-sm text-amber-200/80">
          <FiAlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>Filler episodes are marked in <span className="text-amber-400 font-medium">amber</span>.</span>
        </div>
      )}
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
        {episodes.map(ep => {
          const isCurrent = currentEpisode === ep.number;
          const isFiller = ep.isFiller;
          
          return (
            <button
              key={ep.number}
              onClick={() => onSelect(ep.number)}
              className={`
                group relative p-3 rounded-xl text-left transition-all duration-200 border
                ${isCurrent 
                  ? 'bg-purple-600 border-purple-500 shadow-lg shadow-purple-600/25 scale-[1.02]' 
                  : isFiller
                    ? 'bg-amber-900/20 border-amber-700/30 hover:bg-amber-900/30 hover:border-amber-600/50'
                    : 'bg-gray-700/50 border-gray-600/30 hover:bg-gray-700 hover:border-gray-500/50'
                }
              `}
            >
              <div className={`
                inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold mb-2
                ${isCurrent 
                  ? 'bg-white/20 text-white' 
                  : isFiller
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-gray-600/50 text-gray-300'
                }
              `}>
                {ep.number}
              </div>
              
              {isFiller && (
                <div className="absolute top-2 right-2">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-amber-950 uppercase tracking-wider">
                    Filler
                  </span>
                </div>
              )}
              
              <p className={`
                text-xs font-medium line-clamp-2 leading-relaxed
                ${isCurrent ? 'text-white' : isFiller ? 'text-amber-200/70' : 'text-gray-400'}
              `}>
                {ep.title || `Episode ${ep.number}`}
              </p>
              
              {isCurrent && (
                <div className="absolute bottom-2 right-2">
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Server Selector Component
const ServerSelector = ({ servers, selectedType, selectedServer, onServerChange, onTypeChange }) => {
  const availableServers = servers[selectedType] || []
  
  return (
    <div className="mt-6 bg-gray-900/80 backdrop-blur-md rounded-2xl p-5 border border-white/10 shadow-2xl">
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
