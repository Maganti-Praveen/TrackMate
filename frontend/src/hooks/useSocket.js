import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import offlineBuffer from '../utils/offlineBuffer';
import { API_BASE_URL } from '../constants/api';

const SOCKET_URL = API_BASE_URL;
const TOKEN_KEY = 'tm_token';
const MIN_UPDATE_INTERVAL_MS = Number(import.meta.env.VITE_MIN_UPDATE_INTERVAL_MS) || 3000;
const FLUSH_DELAY_MS = Math.min(500, MIN_UPDATE_INTERVAL_MS);
const MAX_RETRIES = 3;

let socketInstance = null;
let lastEmitTs = 0;

const getSocket = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket']
    });
  }
  return socketInstance;
};

export const refreshSocketAuth = () => {
  const socket = getSocket();
  if (!socket) return;

  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) {
    socket.disconnect();
    return;
  }

  const emitAuth = () => {
    socket.emit('auth:token', { token });
    flushBuffer();
  };

  if (socket.connected) {
    emitAuth();
  } else {
    socket.connect();
    socket.once('connect', emitAuth);
  }
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
  }
};

const flushBuffer = () => {
  const socket = getSocket();
  if (!socket || !socket.connected) return 0;
  const pending = offlineBuffer.drain();
  if (!pending.length) return 0;

  pending.forEach((point, index) => {
    setTimeout(() => {
      emitLocation(point, { retry: false });
    }, index * FLUSH_DELAY_MS);
  });
  return pending.length;
};

const emitLocation = (payload, { retry = true } = {}) => {
  const socket = getSocket();
  if (!socket || !payload) {
    if (payload) offlineBuffer.push(payload);
    return false;
  }

  if (!socket.connected) {
    offlineBuffer.push(payload);
    return false;
  }

  try {
    socket.emit('driver:location_update', payload);
    lastEmitTs = Date.now();
    return true;
  } catch (error) {
    if (retry) {
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
        const delay = Math.min(FLUSH_DELAY_MS * 2 ** attempt, 2000);
        setTimeout(() => emitLocation(payload, { retry: attempt < MAX_RETRIES }), delay);
      }
    } else {
      offlineBuffer.push(payload);
    }
    return false;
  }
};

export const useSocket = (handlers = {}) => {
  const [isConnected, setIsConnected] = useState(socketInstance?.connected ?? false);
  const [bufferSize, setBufferSize] = useState(offlineBuffer.size());

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;

    const handleConnect = () => {
      setIsConnected(true);
      const token = sessionStorage.getItem(TOKEN_KEY);
      if (token) {
        socket.emit('auth:token', { token });
      }
      const flushed = flushBuffer();
      if (flushed) {
        setBufferSize(offlineBuffer.size());
      }
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      setBufferSize(offlineBuffer.size());
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    if (!socket.connected) {
      socket.connect();
    } else {
      handleConnect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;

    Object.entries(handlers).forEach(([event, callback]) => {
      if (typeof callback === 'function') {
        socket.on(event, callback);
      }
    });

    return () => {
      Object.entries(handlers).forEach(([event, callback]) => {
        if (typeof callback === 'function') {
          socket.off(event, callback);
        }
      });
    };
  }, [handlers]);

  return useMemo(
    () => ({
      socket: socketInstance,
      isConnected,
      bufferSize,
      lastEmitTs,
      emitLocation: (payload) => {
        const success = emitLocation(payload);
        setBufferSize(offlineBuffer.size());
        return success;
      }
    }),
    [bufferSize, isConnected]
  );
};
