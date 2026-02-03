import axios, { AxiosRequestConfig } from 'axios';

// Use relative URL to go through Vite proxy
// IMPORTANT: Must be relative (starting with /) to work with Vite proxy
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// Create axios instance WITHOUT baseURL initially to avoid resolution issues
export const apiClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

// Request interceptor to add auth token and construct correct relative URL
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // CRITICAL FIX: Manually construct the full relative URL
    // This ensures it goes through Nginx proxy instead of directly to backend
    if (config.url) {
      // Remove any absolute URL and make it relative
      let urlPath = config.url;
      if (urlPath.startsWith('http')) {
        try {
          const urlObj = new URL(urlPath);
          urlPath = urlObj.pathname + urlObj.search;
        } catch (e) {
          console.error('Error parsing URL:', e);
        }
      }
      
      // Ensure urlPath starts with /
      if (!urlPath.startsWith('/')) {
        urlPath = '/' + urlPath;
      }
      
      // Construct full relative URL: /api/v1 + /auth/login = /api/v1/auth/login
      // ALWAYS use /api/v1 as the base path for Docker/Nginx proxy
      const basePath = '/api/v1';
      
      // Construct full path: /api/v1 + /auth/login = /api/v1/auth/login
      const fullPath = basePath + urlPath;
      
      // Set the URL directly (this bypasses axios's baseURL resolution)
      config.url = fullPath;
      config.baseURL = ''; // Clear baseURL to prevent double resolution
      
      console.log(`[API] ${config.method?.toUpperCase()} ${fullPath}`);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't redirect to login if:
    // 1. We're already on login/register pages (prevents redirect loops)
    // 2. The request was to login/register endpoints (login failures shouldn't redirect)
    const requestUrl = error.config?.url || '';
    const currentPath = window.location.pathname;
    const isAuthEndpoint = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register');
    const isAuthPage = currentPath === '/login' || currentPath === '/register';
    
    if (error.response?.status === 401) {
      // Only remove token and redirect if it's not an auth endpoint and not already on auth page
      if (!isAuthEndpoint && !isAuthPage) {
        localStorage.removeItem('token');
        // Use setTimeout to avoid navigation conflicts with React Router
        setTimeout(() => {
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }, 0);
      }
    }
    return Promise.reject(error);
  }
);
