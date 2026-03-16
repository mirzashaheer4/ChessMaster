import { Move } from 'chess.js';

export interface GameEngine {
  // State Access
  getFen(): string;
  getTurn(): 'w' | 'b';
  getHistory(): string[]; // Verbose SAN history
  getHistoryLan(): string[]; // LAN history for AI/UCI
  inCheck(): boolean;
  isCheckmate(): boolean;
  isDraw(): boolean;
  isGameOver(): boolean;
  
  // Actions
  makeMove(move: { from: string; to: string; promotion?: string }): Move | null;
  undoMove(): void;
  reset(): void;
  loadFen(fen: string): void;
  
  // Validation
  getLegalMoves(square: string): string[];
}
