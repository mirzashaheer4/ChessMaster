import type { StateCreator } from 'zustand';
import type { GameStore, SettingsSlice } from '../types';
import { useStandardStore } from '../../engine/storeStandard';
import { useChess960Store } from '../../engine/storeChess960';
import { generateChess960 } from '../../utils/chess960';
import { syncState } from '../storeUtils';

export const createSettingsSlice: StateCreator<GameStore, [], [], SettingsSlice> = (set, get) => ({
  // Initial State
  chessType: 'standard',
  mode: null,
  difficulty: null,
  playerColor: null,
  boardFlipped: false,
  boardTheme: 'midnight',
  pieceTheme: 'wood',
  customBot: null,

  // Actions
  setMode: (mode) => set({ mode }),
  setDifficulty: (difficulty) => set({ difficulty }),
  setPlayerColor: (color) => set({ playerColor: color }),
  
  setChessType: (type) => {
    set({ chessType: type });
    // Initialize the appropriate store
    if (type === 'standard') {
      useStandardStore.getState().reset();
    } else {
      const setup = generateChess960();
      useChess960Store.getState().set960Position(setup);
    }
    syncState(set, get);
  },

  setBoardFlipped: (f) => set({ boardFlipped: f }),
  flipBoard: () => set((state) => ({ boardFlipped: !state.boardFlipped })),
  setBoardTheme: (t) => set({ boardTheme: t }),
  setPieceTheme: (t) => set({ pieceTheme: t }),
  setCustomBot: (b: SettingsSlice['customBot']) => set({ customBot: b }),
});
