// Anime API Service
// Using AnimeKai API from localhost:3000
// API Documentation:
// - Search: GET /anime/animekai/{query}
// - Get Info: GET /anime/animekai/info?id={id}
// - Get Servers: GET /anime/animekai/servers/{id}$ep={episode}$token={token}

const API_BASE = 'http://ttt-mauve-rho.vercel.app/anime/animekai';

// Get top airing anime
export const getTopAiringAnime = async () => {
  try {
    const response = await fetch(`${API_BASE}/top-airring`);
    if (!response.ok) {
      throw new Error('Failed to get top airing anime');
    }
    return await response.json();
  } catch (error) {
    console.error('Top airing anime error:', error);
    throw error;
  }
};

// Search for anime
export const searchAnime = async (query) => {
  try {
    const response = await fetch(`${API_BASE}/${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error('Failed to search anime');
    }
    return await response.json();
  } catch (error) {
    console.error('Anime search error:', error);
    throw error;
  }
};

// Get anime details by ID
// API: GET /anime/animekai/info?id={id}
export const getAnimeDetails = async (id) => {
  try {
    const response = await fetch(`${API_BASE}/info?id=${encodeURIComponent(id)}`);
    if (!response.ok) {
      throw new Error('Failed to get anime details');
    }
    return await response.json();
  } catch (error) {
    console.error('Anime details error:', error);
    throw error;
  }
};

// Get anime servers for an episode
// API: GET /anime/animekai/servers/{id}$ep={episode}$token={token}
export const getAnimeServers = async (id, episodeNumber) => {
  try {
    // Generate a token (for now using a placeholder)
    const token = generateToken();
    const response = await fetch(
      `${API_BASE}/servers/${encodeURIComponent(id)}$ep=${episodeNumber}$token=${token}`
    );
    if (!response.ok) {
      throw new Error('Failed to get anime servers');
    }
    return await response.json();
  } catch (error) {
    console.error('Anime servers error:', error);
    throw error;
  }
};

// Generate a simple token for server requests
const generateToken = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 16; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

// Get episode sources/streaming links
export const getEpisodeSources = async (id, episodeNumber) => {
  try {
    const data = await getAnimeServers(id, episodeNumber);
    
    // Log the raw response for debugging
    console.log('Server response:', data);
    
    // Extract streaming URLs from servers
    if (data.servers && data.servers.length > 0) {
      return data.servers.map((server, index) => ({
        id: index,
        name: server.name || server.serverName || `Server ${index + 1}`,
        url: server.url || server.link || server.videoUrl,
        quality: server.quality || 'HD'
      }));
    }
    
    if (data.sources && data.sources.length > 0) {
      return data.sources.map((source, index) => ({
        id: index,
        name: source.quality || `Source ${index + 1}`,
        url: source.url || source.link || source.videoUrl,
        quality: source.quality || 'HD'
      }));
    }
    
    // Try to find any URL in the response
    if (data.url) {
      return [{
        id: 0,
        name: 'Video',
        url: data.url,
        quality: 'HD'
      }];
    }
    
    return [];
  } catch (error) {
    console.error('Episode sources error:', error);
    throw error;
  }
};

export default {
  getTopAiringAnime,
  searchAnime,
  getAnimeDetails,
  getAnimeServers,
  getEpisodeSources
};

