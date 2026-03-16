import { Chess } from 'chess.js';

export type MoveClassification = 'great' | 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder' | 'missed_win';

export interface MoveAnalysis {
  moveNumber: number;
  move: string; // SAN notation
  fen: string; // position after move
  classification: MoveClassification;
  evalBefore: number; // centipawns
  mateBefore?: number | null;
  evalAfter: number;
  mateAfter?: number | null;
  evalLoss: number;
  bestMove?: string;
  explanation: string;
  alternatives?: Array<{ move: string; eval: number }>;
}

export interface AnalysisConfig {
  depth: number;
  multiPV: number;
}

// ─── Piece values for sacrifice detection ───
const PIECE_VALUES: Record<string, number> = {
  p: 100, n: 320, b: 330, r: 500, q: 900, k: 0,
};

/**
 * Classify a move based on centipawn loss and position context.
 * Priority order: missed_win → brilliant → great → standard thresholds.
 *
 * @param evalLoss      – Centipawn loss (topMoveCp − evalAfter, player's POV, ≥ 0)
 * @param evalBefore    – Eval before the move (player's POV, sign-aware)
 * @param evalAfter     – Eval after the move (player's POV, sign-aware)
 * @param topMoves      – Engine's top N moves with evaluations
 * @param moveSan       – The move in SAN notation
 * @param fenBefore     – FEN before the move was made
 * @param mateBefore    – Mate-in-N before the move (null = no forced mate)
 * @param mateAfter     – Mate-in-N after the move (null = no forced mate)
 */
export function classifyMove(
  evalLoss: number,
  evalBefore: number,
  evalAfter: number,
  topMoves: Array<{ move: string; eval: number }>,
  moveSan: string,
  fenBefore: string,
  mateBefore: number | null | undefined,
  mateAfter: number | null | undefined,
): MoveClassification {
  // ── Priority 1: MISSED WIN ──
  // Player had a forced mate but played a move that lost it
  if (mateBefore !== null && mateBefore !== undefined && mateBefore > 0 && (mateAfter === null || mateAfter === undefined)) {
    return 'missed_win';
  }

  // ── Pre-compute sacrifice material diff ──
  const materialDiff = getMaterialDiff(moveSan, fenBefore);

  // ── Priority 2: GREAT ──
  // Sacrifice: gave up ≥ 150cp material but evalLoss ≤ 10
  if (evalLoss <= 10 && materialDiff >= 150) return 'great';
  // Only move: top move is 200cp+ better than #2 and player found it
  if (evalLoss <= 10 && topMoves.length >= 2 && (topMoves[0].eval - topMoves[1].eval) >= 200) return 'great';
  // Eval swing: player's position improved by ≥ 100cp
  const evalGain = evalAfter - evalBefore;
  if (evalGain >= 100) return 'great';
  // Defensive sacrifice: gave up ≥ 150cp material but evalLoss ≤ 5
  if (materialDiff >= 150 && evalLoss <= 5) return 'great';

  // ── Priority 4: Standard centipawn-loss thresholds ──
  if (evalLoss <= 10) return 'best';
  if (evalLoss <= 20) return 'good';
  if (evalLoss <= 50) return 'inaccuracy';
  if (evalLoss <= 150) return 'mistake';
  return 'blunder';
}

/**
 * Returns the material difference when a capture is made.
 * Positive value means the attacker sacrificed material (attacker worth > captured).
 * Returns 0 for non-captures.
 */
function getMaterialDiff(moveSan: string, fenBefore: string): number {
  if (!moveSan.includes('x')) return 0;

  try {
    const game = new Chess(fenBefore);
    const targetSquareMatch = moveSan.match(/x([a-h][1-8])/);
    if (!targetSquareMatch) return 0;

    const targetSquare = targetSquareMatch[1] as any;
    const capturedPiece = game.get(targetSquare);
    if (!capturedPiece) return 0;

    const attackerType = getAttackerType(moveSan);
    if (!attackerType) return 0;

    const attackerValue = PIECE_VALUES[attackerType] || 0;
    const capturedValue = PIECE_VALUES[capturedPiece.type] || 0;

    return Math.max(0, attackerValue - capturedValue);
  } catch {
    return 0;
  }
}

