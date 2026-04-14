import axios from 'axios';

const MAX_GET_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 400;

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

const shouldRetryRequest = (error: any): boolean => {
  const config = error?.config;
  if (!config) return false;

  const method = (config.method || 'get').toString().toLowerCase();
  if (method !== 'get' && method !== 'head') {
    return false;
  }

  if (isAuthEndpoint(config.url)) {
    return false;
  }

  const status = error?.response?.status;
  if (!status) {
    return true;
  }

  return status >= 500;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
  async (error) => {
    const requestUrl = error.config?.url;
    if (error.response?.status === 401 && !isAuthEndpoint(requestUrl)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    if (shouldRetryRequest(error)) {
      const config = error.config as any;
      const retryCount = config.__retryCount ?? 0;

      if (retryCount < MAX_GET_RETRIES) {
        config.__retryCount = retryCount + 1;
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, retryCount);
        await sleep(delay);
        return api(config);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
