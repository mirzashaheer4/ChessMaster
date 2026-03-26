import React, { useEffect, useLayoutEffect, useState, useRef, useMemo } from 'react';
import { canCastle960, reconstructGame, getSafeHistory } from '../../../core/utils/chess960';
import { useGameStore } from '../../../core/store/game';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import PromotionDialog from '../ui/PromotionDialog';
import { getVisualBoardOrder, squareToBoardIndices, logicalToVisualPosition, squareToCoords } from '../../../core/utils/coordinates';
import { BoardOverlay, type Arrow, type Highlight, COLORS } from './BoardOverlay';
import { CaptureEffect } from './CaptureEffect';
import { audio } from '../../../core/audio/audio';
import { BOARD_THEMES, PIECE_THEMES, type BoardTheme } from '../../../core/utils/themes';

/**
 * Validate move geometry for premoves (pseudo-legal check)
 * Returns true if the move follows the piece's basic movement rules
 * ignores obstructions because they might clear up by the time the move executes
 */
function isPseudoLegalPremove(
  from: string,
  to: string,
  pieceType: string,
  pieceColor: string
): boolean {
  if (from === to) return false;
  
  const dx = Math.abs(to.charCodeAt(0) - from.charCodeAt(0));
  const dy = Math.abs(parseInt(to[1]) - parseInt(from[1]));
  
  switch(pieceType) {
    case 'p':
      // Pawn: 1 forward, 2 forward (if start), 1 diagonal (capture)
      const startRank = pieceColor === 'w' ? '2' : '7';
      const fromRank = from[1];
      const rankDiff = parseInt(to[1]) - parseInt(fromRank);
      
      // Must move forward
      if (pieceColor === 'w' && rankDiff <= 0) return false;
      if (pieceColor === 'b' && rankDiff >= 0) return false;
      
      const absRankDiff = Math.abs(rankDiff);
      
      if (dx === 0) {
        // Moving straight: 1 step or 2 steps from start
        if (absRankDiff === 1) return true;
        if (absRankDiff === 2 && fromRank === startRank) return true;
        return false;
      } else if (dx === 1) {
        // Diagonal capture: must be 1 step
        // We allow diagonal moves as premoves assuming a capture MIGHT appear
        return absRankDiff === 1;
      }
      return false;
      
    case 'n': // Knight
      return (dx === 1 && dy === 2) || (dx === 2 && dy === 1);
      
    case 'b': // Bishop
      return dx === dy && dx > 0;
      
    case 'r': // Rook
      return (dx === 0 || dy === 0) && (dx + dy > 0);
      
    case 'q': // Queen
      return (dx === dy || dx === 0 || dy === 0) && (dx + dy > 0);
      
    case 'k': // King — 1 square any direction OR 2 squares horizontal (castling)
      if (dx <= 1 && dy <= 1 && (dx + dy > 0)) return true;
      // Castling premove: king moves 2 squares horizontally
      if (dx === 2 && dy === 0) return true;
      return false;
      
    default:
      return false;
  }
}

// Chess piece icons
// Piece rendering now handled dynamically via PIECE_THEMES in the store


const ItemType = {
  PIECE: 'piece',
};

interface PieceProps {
  piece: { type: string; color: string };
  position: string;
}

const Piece: React.FC<PieceProps> = ({ piece, position }) => {
  const { pieceTheme, mode, playerColor, game } = useGameStore();
  
  const canDrag = useMemo(() => {
    // In local mode, can move current turn's pieces
    if (mode === 'local' || !mode) {
      return piece.color === game.turn();
    }
    // In AI mode, can only move own pieces
    const playerColorShort = playerColor === 'white' ? 'w' : 'b';
    return piece.color === playerColorShort;
  }, [mode, playerColor, piece.color, game.turn()]);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemType.PIECE,
    item: { position, pieceColor: piece.color, pieceType: piece.type },
    canDrag: () => canDrag,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [position, piece.color, piece.type, canDrag]);

  const iconUrl = PIECE_THEMES[pieceTheme].getIcon(piece.color as 'w'|'b', piece.type.toLowerCase());

  return (
    <div
      ref={drag as any}
      className={`
        w-full h-full flex items-center justify-center 
        ${canDrag ? 'cursor-grab active:cursor-grabbing hover:scale-105 hover:drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]' : 'cursor-default'}
        ${isDragging ? 'opacity-40 scale-110' : 'opacity-100'}
        transition-all duration-200 ease-out
      `}
      style={{
        transform: isDragging ? 'scale(1.1)' : undefined,
        zIndex: isDragging ? 100 : 'auto',
      }}
    >
      {iconUrl && (
        <img 
          src={iconUrl}
          alt={`${piece.color} ${piece.type}`} 
          draggable={false}
          className={`
            w-[85%] h-[85%] 
            object-contain drop-shadow-lg
            transition-transform duration-150 ease-out
          `}
          style={{ 
            filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' 
          }}
        />
      )}
    </div>
  );
};

interface DragItem {
  position: string;
  pieceColor: string;
  pieceType: string;
}

interface SquareProps {
  position: string;
  isBlack: boolean;
  children?: React.ReactNode;
  onMove: (from: string, to: string, pieceColor: string, pieceType: string) => void;
  lastMove?: { from: string; to: string } | null;
  isLegalMove?: boolean;
  isSelected?: boolean;
  isCheck?: boolean;
  isPremove?: boolean;
  onSquareClick?: () => void;
  fileLabel?: string | null;  // Label to show along bottom edge
  rankLabel?: string | null;  // Label to show along left edge
  theme: BoardTheme;
}

