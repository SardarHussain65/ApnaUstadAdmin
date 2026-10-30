import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from './api';

let socket: Socket | null = null;

export const getSocketUrl = (): string => {
  if (typeof window === 'undefined') return '';
  const envUrl = import.meta.env.VITE_SOCKET_URL;
  if (envUrl) return envUrl;
  return API_BASE_URL.replace(/\/api\/v1\/?$/, '');
};

export const getSocket = (): Socket | null => {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('adminToken');
  if (!token) {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    return null;
  }

  if (socket && socket.connected) {
    return socket;
  }

  const url = getSocketUrl();
  if (!url) return null;

  if (!socket) {
    socket = io(url, {
      auth: { token },
      extraHeaders: {
        Authorization: `Bearer ${token}`,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      autoConnect: true,
    });

    socket.on('connect_error', () => {
      // Graceful fallback to HTTP polling if WebSocket is temporarily blocked
    });
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
