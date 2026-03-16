import { Chess } from 'chess.js';

// type PieceSymbol = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export interface Chess960Setup {
  fen: string;
  startFen: string; // The FEN with full castling rights (for AI)
  displayFen: string; // The FEN with no castling rights (for standard chess.js)
  rights: {
    w: { kSide: string | null; qSide: string | null }; // File letters of rooks
    b: { kSide: string | null; qSide: string | null };
  };
}

export function generateChess960(): Chess960Setup {
  const board = new Array(8).fill(null) as (string | null)[];

  // 1. Bishops on opposite colors
  // Even squares: 0, 2, 4, 6 (Dark)
  // Odd squares: 1, 3, 5, 7 (Light)
  const evenIndices = [0, 2, 4, 6];
  const oddIndices = [1, 3, 5, 7];

  const bishop1Pos = evenIndices[Math.floor(Math.random() * evenIndices.length)];
  const bishop2Pos = oddIndices[Math.floor(Math.random() * oddIndices.length)];

  board[bishop1Pos] = 'b';
  board[bishop2Pos] = 'b';

  // 2. Queen
  const emptyIndices = getEmptyIndices(board);
  const queenPos = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
  board[queenPos] = 'q';

  // 3. Knights
  let emptyForKnights = getEmptyIndices(board);
  const knight1Pos = emptyForKnights[Math.floor(Math.random() * emptyForKnights.length)];
  board[knight1Pos] = 'n';
  
  emptyForKnights = getEmptyIndices(board);
  const knight2Pos = emptyForKnights[Math.floor(Math.random() * emptyForKnights.length)];
  board[knight2Pos] = 'n';

  // 4. Rooks and King (R K R)
  // Must be in that order in the remaining 3 slots
  const remaining = getEmptyIndices(board); // Should be length 3
  // Sort indices
  remaining.sort((a, b) => a - b);
  
  const qSideRookPos = remaining[0];
  const kingPos = remaining[1];
  const kSideRookPos = remaining[2];

  board[qSideRookPos] = 'r';
  board[kingPos] = 'k';
  board[kSideRookPos] = 'r';

  // Construct FEN
  // Pieces are usually uppercase for White
  const whitePieces = board.map(p => p?.toUpperCase()).join('');
  const blackPieces = board.map(p => p?.toLowerCase()).join('');

  const rank1 = whitePieces; // White on rank 1
  const rank8 = blackPieces; // Black on rank 8
  const rank2 = 'PPPPPPPP';
  const rank7 = 'pppppppp';
  const emptyRank = '8';

  // "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
  // 960 FEN: piece placement + rights (files of rooks)
  
  // Castling Rights
  // In 960 (Shredder-FEN/X-FEN), we use the File Letter of the rook.
  // Unless standard chess.js doesn't support it, which we know it doesn't.
  // So we create two FENs:
  // 1. For AI (Stockfish): Standard X-FEN with file letters.
  // 2. For Display (chess.js): No castling rights '-' to avoid validation errors, OR try to trick it (won't work).
  // We will manually track rights.

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const wKFile = files[kSideRookPos].toUpperCase();
  const wQFile = files[qSideRookPos].toUpperCase();
  const bKFile = files[kSideRookPos].toLowerCase();
  const bQFile = files[qSideRookPos].toLowerCase();

  const rightsString = `${wKFile}${wQFile}${bKFile}${bQFile}`;
  
  // Clean FEN for chess.js (no rights)
  const displayFen = `${rank8}/${rank7}/${emptyRank}/${emptyRank}/${emptyRank}/${emptyRank}/${rank2}/${rank1} w - - 0 1`;
  
  // Full FEN for AI
  const startFen = `${rank8}/${rank7}/${emptyRank}/${emptyRank}/${emptyRank}/${emptyRank}/${rank2}/${rank1} w ${rightsString} - 0 1`;

  // Note: Standard chess.js might accept KQkq but it implies corners.
  // If rooks are in corners (Queen-side at A, King-side at H), standard FEN works?
  // Only if King is at e1.
  
  return {
    fen: startFen, // We'll store the AI version as "true" FEN in store, but handle loading carefully
    startFen,
    displayFen, 
    rights: {
      w: { kSide: files[kSideRookPos], qSide: files[qSideRookPos] },
      b: { kSide: files[kSideRookPos], qSide: files[qSideRookPos] }
    }
  };
}

function getEmptyIndices(board: (string | null)[]): number[] {
  return board.map((p, i) => p === null ? i : -1).filter(i => i !== -1);
}

/**
 * Checks if a Chess960 castling move is valid without executing it.
 */