const BoardSquare: React.FC<SquareProps> = ({ 
  position, 
  isBlack, 
  children, 
  onMove, 
  lastMove,
  isLegalMove = false,
  isSelected = false,
  isCheck = false,
  isPremove = false,
  onSquareClick,
  fileLabel = null,
  rankLabel = null,
  theme,
}) => {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemType.PIECE,
    drop: (item: DragItem) => onMove(item.position, position, item.pieceColor, item.pieceType),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  }), [onMove, position]);

  const isLastMove = lastMove?.from === position || lastMove?.to === position;
  const hasChildren = React.Children.count(children) > 0;
  
  const themeColors = BOARD_THEMES[theme];
  const bgColor = isBlack ? themeColors.dark : themeColors.light;

  return (
    <div
      ref={drop as any}
      onClick={onSquareClick}
      className={`relative w-full h-full flex items-center justify-center transition-all duration-200 cursor-pointer
        ${isLastMove ? '!bg-gradient-to-br !from-[#D4AF37]/40 !to-[#C9A961]/40 ring-1 ring-[#D4AF37]/50' : ''}
        ${isSelected ? '!bg-gradient-to-br !from-[#7fa650]/60 !to-[#6b9040]/60 ring-2 ring-[#7fa650]' : ''}
        ${isCheck ? '!bg-gradient-to-br !from-red-500/60 !to-red-600/60 ring-2 ring-red-500 animate-pulse' : ''}
        ${isPremove ? '!bg-gradient-to-br !from-cyan-500/50 !to-blue-500/50 ring-2 ring-cyan-400' : ''}
        ${isOver && canDrop ? 'ring-2 ring-[#D4AF37]/60 z-10 scale-95' : ''}
      `}
      style={{
        backgroundColor: bgColor,
        // Only apply gradient for glass/custom themes if needed, or stick to solid colors which look better for play
        // For 'glass', we can add a subtle overlay
        backgroundImage: theme === 'glass' ? (isBlack ? 'linear-gradient(135deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.4) 100%)' : 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)') : undefined,
      }}
    >
      {/* Coordinate Labels */}
      {rankLabel && (
        <span className={`absolute top-0.5 left-1 text-[10px] font-bold select-none ${isBlack ? 'text-white/50' : 'text-black/50'}`} style={{ color: isBlack ? themeColors.light : themeColors.dark, opacity: 0.7 }}>
          {rankLabel}
        </span>
      )}
      {fileLabel && (
        <span className={`absolute bottom-0 right-1 text-[10px] font-bold select-none ${isBlack ? 'text-white/50' : 'text-black/50'}`} style={{ color: isBlack ? themeColors.light : themeColors.dark, opacity: 0.7 }}>
          {fileLabel}
        </span>
      )}

      {children}
      
      {/* Legal Move Dot */}
      {isLegalMove && !hasChildren && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[30%] h-[30%] rounded-full bg-black/20" />
        </div>
      )}
      
      {/* Legal Move Capture Ring (when square has a piece) */}
      {isLegalMove && hasChildren && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-full h-full rounded-full border-[4px] border-black/20" />
        </div>
      )}
      
      {/* Coordinate labels — positioned by visual grid edge, not logical position */}
      {fileLabel && <span className={`absolute bottom-0.5 right-1 text-[10px] ${isBlack ? 'text-white/50' : 'text-black/50'}`}>{fileLabel}</span>}
      {rankLabel && <span className={`absolute top-0.5 left-1 text-[10px] ${isBlack ? 'text-white/50' : 'text-black/50'}`}>{rankLabel}</span>}
    </div>
  );
};
// Helper functions for interaction
/**
 * Convert mouse position to square notation
 */
function coordsToSquare(
  clientX: number, 
  clientY: number, 
  rect: DOMRect,
  squareSize: number,
  flipped: boolean
): string | null {
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  
  if (x < 0 || y < 0 || x >= squareSize * 8 || y >= squareSize * 8) {
    return null;
  }
  
  let fileIndex = Math.floor(x / squareSize);
  let rankIndex = Math.floor(y / squareSize);
  
  if (flipped) {
    fileIndex = 7 - fileIndex;
    rankIndex = rankIndex;
  } else {
    rankIndex = 7 - rankIndex;
  }
  
  const file = String.fromCharCode(97 + fileIndex);
  const rank = String(rankIndex + 1);
  
  return `${file}${rank}`;
}

/**
 * Get modifier color based on keyboard state
 */
function getModifierColor(e: React.MouseEvent): string {
  if (e.shiftKey) return COLORS.shift;
  if (e.ctrlKey) return COLORS.ctrl;
  if (e.altKey) return COLORS.alt;
  return COLORS.default;
}

