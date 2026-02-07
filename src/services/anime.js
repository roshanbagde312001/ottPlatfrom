// API Configuration - Prioritize local development server, fallback to external API
const API_LOCAL = 'http://192.168.7.15:3030/api/v1';
const API_EXTERNAL = 'http://192.168.7.15:3030/api/v1';

// Auto-detect API base - try local first, fallback to external
const API_ROOT = API_LOCAL;

// Provider configuration for different anime providers
const PROVIDERS = {
  animekai: {
    templates: {
      search: '/anime/animekai/{query}',
      info: '/anime/animekai/info?id={id}',
      episodes: '/anime/animekai/episodes/{id}',
      watch: '/anime/animekai/watch/{episodeId}'
    }
  },
  animepahe: {
    templates: {
      search: '/anime/animepahe/{query}',
      info: '/anime/animepahe/info/{id}',
      episodes: '/anime/animepahe/episodes/{id}',
      watch: '/anime/animepahe/watch?episodeId={episodeId}'
    }
  },
  'hianime-scrap': {
    templates: {
      search: '/search?keyword={query}&page=1',
      info: '/anime/{id}', // Fixed: removed /animes/
      episodes: '/episodes/{id}',
      servers: '/servers?id={id}',
      stream: '/stream?id={id}&type={type}&server={server}'
    }
  }
};

// Proxy for streaming - using the API's built-in proxy endpoint
const PROXY_BASE = 'http://192.168.7.15:3030/api/v1';

// Helper function to build URLs from provider templates
export function buildUrl(providerKey, templateKey, params = {}) {
  const provider = PROVIDERS[providerKey];
  const template = provider?.templates[templateKey];
  if (!template) return '';

  let url = template;
  Object.keys(params).forEach(key => {
    const value = encodeURIComponent(String(params[key] || ''));
    url = url.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  });
  console.log(url)
  return url;
}

// Utility function to safely parse JSON with error handling
export async function safeFetch(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        // 'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Fetch error for ${url}:`, error);
    throw error;
  }
}

// Default provider
const DEFAULT_PROVIDER = 'hianime-scrap';

