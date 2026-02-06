// Anime API Service
// Using AnimeKai API: https://ttt-mauve-rho.vercel.app/anime/animekai

const API_BASE = 'https://ttt-mauve-rho.vercel.app/anime/animekai';

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
export const getAnimeDetails = async (id) => {
  try {
    const response = await fetch(`${API_BASE}/info?id=${id}`);
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
export const getAnimeServers = async (id, episodeNumber) => {
  try {
    const response = await fetch(`${API_BASE}/servers/${id}$ep=${episodeNumber}$token=placeholder`);
    if (!response.ok) {
      throw new Error('Failed to get anime servers');
    }
    return await response.json();
  } catch (error) {
    console.error('Anime servers error:', error);
    throw error;
  }
};

// Get episode sources/streaming links
export const getEpisodeSources = async (id, episodeNumber) => {
  try {
    const data = await getAnimeServers(id, episodeNumber);
    
    // Extract streaming URLs from servers
    if (data.servers && data.servers.length > 0) {
      return data.servers.map(server => ({
        name: server.name || server.serverName || 'Unknown',
        url: server.url,
        quality: server.quality || 'HD'
      }));
    }
    
    if (data.sources && data.sources.length > 0) {
      return data.sources.map(source => ({
        name: source.quality || 'HD',
        url: source.url,
        quality: source.quality || 'HD'
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Episode sources error:', error);
    throw error;
  }
};

export default {
  searchAnime,
  getAnimeDetails,
  getAnimeServers,
  getEpisodeSources
};

