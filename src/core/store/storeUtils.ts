import { useStandardStore } from '../engine/storeStandard';
import { useChess960Store } from '../engine/storeChess960';
import { type GameEngine } from '../engine/gameEngineInterface';
import type { ChessType, GameStore } from './types';

// Helper to get active engine
export const getEngine = (type: ChessType): GameEngine => {
  return type === 'standard' ? useStandardStore.getState() : useChess960Store.getState();
};

// Sync local state with engine state
// Uses generic set/get from Zustand
export const syncState = (set: any, get: () => GameStore) => {
  const { chessType } = get();
  const engine = getEngine(chessType);
  
  // Access 960 specific properties if they exist
  const startFen = (engine as any).startFen;
  const castlingRights = (engine as any).castlingRights;
  
  set({
    game: (engine as any).game, // Expose raw game object for UI rendering only
    fen: engine.getFen(),
    history: engine.getHistory(),
    historyLan: engine.getHistoryLan(),
    startFen,
    castlingRights,
    moveVersion: get().moveVersion + 1,
    gameStatus: engine.isCheckmate() ? 'checkmate' : engine.isDraw() ? 'draw' : get().gameStatus
  });
};
