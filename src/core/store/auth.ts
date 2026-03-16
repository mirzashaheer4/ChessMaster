import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CloudGame } from '../api/gameApi';
import { fetchUserGames } from '../api/gameApi';

interface User {
  id: string;
  username: string;
  eloRating: number;
}

interface AuthState {
  token: string | null;
  user: User | null;

  // Cloud game history
  userGames: CloudGame[];
  isLoadingGames: boolean;

  // Actions
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  fetchGames: () => Promise<void>;
  addGame: (game: CloudGame) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      userGames: [],
      isLoadingGames: false,

      setAuth: (token, user) => set({ token, user }),

      logout: () => set({
        token: null,
        user: null,
        userGames: [],       // Clear all game data on logout
        isLoadingGames: false,
      }),

      fetchGames: async () => {
        const { token } = get();
        if (!token) return;
        
        set({ isLoadingGames: true });
        try {
          const games = await fetchUserGames();
          set({ userGames: games, isLoadingGames: false });
        } catch (error) {
          console.error('Failed to fetch games:', error);
          set({ isLoadingGames: false });
        }
      },

      addGame: (game) => {
        set((state) => ({
          userGames: [game, ...state.userGames],
        }));
      },
    }),
    {
      name: 'chess-auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        // Don't persist userGames — always fetch fresh from cloud on login
      }),
    }
  )
);
