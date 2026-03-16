import React, { useMemo } from 'react';
import { useGameStore } from '../../../core/store/game';

// Piece values for material calculation
const PIECE_VALUES: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
};

// Piece Unicode symbols
const PIECE_SYMBOLS: Record<string, { white: string; black: string }> = {
  p: { white: '♙', black: '♟' },
  n: { white: '♘', black: '♞' },
  b: { white: '♗', black: '♝' },
  r: { white: '♖', black: '♜' },
  q: { white: '♕', black: '♛' },
};

// Order pieces should be displayed
const PIECE_ORDER = ['q', 'r', 'b', 'n', 'p'];

interface CapturedPiecesProps {
  color: 'white' | 'black';
  className?: string;
}

/**
 * Displays captured pieces for one side
 * Shows material advantage when applicable
 */
export const CapturedPieces: React.FC<CapturedPiecesProps> = ({ color, className = '' }) => {
  const { fen } = useGameStore();
  
  // Calculate captured pieces from FEN
  const { pieces, materialAdvantage } = useMemo(() => {
    // Starting piece counts
    const startingPieces = { p: 8, n: 2, b: 2, r: 2, q: 1 };
    
    // Count current pieces on board from FEN
    const boardPart = fen.split(' ')[0];
    const whitePieces: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };
    const blackPieces: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };
    
    for (const char of boardPart) {
      if (char >= 'a' && char <= 'z') {
        // Black piece
        if (blackPieces[char] !== undefined) {
          blackPieces[char]++;
        }
      } else if (char >= 'A' && char <= 'Z') {
        // White piece
        const lower = char.toLowerCase();
        if (whitePieces[lower] !== undefined) {
          whitePieces[lower]++;
        }
      }
    }
    
    // Calculate captured pieces (pieces that are missing from the board)
    // If we want to show pieces captured BY this color, we look at opponent's missing pieces
    const opponentPieces = color === 'white' ? blackPieces : whitePieces;
    
    const captured: string[] = [];
    for (const piece of PIECE_ORDER) {
      const missingCount = startingPieces[piece as keyof typeof startingPieces] - opponentPieces[piece];
      for (let i = 0; i < missingCount; i++) {
        captured.push(piece);
      }
    }
    
    // Calculate material advantage
    const whiteMaterial = Object.entries(whitePieces).reduce(
      (sum, [piece, count]) => sum + (PIECE_VALUES[piece] || 0) * count, 0
    );
    const blackMaterial = Object.entries(blackPieces).reduce(
      (sum, [piece, count]) => sum + (PIECE_VALUES[piece] || 0) * count, 0
    );
    
    const advantage = color === 'white' 
      ? whiteMaterial - blackMaterial 
      : blackMaterial - whiteMaterial;
    
    return { pieces: captured, materialAdvantage: advantage };
  }, [fen, color]);

  const pieceColor = color === 'white' ? 'black' : 'white'; // Captured pieces are opponent's color

  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {/* Captured pieces */}
      <div className="flex flex-wrap gap-0">
        {pieces.map((piece, idx) => (
          <span 
            key={`${piece}-${idx}`}
            className={`text-lg leading-none ${
              pieceColor === 'white' ? 'text-gray-100' : 'text-gray-800'
            }`}
            style={{ 
              textShadow: pieceColor === 'white' 
                ? '0 1px 2px rgba(0,0,0,0.5)' 
                : '0 1px 1px rgba(255,255,255,0.3)',
              marginLeft: idx > 0 ? '-4px' : '0' // Overlap pieces slightly
            }}
          >
            {PIECE_SYMBOLS[piece]?.[pieceColor]}
          </span>
        ))}
      </div>
      
      {/* Material advantage indicator */}
      {materialAdvantage > 0 && (
        <span className="text-xs font-bold text-green-400 ml-1">
          +{materialAdvantage}
        </span>
      )}
    </div>
  );
};

export default CapturedPieces;
