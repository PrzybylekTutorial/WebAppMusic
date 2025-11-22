// ===== API CONFIGURATION =====
// Get the API base URL - use production URL when running locally, relative URL when deployed
export const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
export const API_BASE_URL = isLocalhost 
  ? 'https://web-app-music-przybylektutorials-projects.vercel.app'
  : '';
export const LOGIN_URL = `${API_BASE_URL}/api/auth/login`;

// Helper function to get API URL (for endpoints that need absolute URLs when running locally)
export const getApiUrl = (endpoint) => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
  return isLocalhost ? `${API_BASE_URL}/${cleanEndpoint}` : `/${cleanEndpoint}`;
};

