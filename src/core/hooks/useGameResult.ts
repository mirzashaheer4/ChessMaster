import { useGameStore } from '../store/game';
import type { GameStore } from '../store/game';

/**
 * Pure function to derive game result
 */
export function deriveGameResult(state: Pick<GameStore, 'gameStatus' | 'game' | 'playerColor' | 'mode'>): 'win' | 'loss' | 'draw' {
  if (state.gameStatus === 'draw') return 'draw';
  if (state.gameStatus === 'resign') {
    // In AI mode, resign always means player lost
    // In local mode, whoever's turn it is resigned
    return state.mode === 'ai' ? 'loss' : (state.game.turn() === 'w' ? 'loss' : 'win');
  }
  // Checkmate or timeout — derive from turn
  if (state.mode === 'ai') {
    const aiColor = state.playerColor === 'white' ? 'b' : 'w';
    return state.game.turn() === aiColor ? 'win' : 'loss';
  }
  // Local: the side whose turn it is just got mated/timed out
  return state.game.turn() === 'w' ? 'loss' : 'win';
}

/**
 * Pure function to derive game reason
 */
export function deriveGameReason(state: Pick<GameStore, 'gameStatus' | 'game'>): string {
  if (state.gameStatus === 'checkmate') return 'by checkmate';
  if (state.gameStatus === 'timeout') return 'on time';
  if (state.gameStatus === 'resign') return 'by resignation';
  if (state.gameStatus === 'draw') {
    if (state.game.isStalemate()) return 'by stalemate';
    if (state.game.isThreefoldRepetition()) return 'by repetition';
    if (state.game.isInsufficientMaterial()) return 'insufficient material';
    return 'by agreement';
  }
  return '';
}

/**
 * Shared hook for deriving game result and reason strings.
 * Eliminates duplication between AIGame and LocalGame.
 */
export function useGameResult() {
  const state = useGameStore();

  const getGameResult = () => deriveGameResult(state);
  const getGameReason = () => deriveGameReason(state);

  return { getGameResult, getGameReason };
}
