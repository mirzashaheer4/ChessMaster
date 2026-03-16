import { Chess } from 'chess.js';

try {
    const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w AHah - 0 1";
    console.log("Testing FEN:", fen);
    const chess = new Chess(fen);
    console.log("Success! FEN accepted.");
    console.log("Fen output:", chess.fen());
} catch (e) {
    console.error("Error loading FEN:", e);
}
