/**
 * Coordinate Mapping System for Chess Board
 * 
 * Separates visual (render) coordinates from logical (game) coordinates.
 * This ensures chess rules remain independent from visual representation.
 * 
 * ARCHITECTURE:
 * 1. Logical Layer: Pure chess.js coordinates (a1-h8) - NEVER changes
 * 2. Visual Layer: What the player sees (may be flipped/rotated)
 * 3. Mapping Functions: Convert between layers safely
 */

export type PlayerColor = 'white' | 'black';
export type File = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h';
export type Rank = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';
export type Square = `${File}${Rank}`;

// Chess.js board array indices
// board[0] = rank 8, board[7] = rank 1
// board[row][0] = file 'a', board[row][7] = file 'h'

const FILES: File[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS: Rank[] = ['1', '2', '3', '4', '5', '6', '7', '8'];

/**
 * Convert square string to board array indices
 * @param square - Chess notation like "e4"
 * @returns [rowIndex, colIndex] for board array access
 */
export function squareToBoardIndices(square: string): [number, number] {
  const file = square[0] as File;
  const rank = square[1] as Rank;
  
  const colIndex = FILES.indexOf(file);
  const rowIndex = 8 - parseInt(rank); // board[0] is rank 8
  
  return [rowIndex, colIndex];
}

/**
 * Convert board array indices to square string
 * @param rowIndex - Row in board array (0-7)
 * @param colIndex - Column in board array (0-7)
 * @returns Chess notation like "e4"
 */
export function boardIndicesToSquare(rowIndex: number, colIndex: number): Square {
  const file = FILES[colIndex];
  const rank = RANKS[7 - rowIndex]; // board[0] is rank 8, so rank = 8 - rowIndex
  return `${file}${rank}` as Square;
}

/**
 * Get the visual iteration order for ranks and files based on player color.
 * This ONLY affects display order, NOT logical positions.
 * 
 * @param playerColor - 'white' shows white pieces at bottom, 'black' shows black at bottom
 */
export function getVisualBoardOrder(playerColor: PlayerColor | null) {
  // Files are normally a-h (left to right)
  // If player is black (flipped), files are h-a (left to right)
  const files: File[] = playerColor === 'black' 
    ? [...FILES].reverse() 
    : [...FILES];
  
  // Ranks order depends on perspective
  // White at bottom: show ranks 8->1 (top to bottom visually)
  // Black at bottom: show ranks 1->8 (top to bottom visually)
  const ranks: Rank[] = playerColor === 'black' 
    ? [...RANKS]  // ['1', '2', '3', '4', '5', '6', '7', '8']
    : [...RANKS].reverse();  // ['8', '7', '6', '5', '4', '3', '2', '1']
  
  return { files, ranks };
}

/**
 * Given visual grid position, get the logical square.
 * This is the KEY function that bridges visual and logical layers.
 * 
 * @param visualRow - Visual row index (0 = top of screen)
 * @param visualCol - Visual column index (0 = left of screen)
 * @param playerColor - Current player's color (determines board orientation)
 * @returns The logical chess square (e.g., "e4")
 */
export function visualToLogicalSquare(
  visualRow: number, 
  visualCol: number, 
  playerColor: PlayerColor | null
): Square {
  const { files, ranks } = getVisualBoardOrder(playerColor);
  
  const file = files[visualCol];
  const rank = ranks[visualRow];
  
  return `${file}${rank}` as Square;
}

/**
 * Given a logical square, get the visual grid position.
 * 
 * @param square - Logical chess square (e.g., "e4")  
 * @param playerColor - Current player's color
 * @returns [visualRow, visualCol] for rendering
 */
export function logicalToVisualPosition(
  square: string, 
  playerColor: PlayerColor | null
): [number, number] {
  const { files, ranks } = getVisualBoardOrder(playerColor);
  
  const file = square[0] as File;
  const rank = square[1] as Rank;
  
  const visualCol = files.indexOf(file);
  const visualRow = ranks.indexOf(rank);
  
  return [visualRow, visualCol];
}

/**
 * Get the relative coordinates (0-7) for a square
 * @param square - Logical chess square
 * @param squareSize - Size of one square in pixels
 * @param boardFlipped - Whether the board is flipped (black at bottom)
 */
export function squareToCoords(square: string, squareSize: number, viewColor: PlayerColor) {
  const [visualRow, visualCol] = logicalToVisualPosition(square, viewColor);
  return {
    x: (visualCol + 0.5) * squareSize, // Center of square
    y: (visualRow + 0.5) * squareSize  // Center of square
  };
}

/**
 * Get piece from board array using logical square notation.
 * This ensures we always access the correct piece regardless of visual orientation.
 * 
 * @param board - Chess.js board array from game.board()
 * @param square - Logical chess square (e.g., "e4")
 * @returns The piece at that square, or null
 */
export function getPieceAtSquare<T>(board: T[][], square: string): T | null {
  const [rowIndex, colIndex] = squareToBoardIndices(square);
  
  if (rowIndex < 0 || rowIndex > 7 || colIndex < 0 || colIndex > 7) {
    console.error('[Coords] Invalid square:', square);
    return null;
  }
  
  return board[rowIndex][colIndex];
}

/**
 * Validate that a square notation is valid
 */
export function isValidSquare(square: string): square is Square {
  if (square.length !== 2) return false;
  const file = square[0];
  const rank = square[1];
  return FILES.includes(file as File) && RANKS.includes(rank as Rank);
}

