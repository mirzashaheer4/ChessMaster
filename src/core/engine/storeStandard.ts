import { create } from 'zustand';
import { Chess } from 'chess.js';
import type { GameEngine } from './gameEngineInterface';
import { getSafeHistory } from '../utils/chess960';

interface StandardStore extends GameEngine {
  game: Chess;
  history: string[]; // Verbose SAN
  historyLan: string[]; // LAN for AI
}

export const useStandardStore = create<StandardStore>((set, get) => ({
  game: new Chess(),
  history: [],
  historyLan: [],

  getFen: () => get().game.fen(),
  getTurn: () => get().game.turn(),
  getHistory: () => get().history,
  getHistoryLan: () => get().historyLan,
  inCheck: () => get().game.inCheck(),
  isCheckmate: () => get().game.isCheckmate(),
  isDraw: () => get().game.isDraw(),
  isGameOver: () => get().game.isGameOver(),

  makeMove: (move) => {
    const { game } = get();
    try {
      // Standard chess.js validation
      const result = game.move(move);
      if (result) {
        
        // Use safe history extraction to prevent crashes
        const verbose = getSafeHistory(game);
        const newHistory = verbose.map(m => m.san);

        // Fix: chess.js result.lan might be undefined
        const lan = result.lan || `${result.from}${result.to}${result.promotion || ''}`;
        const newHistoryLan = [...get().historyLan, lan];
        
        // CRITICAL FIX: Do NOT recreate game from FEN, as it wipes history.
        // Instead, we can either mutate 'game' (since we're using getState not a reactive hook for logic)
        // OR clone it properly. Since chess.js doesn't clone history easily, we'll keep the same instance.
        // To trigger re-renders, we rely on the specific state fields (fen, history, turn) changing.
        
        set({
          history: newHistory,
          historyLan: newHistoryLan,
          game: game // Keep the same instance with updated internal state
        });
        return result;
      }
    } catch (e) {
      // Invalid moves are normal for failed premoves (e.g. piece was blocked)
      // Silently catch to avoid noisy console errors.
    }
    return null;
  },

  undoMove: () => {
    const { game } = get();
    game.undo();
    const newHistory = [...get().history];
    newHistory.pop();
    const newHistoryLan = [...get().historyLan];
    newHistoryLan.pop();
    
    set({
      history: newHistory,
      historyLan: newHistoryLan,
      game: new Chess(game.fen())
    });
  },

  reset: () => {
    set({
      game: new Chess(),
      history: [],
      historyLan: []
    });
  },

  loadFen: (fen) => {
    const newGame = new Chess(fen);
    set({
      game: newGame,
      history: [],
      historyLan: []
    });
  },

  getLegalMoves: (square) => {
    return get().game.moves({ square: square as any, verbose: true }).map(m => m.to);
  }
}));
