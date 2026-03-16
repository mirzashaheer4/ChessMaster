import { useRef, useCallback } from 'react';
import { useGameStore } from '../store/game';
import type { MoveAnalysis } from '../utils/analysisEngine';
import type { PastGame } from '../store/types';

/**
 * Shared hook for game save logic with built-in duplicate prevention.
 * Used by both AIGame and LocalGame to ensure each game is saved exactly once.
 * 
 * The ref-based guard prevents duplicates from:
 *   - React StrictMode double-mounting
 *   - Rapid concurrent state changes
 *   - Returning from review screen (where gameStatus is still 'checkmate'/'draw')
 */
export function useGameSave() {
  const gameSavedRef = useRef(false);
  const store = useGameStore();

  /**
   * Save the game exactly once. Subsequent calls are silently ignored.
   * Returns true if the save executed, false if it was already saved.
   */
  const saveOnce = useCallback((
    result: 'win' | 'loss' | 'draw',
    analysis?: MoveAnalysis[],
    stats?: PastGame['stats'],
    pgnOverride?: string
  ): boolean => {
    if (gameSavedRef.current) return false;
    gameSavedRef.current = true;
    store.saveGame(result, analysis, stats, pgnOverride);
    return true;
  }, [store]);

  /**
   * Get a safe PGN string, falling back to a result header on error.
   */
  const getSafePgn = useCallback((fallbackResult?: string): string => {
    try {
      return store.game.pgn();
    } catch {
      return `[Result "${fallbackResult || '*'}"]`;
    }
  }, [store.game]);

  /**
   * Mark as already saved (e.g., when returning from review).
   */
  const markSaved = useCallback(() => {
    gameSavedRef.current = true;
  }, []);

  /**
   * Reset the guard (e.g., on fresh game start).
   */
  const resetGuard = useCallback(() => {
    gameSavedRef.current = false;
  }, []);

  /**
   * Check if this game session has already been saved.
   */
  const isSaved = useCallback(() => gameSavedRef.current, []);

  return { saveOnce, getSafePgn, markSaved, resetGuard, isSaved };
}
