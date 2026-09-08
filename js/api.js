// Use the local server by default; deployments can override this before loading the app.
const API_BASE = globalThis.__API_BASE__ || '/api';

/**
 * Helper to show/hide loading overlay
 */
function setLoading(isLoading) {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    if (isLoading) {
      overlay.classList.add('active');
    } else {
      overlay.classList.remove('active');
    }
  }
}

/**
 * Generic fetch wrapper with error handling and loading states
 */
async function fetchAPI(endpoint) {
  setLoading(true);
  try {
    const response = await fetch(`${API_BASE}${endpoint}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || data.error || 'Unknown API error');
    }
    return data.data;
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    throw error;
  } finally {
    setLoading(false);
  }
}

export const api = {
  // Keep original for compatibility if needed elsewhere
  getLiveTrafficReport: () => fetchAPI('/live-traffic-report'),
  
  // New endpoints
  getOverview: (params = '') => fetchAPI(`/traffic-overview${params}`),
  getTrafficByDevice: (params = '') => fetchAPI(`/traffic-by-device${params}`),
  
  // Existing endpoints
  getTrafficTrend: () => fetchAPI('/traffic-trend'),
  getSEOPerformance: () => fetchAPI('/seo-performance'),
  getKeywords: () => fetchAPI('/spineditor/rankings'),
  getLandingPages: () => fetchAPI('/landing-pages')
};
