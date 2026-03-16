import { expect, test, describe, beforeEach, vi } from 'vitest';
import { useGameStore } from '../core/store/game';

// Mock audio
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

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

vi.stubGlobal('localStorage', localStorageMock);

describe('Store Logic - Save, Load, and Clock', () => {
  beforeEach(() => {
    localStorageMock.clear();
    useGameStore.getState().resetGame();
    vi.clearAllMocks();
  });

  test('should save game correctly to pastGames', () => {
    const store = useGameStore.getState();
    store.makeMove({ from: 'e2', to: 'e4' });
    store.saveGame('win');

    const updatedStore = useGameStore.getState();
    expect(updatedStore.pastGames.length).toBe(1);
    expect(updatedStore.pastGames[0].pgn).toContain('e4');
  });

  test('should load game correctly from pastGames', () => {
    const store = useGameStore.getState();
    store.makeMove({ from: 'd2', to: 'd4' });
    store.saveGame('win');
    const savedId = useGameStore.getState().pastGames[0].id;
    
    // Reset to clear current game
    store.resetGame();
    expect(useGameStore.getState().history.length).toBe(0);

    // Load the saved game
    useGameStore.getState().loadGame(savedId);
    
    expect(useGameStore.getState().history.length).toBe(1);
    expect(useGameStore.getState().history[0]).toBe('d4');
  });

  test('should start and track the clock', async () => {
    // Enable fake timers to easily test setInterval
    vi.useFakeTimers();

    const store = useGameStore.getState();
    store.setTimeControl({ initial: 300000, increment: 0, category: 'blitz', label: '5 min' });
    store.setGameStatus('active');
    
    // The store should have 5 mins = 300,000 ms
    expect(useGameStore.getState().whiteTime).toBe(300000);
    expect(useGameStore.getState().blackTime).toBe(300000);

    // Start clock for white
    useGameStore.getState().startClock();
    expect(useGameStore.getState().clockRunning).toBe(true);

    // Fast-forward 2 seconds
    vi.advanceTimersByTime(2000);

    // Tick the clock (the game store uses a recursive setTimeout/setInterval which we triggered)
    // Wait, the store uses tickClock(), let's manually tick or wait for it.
    useGameStore.getState().tickClock(100); // Usually called every 100ms
    
    // Check that white time is reduced. 
    // In actual implementation, tickClock subtracts elapsed time.
    expect(useGameStore.getState().whiteTime).toBeLessThan(300000);
    expect(useGameStore.getState().blackTime).toBe(300000);

    // Clean up
    useGameStore.getState().pauseClock();
    vi.useRealTimers();
  });
});
