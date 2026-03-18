import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth';

/**
 * Singleton Socket.io client manager for online multiplayer.
 * Connects with JWT auth token. Auto-reconnects.
 */

let socket: Socket | null = null;

const rawServerUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
const SERVER_URL = rawServerUrl.endsWith('/') ? rawServerUrl.slice(0, -1) : rawServerUrl;

export function getSocket(): Socket {
  if (socket && socket.connected) return socket;

  const token = useAuthStore.getState().token;
  if (!token) {
    throw new Error('Cannot connect to server: not authenticated');
  }

  if (socket) {
    // Update auth token and reconnect
    socket.auth = { token };
    socket.connect();
    return socket;
  }

  socket = io(SERVER_URL, {
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 3000, // 3 seconds for responsive chess game
  });

  socket.on('connect', () => {
    // Socket connected - no logging needed
  });

  socket.on('disconnect', () => {
    // Socket disconnected - no logging needed
  });

  socket.on('connect_error', () => {
    // Connection error - handled by UI
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function isSocketConnected(): boolean {
  return socket?.connected || false;
}