// Helper function for API calls
const fetchAPI = async (endpoint, options = {}) => {
  // let url = `${API_ROOT}${endpoint}`;
  let url = endpoint;
  if(url.includes("stream")){
    url = `${"https://api.animo.qzz.io/api/v1"}${endpoint}`
  }else{
   url = `${API_ROOT}${endpoint}`;
}
  const response = await fetch(url, {
    ...options,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
      // 'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
};


// ==================== HOME & DISCOVERY ====================

// Get homepage data with all sections
export const getHomeData = async () => {
  return fetchAPI('/home');
};

// Get spotlight anime
export const getSpotlight = async () => {
  return fetchAPI('/spotlight');
};

// Get top 10 anime (today, week, month)
export const getTopTen = async () => {
  return fetchAPI('/topten');
};

// Get meta information (genres, az-list, filter options)
export const getMetaInfo = async () => {
  return fetchAPI('/meta');
};

// ==================== SEARCH ====================

// Search anime by keyword with provider support
export const searchAnime = async (keyword, page = 1, provider = DEFAULT_PROVIDER) => {
  let searchUrl = buildUrl(provider, 'search', { query: keyword });
  searchUrl = `${PROXY_BASE}${searchUrl}`
  console.log('Search URL:', searchUrl);

  const data = await safeFetch(searchUrl);

  // Handle different response structures
  let results = [];

  // Handle hianime-scrap response format: {success, data: {pageInfo, response: [...]}}
  if (data && data.data && data.data.response && Array.isArray(data.data.response)) {
    results = data.data.response;
  } else if (Array.isArray(data)) {
    results = data;
  } else if (data && data.results && Array.isArray(data.results)) {
    results = data.results;
  } else if (data && data.anime && Array.isArray(data.anime)) {
    results = data.anime;
  } else if (data && data.data && Array.isArray(data.data)) {
    results = data.data;
  }

  return { data: { response: results } };
};

// Get search suggestions
export const getSuggestions = async (keyword) => {
  return fetchAPI(`/suggestion?keyword=${encodeURIComponent(keyword)}`);
};

// ==================== ANIME DETAILS ====================

// Get anime details by ID
export const getAnimeDetails = async (id) => {
  return fetchAPI(`/anime/${encodeURIComponent(id)}`);
};

// Get random anime
export const getRandomAnime = async () => {
  return fetchAPI('/anime/random');
};

// ==================== EPISODES ====================

// Get episodes list for an anime with provider support
export const getEpisodes = async (id, provider = DEFAULT_PROVIDER) => {
  const endpoint = buildUrl(provider, 'episodes', { id });
  console.log('[anime.js] Episodes endpoint:', endpoint);

  const episodesData = await fetchAPI(endpoint);
  console.log('[anime.js] Episodes raw response:', episodesData);
  
  const episodes = extractEpisodes(episodesData, provider);
  console.log('[anime.js] Extracted episodes:', episodes);

  return { data: episodes };
};

// Get streaming servers for an episode
export const getServers = async (id) => {
  // Use the provider-specific template for servers
  let endpoint = buildUrl('hianime-scrap', 'servers', { id });
  endpoint = endpoint.replace("?","/")
  console.log('[anime.js] Servers endpoint:', endpoint.replace("?","/"));
  
  const response = await fetchAPI(endpoint);
  console.log('[anime.js] Servers response:', response);
  return response;
};
// Get streaming link for an episode with provider support
export const getStreamLink = async (streamId, server = 'hd-1', type = 'sub', provider = DEFAULT_PROVIDER) => {
  // We use buildUrl to get the endpoint, then fetchAPI to add the Base URL
  const endpoint = buildUrl(provider, provider === 'hianime-scrap' ? 'stream' : 'watch', { 
    id: streamId, 
    episodeId: streamId, // for animepahe template
    type, 
    server 
  });

  console.log('[anime.js] Stream endpoint:', endpoint);
  console.log('[anime.js] Stream params:', { streamId, server, type, provider });

  // Use the internal fetchAPI so the base URL and headers are applied correctly
  console.log("roshan",endpoint)
  const response = await fetchAPI(endpoint);
  console.log('[anime.js] Stream response:', response);
  return response;
};



// Get proxied stream URL for video playback (bypasses CORS)
export const getProxiedStreamUrl = (originalUrl, referer = 'https://megacloud.tv') => {
  if (!originalUrl) return null;
  
  // Use the API's proxy endpoint with proper encoding
  const proxyUrl = `${PROXY_BASE}/proxy?url=${encodeURIComponent(originalUrl)}&referer=${encodeURIComponent(referer)}`;
  console.log('[anime.js] Proxied Stream URL:', proxyUrl);
  
  return proxyUrl;
};

// Get direct stream URL (fallback when proxy fails)
export const getDirectStreamUrl = (originalUrl) => {
  if (!originalUrl) return null;
  console.log('[anime.js] Direct Stream URL (fallback):', originalUrl);
  return originalUrl;
};

// ==================== BROWSE BY CATEGORY ====================

// Browse anime by query (top-airing, most-popular, etc.)
export const browseByQuery = async (query, page = 1) => {
  const validQueries = [
    'top-airing', 'most-popular', 'most-favorite', 
    'completed', 'recently-added', 'recently-updated',
    'top-upcoming', 'subbed-anime', 'dubbed-anime',
    'movie', 'tv', 'ova', 'ona', 'special'
  ];
  
  if (!validQueries.includes(query)) {
    throw new Error(`Invalid query: ${query}`);
  }
  
  return fetchAPI(`/${query}?page=${page}`);
};

// Browse anime by genre
export const browseByGenre = async (genre, page = 1) => {
  const validGenres = [
    'action', 'adventure', 'cars', 'comedy', 'dementia', 'demons',
    'drama', 'ecchi', 'fantasy', 'game', 'harem', 'historical',
    'horror', 'isekai', 'josei', 'kids', 'magic', 'martial-arts',
    'mecha', 'military', 'music', 'mystery', 'parody', 'police',
    'psychological', 'romance', 'samurai', 'school', 'sci-fi',
    'seinen', 'shoujo', 'shoujo-ai', 'shounen', 'shounen-ai',
    'slice-of-life', 'space', 'sports', 'super-power', 'supernatural',
    'thriller', 'vampire'
  ];
  
  const normalizedGenre = genre.toLowerCase().replace(/\s+/g, '-');
  
  if (!validGenres.includes(normalizedGenre)) {
    throw new Error(`Invalid genre: ${genre}`);
  }
  
  return fetchAPI(`/genre/${normalizedGenre}?page=${page}`);
};

// Browse anime by letter (A-Z or 0-9)
export const browseByLetter = async (letter, page = 1) => {
  const validLetters = [
    'all', 'other', '0-9',
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
    'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'
  ];
  
  const normalizedLetter = letter.toLowerCase();
  
  if (!validLetters.includes(normalizedLetter)) {
    throw new Error(`Invalid letter: ${letter}`);
  }
  
  return fetchAPI(`/az-list/${normalizedLetter}?page=${page}`);
};

// Browse anime by producer/studio
export const browseByProducer = async (producerId, page = 1) => {
  return fetchAPI(`/producer/${encodeURIComponent(producerId)}?page=${page}`);
};

// Filter anime with multiple parameters
export const filterAnime = async (params = {}) => {
  const {
    keyword = '',
    type = 'all',
    status = 'all',
    rated = 'all',
    score = 'all',
    season = 'all',
    language = 'all',
    sort = 'default',
    genres = '',
    page = 1
  } = params;
  
  const queryParams = new URLSearchParams({
    page: page.toString(),
  });
  
  if (keyword) queryParams.append('keyword', keyword);
  if (type !== 'all') queryParams.append('type', type);
  if (status !== 'all') queryParams.append('status', status);
  if (rated !== 'all') queryParams.append('rated', rated);
  if (score !== 'all') queryParams.append('score', score);
  if (season !== 'all') queryParams.append('season', season);
  if (language !== 'all') queryParams.append('language', language);
  if (sort !== 'default') queryParams.append('sort', sort);
  if (genres) queryParams.append('genres', genres);
  
  return fetchAPI(`/filter?${queryParams.toString()}`);
};

// ==================== SCHEDULE ====================

// Get anime schedule by date
export const getSchedule = async (date) => {
  // date format: DD (e.g., "21")
  return fetchAPI(`/schedule?date=${encodeURIComponent(date)}`);
};

// Get next episode schedule for an anime
export const getNextEpisode = async (animeId) => {
  return fetchAPI(`/schedule/next/${encodeURIComponent(animeId)}`);
};

// ==================== CHARACTERS & ACTORS ====================

// Get characters for an anime
export const getCharacters = async (id, page = 1) => {
  return fetchAPI(`/characters/${encodeURIComponent(id)}?page=${page}`);
};

// Get character details
export const getCharacterDetails = async (characterId) => {
  // id format: character:name-id
  return fetchAPI(`/character/${encodeURIComponent(characterId)}`);
};

// Get voice actor details
export const getActorDetails = async (actorId) => {
  // id format: people:name-id
  return fetchAPI(`/actor/${encodeURIComponent(actorId)}`);
};

// Extract episodes from different API response formats
export function extractEpisodes(data, provider) {
  if (!data) return [];

  // Handle hianime-scrap format: {success, data: [...episodes]}
  // Episodes have: id, title, alternativeTitle, isFiller, episodeNumber, number
  if (provider === 'hianime-scrap' && data && data.data && Array.isArray(data.data)) {
    return data.data.map((ep, index) => ({
      id: ep.id || `${index + 1}`,
      number: ep.episodeNumber || ep.number || index + 1,
      title: ep.title || ep.alternativeTitle || `Episode ${ep.episodeNumber || ep.number || index + 1}`,
      isFiller: ep.isFiller || false
    }));
  }

  // Handle different response structures
  if (Array.isArray(data)) {
    return data.map((ep, index) => ({
      id: ep.id || ep.episodeId || `${index + 1}`,
      number: ep.number || ep.episode || ep.ep || ep.episodeNumber || index + 1,
      title: ep.title || ep.name || `Episode ${index + 1}`
    }));
  }

  if (data.episodes && Array.isArray(data.episodes)) {
    return data.episodes.map((ep, index) => ({
      id: ep.id || ep.episodeId || `${index + 1}`,
      number: ep.number || ep.episode || ep.ep || ep.episodeNumber || index + 1,
      title: ep.title || ep.name || `Episode ${index + 1}`
    }));
  }

  if (data.data && Array.isArray(data.data)) {
    return data.data.map((ep, index) => ({
      id: ep.id || ep.episodeId || `${index + 1}`,
      number: ep.number || ep.episode || ep.ep || ep.episodeNumber || index + 1,
      title: ep.title || ep.name || `Episode ${index + 1}`
    }));
  }

  return [];
}

// Normalize anime data from different API response formats
export function normalizeAnimeData(data, id, provider) {
  // Handle different response structures

  // Handle hianime-scrap format: {success, data: {...anime details...}}
  if (data && data.data && provider === 'hianime-scrap') {
    return {
      ...data.data,
      id: data.data.id || id,
      // Map hianime-scrap fields to standard format
      title: data.data.title,
      poster: data.data.poster,
      image: data.data.poster,
      type: data.data.type,
      status: data.data.status,
      genres: data.data.genres || [],
      description: data.data.description || data.data.synopsis || '',
      totalEpisodes: data.data.episodes?.eps || data.data.episodes?.sub || data.data.episodes?.dub || 'Unknown'
    };
  }

  if (Array.isArray(data)) {
    // Response is an array - take first item if it matches ID
    const match = data.find(item => item && item.id === id) || data[0];
    if (match) return { ...match, id: match.id || id };
    return { id, episodes: [] };
  }

  if (data && data.results && Array.isArray(data.results)) {
    // Response has results wrapper
    const match = data.results.find(item => item && item.id === id) || data.results[0];
    if (match) return { ...match, id: match.id || id };
    return { ...data, id: data.id || id };
  }

  if (data && data.data) {
    // Response has data wrapper (common in REST APIs)
    return { ...data.data, id: data.data.id || id };
  }

  // Return data as-is if it looks like anime object
  if (data && (data.title || data.name || data.englishName)) {
    return { ...data, id: data.id || id };
  }

  // Fallback - return data with provided ID
  return { id, ...(data || {}) };
}

// ==================== UTILITY FUNCTIONS ====================

// Get poster URL with fallback
export const getPosterUrl = (poster) => {
  if (!poster) return 'https://via.placeholder.com/300x450?text=No+Image';
  if (poster.startsWith('http')) return poster;
  return poster;
};

// Parse anime ID from various formats
export const parseAnimeId = (id) => {
  // Handle cases like "steinsgate-3::ep=213"
  if (id.includes('::ep=')) {
    const [animeId, episodePart] = id.split('::ep=');
    return {
      animeId,
      episodeNumber: parseInt(episodePart, 10)
    };
  }
  return { animeId: id, episodeNumber: null };
};

// Build episode ID format
export const buildEpisodeId = (animeId, episodeNumber) => {
  return `${animeId}::ep=${episodeNumber}`;
};

// ==================== DEFAULT EXPORT ====================

export default {
  // Home & Discovery
  getHomeData,
  getSpotlight,
  getTopTen,
  getMetaInfo,
  
  // Search
  searchAnime,
  getSuggestions,
  
  // Details
  getAnimeDetails,
  getRandomAnime,
  
  // Episodes
  getEpisodes,
  getServers,
  getStreamLink,
  getProxiedStreamUrl,
  
  // Browse

  browseByQuery,
  browseByGenre,
  browseByLetter,
  browseByProducer,
  filterAnime,
  
  // Schedule
  getSchedule,
  getNextEpisode,
  
  // Characters
  getCharacters,
  getCharacterDetails,
  getActorDetails,
  
  // Utilities
  getPosterUrl,
  parseAnimeId,
  buildEpisodeId,
  buildUrl,
  safeFetch,
  extractEpisodes,
  normalizeAnimeData,
};