export function canCastle960(
  game: Chess, 
  from: string, 
  to: string, 
  rights: Chess960Setup['rights'] | null | undefined
): boolean {
  if (!rights) return false;
  
  const piece = game.get(from as any);
  if (!piece || piece.type !== 'k') return false;
  
  const color = piece.color;
  const rank = color === 'w' ? '1' : '8';
  
  let isKingside = false;
  
  // Detect target: g/c file OR rook file (from rights)
  if (to === `g${rank}`) isKingside = true;
  else if (to === `c${rank}`) isKingside = false;
  else {
      // Check if 'to' is the rook square itself (AI / UCI notation)
      const kRook = rights.w.kSide && color === 'w' ? `${rights.w.kSide.toLowerCase()}${rank}` 
                  : rights.b.kSide && color === 'b' ? `${rights.b.kSide.toLowerCase()}${rank}` : null;
      const qRook = rights.w.qSide && color === 'w' ? `${rights.w.qSide.toLowerCase()}${rank}` 
                  : rights.b.qSide && color === 'b' ? `${rights.b.qSide.toLowerCase()}${rank}` : null;
                  
      if (to === kRook) isKingside = true;
      else if (to === qRook) isKingside = false;
      else return false;
  } 
  
  const rookFile = isKingside 
    ? (color === 'w' ? rights.w.kSide : rights.b.kSide)
    : (color === 'w' ? rights.w.qSide : rights.b.qSide);
    
  if (!rookFile) return false;
  
  const rookSquare = `${rookFile.toLowerCase()}${rank}`;
  const rook = game.get(rookSquare as any);
  
  if (!rook || rook.type !== 'r' || rook.color !== color) return false;
  
  // King and rook destinations
  const kFileIdx = from.charCodeAt(0) - 97;
  const rFileIdx = rookFile.toLowerCase().charCodeAt(0) - 97;
  const kingDestIdx = isKingside ? 6 : 2; // g or c file
  const rookDestIdx = isKingside ? 5 : 3; // f or d file
  const excludeSquares = [from, rookSquare]; // These will move

  // Helper: check all squares in [lo..hi] range are empty (excluding king & rook)
  const isPathClear = (fromIdx: number, toIdx: number): boolean => {
    const lo = Math.min(fromIdx, toIdx);
    const hi = Math.max(fromIdx, toIdx);
    for (let i = lo; i <= hi; i++) {
      const sq = `${String.fromCharCode(97 + i)}${rank}`;
      if (excludeSquares.includes(sq)) continue;
      if (game.get(sq as any)) return false;
    }
    return true;
  };

  // Check path between king start and king dest
  if (!isPathClear(kFileIdx, kingDestIdx)) return false;
  // Check path between rook start and rook dest
  if (!isPathClear(rFileIdx, rookDestIdx)) return false;

  // Check destination squares are empty (if not king/rook's own square)
  const kingDestSq = `${String.fromCharCode(97 + kingDestIdx)}${rank}`;
  if (!excludeSquares.includes(kingDestSq) && game.get(kingDestSq as any)) return false;
  const rookDestSq = `${String.fromCharCode(97 + rookDestIdx)}${rank}`;
  if (!excludeSquares.includes(rookDestSq) && game.get(rookDestSq as any)) return false;
  
  // King must not be in check
  if (game.inCheck()) return false;

  // King must not pass through or land on attacked squares
  const opponentColor = color === 'w' ? 'b' : 'w';
  const kingStep = kingDestIdx > kFileIdx ? 1 : (kingDestIdx < kFileIdx ? -1 : 0);
  if (kingStep !== 0) {
    for (let i = kFileIdx; i !== kingDestIdx + kingStep; i += kingStep) {
      const sq = `${String.fromCharCode(97 + i)}${rank}`;
      if (game.isAttacked(sq as any, opponentColor)) return false;
    }
  }
  
  return true;
}

/**
 * Attempts to execute a Chess960 castling move manually.
 * Returns the Move object if successful, or null if invalid.
 */
