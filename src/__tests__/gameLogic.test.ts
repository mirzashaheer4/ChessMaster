import { expect, test, describe, beforeEach, vi } from 'vitest';
import { useGameStore } from '../core/store/game';

// Mock audio to avoid errors during tests
vi.mock('../core/audio/audio', () => ({
  audio: {
    playMove: vi.fn(),
    playCapture: vi.fn(),
    playGameStart: vi.fn(),
    playGameOver: vi.fn(),
    playWarning: vi.fn(),
    playCheck: vi.fn(),
    playCastle: vi.fn(),
    playTenSeconds: vi.fn(),
  }
}));

// Also mock localStorage for persistent store parts
vi.stubGlobal('localStorage', {
  getItem: vi.fn(),
  setItem: vi.fn(),
});

describe('Core Game Logic - makeMove & gameStatus', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  test('should execute a valid standard move', () => {
    const store = useGameStore.getState();
    const result = store.makeMove({ from: 'e2', to: 'e4' });
    
    expect(result).not.toBe(null);
    expect(useGameStore.getState().history.length).toBe(1);
    expect(useGameStore.getState().history[0]).toBe('e4');
    expect(useGameStore.getState().game.turn()).toBe('b');
  });

  test('should reject an illegal move', () => {
    const store = useGameStore.getState();
    const result = store.makeMove({ from: 'e2', to: 'e5' }); // Invalid for a pawn
    
    expect(result).toBe(null);
    expect(useGameStore.getState().history.length).toBe(0);
    expect(useGameStore.getState().game.turn()).toBe('w');
  });

  test('should detect checkmate and update gameStatus', () => {
    // Setup position one move away from back-rank mate
    useGameStore.getState().game.load('6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1');
    useGameStore.getState().setGameStatus('active'); // ensure active to allow move
    
    const res = useGameStore.getState().makeMove({ from: 'e1', to: 'e8' });
    expect(res).not.toBe(null);
    
    expect(useGameStore.getState().game.isCheckmate()).toBe(true);
    expect(useGameStore.getState().gameStatus).toBe('checkmate');
  });

  test('should detect stalemate and update gameStatus', () => {
    // Setup position one move away from stalemate
    useGameStore.getState().game.load('7k/8/8/8/8/8/8/K5Q1 w - - 0 1');
    useGameStore.getState().setGameStatus('active');
    
    const res = useGameStore.getState().makeMove({ from: 'g1', to: 'g6' });
    expect(res).not.toBe(null);
    
    expect(useGameStore.getState().game.isStalemate()).toBe(true);
    expect(useGameStore.getState().gameStatus).toBe('draw');
  });
});