export const Board: React.FC = () => {
  const { game, fen, makeMove, history, reviewIndex, mode, playerColor, boardFlipped, premoves, addPremove, moveVersion, boardTheme, pieceTheme, engineArrows } = useGameStore();
  
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [capturePosition, setCapturePosition] = useState<{ x: number | string; y: number | string } | null>(null);
  const [captureKey, setCaptureKey] = useState(0); // Increment to force re-trigger capture effect
  const boardRef = useRef<HTMLDivElement>(null);
  const [boardSize, setBoardSize] = useState(0);

  // Use coordinate utility for proper visual order
  // Board orientation: In local mode (playerColor null), default to white and flip toggles
  // In AI mode, use playerColor and flip toggles from there
  const baseColor = playerColor ?? 'white';
  const effectiveColor = boardFlipped 
    ? (baseColor === 'white' ? 'black' : 'white')
    : baseColor;
  const { files, ranks } = getVisualBoardOrder(effectiveColor);

  // === MOVE ANIMATION STATE ===
  const wasDragRef = useRef(false); // Track if last move was a drag (skip animation)
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [animatingMove, setAnimatingMove] = useState<{
    piece: string;       // e.g. "wN"
    from: string;        // visual origin (where ghost starts)
    to: string;          // visual destination (where ghost ends)
    castleRook?: { piece: string; from: string; to: string };
    started: boolean;     // false = at origin, true = transitioning to dest
    isFinishing?: boolean; // true = blending out
    direction: 'forward' | 'reverse';
  } | null>(null);
  const prevHistoryLen = useRef(history.length);
  const prevReviewIdx = useRef(reviewIndex);

  // Interaction state
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [drawingArrow, setDrawingArrow] = useState<{ from: string; to: string; color: string } | null>(null);
  
  // Measure board size for overlay
  useEffect(() => {
    const updateSize = () => {
      if (boardRef.current) {
        setBoardSize(boardRef.current.offsetWidth);
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);
  
  // Promotion state
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null);
  const [promotionColor, setPromotionColor] = useState<'w' | 'b'>('w');

  // Calculate legal moves for selected square
  const legalMoves: string[] = useMemo(() => {
    if (!selectedSquare) return [];
    try {
      const moves = game.moves({ square: selectedSquare as any, verbose: true });
      const standardMoves = moves.map(m => m.to as string);
      
      const { chessType, castlingRights } = useGameStore.getState();
      if (chessType === 'chess960') {
         // Check if this is a King and we have castling rights
         const piece = game.get(selectedSquare as any);
         if (piece && piece.type === 'k') {
             const rank = piece.color === 'w' ? '1' : '8';
             const targets = [`g${rank}`, `c${rank}`];
             // Filter targets that are valid castling moves
             const validTargets = targets.filter(t => canCastle960(game, selectedSquare, t, castlingRights));
             return [...standardMoves, ...validTargets];
         }
      }
      
      return standardMoves;
    } catch {
      return [];
    }
  }, [selectedSquare, fen, game]);

  // CRITICAL FIX: Always compute the board from HISTORY, not from the game object directly.
  // The game object is mutated in place (same reference), which can cause React to miss updates.
  // By reconstructing from history, we guarantee freshness and correct 960 handling.
  const { board, displayGame } = useMemo(() => {
    const { chessType, startFen, historyLan, castlingRights } = useGameStore.getState();
    const isReviewing = reviewIndex !== -1;
    
    if (isReviewing) {
      // Review mode: replay up to reviewIndex
      // reviewIndex === -2 means "start" (before any moves)
      const moveCount = reviewIndex === -2 ? 0 : reviewIndex + 1;
      let movesToReplayLan: string[] = [];
      
      if (historyLan) {
          movesToReplayLan = historyLan.slice(0, moveCount);
      }
      
      const reviewGame = reconstructGame(chessType as any, startFen, movesToReplayLan, castlingRights);
      
      // If standard and no LAN (legacy/fallback), try standard replay
      if (chessType !== 'chess960' && (!historyLan || historyLan.length === 0)) {
           const movesToReplay = history.slice(0, moveCount);
           for (const move of movesToReplay) {
                try { reviewGame.move(move); } catch (e) { console.warn('Review replay failed', move); }
           }
      }

      return { board: reviewGame.board(), displayGame: reviewGame };
    } else {
      // LIVE MODE: Use the authoritative game instance directly (O(1))
      // This avoids expensive reconstruction on every render
      return { board: game.board(), displayGame: game };
    }
  }, [reviewIndex, history.length, fen, moveVersion, game]);

  // Clear arrows/highlights when entering/exiting review mode
  useEffect(() => {
    setArrows([]);
    setHighlights([]);
    // NOTE: Don't clear capturePosition here — the animation detection
    // sets it in useLayoutEffect and this useEffect would clear it before rendering
  }, [reviewIndex]);

  // Check if king is in check - use displayGame to respect review mode
  // Also don't show check indicator if game is over (checkmate)
  const kingInCheck = useMemo(() => {
    // Don't show check indicator if game is in checkmate (game over)
    if (displayGame.isCheckmate()) return null;
    
    if (!displayGame.inCheck()) return null;
    
    // Find the king of the current turn
    const turn = displayGame.turn();
    const boardArray = displayGame.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = boardArray[r][c];
        if (piece && piece.type === 'k' && piece.color === turn) {
          const file = String.fromCharCode(97 + c);
          const rank = String(8 - r);
          return `${file}${rank}`;
        }
      }
    }
    return null;
  }, [displayGame, fen, reviewIndex]);

  // Update last move whenever fen changes
  useEffect(() => {
    const { chessType, startFen, historyLan, castlingRights } = useGameStore.getState();
    const isReviewing = reviewIndex !== -1;
    
    // Always reconstruct for consistency
    const targetIndex = isReviewing ? reviewIndex : history.length - 1;
    if (targetIndex < 0 || reviewIndex === -2) {
        setLastMove(null);
        return;
    }

    let movesToReplayLan: string[] = [];
    if (historyLan) movesToReplayLan = historyLan.slice(0, targetIndex + 1);

    const tempGame = reconstructGame(chessType as any, startFen, movesToReplayLan, castlingRights);
    
    // Standard fallback
    if (chessType !== 'chess960' && (!historyLan || historyLan.length === 0)) {
         const movesToReplay = history.slice(0, targetIndex + 1);
         for (const m of movesToReplay) {
            try { tempGame.move(m); } catch { break; }
         }
    }
    
    const historyVerbose = getSafeHistory(tempGame);
    const last = historyVerbose[historyVerbose.length - 1];
    setLastMove(last ? { from: last.from, to: last.to } : null);
  }, [fen, reviewIndex, history.length, game, moveVersion]);

  // === MOVE ANIMATION DETECTION ===
  // useLayoutEffect runs before browser paint, preventing the 1-frame flash
  // where the static piece is visible at its destination before the ghost overlay hides it
  useLayoutEffect(() => {
    // Skip animation on drag moves
    if (wasDragRef.current) {
      wasDragRef.current = false;
      prevHistoryLen.current = history.length;
      prevReviewIdx.current = reviewIndex;
      return;
    }

    const oldLen = prevHistoryLen.current;
    const oldIdx = prevReviewIdx.current;
    prevHistoryLen.current = history.length;
    prevReviewIdx.current = reviewIndex;

    if (boardSize === 0) return;

    // Determine direction using effective position indices
    // Map sentinel values to logical positions:
    //   -1 (live) → history.length - 1 (latest move)
    //   -2 (start) → -1 (before any moves)
    //   N (review) → N
    const historyGrew = history.length > oldLen && reviewIndex === -1;
    const effectiveOld = oldIdx === -1 ? (oldLen - 1) : (oldIdx === -2 ? -1 : oldIdx);
    const effectiveNew = reviewIndex === -1 ? (history.length - 1) : (reviewIndex === -2 ? -1 : reviewIndex);
    const delta = effectiveNew - effectiveOld;

    let direction: 'forward' | 'reverse' | null = null;
    if (historyGrew) {
      // New live move — always animate forward
      direction = 'forward';
    } else if (delta === 1) {
      // Single step forward (← or Next button)
      direction = 'forward';
    } else if (delta === -1) {
      // Single step backward (→ or Previous button)
      direction = 'reverse';
    }
    // |delta| > 1 or delta === 0 → snap (no animation)

    if (!direction) return;

    const { chessType, startFen, historyLan, castlingRights } = useGameStore.getState();

    if (direction === 'forward') {
      // Forward: animate the move at the current position
      const targetIndex = reviewIndex >= 0 ? reviewIndex : history.length - 1;
      if (targetIndex < 0) return;

      let movesToReplayLan: string[] = [];
      if (historyLan) movesToReplayLan = historyLan.slice(0, targetIndex + 1);

      const tempGame = reconstructGame(chessType as any, startFen, movesToReplayLan, castlingRights);
      if (chessType !== 'chess960' && (!historyLan || historyLan.length === 0)) {
        const movesToReplay = history.slice(0, targetIndex + 1);
        for (const m of movesToReplay) {
          try { tempGame.move(m); } catch { break; }
        }
      }
      const verboseHistory = getSafeHistory(tempGame);
      const lastVerbose = verboseHistory[verboseHistory.length - 1];
      if (!lastVerbose) return;

      const pieceKey = `${lastVerbose.color}${lastVerbose.piece.toUpperCase()}`;
      let castleRook: { piece: string; from: string; to: string } | undefined;
      if (lastVerbose.piece === 'k' && Math.abs(lastVerbose.from.charCodeAt(0) - lastVerbose.to.charCodeAt(0)) === 2) {
        const rank = lastVerbose.from[1];
        const isKingside = lastVerbose.to[0] === 'g';
        castleRook = {
          piece: `${lastVerbose.color}R`,
          from: isKingside ? `h${rank}` : `a${rank}`,
          to: isKingside ? `f${rank}` : `d${rank}`,
        };
      }

      if (animTimerRef.current) clearTimeout(animTimerRef.current);
      setAnimatingMove({ piece: pieceKey, from: lastVerbose.from, to: lastVerbose.to, castleRook, started: false, direction: 'forward' });

      // Navigation sound effects
      const isCapture = lastVerbose.flags.includes('c') || lastVerbose.flags.includes('e');
      if (isCapture) {
        audio.playCapture();
      } else if (lastVerbose.flags.includes('k') || lastVerbose.flags.includes('q')) {
        audio.playCastling();
      } else {
        audio.playMove();
      }

      // Capture smoke effect on forward navigation — use percentage coords for resize-safety
      if (isCapture) {
        const [visualRow, visualCol] = logicalToVisualPosition(lastVerbose.to, effectiveColor);
        const xPercent = `${((visualCol + 0.5) / 8) * 100}%`;
        const yPercent = `${((visualRow + 0.5) / 8) * 100}%`;
        setCapturePosition({ x: xPercent, y: yPercent });
        setCaptureKey(k => k + 1);
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimatingMove(prev => prev ? { ...prev, started: true } : null);
        });
      });

      const animDuration = 350;
      const fadeOut = 100;
      animTimerRef.current = setTimeout(() => {
        setAnimatingMove(prev => prev ? { ...prev, isFinishing: true } : null);
        animTimerRef.current = setTimeout(() => {
          setAnimatingMove(null);
          animTimerRef.current = null;
        }, fadeOut);
      }, animDuration);

    } else {
      // Reverse: animate the UNDONE move backward (from its to → back to its from)
      // The undone move was at oldIdx (or history.length-1 if oldIdx was -1)
      const undoneIndex = oldIdx === -1 ? history.length - 1 : oldIdx;
      if (undoneIndex < 0) return;

      let movesToReplayLan: string[] = [];
      if (historyLan) movesToReplayLan = historyLan.slice(0, undoneIndex + 1);

      const tempGame = reconstructGame(chessType as any, startFen, movesToReplayLan, castlingRights);
      if (chessType !== 'chess960' && (!historyLan || historyLan.length === 0)) {
        const movesToReplay = history.slice(0, undoneIndex + 1);
        for (const m of movesToReplay) {
          try { tempGame.move(m); } catch { break; }
        }
      }
      const verboseHistory = getSafeHistory(tempGame);
      const lastVerbose = verboseHistory[verboseHistory.length - 1];
      if (!lastVerbose) return;

      const pieceKey = `${lastVerbose.color}${lastVerbose.piece.toUpperCase()}`;
      let castleRook: { piece: string; from: string; to: string } | undefined;
      if (lastVerbose.piece === 'k' && Math.abs(lastVerbose.from.charCodeAt(0) - lastVerbose.to.charCodeAt(0)) === 2) {
        const rank = lastVerbose.from[1];
        const isKingside = lastVerbose.to[0] === 'g';
        castleRook = {
          piece: `${lastVerbose.color}R`,
          // Reverse: rook goes from dest back to origin
          from: isKingside ? `f${rank}` : `d${rank}`,
          to: isKingside ? `h${rank}` : `a${rank}`,
        };
      }

      if (animTimerRef.current) clearTimeout(animTimerRef.current);
      // Ghost starts at the move's 'to' and transitions to the move's 'from'
      setAnimatingMove({ piece: pieceKey, from: lastVerbose.to, to: lastVerbose.from, castleRook, started: false, direction: 'reverse' });

      // Navigation sound effects
      const isCapture = lastVerbose.flags.includes('c') || lastVerbose.flags.includes('e');
      if (isCapture) {
        audio.playCapture();
      } else if (lastVerbose.flags.includes('k') || lastVerbose.flags.includes('q')) {
        audio.playCastling();
      } else {
        audio.playMove();
      }

      // Capture smoke effect on reverse navigation (at the 'from' square where piece returns)
      if (isCapture && boardRef.current) {
        const rect = boardRef.current.getBoundingClientRect();
        const squareSize = rect.width / 8;
        const { x, y } = squareToCoords(lastVerbose.from, squareSize, effectiveColor);
        setCapturePosition({ x, y });
        setCaptureKey(k => k + 1);
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimatingMove(prev => prev ? { ...prev, started: true } : null);
        });
      });

      const animDuration = 350;
      const fadeOut = 100;
      animTimerRef.current = setTimeout(() => {
        setAnimatingMove(prev => prev ? { ...prev, isFinishing: true } : null);
        animTimerRef.current = setTimeout(() => {
          setAnimatingMove(null);
          animTimerRef.current = null;
        }, fadeOut);
      }, animDuration);
    }

    return () => {
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
    };
  }, [history.length, reviewIndex, moveVersion, boardSize]);

  // UNIVERSAL sound & capture detection
  // Uses moveVersion to guarantee we process every single move update from the store
  const lastProcessedMoveVersion = useRef(moveVersion);

  useEffect(() => {
    // Detect game reset (moveVersion went backward)
    if (moveVersion < lastProcessedMoveVersion.current) {
        lastProcessedMoveVersion.current = moveVersion;
        return;
    }

    // Skip if no new move (or if we just mounted and don't want to play sound for resumed game)
    if (moveVersion <= lastProcessedMoveVersion.current) return;
    
    // Update tracker immediately
    lastProcessedMoveVersion.current = moveVersion;

    const { game, history } = useGameStore.getState();
    
    // Safety check
    if (history.length === 0) return;
    
    // Use getSafeHistory to get flags (original method)
    const historyVerbose = getSafeHistory(game);
    const lastMove = historyVerbose[historyVerbose.length - 1];
    
    if (!lastMove) return;

    // --- SOUND EFFECTS ---
    // Strict Order: Checkmate > Promotion > Castle > Capture(+Check) > Check > Move
    if (game.isCheckmate()) {
        audio.playCheckmate();
    } else if (lastMove.promotion) {
        audio.playPromotion();
    } else if (lastMove.flags.includes('k') || lastMove.flags.includes('q')) {
        audio.playCastling();
    } else if (lastMove.flags.includes('c') || lastMove.flags.includes('e')) {
        audio.playCapture();
        if (game.isCheck()) {
            audio.playCheckPing();
        }
    } else if (game.isCheck()) {
        audio.playCheck();
    } else {
        audio.playMove(); // Normal move
    }

    // --- CAPTURE PARTICLE EFFECT ---
    // Use flags for capture detection too
    if ((lastMove.flags.includes('c') || lastMove.flags.includes('e')) && boardRef.current) {
        const targetSquare = lastMove.to;
        if (targetSquare) {
            const rect = boardRef.current.getBoundingClientRect();
            const squareSize = rect.width / 8;
            // CRITICAL FIX: Pass effectiveColor to squareToCoords to handle mirrored boards
            const { x, y } = squareToCoords(targetSquare, squareSize, effectiveColor);
            setCapturePosition({ x, y });
            setCaptureKey(k => k + 1);
        }
    }

  }, [moveVersion, boardFlipped, effectiveColor]); // Added effectiveColor dependency



  const handleMove = (from: string, to: string, pieceColor: string, pieceType: string) => {
    // CRITICAL: Use getState() to get fresh game state to avoid stale closures
    const freshState = useGameStore.getState();
    const freshGame = freshState.game;
    const currentMode = freshState.mode;
    
    // Prevent ANY moves if the game is over
    if (freshState.gameStatus !== 'active') return;
    
    // CRITICAL FIX: If in review mode, exit first to sync board with game state
    // This prevents the desync where moves are added but reviewIndex stays the same
    if (freshState.reviewIndex !== -1) {
      useGameStore.getState().exitReview();
    }
    
    // Check if it's the moving piece's turn
    const currentTurn = freshGame.turn();
    const movingPieceTurn = pieceColor === 'w' ? 'w' : 'b';
    
    
    // Check for pawn promotion (even for premoves in AI mode)
    if (pieceType === 'p') {
      const toRank = to[1];
      const isPromotionRank = (pieceColor === 'w' && toRank === '8') || 
                               (pieceColor === 'b' && toRank === '1');
      if (isPromotionRank) {
        setPendingPromotion({ from, to });
        setPromotionColor(pieceColor as 'w' | 'b');
        return;
      }
    }
    
    // In Local mode, strictly enforce turn order (No premoves)
    if (currentMode === 'local' && movingPieceTurn !== currentTurn) {
      console.warn(`[Chess] Move rejected: Not ${pieceColor}'s turn. Current turn: ${currentTurn}`);
      return; 
    }

    // AI & Online Mode: Allow Premove if it's not the user's turn
    if ((currentMode === 'ai' || currentMode === 'online') && movingPieceTurn !== currentTurn) {
      if (isPseudoLegalPremove(from, to, pieceType, pieceColor)) {
        console.log(`[Chess] Queuing premove: ${from}->${to} (${pieceColor}${pieceType})`);
        // Only include promotion for pawns reaching the back rank
        const needsPromotion = pieceType === 'p' && (to[1] === '8' || to[1] === '1');
        useGameStore.getState().addPremove({ from, to, promotion: needsPromotion ? 'q' : undefined });
        audio.playPremove();
        setLastMove({ from, to }); // Local feedback
        setSelectedSquare(null);
        setHighlights([]);
      } else {
        console.log(`[Chess] Premove rejected (invalid geometry): ${from}->${to}`);
        setSelectedSquare(null);
        setHighlights([]);
      }
      return;
    }
    
    // Clear premoves if user makes a move on their turn
    if ((currentMode === 'ai' || currentMode === 'online') && movingPieceTurn === currentTurn) {
       useGameStore.getState().clearPremoves();
    }
    
    // Check for pawn promotion moved to top


    
    // Normal move (not promotion)
    const move = makeMove({ from, to });
    if (move) {
      setLastMove({ from, to });
    } else {
      if (from !== to) {
        audio.playIllegalMove();
      }
    }
  };

  // Wrapper for drag-and-drop moves — skips animation since user already dragged visually
  const handleDragMove = (from: string, to: string, pieceColor: string, pieceType: string) => {
    wasDragRef.current = true;
    handleMove(from, to, pieceColor, pieceType);
  };

  const handlePromotionSelect = (piece: 'q' | 'r' | 'b' | 'n') => {
    if (pendingPromotion) {
      const { from, to } = pendingPromotion;
      
      // Check if it's a premove
      const fromPiece = game.get(from as any);
      if (fromPiece && fromPiece.color !== game.turn()) {
        console.log('[Chess] Queuing promotion premove:', from, '->', to, 'promotion:', piece);
        addPremove({ from, to, promotion: piece });
        audio.playPremove();
      } else {
        const move = makeMove({ from, to, promotion: piece });
        if (move) {
           setLastMove({ from, to });
        }
      }
      setPendingPromotion(null);
    }
  };



  // Interaction handlers
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const handleInteractionMouseDown = (e: React.MouseEvent) => {
    // Only capture right-clicks for arrows/highlights
    if (e.button !== 2) return;
    
    // Stop propagation so we don't trigger other things? 
    // Actually React events propagate. But we just want to track this.
    
    if (!boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    // Use effectiveColor here too!
    const square = coordsToSquare(e.clientX, e.clientY, rect, boardSize / 8, effectiveColor === 'black');
    
    if (square) {
      const color = getModifierColor(e);
      setDrawingArrow({ from: square, to: square, color });
    }
  };

  const handleInteractionMouseMove = (e: React.MouseEvent) => {
    if (!drawingArrow || !boardRef.current) return;
    
    const rect = boardRef.current.getBoundingClientRect();
    const square = coordsToSquare(e.clientX, e.clientY, rect, boardSize / 8, effectiveColor === 'black');
    
    if (square && square !== drawingArrow.to) {
      setDrawingArrow(prev => prev ? { ...prev, to: square } : null);
    }
  };

  const handleInteractionMouseUp = (_e: React.MouseEvent) => {
    if (!drawingArrow) return;
    
    const { from, to, color } = drawingArrow;
    
    if (from === to) {
      // Click on single square = toggle highlight
      setHighlights(prev => {
        const existing = prev.find(h => h.square === from);
        if (existing) {
          // Remove if same color, replace if different
          if (existing.color === color) {
            return prev.filter(h => h.square !== from);
          }
          return prev.map(h => h.square === from ? { ...h, color } : h);
        }
        return [...prev, { square: from, color }];
      });
    } else {
      // Drag between squares = toggle arrow
      setArrows(prev => {
        const existing = prev.find(a => a.from === from && a.to === to);
        if (existing) {
          // Remove if same color, replace if different
          if (existing.color === color) {
            return prev.filter(a => !(a.from === from && a.to === to));
          }
          return prev.map(a => (a.from === from && a.to === to) ? { ...a, color } : a);
        }
        return [...prev, { from, to, color }];
      });
    }
    
    setDrawingArrow(null);
  };
  
  // Clear only when left clicking on empty space or doing pure click?
  // We'll let the BoardSquare onClick handle clearing via a separate effect or just here?
  // Actually, standard board behavior: left click clears arrows and premoves.
  const handleBoardClick = (e: React.MouseEvent) => {
    if (e.button === 0) {
      if (arrows.length > 0 || highlights.length > 0) {
        setArrows([]);
        setHighlights([]);
      }
      // Don't cancel premove on left click - use right click or specific cancel action
      // if (premove) { setPremove(null); }
    }
  };

  return (
    <>
    <DndProvider backend={HTML5Backend}>
      <div className="relative">
          {/* Promotion Dialog */}
          <PromotionDialog 
            isOpen={pendingPromotion !== null}
            onSelect={handlePromotionSelect}
            playerColor={promotionColor}
          />

          {/* Premium Board Frame with Gold Accents */}
          <div className="relative p-3 md:p-6 rounded-3xl bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)]"
               style={{
                 boxShadow: `
                   0 0 0 1px rgba(212, 175, 55, 0.15),
                   0 0 0 3px rgba(20, 20, 20, 0.95),
                   0 0 0 4px rgba(212, 175, 55, 0.2),
                   0 20px 60px -15px rgba(0, 0, 0, 0.9),
                   inset 0 1px 0 rgba(255, 255, 255, 0.03)
                 `
               }}>
            
            {/* Inner gold accent line */}
            <div className="absolute top-3 left-3 right-3 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-transparent" />
            
            <div 
              ref={boardRef}
              className="w-full aspect-square relative rounded-xl overflow-hidden shadow-[inset_0_0_40px_rgba(0,0,0,0.3)] z-10 select-none"
              onContextMenu={handleContextMenu}
              onMouseDown={handleInteractionMouseDown}
              onMouseMove={handleInteractionMouseMove}
              onMouseUp={handleInteractionMouseUp}
             onClickCapture={handleBoardClick} 
                 style={{
                   borderColor: BOARD_THEMES[boardTheme].border,
                   borderWidth: '8px',
                   background: BOARD_THEMES[boardTheme].background || '#262522',
                   boxShadow: `0 20px 40px -5px rgba(0,0,0,0.4)`
                 }}>
               {/* Click capture to clear arrows on left click (if not handled by piece) */}
              {/* Board grid */}
              <div className="absolute inset-0 grid grid-cols-8 grid-rows-8">
              {ranks.map((rank, rIndex) =>
                files.map((file, fIndex) => {
                  // Build the logical position string
                  const position = `${file}${rank}`;
                  const isBlack = (rIndex + fIndex) % 2 === 1;
                  
                  // Coordinate labels: file name on bottom row, rank number on left column
                  const fileLabel = rIndex === 7 ? file : null;
                  const rankLabel = fIndex === 0 ? String(rank) : null;
                  
                  // Use coordinate utility to get correct board array indices
                  const [boardRowIndex, boardColIndex] = squareToBoardIndices(position);
                  const piece = board[boardRowIndex]?.[boardColIndex];

                  // Compute premove virtual positions for this square
                  // premoveFromSquares: squares where a piece was moved AWAY (hide real piece)
                  // premoveGhostPieces: squares where a ghost piece should appear
                  const premoveFromSquares = new Set<string>();
                  const premoveGhostPieces = new Map<string, { type: string; color: string }>();
                  
                  if (premoves.length > 0) {
                    // Track virtual piece positions through the premove chain
                    for (const pm of premoves) {
                      // Find what piece is at the 'from' square (could be a virtual piece from earlier premove)
                      let sourcePiece: { type: string; color: string } | null = null;
                      
                      // Check if a previous premove placed a ghost here
                      if (premoveGhostPieces.has(pm.from)) {
                        sourcePiece = premoveGhostPieces.get(pm.from)!;
                        premoveGhostPieces.delete(pm.from); // Remove from intermediate position
                      } else {
                        // Get from real board
                        const [r, c] = squareToBoardIndices(pm.from);
                        const realPiece = board[r]?.[c];
                        if (realPiece) {
                          sourcePiece = { type: realPiece.type, color: realPiece.color };
                          premoveFromSquares.add(pm.from); // Hide real piece
                        }
                      }
                      
                      if (sourcePiece) {
                        // Handle promotion
                        let pieceType = sourcePiece.type;
                        if (pm.promotion && sourcePiece.type === 'p' && (pm.to[1] === '8' || pm.to[1] === '1')) {
                          pieceType = pm.promotion;
                        }
                        premoveGhostPieces.set(pm.to, { type: pieceType, color: sourcePiece.color });
                      }
                    }
                  }

                  const isPremoveFrom = premoveFromSquares.has(position);
                  const ghostPiece = premoveGhostPieces.get(position);

                  return (
                    <BoardSquare
                      key={position}
                      position={position}
                      isBlack={isBlack}
                      theme={boardTheme}
                      onMove={handleDragMove}
                      lastMove={lastMove}
                      isLegalMove={legalMoves.includes(position)}
                      isSelected={selectedSquare === position}

                      isCheck={kingInCheck === position}
                      isPremove={premoves.some(pm => pm.from === position || pm.to === position)}
                      fileLabel={fileLabel}
                      rankLabel={rankLabel}
                      onSquareClick={() => {
                        // If clicking on a piece...
                        const clickedPiece = game.get(position as any);
                        
                        // Virtual piece lookup: if a premove moved a piece TO this square,
                        // treat this square as having that piece (for multi-premove chains)
                        const currentPremoves = useGameStore.getState().premoves;
                        const getVirtualPiece = (sq: string): { type: string; color: string } | null => {
                          // Walk premove queue in reverse: last premove targeting this square wins
                          for (let i = currentPremoves.length - 1; i >= 0; i--) {
                            if (currentPremoves[i].to === sq) {
                              // Find the original piece by tracing the chain
                              let traceSq = currentPremoves[i].from;
                              for (let j = i - 1; j >= 0; j--) {
                                if (currentPremoves[j].to === traceSq) {
                                  traceSq = currentPremoves[j].from;
                                }
                              }
                              const originalPiece = game.get(traceSq as any);
                              if (originalPiece) {
                                // If it was promoted, update type
                                const promoType = currentPremoves[i].promotion;
                                return { 
                                  type: promoType && promoType !== 'q' ? promoType : (originalPiece.type === 'p' && (sq[1] === '8' || sq[1] === '1') ? (promoType || 'q') : originalPiece.type),
                                  color: originalPiece.color 
                                };
                              }
                            }
                          }
                          return null;
                        };

                        const virtualPiece = getVirtualPiece(position);
                        const playerColorShort = playerColor === 'white' ? 'w' : 'b';
                        const isPlayerTurn = game.turn() === playerColorShort;
                        
                        // When it's NOT our turn (premove mode), prefer virtual piece over real piece
                        const effectivePiece = (!isPlayerTurn && virtualPiece) ? virtualPiece : (clickedPiece || virtualPiece);
                        
                        console.log(`[Click] ${position} | selected=${selectedSquare} | real=${clickedPiece ? clickedPiece.color+clickedPiece.type : 'null'} | virtual=${virtualPiece ? virtualPiece.color+virtualPiece.type : 'null'} | effective=${effectivePiece ? effectivePiece.color+effectivePiece.type : 'null'} | turn=${game.turn()} | player=${playerColorShort} | premoves=${currentPremoves.length}`);
                        
                        let handled = false;
                        
                        if (selectedSquare && selectedSquare !== position) {
                          const isLegal = legalMoves.includes(position);
                          const fromPieceReal = game.get(selectedSquare as any);
                          const fromPieceVirtual = getVirtualPiece(selectedSquare);
                          const fromPiece = (!isPlayerTurn && fromPieceVirtual) ? fromPieceVirtual : (fromPieceReal || fromPieceVirtual);
                          const isMyTurn = fromPieceReal && fromPieceReal.color === game.turn();
                          
                          const targetIsOwnPiece = effectivePiece && effectivePiece.color === playerColorShort;
                          
                          console.log(`[Click] Move check: from=${selectedSquare} fromPiece=${fromPiece ? fromPiece.color+fromPiece.type : 'null'} (real=${fromPieceReal ? fromPieceReal.color+fromPieceReal.type : 'null'} virtual=${fromPieceVirtual ? fromPieceVirtual.color+fromPieceVirtual.type : 'null'}) isLegal=${isLegal} isMyTurn=${isMyTurn} targetIsOwn=${targetIsOwnPiece}`);
                          
                          if (!isMyTurn && targetIsOwnPiece && !isLegal) {
                            console.log(`[Click] → Re-selecting piece at ${position}`);
                            setSelectedSquare(position);
                            handled = true;
                          } else if (fromPiece && (isLegal || !isMyTurn)) {
                            console.log(`[Click] → Executing move/premove ${selectedSquare}->${position}`);
                            handleMove(selectedSquare, position, fromPiece.color, fromPiece.type);
                            setSelectedSquare(null);
                            handled = true;
                          } else {
                            console.log(`[Click] → Move rejected`);
                          }
                        } else if (selectedSquare === position) {
                          console.log(`[Click] → Deselecting`);
                          setSelectedSquare(null);
                          handled = true;
                        }
                        
                        if (!handled) {
                          let canSelect = false;
                          if (effectivePiece) {
                            if (mode === 'local') {
                              canSelect = true;
                            } else {
                              canSelect = effectivePiece.color === playerColorShort;
                            }
                          }
                          
                          if (canSelect) {
                            console.log(`[Click] → Selecting ${effectivePiece!.color}${effectivePiece!.type} at ${position}${virtualPiece ? ' (VIRTUAL)' : ''}`);
                            setSelectedSquare(position);
                          } else {
                            console.log(`[Click] → Nothing to select, deselecting`);
                            setSelectedSquare(null);
                          }
                        }
                      }}
                    >
                      {/* Real piece — hidden if premoved away, dimmed if ghost overlaps */}
                      {piece && (
                        <div style={{
                          opacity: isPremoveFrom ? 0
                                 : ghostPiece ? 0
                                 : animatingMove && animatingMove.to === position && !animatingMove.started ? 0
                                 : animatingMove && animatingMove.to === position && !animatingMove.isFinishing ? 0
                                 : animatingMove && animatingMove.from === position && animatingMove.direction !== 'reverse' ? 0
                                 : animatingMove?.castleRook && (animatingMove.castleRook.to === position || animatingMove.castleRook.from === position) && !animatingMove.isFinishing ? 0
                                 : 1,
                          transition: 'opacity 0ms',
                          width: '100%',
                          height: '100%',
                          pointerEvents: (isPremoveFrom || ghostPiece) ? 'none' : 'auto',
                        }}>
                          <Piece key={`${position}-${piece.color}${piece.type}`} piece={piece} position={position} />
                        </div>
                      )}
                      {/* Ghost piece at premove destination (empty square) */}
                      {ghostPiece && !piece && (
                        <div style={{
                          opacity: 0.7,
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <Piece key={`ghost-${position}-${ghostPiece.color}${ghostPiece.type}`} piece={ghostPiece} position={position} />
                        </div>
                      )}
                      {/* Ghost piece overlapping an existing piece at destination */}
                      {ghostPiece && piece && (
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          opacity: 0.85,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 5,
                        }}>
                          <Piece key={`ghostover-${position}-${ghostPiece.color}${ghostPiece.type}`} piece={ghostPiece} position={position} />
                        </div>
                      )}
                    </BoardSquare>
                  );
                })
              )}
              </div>
              {boardSize > 0 && (
                <BoardOverlay 
                  squareSize={boardSize / 8}
                  boardFlipped={boardFlipped}
                  playerColor={playerColor}
                  arrows={[...arrows, ...engineArrows]}
                  highlights={highlights}
                  drawingArrow={drawingArrow}
                  theme={boardTheme}
                />
              )}
              {/* === CAPTURE EFFECT === */}
              {capturePosition && (
                <CaptureEffect 
                  key={captureKey}
                  x={capturePosition.x}
                  y={capturePosition.y}
                  isAbsolute={true}
                />
              )}
              {/* === MOVE ANIMATION GHOST OVERLAY === */}
              {animatingMove && boardSize > 0 && (() => {
                const baseCol = playerColor ?? 'white';
                const effCol = boardFlipped
                  ? (baseCol === 'white' ? 'black' : 'white')
                  : baseCol;
                
                const [fromRow, fromCol] = logicalToVisualPosition(animatingMove.from, effCol);
                const [toRow, toCol] = logicalToVisualPosition(animatingMove.to, effCol);
                
                const fromX = fromCol * 100;
                const fromY = fromRow * 100;
                const toX = toCol * 100;
                const toY = toRow * 100;
                
                const pieceKey = animatingMove.piece; // e.g. "wN"
                const color = pieceKey[0] as 'w'|'b';
                const type = pieceKey[1].toLowerCase();
                const iconUrl = PIECE_THEMES[pieceTheme].getIcon(color, type);
                
                const ghostElements: React.ReactNode[] = [];
                
                // Main piece ghost
                if (iconUrl) {
                  ghostElements.push(
                    <div
                      key="main-ghost"
                      className="absolute pointer-events-none z-30"
                      style={{
                        width: '12.5%',
                        height: '12.5%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transform: animatingMove.started 
                          ? `translate(${toX}%, ${toY}%)` 
                          : `translate(${fromX}%, ${fromY}%)`,
                        transition: animatingMove.started ? 'transform 300ms ease-in-out, opacity 100ms' : 'none',
                        opacity: animatingMove.isFinishing ? 0 : 1,
                      }}
                    >
                       <img 
                          src={iconUrl} 
                          className="w-[85%] h-[85%] object-contain drop-shadow-lg" 
                          style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }}
                          alt="ghost" 
                       />
                    </div>
                  );
                }
                
                // Castle rook ghost
                if (animatingMove.castleRook) {
                  const [rFromRow, rFromCol] = logicalToVisualPosition(animatingMove.castleRook.from, effCol);
                  const [rToRow, rToCol] = logicalToVisualPosition(animatingMove.castleRook.to, effCol);
                  
                  const rKey = animatingMove.castleRook.piece;
                  const rColor = rKey[0] as 'w'|'b';
                  const rType = rKey[1].toLowerCase();
                  const rIconUrl = PIECE_THEMES[pieceTheme].getIcon(rColor, rType);
                  
                  if (rIconUrl) {
                    ghostElements.push(
                      <div
                        key="rook-ghost"
                        className="absolute pointer-events-none z-30"
                        style={{
                          width: '12.5%',
                          height: '12.5%',
                          transform: animatingMove.started 
                            ? `translate(${rToCol * 100}%, ${rToRow * 100}%)` 
                            : `translate(${rFromCol * 100}%, ${rFromRow * 100}%)`,
                          transition: animatingMove.started ? 'transform 300ms ease-in-out, opacity 100ms' : 'none',
                          opacity: animatingMove.isFinishing ? 0 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                          <img 
                            src={rIconUrl} 
                            className="w-[85%] h-[85%] object-contain drop-shadow-lg" 
                            style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }}
                            alt="rook ghost" 
                          />
                      </div>
                    );
                  }
                }
                
                return ghostElements;
              })()}
            </div>
            
            {/* Bottom gold accent line */}
            <div className="absolute bottom-3 left-3 right-3 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-transparent" />
          </div>
      </div>
    </DndProvider>
    
  </>
  );
};
