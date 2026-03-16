import { Chess } from 'chess.js';

console.log('Testing Chess960 support...');

// A standard-ish 960 position: King at B1, Rook at A1 (queenside).
// FEN for this (if supported): 
// "rkrnnnnn/pppppppp/8/8/8/8/PPPPPPPP/RKRNNNNN w KQkq - 0 1" (Standard castling rights KQkq?)
// In X-FEN/960, castling rights are the columns of the rooks.
// If Rooks are at A and C (index 0 and 2). King at B (index 1).
// FEN: rk1r4/pppppppp/8/8/8/8/PPPPPPPP/RK1R4 w CAca - 0 1
// Let's try to load this.


// Testing standard castling rights on non-standard position
// Position: R K R N N N N N
// White Rooks at a1 (index 0), c1 (index 2). King at b1 (index 1).
// Black Rooks at a8, c8. King at b8.
// FEN: rkrnnnnn/pppppppp/8/8/8/8/PPPPPPPP/RKRNNNNN w KQkq - 0 1
// Does it load?
try {
  const fen = "rkrnnnnn/pppppppp/8/8/8/8/PPPPPPPP/RKRNNNNN w KQkq - 0 1";
  // The official chess.js constructor signature might vary. 
  // Trying common patterns.
  // 1. new Chess(fen, { skipValidation: true })
  // 2. load(fen, { skipValidation: true })
  
  try {
      const c = new Chess();
      c.load(fen, { skipValidation: true });
      console.log('Loaded via load(..., { skipValidation: true })');
      console.log(c.ascii());
      console.log('Moves:', c.moves());
  } catch(e) { console.log('load failed:', e.message); }

} catch (e) {
  console.log('Failed:', e.message);
}

