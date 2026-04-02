import { getApiServerUrl } from './urlUtils';

const API_BASE = `${getApiServerUrl()}/api/stats`;

export interface OverviewStats {
  players: number;
  games: number;
  accuracy: number;
}

export interface Leader {
  rank: number;
  name: string;
  rating: number;
  country: string;
  wins: number;
}

export interface LeaderboardResponse {
  leaders: Leader[];
}

export async function fetchOverviewStats(): Promise<OverviewStats | null> {
  try {
    const res = await fetch(`${API_BASE}/overview`);
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('Failed to fetch overview stats:', error);
    return null;
  }
}

export async function fetchLeaderboard(): Promise<LeaderboardResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/leaderboard`);
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
    return null;
  }
}
