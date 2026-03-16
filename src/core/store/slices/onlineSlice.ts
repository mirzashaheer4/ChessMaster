import type { StateCreator } from 'zustand';
import type { GameStore, OnlineSlice } from '../types';
import { getSocket } from '../../api/socketClient';
import { syncState } from '../storeUtils';
import { useStandardStore } from '../../engine/storeStandard';
import { useChess960Store } from '../../engine/storeChess960';

export const createOnlineSlice: StateCreator<GameStore, [], [], OnlineSlice> = (set, get) => ({
  // Initial State
  onlineStatus: 'idle',
  roomId: null,
  onlineColor: null,
  opponentName: null,
  opponentElo: null,
  drawOfferedBy: null,
  opponentDisconnected: false,
  connectionError: null,

  // ── Actions ──────────────────────────────────────────────────────

  joinQueue: (timeCategory, timeInitial, timeIncrement) => {
    try {
      set({ onlineStatus: 'connecting', connectionError: null });
      const socket = getSocket();

      // Init listeners first
      get().initSocketListeners();

      const join = () => {
        socket.emit('join_queue', { timeCategory, timeInitial, timeIncrement });
        set({ onlineStatus: 'queuing' });
      };

      if (socket.connected) {
        join();
      } else {
        socket.once('connect', join);
      }
    } catch (err: any) {
      set({ onlineStatus: 'idle', connectionError: err.message });
    }
  },

  leaveQueue: () => {
    try {
      const socket = getSocket();
      socket.emit('leave_queue');
    } catch {
      // Ignore
    }
    set({ onlineStatus: 'idle' });
  },

  makeOnlineMove: (move) => {
    const { roomId } = get();
    if (!roomId) return;

    try {
      const socket = getSocket();
      console.log(`[Online] Sending move to server:`, move);
      socket.emit('make_move', { roomId, ...move });
    } catch (err: any) {
      console.error('[Online] Failed to send move:', err);
    }
  },

  resignOnline: () => {
    const { roomId } = get();
    if (!roomId) return;

    try {
      const socket = getSocket();
      socket.emit('resign', { roomId });
    } catch {
      // Ignore
    }
  },

  offerDraw: () => {
    const { roomId } = get();
    if (!roomId) return;

    try {
      const socket = getSocket();
      socket.emit('offer_draw', { roomId });
    } catch {
      // Ignore
    }
  },

  acceptDraw: () => {
    const { roomId } = get();
    if (!roomId) return;

    try {
      const socket = getSocket();
      socket.emit('accept_draw', { roomId });
    } catch {
      // Ignore
    }
  },

  declineDraw: () => {
    const { roomId } = get();
    if (!roomId) return;

    try {
      const socket = getSocket();
      socket.emit('decline_draw', { roomId });
      set({ drawOfferedBy: null });
    } catch {
      // Ignore
    }
  },

  resetOnline: () => {
    get().cleanupSocketListeners();
    set({
      onlineStatus: 'idle',
      roomId: null,
      onlineColor: null,
      opponentName: null,
      opponentElo: null,
      drawOfferedBy: null,
      opponentDisconnected: false,
      connectionError: null,
    });
  },

  initSocketListeners: () => {
    let socket: ReturnType<typeof getSocket>;
    try {
      socket = getSocket();
    } catch {
      return;
    }

    // Remove old listeners (idempotent)
    socket.off('queue_joined');
    socket.off('game_matched');
    socket.off('game_reconnected');
    socket.off('move_made');
    socket.off('move_error');
    socket.off('game_over');
    socket.off('draw_offered');
    socket.off('draw_declined');
    socket.off('opponent_disconnected');
    socket.off('opponent_reconnected');

    // ── Queue joined ──
    socket.on('queue_joined', () => {
      set({ onlineStatus: 'queuing' });
    });

    // ── Game matched ──
    socket.on('game_matched', (data: {
      roomId: string;
      color: 'white' | 'black';
      opponent: { username: string; elo: number };
      timeInitial: number;
      timeIncrement: number;
    }) => {
      // Reset the board and configure for online play
      const store = get();
      store.setMode('online');
      store.setPlayerColor(data.color === 'white' ? 'white' : 'black');
      store.setTimeControl({
        category: data.timeInitial <= 60 ? 'bullet' : data.timeInitial <= 300 ? 'blitz' : 'rapid',
        initial: data.timeInitial,
        increment: data.timeIncrement,
        label: `${Math.floor(data.timeInitial / 60)}+${data.timeIncrement}`,
      });
      store.resetGame();
      store.startClock();

      set({
        onlineStatus: 'playing',
        roomId: data.roomId,
        onlineColor: data.color,
        opponentName: data.opponent.username,
        opponentElo: data.opponent.elo,
        drawOfferedBy: null,
        opponentDisconnected: false,
      });
    });

    // ── Game reconnected ──
    socket.on('game_reconnected', (data: {
      roomId: string;
      color: 'white' | 'black';
      fen: string;
      pgn: string;
      moves: string[];
      whiteTime: number;
      blackTime: number;
      opponent: { username: string; elo: number };
      timeIncrement: number;
      drawOfferedBy: 'white' | 'black' | null;
    }) => {
      const store = get();
      store.setMode('online');
      store.setPlayerColor(data.color);

      // Load the game state from server
      store.loadCloudGame(data.pgn, 'online');
      store.startClock();

      set({
        onlineStatus: 'playing',
        roomId: data.roomId,
        onlineColor: data.color,
        opponentName: data.opponent.username,
        opponentElo: data.opponent.elo,
        drawOfferedBy: data.drawOfferedBy,
        opponentDisconnected: false,
        whiteTime: data.whiteTime / 1000, // Convert to seconds
        blackTime: data.blackTime / 1000,
      });
    });

    // ── Move made (from server) ──
    socket.on('move_made', (data: {
      from: string;
      to: string;
      san: string;
      promotion?: string;
      fen: string;
      whiteTime: number;
      blackTime: number;
    }) => {
      const store = get();
      
      console.log(`[Online] Received move: ${data.from}-${data.to} (${data.san})`);
      console.log(`[Online] Current board FEN: ${store.game.fen()}`);
      console.log(`[Online] Current turn: ${store.game.turn()}`);

      const currentFen = store.game.fen().split(' ')[0];
      const incomingFen = data.fen.split(' ')[0];

      if (currentFen === incomingFen) {
        // We already have this state (likely because we originated the move)
        // Just sync the times and return early to prevent echo wiping our history
        set({
          whiteTime: data.whiteTime / 1000,
          blackTime: data.blackTime / 1000,
        });
        return;
      }

      // Apply the move locally, marking it as a network move so it doesn't echo back
      const result = store.makeMove({ from: data.from, to: data.to, promotion: data.promotion }, true);
      
      if (!result) {
        console.warn(`[Online] makeMove rejected incoming move! Syncing board state via FEN fallback.`);
        // Force sync board state if our local engine rejected it for some reason
        if (store.chessType === 'standard') {
          useStandardStore.getState().loadFen(data.fen);
        } else {
          useChess960Store.getState().loadFen(data.fen);
        }
        syncState(set, get);
      }

      // Sync clocks from server (authoritative)
      set({
        whiteTime: data.whiteTime / 1000,
        blackTime: data.blackTime / 1000,
      });
    });

    // ── Move error ──
    socket.on('move_error', (data: { message: string }) => {
      console.error('[Online] Move error:', data.message);
    });

    // ── Game over ──
    socket.on('game_over', (data: {
      winner: 'white' | 'black' | 'draw';
      reason: string;
      result: string;
      whiteTime: number;
      blackTime: number;
      pgn: string;
    }) => {
      const store = get();
      store.pauseClock();

      // Determine status
      let gameStatus: 'checkmate' | 'draw' | 'resign' | 'timeout' = 'draw';
      if (data.reason === 'checkmate') gameStatus = 'checkmate';
      else if (data.reason === 'resign' || data.reason === 'abandonment') gameStatus = 'resign';
      else if (data.reason === 'timeout') gameStatus = 'timeout';

      store.setGameStatus(gameStatus);

      set({
        onlineStatus: 'ended',
        drawOfferedBy: null,
        whiteTime: data.whiteTime / 1000,
        blackTime: data.blackTime / 1000,
      });
    });

    // ── Draw offered ──
    socket.on('draw_offered', (data: { by: 'white' | 'black' }) => {
      set({ drawOfferedBy: data.by });
    });

    // ── Draw declined ──
    socket.on('draw_declined', () => {
      set({ drawOfferedBy: null });
    });

    // ── Opponent disconnected ──
    socket.on('opponent_disconnected', () => {
      set({ opponentDisconnected: true });
    });

    // ── Opponent reconnected ──
    socket.on('opponent_reconnected', () => {
      set({ opponentDisconnected: false });
    });
  },

  cleanupSocketListeners: () => {
    try {
      const socket = getSocket();
      socket.off('queue_joined');
      socket.off('game_matched');
      socket.off('game_reconnected');
      socket.off('move_made');
      socket.off('move_error');
      socket.off('game_over');
      socket.off('draw_offered');
      socket.off('draw_declined');
      socket.off('opponent_disconnected');
      socket.off('opponent_reconnected');
    } catch {
      // Socket may not exist
    }
  },
});
