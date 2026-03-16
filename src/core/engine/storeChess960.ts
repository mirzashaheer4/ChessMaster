import { create } from 'zustand';
import { Chess, type Move } from 'chess.js';
import type { GameEngine } from './gameEngineInterface';
import { generateChess960, reconstructGame, type Chess960Setup } from '../utils/chess960';

interface Chess960Store extends GameEngine {
  game: Chess;
  history: string[];
  historyLan: string[];
  startFen: string;
  castlingRights: Chess960Setup['rights'] | null;

  // 960 Specific Actions
  executeChess960Castling: (move: { from: string; to: string }) => Move | null;
  set960Position: (setup: Chess960Setup) => void;
}

/**
 * Creates a NEW Chess instance from the current one, preserving internal _history.
 * This is critical because:
 *   1. Zustand needs a new object reference to trigger re-renders
 *   2. getSafeHistory() needs _history populated to extract move flags (capture, check, etc.)
 *   3. Board.tsx uses those flags for sounds and smoke effects
 */
function cloneGameWithHistory(game: Chess): Chess {
  const newGame = new Chess(game.fen());
  const internalHistory = (game as any)._history;
  if (internalHistory) {
    (newGame as any)._history = [...internalHistory];
  }
  return newGame;
}

/**
 * Check if all squares in a range on a given rank are empty,
 * EXCLUDING the king square and rook square (they will move).
 */
function isPathClear(
  game: Chess,
  fromFileIdx: number,
  toFileIdx: number,
  rank: string,
  excludeSquares: string[]
): boolean {
  const lo = Math.min(fromFileIdx, toFileIdx);
  const hi = Math.max(fromFileIdx, toFileIdx);
  for (let i = lo; i <= hi; i++) {
    const sq = `${String.fromCharCode(97 + i)}${rank}`;
    if (excludeSquares.includes(sq)) continue;
    const piece = game.get(sq as any);
    if (piece) return false;
  }
  return true;
}

/**
 * Validate whether Chess960 castling is legal.
 * Rules:
 *   1. King and rook must be on the same rank
 *   2. The rook must be at the position defined by castling rights
 *   3. All squares between king start and king dest must be clear (except king & rook)
 *   4. All squares between rook start and rook dest must be clear (except king & rook)
 *   5. King must not be in check
 *   6. King must not pass through an attacked square
 */
function canCastle960(
  game: Chess,
  kingSquare: string,
  rookSquare: string,
  side: 'k' | 'q',
  color: 'w' | 'b'
): boolean {
  const rank = color === 'w' ? '1' : '8';
  const kingFileIdx = kingSquare.charCodeAt(0) - 97;
  const rookFileIdx = rookSquare.charCodeAt(0) - 97;

  // King destination: g-file for kingside, c-file for queenside
  const kingDestIdx = side === 'k' ? 6 : 2;
  // Rook destination: f-file for kingside, d-file for queenside
  const rookDestIdx = side === 'k' ? 5 : 3;

  const excludeSquares = [kingSquare, rookSquare];

  // Check path between king start and king dest is clear
  if (!isPathClear(game, kingFileIdx, kingDestIdx, rank, excludeSquares)) return false;

  // Check path between rook start and rook dest is clear
  if (!isPathClear(game, rookFileIdx, rookDestIdx, rank, excludeSquares)) return false;

  // Check king destination square (if not the king or rook's current square, must be empty)
  const kingDestSq = `${String.fromCharCode(97 + kingDestIdx)}${rank}`;
  if (!excludeSquares.includes(kingDestSq)) {
    const destPiece = game.get(kingDestSq as any);
    if (destPiece) return false;
  }

  // Check rook destination square
  const rookDestSq = `${String.fromCharCode(97 + rookDestIdx)}${rank}`;
  if (!excludeSquares.includes(rookDestSq)) {
    const destPiece = game.get(rookDestSq as any);
    if (destPiece) return false;
  }

  // King must not currently be in check
  if (game.inCheck()) return false;

  // Check that king does not pass through or land on an attacked square
  const opponentColor = color === 'w' ? 'b' : 'w';
  const kingStep = kingDestIdx > kingFileIdx ? 1 : (kingDestIdx < kingFileIdx ? -1 : 0);
  if (kingStep !== 0) {
    for (let i = kingFileIdx; i !== kingDestIdx + kingStep; i += kingStep) {
      const sq = `${String.fromCharCode(97 + i)}${rank}`;
      if (game.isAttacked(sq as any, opponentColor)) return false;
    }
  } else {
    const sq = `${String.fromCharCode(97 + kingFileIdx)}${rank}`;
    if (game.isAttacked(sq as any, opponentColor)) return false;
  }

  return true;
}

