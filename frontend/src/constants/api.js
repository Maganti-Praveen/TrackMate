const FALLBACK_BASE_URL = 'http://localhost:5000';
// ^ Replace the URL above with your deployed backend host if you do not set VITE_BACKEND_URL.

const inferApiBaseUrl = () => {
  if (import.meta.env?.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    const fallbackPort = 5000;
    const parsedPort = port ? Number(port) : null;
    const isLocalHost = ['localhost', '127.0.0.1'].includes(hostname);
    const isLanHost = hostname?.startsWith('192.168.') || hostname?.startsWith('10.') || hostname?.endsWith('.local');

    if (isLocalHost || isLanHost || parsedPort === 5173) {
      return `${protocol}//${hostname}:${fallbackPort}`;
    }

    return `${protocol}//${hostname}`;
  }

  return FALLBACK_BASE_URL;
};

export const API_BASE_URL = inferApiBaseUrl();
export const API_ROOT = `${API_BASE_URL}/api`;
