import './style.css';

const API_BASE = 'https://ttt-mauve-rho.vercel.app/anime/animekai';

// DOM Elements
const app = document.getElementById('app');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const resultsContainer = document.getElementById('results');
const detailsContainer = document.getElementById('details');
const episodesContainer = document.getElementById('episodes');
const serversContainer = document.getElementById('servers');

let currentAnimeId = null;

// Select anime and fetch details - DEFINE FIRST
async function selectAnime(id, title) {
  currentAnimeId = id;
  try {
    detailsContainer.innerHTML = '<p>Loading details...</p>';
    const response = await fetch(`${API_BASE}/info?id=${id}`);
    const data = await response.json();
    
    displayAnimeDetails(data, title);
  } catch (error) {
    console.error('Details error:', error);
    detailsContainer.innerHTML = `<p class="error">Error loading details: ${error.message}</p>`;
  }
}

// Select episode and fetch servers - DEFINE FIRST
async function selectEpisode(episodeId, episodeNumber) {
  try {
    serversContainer.innerHTML = '<p>Loading servers...</p>';
    
    const response = await fetch(`${API_BASE}/servers/${currentAnimeId}$ep=${episodeNumber}$token=placeholder`);
    const data = await response.json();
    
    displayServers(data, episodeNumber);
  } catch (error) {
    console.error('Servers error:', error);
    serversContainer.innerHTML = `<p class="error">Error loading servers: ${error.message}</p>`;
  }
}

// Expose to global scope
window.selectAnime = selectAnime;
window.selectEpisode = selectEpisode;

function displayResults(results) {
  resultsContainer.innerHTML = results.map(anime => `
    <div class="anime-card" onclick="selectAnime('${anime.id}', '${anime.title}')">
      <img src="${anime.image || 'https://via.placeholder.com/150x200'}" alt="${anime.title}">
      <h3>${anime.title}</h3>
      <p>${anime.releaseDate || 'N/A'}</p>
    </div>
  `).join('');
}

// Search anime
searchBtn.addEventListener('click', async () => {
  const query = searchInput.value.trim();
  if (!query) {
    alert('Please enter a search query');
    return;
  }
  
  try {
    resultsContainer.innerHTML = '<p>Loading...</p>';
    const response = await fetch(`${API_BASE}/${query}`);
    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      resultsContainer.innerHTML = '<p>No results found</p>';
      return;
    }
    
    displayResults(data.results);
  } catch (error) {
    console.error('Search error:', error);
    resultsContainer.innerHTML = `<p class="error">Error: ${error.message}</p>`;
  }
});

// Enter key search
searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    searchBtn.click();
  }
});

function displayAnimeDetails(data, title) {
  const anime = data;
  
  console.log('Anime data:', anime);
  
  detailsContainer.innerHTML = `
    <div class="anime-details">
      <div class="anime-header">
        <img src="${anime.image || 'https://via.placeholder.com/200x300'}" alt="${title}">
        <div class="anime-info">
          <h2>${anime.title || title}</h2>
          <p><strong>Japanese Title:</strong> ${anime.japaneseTitle || 'N/A'}</p>
          <p><strong>Type:</strong> ${anime.type || 'Unknown'}</p>
          ${anime.status ? `<p><strong>Status:</strong> ${anime.status}</p>` : ''}
          ${anime.genres ? `<p><strong>Genres:</strong> ${anime.genres.join(', ')}</p>` : ''}
          ${anime.totalEpisodes ? `<p><strong>Total Episodes:</strong> ${anime.totalEpisodes}</p>` : ''}
          <p><strong>Description:</strong> ${anime.description || 'No description available'}</p>
          ${anime.url ? `<p><a href="${anime.url}" target="_blank" rel="noopener noreferrer" class="watch-link">View on AnimeKai →</a></p>` : ''}
        </div>
      </div>
    </div>
  `;
  
  // Scroll to details
  detailsContainer.scrollIntoView({ behavior: 'smooth' });
  
  // Display recommendations
  if (anime.recommendations && anime.recommendations.length > 0) {
    episodesContainer.innerHTML = '<h3>Recommended Anime</h3>';
    const recList = anime.recommendations.map(rec => `
      <div class="anime-card" onclick="selectAnime('${rec.id}', '${rec.title}')">
        <img src="${rec.image || 'https://via.placeholder.com/150x200'}" alt="${rec.title}">
        <h3>${rec.title}</h3>
        <p>${rec.japaneseTitle || 'N/A'}</p>
      </div>
    `).join('');
    episodesContainer.innerHTML += `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 20px;">${recList}</div>`;
  } else {
    episodesContainer.innerHTML = '';
  }
  
  serversContainer.innerHTML = '';
}

function displayServers(data, episodeNumber) {
  serversContainer.innerHTML = `<h3>Servers for Episode ${episodeNumber}</h3>`;
  
  let html = '<div class="servers-list">';
  
  if (data.servers && data.servers.length > 0) {
    data.servers.forEach(server => {
      html += `
        <div class="server-option">
          <strong>${server.name || server.serverName || 'Unknown Server'}</strong>
          <p>URL: <a href="${server.url}" target="_blank" rel="noopener noreferrer">Watch</a></p>
        </div>
      `;
    });
  } else if (data.sources && data.sources.length > 0) {
    data.sources.forEach(source => {
      html += `
        <div class="server-option">
          <strong>${source.quality || 'HD'}</strong>
          <p>URL: <a href="${source.url}" target="_blank" rel="noopener noreferrer">Watch</a></p>
        </div>
      `;
    });
  } else {
    html += '<p>No servers available for this episode</p>';
  }
  
  html += '</div>';
  serversContainer.innerHTML += html;
}
