import axios from 'axios';

const inferApiUrl = () => {
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    const defaultPort = 5000;
    const numericPort = port ? Number(port) : null;
    const isLocalHost = ['localhost', '127.0.0.1'].includes(hostname);
    const isLanHost = hostname?.startsWith('192.168.') || hostname?.startsWith('10.') || hostname?.endsWith('.local');

    if (isLocalHost || isLanHost || numericPort === 5173) {
      return `${protocol}//${hostname}:${defaultPort}`;
    }

    return `${protocol}//${hostname}`;
  }

  return 'http://localhost:5000';
};

const API_URL = inferApiUrl();
const TOKEN_KEY = 'tm_token';
const USER_KEY = 'tm_user';

export const api = axios.create({
  baseURL: `${API_URL}/api`
});

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

const redirectToLogin = () => {
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      setAuthToken(null);
      redirectToLogin();
    }
    return Promise.reject(error);
  }
);
