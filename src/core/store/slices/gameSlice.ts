import type { StateCreator } from 'zustand';
import { Chess } from 'chess.js';
import type { GameStore, GameSlice, PastGame } from '../types';
import { getEngine, syncState } from '../storeUtils';
import { useStandardStore } from '../../engine/storeStandard';
import { useChess960Store } from '../../engine/storeChess960';
import { generateChess960 } from '../../utils/chess960';
import { saveGameToCloud } from '../../api/gameApi';
import { useAuthStore } from '../auth';

const loadSavedGames = (): PastGame[] => {
    try {
        const saved = localStorage.getItem('chess-game-history');
        return saved ? JSON.parse(saved) : [];
    } catch { return []; }
};

export const createGameSlice: StateCreator<GameStore, [], [], GameSlice> = (set, get) => ({
    // Initial State
    game: new Chess(),
    fen: new Chess().fen(),
    history: [],
    historyLan: [],
    moveVersion: 0,
    evaluation: 0,
    mateIn: null,
    gameStatus: 'active',
    reviewIndex: -1,
    currentGameAnalysis: null,
    engineArrows: [],
    premoves: [],
    timeControl: null,
    whiteTime: 0,
    blackTime: 0,
    clockRunning: false,
    pastGames: loadSavedGames(),

    // Game Logic Delegation
    makeMove: (move, isNetworkMove = false) => {
        const state = get();
        const { chessType, clockRunning, timeControl, mode } = state;
        const engine = getEngine(chessType);

        // Delegate to engine
        const result = engine.makeMove(move);

        if (result) {
            syncState(set, get);

            // Handle Clock Start First Move
            if (!clockRunning && timeControl) {
                get().startClock();
            }

            // In online mode, the server controls the clocks and turn increments.
            get().onMoveMade();

            // Broadcast to server if we're in an online game and it's a LOCAL move
            if (mode === 'online' && !isNetworkMove) {
                state.makeOnlineMove({
                    from: result.from,
                    to: result.to,
                    promotion: result.promotion
                });
            }

            return result;
        }
        return null;
    },

    resetGame: () => {
        const { chessType } = get();

        if (chessType === 'standard') {
            useStandardStore.getState().reset();
        } else {
            const setup = generateChess960();
            useChess960Store.getState().set960Position(setup);
        }

        set({
            gameStatus: 'active',
            reviewIndex: -1,
            evaluation: 0,
            mateIn: null,
            premoves: [],
            currentGameAnalysis: null,
            moveVersion: 0,
            whiteTime: get().timeControl?.initial || 0,
            blackTime: get().timeControl?.initial || 0,
            clockRunning: false
        });

        syncState(set, get);
    },

    onMoveMade: () => {
        const { game, timeControl, whiteTime, blackTime, mode } = get();
        if (!timeControl) return;
        // In online mode, the server sends authoritative times — don't add increment locally
        if (mode === 'online') return;

        const turn = game.turn();
        const justMoved = turn === 'w' ? 'b' : 'w';

        const inc = timeControl.increment;
        if (justMoved === 'w') {
            set({ whiteTime: whiteTime + inc });
        } else {
            set({ blackTime: blackTime + inc });
        }
    },

    setEvaluation: (e, m = null) => set({ evaluation: e, mateIn: m }),

    // Clocks
    setTimeControl: (tc) => set({ timeControl: tc, whiteTime: tc?.initial || 0, blackTime: tc?.initial || 0 }),

    startClock: () => {
        if (get().gameStatus === 'active') set({ clockRunning: true });
    },

    pauseClock: () => set({ clockRunning: false }),

    resetClocks: () => {
        const { timeControl } = get();
        set({
            clockRunning: false,
            whiteTime: timeControl?.initial || 0,
            blackTime: timeControl?.initial || 0
        });
    },

    tickClock: (delta) => {
        const { clockRunning, gameStatus, game, whiteTime, blackTime, playerColor, mode } = get();
        if (!clockRunning || gameStatus !== 'active') return;
        // In online mode, don't trigger timeout locally — the server is authoritative

        const turn = game.turn();
        if (turn === 'w') {
            const next = Math.max(0, whiteTime - delta);
            set({ whiteTime: next });
            if (next === 0 && mode !== 'online') {
                get().setGameStatus('timeout');
                const result = playerColor === 'black' ? 'win' : playerColor === 'white' ? 'loss' : 'loss';
                get().saveGame(result);
            }
        } else {
            const next = Math.max(0, blackTime - delta);
            set({ blackTime: next });
            if (next === 0 && mode !== 'online') {
                get().setGameStatus('timeout');
                const result = playerColor === 'white' ? 'win' : playerColor === 'black' ? 'loss' : 'win';
                get().saveGame(result);
            }
        }
    },

    setGameStatus: (s) => set({ gameStatus: s }),

    // Review
    startReview: () => {
        const history = get().history;
        if (history.length > 0) set({ reviewIndex: history.length - 1 });
    },
    setReviewIndex: (i) => set({ reviewIndex: i }),
    exitReview: () => set({ reviewIndex: -1 }),
    setEngineArrows: (arrows) => set({ engineArrows: arrows }),
    setCurrentGameAnalysis: (analysis) => set({ currentGameAnalysis: analysis }),
    prevMove: () => {
        const { reviewIndex, history } = get();
        if (history.length === 0) return;
        if (reviewIndex === -1) {
            // Auto-enter review from live: go back one move
            const target = history.length - 2;
            set({ reviewIndex: target === -1 ? -2 : target });
        } else {
            if (reviewIndex === -2) return; // Prevent decrementing past the Starting Position
            
            // Skip -1 (live sentinel) — go straight from 0 to -2 (start)
            const prev = reviewIndex - 1;
            set({ reviewIndex: prev === -1 ? -2 : prev });
        }
    },
    nextMove: () => {
        const { reviewIndex, history } = get();
        if (reviewIndex === -1) return; // Already live
        // When at start (-2), first move is index 0 (skip -1 sentinel)
        const next = reviewIndex === -2 ? 0 : reviewIndex + 1;
        if (next >= history.length) {
            // Past last move — return to live
            set({ reviewIndex: -1 });
        } else {
            set({ reviewIndex: next });
        }
    },

    // Premoves
    addPremove: (m) => set(s => ({ premoves: [...s.premoves, m] })),
    clearPremoves: () => set({ premoves: [] }),
    executePremove: () => {
        const { premoves } = get();
        if (premoves.length === 0) return;
        const move = premoves[0];
        // Build clean move object — only include promotion if defined (for pawns)
        const cleanMove: { from: string; to: string; promotion?: string } = { from: move.from, to: move.to };
        if (move.promotion) cleanMove.promotion = move.promotion;
        console.log(`[Chess] Executing premove: ${cleanMove.from}->${cleanMove.to}`, cleanMove.promotion ? `(promo: ${cleanMove.promotion})` : '');
        const result = get().makeMove(cleanMove);
        if (result) {
            set({ premoves: premoves.slice(1) });
        } else {
            console.log('[Chess] Premove failed, clearing queue');
            set({ premoves: [] });
        }
    },

    saveGame: (result, analysis, stats, pgnOverride) => {
        const { game, mode, difficulty, pastGames, playerColor, gameStatus } = get();
        let pgn = pgnOverride || '';
        if (!pgn) {
            try { pgn = game.pgn(); } catch { pgn = '[Result "*"]'; }
        }
        const newGame: PastGame = {
            id: Date.now().toString(),
            date: new Date().toLocaleDateString(),
            mode: mode || 'local',
            difficulty: difficulty || undefined,
            result,
            pgn,
            fen: game.fen(),
            analysis,
            stats
        };
        const updated = [newGame, ...pastGames].slice(0, 20);
        set({ pastGames: updated });
        localStorage.setItem('chess-game-history', JSON.stringify(updated));

        // Cloud save (fire-and-forget) — only if user is authenticated
        const authState = useAuthStore.getState();
        if (authState.token && authState.user) {
            const resultCode = result === 'win' ? '1-0' : result === 'loss' ? '0-1' : '1/2-1/2';
            saveGameToCloud({
                pgn,
                result: resultCode,
                status: gameStatus || 'active',
                fen: game.fen(),
                mode: mode || 'local',
                difficulty: difficulty || undefined,
                opponentName: mode === 'ai' ? 'Stockfish 16' : mode === 'local' ? 'Player 2' : undefined,
                playerColor: playerColor || undefined,
            }).then((saved) => {
                if (saved) {
                    useAuthStore.getState().addGame(saved);
                }
            });
        }
    },

    loadGame: (id) => {
        const { pastGames } = get();
        const target = pastGames.find(g => g.id === id);
        if (target) {
            const loadedGame = new Chess();
            try { loadedGame.loadPgn(target.pgn); } catch { 
              try { loadedGame.load(target.fen); } catch { /* fallback to default */ }
            }

            // Derive gameStatus from the saved result instead of hardcoding
            const derivedStatus = target.result === 'draw' ? 'draw' : 'checkmate';
            set({
                game: loadedGame,
                fen: loadedGame.fen(),
                history: loadedGame.history(),
                historyLan: [],
                gameStatus: derivedStatus,
                reviewIndex: 0,
                mode: target.mode
            });
        }
    },

    loadCloudGame: (pgn, mode) => {
        const loadedGame = new Chess();
        try { loadedGame.loadPgn(pgn); } catch { /* fallback to default position */ }

        // Get verbose history to extract LAN notation (from+to)
        const verboseMoves = loadedGame.history({ verbose: true });
        const sanMoves = verboseMoves.map(m => m.san);
        const lanMoves = verboseMoves.map(m => m.from + m.to + (m.promotion || ''));

        // Derive gameStatus from the actual game state instead of hardcoding 'active'
        let derivedStatus: 'active' | 'checkmate' | 'draw' | 'timeout' | 'resign' = 'active';
        if (loadedGame.isCheckmate()) derivedStatus = 'checkmate';
        else if (loadedGame.isDraw() || loadedGame.isStalemate() || loadedGame.isThreefoldRepetition() || loadedGame.isInsufficientMaterial()) derivedStatus = 'draw';

        set({
            game: loadedGame,
            fen: loadedGame.fen(),
            history: sanMoves,
            historyLan: lanMoves,
            gameStatus: derivedStatus,
            reviewIndex: sanMoves.length > 0 ? sanMoves.length - 1 : -1,
            mode: (mode as any) || 'local',
        });
    },

    saveReviewState: () => {
        const { game, history, historyLan, mode, playerColor, chessType, startFen, castlingRights } = get();
        try {
            let pgn = '';
            try { pgn = game.pgn(); } catch { /* ignore */ }
            const data = {
                pgn,
                fen: game.fen(),
                history,
                historyLan,
                mode,
                playerColor,
                chessType,
                startFen: startFen || null,
                castlingRights: castlingRights || null,
            };
            sessionStorage.setItem('chess-review-state', JSON.stringify(data));
        } catch { /* storage not available */ }
    },

    restoreReviewState: () => {
        try {
            const raw = sessionStorage.getItem('chess-review-state');
            if (!raw) return false;
            const data = JSON.parse(raw);
            if (!data.history || data.history.length === 0) return false;

            const loadedGame = new Chess();
            // Try PGN first, then rebuild from history
            let loaded = false;
            if (data.pgn) {
                try { loadedGame.loadPgn(data.pgn); loaded = true; } catch { /* fallback */ }
            }
            if (!loaded) {
                for (const move of data.history) {
                    try { loadedGame.move(move); } catch { break; }
                }
            }

            let derivedStatus: 'active' | 'checkmate' | 'draw' | 'timeout' | 'resign' = 'active';
            if (loadedGame.isCheckmate()) derivedStatus = 'checkmate';
            else if (loadedGame.isDraw() || loadedGame.isStalemate()) derivedStatus = 'draw';

            set({
                game: loadedGame,
                fen: loadedGame.fen(),
                history: data.history,
                historyLan: data.historyLan || [],
                gameStatus: derivedStatus,
                reviewIndex: data.history.length - 1,
                mode: data.mode || 'local',
                playerColor: data.playerColor || null,
                chessType: data.chessType || 'standard',
                startFen: data.startFen || undefined,
                castlingRights: data.castlingRights || undefined,
            });
            return true;
        } catch { return false; }
    },
});
