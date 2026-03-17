import { useAuthStore } from '../store/auth';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || '';
const API_BASE = `${SERVER_URL}/api`;

/**
 * Cloud Game Data — matches what the server returns
 */
export interface CloudGame {
  id: string;
  pgn: string;
  result: string | null;
  status: string;
  mode: string | null;
  difficulty: string | null;
  opponentName: string | null;
  playerColor: string | null;
  timeControl: string | null;
  currentFen: string;
  createdAt: string;
}

/**
 * Data to send when saving a game to the cloud
 */
export interface SaveGamePayload {
  pgn: string;
  result: string;       // '1-0', '0-1', '1/2-1/2'
  status: string;       // checkmate, draw, timeout, resign
  fen: string;
  timeControl?: string;
  mode?: string;
  difficulty?: string;
  opponentName?: string;
  playerColor?: string;
}

/**
 * Get the auth headers for API requests.
 * Returns null if not authenticated (callers should bail out).
 */
function getAuthHeaders(): Record<string, string> | null {
  const token = useAuthStore.getState().token;
  if (!token) return null;
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

/**
 * Save a completed game to the cloud.
 * userId is NEVER sent in the body — the server reads it from the JWT token.
 */
export async function saveGameToCloud(payload: SaveGamePayload): Promise<CloudGame | null> {
  try {
    const headers = getAuthHeaders();
    if (!headers) return null;

    const res = await fetch(`${API_BASE}/games`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('Cloud save failed:', err);
      return null;
    }

    const data = await res.json();
    return data.game;
  } catch (error) {
    console.error('Cloud save error:', error);
    return null;
  }
}

/**
 * Fetch all games for the currently authenticated user.
 * Server enforces WHERE userId = authenticated user — no client filtering.
 */
export async function fetchUserGames(): Promise<CloudGame[]> {
  try {
    const headers = getAuthHeaders();
    if (!headers) return [];

    const res = await fetch(`${API_BASE}/games`, {
      method: 'GET',
      headers,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('Fetch games failed:', err);
      return [];
    }

    const data = await res.json();
    return data.games || [];
  } catch (error) {
    console.error('Fetch games error:', error);
    return [];
  }
}