export const useChess960Store = create<Chess960Store>((set, get) => ({
  game: new Chess(),
  history: [],
  historyLan: [],
  startFen: '',
  castlingRights: null,

  getFen: () => get().game.fen(),
  getTurn: () => get().game.turn(),
  getHistory: () => get().history,
  getHistoryLan: () => get().historyLan,
  inCheck: () => get().game.inCheck(),
  isCheckmate: () => get().game.isCheckmate(),
  isDraw: () => get().game.isDraw(),
  isGameOver: () => get().game.isGameOver(),

  set960Position: (setup) => {
    const newGame = new Chess(setup.displayFen);
    set({
      game: newGame,
      startFen: setup.fen,
      castlingRights: setup.rights,
      history: [],
      historyLan: []
    });
  },

  makeMove: (move) => {
    const { game } = get();

    // Check if this is a castling move (King capturing own Rook)
    const piece = game.get(move.from as any);
    const target = game.get(move.to as any);

    if (piece?.type === 'k' && target?.type === 'r' && piece.color === target.color) {
      return get().executeChess960Castling(move);
    }

    try {
      const result = game.move(move);
      if (result) {
        // Clone game to get a new reference (Zustand reactivity)
        // while preserving internal _history (for getSafeHistory → sounds/effects)
        const clonedGame = cloneGameWithHistory(game);
        set({
          history: [...get().history, result.san],
          historyLan: [...get().historyLan, result.lan],
          game: clonedGame
        });
        return result;
      }
    } catch (e) {
      // If standard move fails, check if it was a castling attempt
      return get().executeChess960Castling(move);
    }
    return null;
  },

  executeChess960Castling: (move) => {
    const { game, castlingRights } = get();
    if (!castlingRights) return null;

    const fromSquare = move.from;
    const toSquare = move.to;
    const piece = game.get(fromSquare as any);
    const target = game.get(toSquare as any);

    if (!piece || piece.type !== 'k') return null;

    const color = piece.color;
    const rank = color === 'w' ? '1' : '8';

    // Figure out which rook is involved
    let side: 'k' | 'q' | null = null;
    let rookSquare = '';

    // Standard notation: King -> g-file or King -> c-file
    if (toSquare === `g${rank}`) {
      side = 'k';
      if (!castlingRights[color].kSide) return null;
      rookSquare = `${castlingRights[color].kSide.toLowerCase()}${rank}`;
    } else if (toSquare === `c${rank}`) {
      side = 'q';
      if (!castlingRights[color].qSide) return null;
      rookSquare = `${castlingRights[color].qSide.toLowerCase()}${rank}`;
    } 
    // UCI/960 Notation: King -> Rook square
    else if (target && target.type === 'r' && target.color === color) {
      const targetFile = toSquare[0];
      if (targetFile === castlingRights[color].kSide?.toLowerCase()) {
        side = 'k';
        rookSquare = toSquare;
      } else if (targetFile === castlingRights[color].qSide?.toLowerCase()) {
        side = 'q';
        rookSquare = toSquare;
      }
    }

    if (!side || !rookSquare) return null; // Not a valid castling intent

    const kingDest = side === 'k' ? `g${rank}` : `c${rank}`;
    const rookDest = side === 'k' ? `f${rank}` : `d${rank}`;

    // === VALIDATE CASTLING IS LEGAL ===
    if (!canCastle960(game, fromSquare, rookSquare, side, color)) {
      return null;
    }

    // Save state before modifications
    const beforeFen = game.fen();
    const oldHistory = (game as any)._history ? [...(game as any)._history] : [];

    // === EXECUTE: Build new position manually ===
    // We work on a temp game to construct the FEN
    const tempGame = new Chess(game.fen());

    // Remove ONLY king and rook from their original squares
    tempGame.remove(fromSquare as any);
    tempGame.remove(rookSquare as any); // Use rookSquare, not user's dest input

    // Place king and rook at their Chess960 destinations
    tempGame.put({ type: 'k', color }, kingDest as any);
    tempGame.put({ type: 'r', color }, rookDest as any);

    // Build correct FEN
    const fen = tempGame.fen();
    const parts = fen.split(' ');
    parts[1] = parts[1] === 'w' ? 'b' : 'w'; // Switch turn
    parts[3] = '-'; // Clear en passant

    // Remove castling rights for the color that just castled
    let rightsStr = parts[2];
    if (rightsStr !== '-') {
      const regex = color === 'w' ? /[A-Z]/g : /[a-z]/g;
      rightsStr = rightsStr.replace(regex, '');
      if (rightsStr === '') rightsStr = '-';
      parts[2] = rightsStr;
    }

    const newFen = parts.join(' ');

    // Create new game from FEN
    let newGame: Chess;
    try {
      newGame = new Chess(newFen);
    } catch (e) {
      console.error('Chess960 castling FEN invalid:', newFen, e);
      return null;
    }

    // Inject history for getSafeHistory() (sounds, effects)
    const san = side === 'k' ? 'O-O' : 'O-O-O';
    const castlingMoveObj = {
      color,
      from: fromSquare,
      to: kingDest,
      flags: side,    // 'k' or 'q' for castling
      piece: 'k' as const,
      san,
      lan: `${fromSquare}${toSquare}`,
      before: beforeFen,
      after: newFen,
      captured: undefined,
      promotion: undefined
    };
    
    // Inject into internal history to match chess.js 1.4.0 format:
    // { move: {...}, kings: {...}, turn: 'w'|'b', castling: {...}, epSquare: number, halfMoves: number, moveNumber: number }
    const historyEntry = {
      move: castlingMoveObj,
      kings: { b: (game as any)._kings.b, w: (game as any)._kings.w },
      turn: (game as any)._turn,
      castling: { b: (game as any)._castling.b, w: (game as any)._castling.w },
      epSquare: (game as any)._epSquare,
      halfMoves: (game as any)._halfMoves,
      moveNumber: (game as any)._moveNumber
    };
    (newGame as any)._history = [...oldHistory, historyEntry];

    // Preserve the position count map so Threefold Repetition works across castles.
    // We clone the old map over to the new game object.
    const oldPositionCount = (game as any)._positionCount;
    if (oldPositionCount instanceof Map) {
      const newPositionCount = new Map(oldPositionCount);
      
      // When newGame was instantiated, it called _incPositionCount() for the new fen
      // But we just overwrote its map. Let's re-add the current state into the copied map.
      const currentHash = typeof (newGame as any)._computeHash === 'function' ? (newGame as any)._computeHash() : newGame.fen().split(' ').slice(0, 4).join(' ');
      const count = newPositionCount.get(currentHash) || 0;
      newPositionCount.set(currentHash, count + 1);
      
      (newGame as any)._positionCount = newPositionCount;
    }

    set({
      game: newGame,
      history: [...get().history, san],
      historyLan: [...get().historyLan, `${fromSquare}${toSquare}`],
    });

    return {
      color,
      from: fromSquare,
      to: kingDest,
      flags: side,
      piece: 'k',
      san,
      lan: `${fromSquare}${toSquare}`,
      captured: undefined,
      promotion: undefined
    } as any;
  },

  undoMove: () => {
    const { startFen, historyLan, castlingRights } = get();
    if (historyLan.length === 0) return;

    const newHistoryLan = historyLan.slice(0, -1);

    // Use reconstructGame which properly handles both normal moves AND 960 castling
    const newGame = reconstructGame('chess960', startFen, newHistoryLan, castlingRights);

    set({
      game: newGame,
      history: newGame.history(),
      historyLan: newHistoryLan
    });
  },

  reset: () => {
    const setup = generateChess960();
    get().set960Position(setup);
  },

  loadFen: (fen) => {
    const newGame = new Chess(fen);
    set({ game: newGame, history: [], historyLan: [] });
  },

  getLegalMoves: (square) => {
    const { game, castlingRights } = get();
    const moves: string[] = game.moves({ square: square as any, verbose: true }).map(m => m.to);

    // Inject Chess960 Castling Moves (King -> Rook) only if path is clear
    const piece = game.get(square as any);
    if (piece?.type === 'k' && castlingRights) {
      const color = piece.color;
      const rights = color === 'w' ? castlingRights.w : castlingRights.b;
      const rank = color === 'w' ? '1' : '8';

      // Kingside castling
      if (rights.kSide) {
        const rookSquare = `${rights.kSide.toLowerCase()}${rank}`;
        const rook = game.get(rookSquare as any);
        if (rook && rook.type === 'r' && rook.color === color) {
          if (canCastle960(game, square, rookSquare, 'k', color)) {
            moves.push(rookSquare);
          }
        }
      }

      // Queenside castling
      if (rights.qSide) {
        const rookSquare = `${rights.qSide.toLowerCase()}${rank}`;
        const rook = game.get(rookSquare as any);
        if (rook && rook.type === 'r' && rook.color === color) {
          if (canCastle960(game, square, rookSquare, 'q', color)) {
            moves.push(rookSquare);
          }
        }
      }
    }

    return Array.from(new Set(moves));
  }

}));