/** Extract the attacking piece type from SAN notation */
function getAttackerType(san: string): string | null {
  const cleaned = san.replace(/[+#!?]/g, '');
  const firstChar = cleaned[0];
  if (firstChar === firstChar.toUpperCase() && /[KQRBN]/.test(firstChar)) {
    return firstChar.toLowerCase();
  }
  return 'p'; // pawn move
}

/**
 * Generate a human-readable explanation for a classified move.
 */
function generateExplanation(
  classification: MoveClassification,
  moveSan: string,
  evalLoss: number,
  bestMove?: string,
): string {
  switch (classification) {
    case 'great':
      return `${moveSan} is an excellent move that significantly improves the position.`;
    case 'best':
      return `${moveSan} is the best move in this position.`;
    case 'good':
      return `${moveSan} is a solid move. A slight improvement was available.`;
    case 'inaccuracy':
      return `${moveSan} is an inaccuracy (${evalLoss}cp loss).${bestMove ? ` Better was ${bestMove}.` : ''}`;
    case 'mistake':
      return `${moveSan} is a mistake (${evalLoss}cp loss).${bestMove ? ` ${bestMove} was much stronger.` : ''}`;
    case 'blunder':
      return `${moveSan} is a blunder! (${evalLoss}cp loss).${bestMove ? ` ${bestMove} was critical.` : ''}`;
    case 'missed_win':
      return `${moveSan} missed a forced checkmate!${bestMove ? ` ${bestMove} was winning.` : ''}`;
    default:
      return `${moveSan}`;
  }
}

/**
 * Analyzes a chess game using Stockfish.
 * Returns move-by-move analysis with real classifications.
 */
export class AnalysisEngine {
  private worker: Worker | null = null;
  private config: AnalysisConfig;
  private resolveMessage: ((message: string) => void) | null = null;

  constructor(config: AnalysisConfig = { depth: 14, multiPV: 3 }) {
    this.config = config;
  }

  /**
   * Initialize Stockfish worker
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.worker = new Worker('/stockfish.js');

        this.worker.onmessage = (e) => {
          const message = e.data as string;
          if (this.resolveMessage) {
            this.resolveMessage(message);
          }
        };

        this.worker.onerror = () => {
          reject(new Error('Stockfish worker failed to load'));
        };

        this.worker.postMessage('uci');

        // Wait for readiness
        setTimeout(() => {
          this.waitForResponse('readyok', 'isready').then(() => resolve());
        }, 100);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Send a UCI command and wait for a specific response token.
   */
  private waitForResponse(token: string, command?: string): Promise<string> {
    return new Promise((resolve) => {
      if (!this.worker) { resolve(''); return; }

      const handler = (msg: string) => {
        if (typeof msg === 'string' && msg.includes(token)) {
          resolve(msg);
        } else {
          // keep listening
          this.resolveMessage = handler;
        }
      };
      this.resolveMessage = handler;

      if (command) {
        this.worker.postMessage(command);
      }
    });
  }

  /**
   * Analyze a single position.
   * Collects ALL info messages during the search, then resolves on bestmove.
   * Handles terminal positions (checkmate/stalemate).
   * @param searchMoves  Optional UCI move(s) to restrict search to (e.g. "e2e4")
   */
  async analyzePosition(fen: string, searchMoves?: string): Promise<{
    eval: number;
    mateIn: number | null;
    bestMove: string;
    topMoves: Array<{ move: string; eval: number }>;
  }> {
    if (!this.worker) await this.init();

    // Check if the position is terminal BEFORE sending to Stockfish
    try {
      const testGame = new Chess(fen);
      if (testGame.isGameOver()) {
        // Terminal position — return appropriate eval without calling Stockfish
        if (testGame.isCheckmate()) {
          // Side to move is checkmated → they lost
          const isWhiteTurn = fen.split(' ')[1] === 'w';
          return {
            eval: isWhiteTurn ? -10000 : 10000,
            mateIn: 0,
            bestMove: '',
            topMoves: [],
          };
        }
        // Stalemate or draw
        return { eval: 0, mateIn: null, bestMove: '', topMoves: [] };
      }
    } catch {
      // If FEN is invalid, proceed anyway and let Stockfish handle it
    }

    // Stop any previous search
    this.worker!.postMessage('stop');
    // Wait for engine to be ready
    await this.waitForResponse('readyok', 'isready');

    return new Promise((resolve) => {
      const isWhiteTurn = fen.split(' ')[1] === 'w';
      const topMoves: Array<{ move: string; eval: number }> = [];
      let bestMoveStr = '';
      let evalScore = 0;
      let bestMateIn: number | null = null;

      // Safety timeout — if Stockfish doesn't respond in 8s, resolve with what we have
      const timeout = setTimeout(() => {
        resolve({ eval: evalScore, mateIn: bestMateIn, bestMove: bestMoveStr, topMoves });
      }, 8000);

      const handler = (message: string) => {
        if (typeof message !== 'string') {
          this.resolveMessage = handler;
          return;
        }

        // Parse evaluation from info lines
        if (message.includes('info') && message.includes('score')) {
          const depthMatch = message.match(/depth (\d+)/);
          const depth = depthMatch ? parseInt(depthMatch[1]) : 0;

          if (depth >= 4) {
            const pvMatch = message.match(/multipv (\d+)/);
            const pvNumber = pvMatch ? parseInt(pvMatch[1]) : 1;

            const moveMatch = message.match(/pv ([a-h][1-8][a-h][1-8][qrbn]?)/);
            const move = moveMatch ? moveMatch[1] : '';

            let score = 0;
            let mateIn: number | null = null;

            if (message.includes('score mate')) {
              const mateMatch = message.match(/score mate (-?\d+)/);
              if (mateMatch) {
                mateIn = parseInt(mateMatch[1]);
                if (!isWhiteTurn) mateIn = -mateIn;
                score = mateIn > 0 ? 10000 : -10000;
              }
            } else if (message.includes('score cp')) {
              const cpMatch = message.match(/score cp (-?\d+)/);
              if (cpMatch) {
                score = parseInt(cpMatch[1]);
                if (!isWhiteTurn) score = -score;
              }
            }

            if (pvNumber === 1) {
              bestMoveStr = move;
              evalScore = score;
              bestMateIn = mateIn;
            }

            if (move && pvNumber <= this.config.multiPV) {
              topMoves[pvNumber - 1] = { move, eval: score };
            }
          }
        }

        // When analysis is complete
        if (message.startsWith('bestmove')) {
          clearTimeout(timeout);
          if (!bestMoveStr) {
            const parts = message.split(' ');
            if (parts[1] && parts[1] !== '(none)') {
              bestMoveStr = parts[1];
            }
          }
          resolve({ eval: evalScore, mateIn: bestMateIn, bestMove: bestMoveStr, topMoves });
        } else {
          this.resolveMessage = handler;
        }
      };

      this.resolveMessage = handler;

      this.worker!.postMessage(`setoption name MultiPV value ${searchMoves ? 1 : this.config.multiPV}`);
      this.worker!.postMessage(`position fen ${fen}`);
      this.worker!.postMessage(searchMoves
        ? `go depth ${this.config.depth} searchmoves ${searchMoves}`
        : `go depth ${this.config.depth}`
      );
    });
  }

  /**
   * Analyze an entire game move-by-move.
   * Analyzes ALL moves (both sides) so accuracy is available for both players.
   *
   * OPTIMISATION: Caches the "before" eval of move N+1 as the "after" eval of move N,
   * cutting the number of Stockfish calls roughly in half.
   *
   * @param history          – Array of SAN moves
   * @param onProgress       – Fired after each move with (current, total)
   * @param onMoveAnalyzed   – Fired after each move with the cumulative analysis array
   */
  async analyzeGame(
    history: string[],
    onProgress?: (current: number, total: number) => void,
    onMoveAnalyzed?: (analyses: MoveAnalysis[]) => void,
  ): Promise<MoveAnalysis[]> {
    if (!this.worker) await this.init();

    const game = new Chess();
    const analyses: MoveAnalysis[] = [];

    // Cache: start position eval
    let cachedEval = await this.analyzePosition(game.fen());

    for (let i = 0; i < history.length; i++) {
      const moveSan = history[i];
      const fenBefore = game.fen();
      const isWhite = i % 2 === 0;

      // 1. Use CACHED eval as the "before" analysis
      const beforeAnalysis = cachedEval;

      // 2. Make the move and extract its UCI notation for topMoves matching
      let moveResult;
      try {
        moveResult = game.move(moveSan);
      } catch {
        if (onProgress) onProgress(i + 1, history.length);
        continue;
      }

      const playedUci = moveResult.from + moveResult.to + (moveResult.promotion || '');
      const fenAfter = game.fen();

      // 3. Analyze the position AFTER the move (always needed for cache + display)
      cachedEval = await this.analyzePosition(fenAfter);
      const afterAnalysis = cachedEval;

      // 4. Evals normalised to White's POV
      const evalBefore = beforeAnalysis.eval;
      const mateBefore = beforeAnalysis.mateIn;
      const evalAfterWhitePov = afterAnalysis.eval;
      const mateAfter = afterAnalysis.mateIn;

      // 5. Compute evalLoss using SAME-POSITION comparison
      //    This avoids the "horizon effect" from cross-position eval bouncing.
      let evalLoss: number;

      if (playedUci === beforeAnalysis.bestMove) {
        // Player played the engine's #1 move — perfect, no loss
        evalLoss = 0;
      } else {
        // Get the exact eval of the played move from the SAME position
        // using Stockfish's searchmoves restriction
        const playedMoveAnalysis = await this.analyzePosition(fenBefore, playedUci);
        const bestEval = beforeAnalysis.eval;       // White's POV
        const playedEval = playedMoveAnalysis.eval;  // White's POV

        if (isWhite) {
          evalLoss = bestEval - playedEval;
        } else {
          evalLoss = playedEval - bestEval;
        }
      }
      evalLoss = Math.max(0, evalLoss);

      // 6. Convert UCI best move to SAN
      let bestMoveSan = beforeAnalysis.bestMove;
      try {
        const tempGame = new Chess(fenBefore);
        const uciMove = beforeAnalysis.bestMove;
        if (uciMove && uciMove.length >= 4) {
          const from = uciMove.substring(0, 2);
          const to = uciMove.substring(2, 4);
          const promotion = uciMove.length > 4 ? uciMove.substring(4, 5) : undefined;
          const result = tempGame.move({ from, to, promotion });
          if (result) bestMoveSan = result.san;
        }
      } catch {
        // Keep UCI notation as fallback
      }

      // 7. Classify the move (pass mate info for missed_win detection)
      // mateBefore from player's POV: positive = player has a forced mate
      const mateBeforePlayerPov = mateBefore !== null && mateBefore !== undefined
        ? (isWhite ? mateBefore : -mateBefore)
        : null;
      const mateAfterPlayerPov = mateAfter !== null && mateAfter !== undefined
        ? (isWhite ? mateAfter : -mateAfter)
        : null;

      const classification = classifyMove(
        evalLoss,
        isWhite ? evalBefore : -evalBefore,
        isWhite ? evalAfterWhitePov : -evalAfterWhitePov,
        beforeAnalysis.topMoves,
        moveSan,
        fenBefore,
        mateBeforePlayerPov,
        mateAfterPlayerPov,
      );

      // 8. Generate explanation
      const explanation = generateExplanation(classification, moveSan, Math.round(evalLoss), bestMoveSan);

      analyses.push({
        moveNumber: Math.floor(i / 2) + 1,
        move: moveSan,
        fen: fenAfter,
        classification,
        evalBefore,
        mateBefore,
        evalAfter: evalAfterWhitePov,
        mateAfter: mateAfter,
        evalLoss: Math.round(evalLoss),
        bestMove: bestMoveSan,
        explanation,
        alternatives: beforeAnalysis.topMoves,
      });

      // Report progress + stream partial results
      if (onProgress) onProgress(i + 1, history.length);
      if (onMoveAnalyzed) onMoveAnalyzed([...analyses]);
    }

    return analyses;
  }

  /**
   * Clean up resources
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.resolveMessage = null;
  }
}
