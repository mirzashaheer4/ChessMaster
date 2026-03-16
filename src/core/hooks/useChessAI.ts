import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/game';
import { Chess } from 'chess.js';

export const useChessAI = () => {
  const workerRef = useRef<Worker | null>(null);
  const isAIThinkingRef = useRef(false); // Track if AI is actually calculating a move
  const { game, difficulty, mode, playerColor, customBot, fen, reviewIndex } = useGameStore();

  // Initialize Stockfish worker for BOTH modes (AI plays moves, Local just evaluates)
  useEffect(() => {
    const worker = new Worker('/stockfish.js');
    workerRef.current = worker;

    worker.postMessage('uci');

    worker.onmessage = (e) => {
      const message = e.data;
      
      // Get fresh state each time (avoid stale closures)
      const store = useGameStore.getState();
      
      // Only make a move if AI mode AND was actually thinking (not just evaluating)
      if (message.startsWith('bestmove') && isAIThinkingRef.current && store.mode === 'ai') {
         isAIThinkingRef.current = false; // Reset flag
         const moveString = message.split(' ')[1];
         if (moveString && moveString !== '(none)') {
           const from = moveString.substring(0, 2);
           const to = moveString.substring(2, 4);
           const promotion = moveString.length > 4 ? moveString.substring(4, 5) : undefined;
           
           // Safety check - only make move if game is still active
           if (!store.game.isGameOver()) {
             store.makeMove({ from, to, promotion });
             
             // Execute premove immediately if one is queued
             // We remove the timeout to prevent race conditions where state changes in between
             const latestStore = useGameStore.getState();
             if (latestStore.premoves.length > 0 && !latestStore.game.isGameOver()) {
               latestStore.executePremove();
             }
           }
        }
      }

      // Always update evaluation from info messages (for both modes)
      if (message.startsWith('info')) {
        let rawScore: number | null = null;
        let isMate = false;

        if (message.includes('score mate')) {
          const match = message.match(/score mate (-?\d+)/);
          if (match) {
            rawScore = parseInt(match[1]);
            isMate = true;
          }
        } else if (message.includes('score cp')) {
          const match = message.match(/score cp (-?\d+)/);
          if (match) {
            rawScore = parseInt(match[1]);
          }
        }

        if (rawScore !== null) {
          const latestStore = useGameStore.getState();
          
          // Determine the turn of the position being analyzed
          // Derive directly from FEN to avoid creating temp Chess instances on each info msg
          let analyzedTurn: 'w' | 'b' = latestStore.game.turn();
          if (latestStore.reviewIndex === -2) {
            // Start position — always white to move
            analyzedTurn = 'w';
          } else if (latestStore.reviewIndex >= 0 && latestStore.history.length > 0) {
            // In review mode, derive turn from FEN of the reviewed position
            // The eval effect already set up the correct FEN — extract turn from it
            analyzedTurn = (latestStore.reviewIndex % 2 === 0) ? 'b' : 'w';
          }
          
          let evalScore = 0;
          let mateInScore: number | null = null;

          if (isMate) {
            // positive = side to move mates, negative = side to move gets mated
            mateInScore = analyzedTurn === 'w' ? rawScore : -rawScore;
            evalScore = mateInScore > 0 ? 10000 : -10000; // Peg the bar
          } else {
            evalScore = analyzedTurn === 'w' ? rawScore : -rawScore;
          }
          
          latestStore.setEvaluation(evalScore, mateInScore);
        }
      }
    };

    return () => worker.terminate();
  }, []); // Initialize once, not dependent on mode

  // Trigger AI move when it's AI's turn (AI mode only)
  useEffect(() => {
    if (mode !== 'ai' || !workerRef.current) return;
    
    // Safety check - don't trigger if game is over
    if (game.isGameOver()) return;

    const currentTurn = game.turn(); // 'w' or 'b'
    
    // Determine if it's AI's turn
    const isAITurn = (playerColor === 'white' && currentTurn === 'b') || 
                     (playerColor === 'black' && currentTurn === 'w') ||
                     (playerColor === null && currentTurn === 'b');

    if (isAITurn) {
      // Small delay for better UX and to prevent race conditions
      const timer = setTimeout(() => {
        if (!workerRef.current) return;

        const currentDifficulty = difficulty || 'easy';
        
        // Dramatically reduced difficulty levels
        const levels: Record<string, { depth: number; skillLevel: number; time: number }> = {
          'easy': { 
            depth: 1,        // Very shallow search
            skillLevel: 0,   // Min skill
            time: 50         // Fast response
          },
          'medium': { 
            depth: 5, 
            skillLevel: 5,
            time: 500 
          },
          'hard': { 
            depth: 10,       // Deeper search
            skillLevel: 10,
            time: 1200 
          },
          'extreme': { 
            depth: 15,       // Deeper search
            skillLevel: 20,  // Max skill
            time: 2000       // Max thinking time
          },
          'custom': {
             depth: 10,
             skillLevel: 10,
             time: 1000
          }
        };

        const config = levels[currentDifficulty];
        
        isAIThinkingRef.current = true; // Set flag CAREFULLY

        // Send position BEFORE setting options/go to ensure engine maps moves correctly
        // For Chess960, we MUST use startFen + moves (LAN) to preserve castling rights
        // game.fen() loses rights if we use displayFen
        const { chessType, startFen, historyLan } = useGameStore.getState();
        
        if (chessType === 'chess960') {
           workerRef.current.postMessage('setoption name UCI_Chess960 value true');
           // CLEAN INPUT: Filter out any potential bad values
           const movesStr = historyLan.filter(m => m && m.length >= 4).join(' ');
           workerRef.current.postMessage(`position fen ${startFen} moves ${movesStr}`);
        } else {
           workerRef.current.postMessage('setoption name UCI_Chess960 value false');
           const fenString = game.fen();
           workerRef.current.postMessage(`position fen ${fenString}`);
        }

        // CUSTOM BOT LOGIC
        if (currentDifficulty === 'custom' && customBot) {
           const { elo, playStyle } = customBot;
           
           // Map Elo to Skill Level (approximate)
           const skill = Math.max(0, Math.min(20, Math.floor((elo - 1000) / 100)));
           const depth = Math.max(1, Math.min(20, Math.floor(elo / 150)));
           
           workerRef.current.postMessage(`setoption name Skill Level value ${skill}`);
           workerRef.current.postMessage(`setoption name UCI_LimitStrength value true`);
           workerRef.current.postMessage(`setoption name UCI_Elo value ${elo}`);

           // Personality / Play Style
           // Contempt: Positive = Optimistic/Aggressive (avoids draws), Negative = Pessimistic/Defensive (accepts draws)
           let contempt = 0;
           if (playStyle === 'aggressive') contempt = 20;
           else if (playStyle === 'defensive') contempt = -20;
           
           workerRef.current.postMessage(`setoption name Contempt value ${contempt}`);
           
           workerRef.current.postMessage(`go depth ${depth} movetime ${Math.min(2000, elo)}`);
        } else {
           workerRef.current.postMessage(`setoption name Skill Level value ${config.skillLevel}`);
           workerRef.current.postMessage(`setoption name UCI_LimitStrength value false`); 
           workerRef.current.postMessage(`go depth ${config.depth} movetime ${config.time}`);
        }
      }, 500 + Math.random() * 500); // Add randomness to delay

      return () => clearTimeout(timer);
    }
  }, [game, difficulty, mode, playerColor, customBot, fen]); // Re-run when these change, especially FEN

  // 🚨 UI EVALUATION SYSTEM LOCK:
  // Stockfish must evaluate historical FEN dynamically when reviewIndex !== -1 (any review state).
  // Do not revert this payload effect to blindly evaluate the live `game.fen()` during review processes!
  // Trigger real-time evaluation for the Eval Bar (runs constantly in local, or during historical review/game over paths)
  useEffect(() => {
    if (!workerRef.current) return;

    // We run lightweight evaluation IF:
    // 1. We are in local mode
    // 2. OR we are in ANY review state (reviewIndex !== -1, includes -2 for start position)
    // 3. OR the active game ended
    const isInReview = reviewIndex !== -1;
    const shouldEvaluate = mode === 'local' || isInReview || game.isGameOver();
    if (!shouldEvaluate) return;

    // Don't conflict with AI actively thinking for a move
    if (isAIThinkingRef.current) return;

    const timer = setTimeout(() => {
      if (!workerRef.current) return;

      const { chessType, startFen, historyLan, history, reviewIndex: currentReview } = useGameStore.getState();

      let targetFen = game.fen();
      let targetMovesStr = '';

      if (currentReview === -2) {
        // Start position — evaluate the initial board
        if (chessType === 'chess960') {
          targetMovesStr = ''; // No moves yet
        } else {
          targetFen = startFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        }
      } else if (currentReview >= 0 && history.length > 0) {
        // Mid-game review position
        if (chessType === 'chess960') {
          targetMovesStr = historyLan.slice(0, currentReview + 1).filter(m => m && m.length >= 4).join(' ');
        } else {
          const tempGame = new Chess();
          for (let i = 0; i <= currentReview && i < history.length; i++) {
            try { tempGame.move(history[i]); } catch { break; }
          }
          targetFen = tempGame.fen();
        }
      } else {
        // Live position (reviewIndex === -1 or no history)
        if (chessType === 'chess960') {
          targetMovesStr = historyLan.filter(m => m && m.length >= 4).join(' ');
        }
      }

      if (chessType === 'chess960') {
        workerRef.current.postMessage('setoption name UCI_Chess960 value true');
        workerRef.current.postMessage(`position fen ${startFen} moves ${targetMovesStr}`);
      } else {
        workerRef.current.postMessage('setoption name UCI_Chess960 value false');
        workerRef.current.postMessage(`position fen ${targetFen}`);
      }

      // Evaluate at depth 16 for more accurate review analysis
      workerRef.current.postMessage('go depth 16');
    }, 150);

    return () => clearTimeout(timer);
  }, [mode, fen, game, reviewIndex]);
};