export function execute960Castling(
  game: Chess, 
  move: { from: string; to: string },
  rights: Chess960Setup['rights'] | null | undefined
): import('chess.js').Move | null {
  if (!canCastle960(game, move.from, move.to, rights)) return null;
  
  // Re-derive vars for execution
  const from = move.from;
  const to = move.to;
  const piece = game.get(from as any);
  const color = piece!.color;
  const rank = color === 'w' ? '1' : '8';
  
  let isKingside = false;
  
  if (to === `g${rank}`) isKingside = true;
  else if (to === `c${rank}`) isKingside = false;
  else {
      // Check if 'to' is the rook square itself (AI / UCI notation)
      const kRook = rights!.w.kSide && color === 'w' ? `${rights!.w.kSide.toLowerCase()}${rank}` 
                  : rights!.b.kSide && color === 'b' ? `${rights!.b.kSide.toLowerCase()}${rank}` : null;
      const qRook = rights!.w.qSide && color === 'w' ? `${rights!.w.qSide.toLowerCase()}${rank}` 
                  : rights!.b.qSide && color === 'b' ? `${rights!.b.qSide.toLowerCase()}${rank}` : null;
                  
      if (to === kRook) isKingside = true;
      else if (to === qRook) isKingside = false;
      else return null;
  }
  
  const rookFile = isKingside 
    ? (color === 'w' ? rights!.w.kSide : rights!.b.kSide)
    : (color === 'w' ? rights!.w.qSide : rights!.b.qSide);
    
  const rookSquare = `${rookFile!.toLowerCase()}${rank}`;
  
  // Dest Indices
  const rDestFileIdx = isKingside ? 5 : 3; // f or d

  
  // To verify safety, we temporarily make the move and check legality?
  // We can't use game.move().
  // We assume for now if path is clear, it's valid (Standard 960 rules are complex).
  // "King does not pass through attacked squares".
  // King Path: from -> dest
  // const kStep = kDestFileIdx > kFileIdx ? 1 : -1;
  // let currentK = kFileIdx;
  
  // Check each square on king's path (excluding start, including dest?)
  // Standard rule: current square, crossed squares, and dest must not be attacked.
  // We already checked current (inCheck).
  
  // We will trust the path is clear of pieces.
  // We will SKIP attack checks for simplicity/robustness unless easy.
  // game.isAttacked(sq, loopColor)
  
  // Execution:
  game.remove(from as any);
  game.remove(rookSquare as any);
  
  // CRITICAL FIX: In 960 castling, King goes to g-file (Kingside) or c-file (Queenside),
  // NOT the Rook's square (which is what 'to' might be from UCI/AI).
  const kDestFileIdx = isKingside ? 6 : 2; // g or c
  const finalKingSquare = `${String.fromCharCode(97 + kDestFileIdx)}${rank}`;

  game.put({ type: 'k', color }, finalKingSquare as any);
  game.put({ type: 'r', color }, `${String.fromCharCode(97 + rDestFileIdx)}${rank}` as any);
  
  // Update turn
  // game.setTurn() is not sufficient to generate valid FEN with correct EP/Rights?
  // We manually toggle turn.
  const nextTurn = color === 'w' ? 'b' : 'w';
  // We must output a valid FEN.
  // game.fen() will generate based on current board.
  // But we need to use internal methods to switch turn?
  // game.load(newFen) is best.
  
  // Construct new FEN manually?
  // Or let game generate it, then swap 'w'/'b' in the string?
  // Construct new FEN manually
  let fen = game.fen();
  const parts = fen.split(' ');
  parts[1] = nextTurn; // Switch turn
  parts[3] = '-'; // EP square cleared
  
  // Update castling rights in FEN parts[2]
  // We removed the king and rook usage, so rights for this color should be gone or modified?
  // Easier to just let game.load handle the new board state if we provide correct rights string?
  // Custom rights string logic is hard.
  // Instead, we trust that for 960 we manage rights externally or use the sanitization.
  // We generally just use what we have, but if we castle, we lose rights for that color.
  // Simplified: Remove all rights for this color.
  let rightsStr = parts[2];
  if (rightsStr !== '-') {
      // Remove any letters corresponding to this color (K, Q, k, q or file letters)
      // Since it's 960, it's file letters.
      const regex = color === 'w' ? /[A-Z]/g : /[a-z]/g;
      rightsStr = rightsStr.replace(regex, '');
      if (rightsStr === '') rightsStr = '-';
      parts[2] = rightsStr;
  }

  const newFen = parts.join(' ');
  
  // CRITICAL FIX: game.load() wipes history. We must save and restore it.
  const oldHistory = (game as any)._history ? [...(game as any)._history] : [];
  // const moveNumber = (game as any)._move_number || 1; // preserve move number logic? load() reads from FEN.
  
  try {
    game.load(newFen);
    
    // Construct the move object for history
    // Standard chess.js move structure
    const moveResult = {
        color,
        from,
        to,
        piece: 'k',
        flags: isKingside ? 'k' : 'q',
        san: isKingside ? 'O-O' : 'O-O-O',
        lan: `${from}${to}`,
        before: fen,
        after: newFen,
        captured: undefined,
        promotion: undefined
    };
    
    // Restore history + add new move
    if ((game as any)._history) {
        (game as any)._history = [...oldHistory, moveResult];
    }
    
    return moveResult as any;

  } catch (e) {
    console.warn('960 Castling FEN load failed', newFen, e);
    return null;
  }
}

/**
 * Reconstructs a game instance from history, handling Chess960 nuances.
 * Uses historyLan for precise move reconstruction (crucial for 960 castling).
 */
