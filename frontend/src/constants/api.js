const DEPLOYED_BASE_URL = 'https://trackmate-backend-ew4v.onrender.com';
const LOCAL_BASE_URL = 'http://localhost:5000';
// Update DEPLOYED_BASE_URL above when your Render server URL changes.

const inferApiBaseUrl = () => {
  if (import.meta.env?.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    const parsedPort = port ? Number(port) : null;
    const isLocalHost = ['localhost', '127.0.0.1'].includes(hostname);
    const isLanHost = hostname?.startsWith('192.168.') || hostname?.startsWith('10.') || hostname?.endsWith('.local');

    if (isLocalHost || isLanHost || parsedPort === 5173) {
      return LOCAL_BASE_URL;
    }

    return DEPLOYED_BASE_URL;
  }

  return DEPLOYED_BASE_URL;
};

export const API_BASE_URL = inferApiBaseUrl();
export const API_ROOT = `${API_BASE_URL}/api`;

if (typeof window !== 'undefined') {
  console.info('[TrackMate] API server:', API_BASE_URL);
}
