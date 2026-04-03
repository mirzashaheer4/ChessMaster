import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth';
import { getApiServerUrl } from './urlUtils';
import { useFriendsStore } from '../store/friendsStore';

/**
 * Singleton Socket.io client manager for online multiplayer.
 * Connects with JWT auth token. Auto-reconnects.
 */

let socket: Socket | null = null;
let friendListenersAttached = false;

const SERVER_URL = getApiServerUrl();

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
    // Request online users list on connect
    socket?.emit('get_online_users');
  });

  socket.on('disconnect', () => {
    // Socket disconnected - no logging needed
  });

  socket.on('connect_error', () => {
    // Connection error - handled by UI
  });

  // Attach friend system listeners once
  if (!friendListenersAttached) {
    attachFriendListeners(socket);
    friendListenersAttached = true;
  }

  return socket;
}

function attachFriendListeners(s: Socket) {
  const store = useFriendsStore.getState;

  // Online presence
  s.on('online_users_list', (data: { users: string[] }) => {
    store().setOnlineUsers(data.users);
  });

  s.on('user_online', (data: { userId: string }) => {
    store().addOnlineUser(data.userId);
  });

  s.on('user_offline', (data: { userId: string }) => {
    store().removeOnlineUser(data.userId);
  });

  // Game invites
  s.on('game_invite', (data: any) => {
    store().addGameInvite(data);
  });

  s.on('invite_declined', (data: { inviteId: string }) => {
    store().removeGameInvite(data.inviteId);
  });

  s.on('invite_expired', (data: { inviteId: string }) => {
    store().removeGameInvite(data.inviteId);
  });

  // Friend request notifications
  s.on('friend_request_received', (data: any) => {
    store().addFriendRequest(data);
  });

  s.on('friend_request_accepted', () => {
    store().fetchFriends();
  });
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    friendListenersAttached = false;
  }
}

export function isSocketConnected(): boolean {
  return socket?.connected || false;
}