export function reconstructGame(
  chessType: 'standard' | 'chess960', 
  startFen: string | undefined, 
  historyLan: string[], 
  castlingRights: Chess960Setup['rights'] | null | undefined
): Chess {
    // Check if startFen is 960-style with invalid rights for standard chess.js
    let safeFen = startFen;
    if (chessType === 'chess960' && startFen) {
        const parts = startFen.split(' ');
        if (parts.length >= 3) {
            parts[2] = '-';
            safeFen = parts.join(' ');
        }
    }

    let game: Chess;
    try {
        game = new Chess(chessType === 'chess960' ? safeFen : undefined);
    } catch (e) {
        console.warn('reconstructGame failed to init FEN', safeFen, e);
        game = new Chess(); // Fallback to standard start to avoid crash
    }
    
    // For standard chess, simpler replay if LAN is missing (backward compatibility)
    if (chessType !== 'chess960' && (!historyLan || historyLan.length === 0)) {
        return game; 
    }
    
    if (!historyLan) return game;

    for (const lan of historyLan) {
        if (!lan || lan.length < 4) continue;
        const from = lan.substring(0, 2);
        const to = lan.substring(2, 4);
        const promotion = lan.length > 4 ? lan.substring(4, 5) : undefined;
        
        try {
            // Try standard move
            game.move({ from, to, promotion });
        } catch (e) {
            // Fallback for 960 castling
            if (chessType === 'chess960') {
              try {
               execute960Castling(game, { from, to }, castlingRights); 
              } catch (castlingError) {
                console.warn('Failed to replay 960 castling move', lan, castlingError);
              }
            }
        }
    }
    return game;
}

// Bitmasks for move flags (standard chess.js v1 values)
const BITS = {
  NORMAL: 1,
  CAPTURE: 2,
  BIG_PAWN: 4,
  EP_CAPTURE: 8,
  PROMOTION: 16,
  KSIDE_CASTLE: 32,
  QSIDE_CASTLE: 64
};

function indexToSquare(i: number): string {
    const f = i & 15;
    const r = i >> 4;
    return String.fromCharCode(97 + f) + String(8 - r);
}

function flagsToString(f: number): string {
    let s = '';
    if (f & BITS.KSIDE_CASTLE) s += 'k';
    if (f & BITS.QSIDE_CASTLE) s += 'q';
    if (f & BITS.EP_CAPTURE) s += 'e';
    if (f & BITS.CAPTURE) s += 'c';
    if (f & BITS.PROMOTION) s += 'p';
    if (f & BITS.BIG_PAWN) s += 'b';
    if (f & BITS.NORMAL) s += 'n';
    return s;
}

/**
 * Safely retrieves verbose history, handling Chess960 crashes.
 * Standard game.history({ verbose: true }) crashes if history contains 
 * injected 960 castling moves that standard logic can't replay.
 */
export function getSafeHistory(game: Chess): any[] {
    const internalHistory = (game as any)._history;
    // Clone the array to prevent corruption if history() fails
    const backupHistory = internalHistory ? [...internalHistory] : [];
    const backupFen = game.fen(); // CRITICAL: Backup board state

    try {
        return game.history({ verbose: true });
    } catch (e) {
        // Restore board state first! history() might have left partial move applications
        try {
            game.load(backupFen);
        } catch (loadError) {
            console.error('Critical failure restoring FEN after history crash', loadError);
        }

        // Restore history if it was corrupted by the failed call
        if (internalHistory) {
             (game as any)._history = backupHistory;
        }

        // Fallback: Access internal history directly AND NORMALIZE IT
        if (backupHistory.length > 0) {
            return backupHistory.map((h: any) => {
                // If it's already a verbose object (e.g. our injected 960 moves), return it
                if (h.san && h.before) return h;

                // Otherwise, it's an internal move object (nested under .move?)
                // inspect_game.js showed the array contains objects with .move property?
                // Wait, inspect_game.js output: INTERNAL MOVE OBJ: { ... }
                // So h has .move property?
                // Let's being safe and checking structure.
                const m = h.move || h; 
                
                const from = typeof m.from === 'number' ? indexToSquare(m.from) : m.from;
                const to = typeof m.to === 'number' ? indexToSquare(m.to) : m.to;
                const flags = typeof m.flags === 'number' ? flagsToString(m.flags) : m.flags;
                
                return {
                    color: m.color,
                    from,
                    to,
                    flags,
                    piece: m.piece,
                    captured: m.captured,
                    promotion: m.promotion,
                    san: m.san || '', // Internal moves might not have SAN computed yet? 
                                      // If missing SAN, sound might work but display history might look ugly. 
                                      // But sound only needs flags.
                    lan: m.lan || `${from}${to}`,
                    before: h.before || '',
                    after: h.after || ''
                };
            });
        }
        console.warn('Failed to retrieve history safely', e);
        return [];
    }
}

