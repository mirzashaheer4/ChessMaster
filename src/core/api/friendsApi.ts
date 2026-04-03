import { getApiServerUrl } from './urlUtils';
import { useAuthStore } from '../store/auth';

const API_BASE = `${getApiServerUrl()}/api/friends`;

function getHeaders() {
  const token = useAuthStore.getState().token;
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

// ─── Types ──────────────────────────────────────────────────────────
export interface UserSearchResult {
  id: string;
  username: string;
  eloRating: number;
  createdAt: string;
  isOnline: boolean;
  isFriend: boolean;
  requestPending: boolean;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: string;
  createdAt: string;
  sender: {
    id: string;
    username: string;
    eloRating: number;
  };
}

export interface Friend {
  friendshipId: string;
  id: string;
  username: string;
  eloRating: number;
  isOnline: boolean;
}

export interface UserPublicProfile {
  id: string;
  username: string;
  eloRating: number;
  createdAt: string;
  isOnline: boolean;
  stats: {
    wins: number;
    losses: number;
    draws: number;
    total: number;
    winRate: number;
  };
  _count: {
    savedGames: number;
    gamesAsWhite: number;
    gamesAsBlack: number;
  };
}

// ─── API Functions ──────────────────────────────────────────────────
export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  try {
    const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`, {
      headers: getHeaders(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.users || [];
  } catch {
    return [];
  }
}

export async function sendFriendRequest(receiverId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/request`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ receiverId }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error };
    return { success: true };
  } catch {
    return { success: false, error: 'Network error' };
  }
}

export async function respondToFriendRequest(requestId: string, accept: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/respond`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ requestId, accept }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error };
    return { success: true };
  } catch {
    return { success: false, error: 'Network error' };
  }
}

export async function getFriendRequests(): Promise<FriendRequest[]> {
  try {
    const res = await fetch(`${API_BASE}/requests`, {
      headers: getHeaders(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.requests || [];
  } catch {
    return [];
  }
}

export async function getFriends(): Promise<Friend[]> {
  try {
    const res = await fetch(`${API_BASE}`, {
      headers: getHeaders(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.friends || [];
  } catch {
    return [];
  }
}

export async function removeFriend(friendshipId: string): Promise<{ success: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/${friendshipId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return { success: res.ok };
  } catch {
    return { success: false };
  }
}

export async function getUserPublicProfile(userId: string): Promise<UserPublicProfile | null> {
  try {
    const res = await fetch(`${API_BASE}/profile/${userId}`, {
      headers: getHeaders(),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
