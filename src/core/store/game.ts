import { create } from 'zustand';
import type { GameStore } from './types';
import { createSettingsSlice } from './slices/settingsSlice';
import { createGameSlice } from './slices/gameSlice';
import { createOnlineSlice } from './slices/onlineSlice';

export * from './types';

export const useGameStore = create<GameStore>((...a) => ({
  ...createSettingsSlice(...a),
  ...createGameSlice(...a),
  ...createOnlineSlice(...a),
}));
