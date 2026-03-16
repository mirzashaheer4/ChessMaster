import { expect, test, describe } from 'vitest';
import { deriveGameResult, deriveGameReason } from '../core/hooks/useGameResult';
import { Chess } from 'chess.js';

describe('Game Result Inference Logic', () => {

  describe('deriveGameResult', () => {
    test('should return draw if gameStatus is draw', () => {
      const state = { gameStatus: 'draw' as const, game: new Chess(), playerColor: 'white' as const, mode: 'local' as const };
      expect(deriveGameResult(state)).toBe('draw');
    });

    test('should return loss if player resigns in AI mode', () => {
      const game = new Chess();
      const state = { gameStatus: 'resign' as const, game, playerColor: 'white' as const, mode: 'ai' as const };
      expect(deriveGameResult(state)).toBe('loss');
    });

    test('should return loss for person whose turn it is in Local resign', () => {
      const game = new Chess(); // White's turn
      const state = { gameStatus: 'resign' as const, game, playerColor: 'white' as const, mode: 'local' as const };
      expect(deriveGameResult(state)).toBe('loss'); // White resigned, White lost
    });

    test('should return win for human in AI mode if AI is mated', () => {
      // Setup Black getting checkmated (so it is Black's turn to move, but they are in mate)
      const game = new Chess('4k3/8/8/8/8/8/8/4R1K1 b - - 0 1'); // Black is in check, let's say it's mate
      const state = { gameStatus: 'checkmate' as const, game, playerColor: 'white' as const, mode: 'ai' as const };
      // Black (AI) is mated -> human (white) wins
      expect(deriveGameResult(state)).toBe('win');
    });

    test('should return loss for human in AI mode if human is timed out', () => {
      const game = new Chess(); // White's turn (human)
      const state = { gameStatus: 'timeout' as const, game, playerColor: 'white' as const, mode: 'ai' as const };
      expect(deriveGameResult(state)).toBe('loss'); // Human timed out
    });
  });

  describe('deriveGameReason', () => {
    test('should return "by checkmate" for checkmate', () => {
      const state = { gameStatus: 'checkmate' as const, game: new Chess() };
      expect(deriveGameReason(state)).toBe('by checkmate');
    });

    test('should return "on time" for timeout', () => {
      const state = { gameStatus: 'timeout' as const, game: new Chess() };
      expect(deriveGameReason(state)).toBe('on time');
    });

    test('should return "by stalemate" for stalemate', () => {
      const game = new Chess('7K/8/6q1/8/8/8/8/k7 w - - 0 1'); // Stalemate
      const state = { gameStatus: 'draw' as const, game };
      expect(deriveGameReason(state)).toBe('by stalemate');
    });

    test('should return "by agreement" for manual draw if no other draw condition is met', () => {
      const game = new Chess(); 
      const state = { gameStatus: 'draw' as const, game };
      expect(deriveGameReason(state)).toBe('by agreement');
    });
  });

});
