import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

const isAuthEndpoint = (url?: string): boolean => {
  if (!url) return false;
  return url.includes('/auth/login')
    || url.includes('/auth/signup')
    || url.includes('/auth/oauth2/google')
    || url.includes('/oauth2/authorization/');
};

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && !isAuthEndpoint(config.url)) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url;
    if (error.response?.status === 401 && !isAuthEndpoint(requestUrl)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
