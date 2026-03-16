import { useEffect, useState, useRef } from 'react';
import { Chess, Move } from 'chess.js';
import { PIECE_THEMES, BOARD_THEMES } from '../../core/utils/themes';
import type { BoardTheme, PieceTheme } from '../../core/utils/themes';
import { audio } from '../../core/audio/audio';
import { Crown } from 'lucide-react';
import { CaptureEffect } from '../game/board/CaptureEffect';

const OPERA_GAME_MOVES = [
  'e4', 'e5', 'Nf3', 'd6', 'd4', 'Bg4', 'dxe5', 'Bxf3', 'Qxf3', 'dxe5', 
  'Bc4', 'Nf6', 'Qb3', 'Qe7', 'Nc3', 'c6', 'Bg5', 'b5', 'Nxb5', 'cxb5', 
  'Bxb5+', 'Nbd7', 'O-O-O', 'Rd8', 'Rxd7', 'Rxd7', 'Rd1', 'Qe6', 'Bxd7+', 'Nxd7', 
  'Qb8+', 'Nxb8', 'Rd8#'
];

interface AnimatedPiece {
  id: string;
  type: string;
  color: 'w'|'b';
  square: string;
}

export const HeroBoard = ({ 
  boardTheme = 'midnight', 
  pieceTheme = 'wood' 
}: { 
  boardTheme?: BoardTheme | string; 
  pieceTheme?: PieceTheme | string; 
}) => {
  const [game] = useState(() => new Chess());
  const [moveIndex, setMoveIndex] = useState(0);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  
  const [pieces, setPieces] = useState<AnimatedPiece[]>(() => {
    const initial: AnimatedPiece[] = [];
    const b = game.board();
    b.forEach((row, r) => {
      row.forEach((piece, c) => {
        if (piece) {
          const sq = `${String.fromCharCode(97 + c)}${8 - r}`;
          initial.push({ id: `${piece.color}${piece.type}-${sq}`, type: piece.type, color: piece.color, square: sq });
        }
      });
    });
    return initial;
  });

  const [capturePosition, setCapturePosition] = useState<{ x: string | number, y: string | number } | null>(null);
  const [captureKey, setCaptureKey] = useState(0);
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const playNextMove = () => {
      // Loop the game logic
      if (moveIndex >= OPERA_GAME_MOVES.length) {
        timeoutId = setTimeout(() => {
          game.reset();
          setMoveIndex(0);
          setLastMove(null);
          
          const initial: AnimatedPiece[] = [];
          const b = game.board();
          b.forEach((row, r) => {
            row.forEach((piece, c) => {
              if (piece) {
                const sq = `${String.fromCharCode(97 + c)}${8 - r}`;
                initial.push({ id: `${piece.color}${piece.type}-${sq}`, type: piece.type, color: piece.color, square: sq });
              }
            });
          });
          setPieces(initial);
        }, 4000);
        return;
      }

      const moveStr = OPERA_GAME_MOVES[moveIndex];
      let moveObj: Move | null = null;
      try {
        moveObj = game.move(moveStr);
      } catch (e) {
        return;
      }

      setLastMove({ from: moveObj.from, to: moveObj.to });
      setMoveIndex(m => m + 1);

      // Handle Animation State
      setPieces(prev => {
        let next = [...prev];
        
        if (moveObj!.captured) {
          const capSquare = moveObj!.flags.includes('e') ? moveObj!.to[0] + moveObj!.from[1] : moveObj!.to;
          next = next.filter(p => !(p.square === capSquare && p.color !== moveObj!.color));
          
          if (boardRef.current) {
            const fileIdx = moveObj!.to.charCodeAt(0) - 97;
            const rankIdx = 8 - parseInt(moveObj!.to[1]);
            setCapturePosition({ 
              x: `${fileIdx * 12.5 + 6.25}%`, 
              y: `${rankIdx * 12.5 + 6.25}%` 
            });
            setCaptureKey(k => k + 1);
          }

          audio.playCapture();
          if (game.isCheck()) audio.playCheckPing();
        } else if (moveObj!.flags.includes('k') || moveObj!.flags.includes('q')) {
          audio.playCastling();
        } else if (game.isCheck()) {
          audio.playCheck();
        } else {
          audio.playMove();
        }

        const movingPiece = next.find(p => p.square === moveObj!.from);
        if (movingPiece) {
          movingPiece.square = moveObj!.to;
          if (moveObj!.promotion) movingPiece.type = moveObj!.promotion;
        }

        if (moveObj!.flags.includes('k') || moveObj!.flags.includes('q')) {
          const isKingside = moveObj!.flags.includes('k');
          const rank = moveObj!.color === 'w' ? '1' : '8';
          const rookFrom = isKingside ? `h${rank}` : `a${rank}`;
          const rookTo = isKingside ? `f${rank}` : `d${rank}`;
          const rook = next.find(p => p.square === rookFrom);
          if (rook) rook.square = rookTo;
        }

        return next;
      });

      timeoutId = setTimeout(playNextMove, 1200); 
    };

    const startDelay = moveIndex === 0 ? 1000 : 1200;
    timeoutId = setTimeout(playNextMove, startDelay);

    return () => clearTimeout(timeoutId);
  }, [moveIndex, game]);

  // Apply requested themes
  const themeColors = BOARD_THEMES[boardTheme as BoardTheme] || BOARD_THEMES['midnight'];
  const pieceThemeStr = pieceTheme as PieceTheme;

  const getSquareOffset = (sq: string) => {
    const file = sq.charCodeAt(0) - 97;
    const rank = 8 - parseInt(sq[1]);
    return { left: `${file * 12.5}%`, top: `${rank * 12.5}%` };
  };

  return (
    <div className="relative w-full max-w-[500px] aspect-square rounded-lg shadow-2xl ring-4 ring-black/40">
      <div className="absolute inset-0 grid grid-cols-8 grid-rows-8 rounded-lg overflow-hidden" ref={boardRef}>
        {Array.from({ length: 64 }).map((_, i) => {
          const r = Math.floor(i / 8);
          const c = i % 8;
          const isBlack = (r + c) % 2 === 1;
          const position = `${String.fromCharCode(97 + c)}${8 - r}`;
          const isLastMove = lastMove?.from === position || lastMove?.to === position;
          
          return (
            <div 
              key={position} 
              className="relative transition-colors duration-300"
              style={{ backgroundColor: isLastMove ? 'rgba(232, 179, 75, 0.4)' : (isBlack ? themeColors.dark : themeColors.light) }}
            >
              {c === 7 && <span className={`absolute top-0.5 right-1 text-[10px] font-bold opacity-70 ${isBlack ? 'text-white/40' : 'text-black/40'}`}>{8 - r}</span>}
              {r === 7 && <span className={`absolute bottom-0.5 left-1 text-[10px] font-bold opacity-70 ${isBlack ? 'text-white/40' : 'text-black/40'}`}>{String.fromCharCode(97 + c)}</span>}
            </div>
          );
        })}
      </div>

      {pieces.map(piece => {
        const { left, top } = getSquareOffset(piece.square);
        return (
          <div
            key={piece.id}
            className="absolute w-[12.5%] h-[12.5%] flex items-center justify-center pointer-events-none transition-all duration-300 ease-in-out z-10"
            style={{ left, top }}
          >
            <img
              src={PIECE_THEMES[pieceThemeStr].getIcon(piece.color, piece.type)}
              alt=""
              className="w-[85%] h-[85%] object-contain drop-shadow-xl"
            />
          </div>
        );
      })}

      {capturePosition && (
        <CaptureEffect 
          key={`capture-${captureKey}`} 
          x={capturePosition.x} 
          y={capturePosition.y} 
          isAbsolute
        />
      )}

      {/* Decorative Player tags */}
      <div className="absolute -top-4 -left-4 glass-card px-4 py-2 rounded-full flex items-center gap-3 border border-white/10 shadow-xl z-20 bg-black/80 backdrop-blur-md">
        <Crown className="w-4 h-4 text-[#e8b34b]" />
        <span className="text-sm font-bold text-white">Guest_4912</span>
        <span className="text-sm text-[#e8b34b] font-mono">1200</span>
      </div>
      <div className="absolute -bottom-4 -right-4 glass-card px-4 py-2 rounded-full flex items-center gap-3 border border-white/10 shadow-xl z-20 bg-black/80 backdrop-blur-md">
        <Crown className="w-4 h-4 text-[#e8b34b]" />
        <span className="text-sm font-bold text-white">Stockfish AI</span>
        <span className="text-sm text-[#e8b34b] font-mono">3200</span>
      </div>
    </div>
  );
};
