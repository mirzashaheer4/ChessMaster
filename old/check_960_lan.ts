
import { Chess } from 'chess.js';

// Setup a 960 position: R K ... R (start position)
// FEN: rkr5/8/8/8/8/8/8/RKR5 w - - 0 1
// Rooks at a1, c1. King at b1.
// To castle Kingside (with c1 Rook), King goes to g1, Rook to f1.
// In 960 notation (Shredder), move is Kb1c1 (King takes Rook).

const game = new Chess('rkr5/8/8/8/8/8/8/RKR5 w - - 0 1');

// To castle Kingside (O-O), we target the 'h' side rook (but here it's on c1? No, c1 is right of b1, so it's Kingside? Or Queenside?)
// Standard: a b c d e f g h
// indices: 0 1 2 3 4 5 6 7
// K at 1 (b1). R at 0 (a1), 2 (c1).
// c1 is to the right. So it's Kingside relative to King?
// Technically 960 castling is defined by King/Rook pairs.
// Let's deduce what chess.js thinks.
const moves = game.moves({ verbose: true });
const castles = moves.filter(m => m.san.includes('O-O'));
console.log('Castling Moves:', castles.map(m => ({ san: m.san, lan: m.lan, from: m.from, to: m.to })));

try {
    const res = game.move('O-O'); // Try casting
    console.log('Castling LAN:', res.lan);
    console.log('Castling From:', res.from);
    console.log('Castling To:', res.to);
} catch (e) {
    console.log('O-O failed:', e.message);
    // Try explicit
    // Maybe it needs O-O-O?
    try {
        const res2 = game.move('O-O-O');
        console.log('O-O-O LAN:', res2.lan);
    } catch (e2) {
         console.log('O-O-O failed:', e2.message);
    }
}
