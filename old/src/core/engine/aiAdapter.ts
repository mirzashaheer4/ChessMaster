import { Chess } from 'chess.js';

/**
 * AI Adapter - Ensures safe, sanitized communication between Game Engine and Stockfish
 * Prevents direct access to the engine's Chess instance.
 */
export const aiAdapter = {
  /**
   * Validates if a LAN move string (e.g., "e2e4") is legal for the current position
   * Returns the move object if valid, null otherwise.
   */
  validateLanMove: (fen: string, lan: string): { from: string; to: string; promotion?: string } | null => {
    try {
      const tempGame = new Chess(fen);
      const from = lan.substring(0, 2);
      const to = lan.substring(2, 4);
      const promotion = lan.length > 4 ? lan.substring(4, 5) : undefined;
      
      // Basic validation
      const moveResult = tempGame.move({ from, to, promotion });
      if (moveResult) {
        return { from, to, promotion };
      }
      
      // Check 960 Castling (King takes Rook)
      const piece = tempGame.get(from as any);
      if (piece?.type === 'k') {
          // If destination is a Rook of same color, it's 960 castling
          const target = tempGame.get(to as any);
          if (target?.type === 'r' && target.color === piece.color) {
               return { from, to, promotion }; // Allow it, store will handle 960 logic
          }
      }

    } catch (e) {
      console.warn('AI Adapter: Invalid LAN move:', lan, e);
    }
    return null;
  },
};
