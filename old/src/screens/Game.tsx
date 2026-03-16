import React, { useEffect, useState } from 'react';
import { Board } from '../components/Board';
import { useGameStore } from '../store/game';
import { motion } from 'framer-motion';
import { useChessAI } from '../hooks/useChessAI';
import { audio } from '../lib/audio';
import GameOverModal from '../components/GameOverModal';
import { CapturedPieces } from '../components/CapturedPieces';
import ChessClock from '../components/ChessClock';

interface GameScreenProps {
  onBack: () => void;
}

const GameScreen: React.FC<GameScreenProps> = ({ onBack }) => {
  const store = useGameStore();
  const { mode, difficulty, resetGame, gameStatus, history, reviewIndex, startReview, nextMove, prevMove, fen, evaluation, game, playerColor, flipBoard, onMoveMade, whiteTime, blackTime, timeControl, pauseClock, setGameStatus } = store;
  
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [gameStats, setGameStats] = useState({ mistakes: 0, blunders: 0, missedWins: 0, accuracy: 100 });
  const [showEvalBar, setShowEvalBar] = useState(true); // Toggle for eval bar visibility
  
  useChessAI();

  // Procedural Sound Effects
  useEffect(() => {
    // We only play sounds for the LATEST move if we are NOT reviewing history
    if (reviewIndex !== -1) return;
    if (history.length === 0) return;

    // Get last move flag
    const historyVerbose = game.history({ verbose: true });
    const lastMove = historyVerbose[historyVerbose.length - 1];
    
    if (!lastMove) return;

    // Check for checkmate/check first
    if (game.isCheckmate() || game.isCheck()) {
       audio.playCheck();
    } else if (lastMove.flags.includes('c') || lastMove.flags.includes('e')) {
       audio.playCapture();
    } else {
       audio.playMove();
    }
  }, [fen, history.length, game, reviewIndex]);

  useEffect(() => {
    resetGame();
  }, []);

  // Call onMoveMade after each move to handle clock increment
  // Also execute any queued premove (for local mode)
  useEffect(() => {
    if (history.length > 0 && reviewIndex === -1) {
      onMoveMade();
    }
  }, [history.length, reviewIndex, onMoveMade]);

  // Track if timeout was already handled to prevent multiple triggers
  const [timeoutHandled, setTimeoutHandled] = useState(false);

  // Detect timeout (time ran out)
  useEffect(() => {
    if (!timeControl || gameStatus !== 'active' || timeoutHandled) return;
    
    if (whiteTime <= 0) {
      setTimeoutHandled(true);
      pauseClock();
      setGameStatus('timeout');
      // White loses on time
      // In local mode, just say "White flagged"
      // In AI mode, determine if player won or lost
      const result = mode === 'local' 
        ? 'loss' // In local, current player (white) lost
        : playerColor === 'white' ? 'loss' : 'win';
      store.saveGame(result);
      // Auto-start review mode after a short delay
      setTimeout(() => {
        startReview();
        setShowGameOverModal(true);
      }, 300);
    } else if (blackTime <= 0) {
      setTimeoutHandled(true);
      pauseClock();
      setGameStatus('timeout');
      // Black loses on time
      const result = mode === 'local'
        ? 'win' // In local, white wins
        : playerColor === 'black' ? 'loss' : 'win';
      store.saveGame(result);
      // Auto-start review mode after a short delay
      setTimeout(() => {
        startReview();
        setShowGameOverModal(true);
      }, 300);
    }
  }, [whiteTime, blackTime, timeControl, gameStatus, pauseClock, playerColor, store, mode, timeoutHandled, setGameStatus, startReview]);

  // Reset timeout handled state when game resets
  useEffect(() => {
    if (gameStatus === 'active' && history.length === 0) {
      setTimeoutHandled(false);
    }
  }, [gameStatus, history.length]);

  // Analyze game after it ends
  // NOTE: Full Stockfish analysis is disabled due to performance issues
  // Just return basic stats for now
  const analyzeFinishedGame = async () => {
    // Skip analysis for local mode
    if (mode !== 'ai') return null;
    
    // For now, return quick placeholder stats instead of full analysis
    // (Full analysis at depth 15 takes too long and can hang)
    const moveCount = history.length;
    
    // Simple heuristic-based stats (not real Stockfish analysis)
    const stats = {
      mistakes: Math.floor(moveCount / 10),
      blunders: Math.floor(moveCount / 20),
      missedWins: Math.floor(moveCount / 15),
      accuracy: Math.max(70, 100 - Math.floor(moveCount / 3))
    };
    
    setGameStats(stats);
    return { analyses: [], stats };
  };

  // Auto-save game on checkmate
  useEffect(() => {
    if (gameStatus === 'checkmate' && history.length > 0) {
      const { saveGame } = store;
      
      // Determine result based on whose turn it is (opposite player won)
      const currentTurn = game.turn();
      let result: 'win' | 'loss' | 'draw';
      
      if (mode === 'ai') {
        // AI plays opposite color
        const aiColor = playerColor === 'white' ? 'b' : 'w';
        result = currentTurn === aiColor ? 'win' : 'loss';
      } else {
        // In local mode, we'll just mark based on turn
        result = currentTurn === 'w' ? 'loss' : 'win';
      }
      
      // Only save once per game
      const lastSaved = store.pastGames[0];
      const currentPgn = game.pgn();
      
      if (!lastSaved || lastSaved.pgn !== currentPgn) {
        // Run analysis first, then save
        analyzeFinishedGame().then((analysisResult) => {
          saveGame(
            result,
            analysisResult?.analyses,
            analysisResult?.stats
          );
          // Show modal after analysis
          setTimeout(() => setShowGameOverModal(true), 500);
        });
      }
    }
    
    // Also handle draw
    if (gameStatus === 'draw' && history.length > 0) {
      const { saveGame } = store;
      const lastSaved = store.pastGames[0];
      const currentPgn = game.pgn();
      
      if (!lastSaved || lastSaved.pgn !== currentPgn) {
        analyzeFinishedGame().then((analysisResult) => {
          saveGame(
            'draw',
            analysisResult?.analyses,
            analysisResult?.stats
          );
          setTimeout(() => setShowGameOverModal(true), 500);
        });
      }
    }
  }, [gameStatus, history.length, mode, game, store, playerColor]);

  const getGameResult = (): 'win' | 'loss' | 'draw' => {
    if (gameStatus === 'draw') return 'draw';
    const currentTurn = game.turn();
    if (mode === 'ai') {
      const aiColor = playerColor === 'white' ? 'b' : 'w';
      return currentTurn === aiColor ? 'win' : 'loss';
    }
    return currentTurn === 'w' ? 'loss' : 'win';
  };

  const getGameReason = (): string => {
    if (gameStatus === 'checkmate') return 'by checkmate';
    if (gameStatus === 'timeout') return 'on time';
    if (gameStatus === 'draw') {
      if (game.isStalemate()) return 'by stalemate';
      if (game.isThreefoldRepetition()) return 'by repetition';
      if (game.isInsufficientMaterial()) return 'insufficient material';
      return 'by agreement';
    }
    return '';
  };

  const handleGameReview = () => {
    setShowGameOverModal(false);
    // Start review mode - board will show starting position and arrows will work
    startReview();
  };

  const handleRematch = () => {
    setShowGameOverModal(false);
    resetGame();
  };

  const handleNewGame = () => {
    setShowGameOverModal(false);
    onBack();
  };

  return (
    <div className="w-full h-full flex flex-col md:flex-row items-center justify-center p-4 gap-8 cinematic-fade">
      {/* Game Over Modal */}
      <GameOverModal
        isOpen={showGameOverModal}
        result={getGameResult()}
        reason={getGameReason()}
        stats={gameStats}
        onGameReview={handleGameReview}
        onRematch={handleRematch}
        onNewGame={handleNewGame}
        onClose={() => setShowGameOverModal(false)}
      />
      
      {/* Left Panel: Info */}
      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        className="hidden md:flex flex-col w-64 h-[600px] glass-panel p-6"
      >
        <div className="mb-8">
          <h2 className="text-[10px] font-bold text-[#D4AF37] mb-4 uppercase tracking-[0.4em]">Opponent</h2>
          <div className="flex items-center gap-4 mt-4">
             <div className="w-14 h-14 rounded-full border-2 border-[#D4AF37]/20 bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] flex items-center justify-center text-xl text-white shadow-[0_4px_20px_rgba(212,175,55,0.15)]">
               {mode === 'ai' ? '🤖' : '👤'}
             </div>
             <div>
               <p className="font-bold text-white text-base tracking-tight">{mode === 'ai' ? 'Stockfish 16' : 'Local Player'}</p>
               <p className="text-[10px] text-[#C9A961] uppercase tracking-[0.3em] font-semibold">{mode === 'ai' ? difficulty : 'Human'}</p>
             </div>
          </div>
          {/* Captured pieces by opponent (black pieces captured by white if we are white) */}
          <CapturedPieces color={playerColor === 'white' ? 'white' : 'black'} className="mt-2" />
        </div>

        {/* Evaluation Bar & Material - with toggle */}
        <div className="flex flex-col gap-2 mb-8">
            <div className="flex justify-between items-center text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-semibold">
                <span>Advantage</span>
                <div className="flex items-center gap-2">
                  <span className={evaluation > 0 ? 'text-[#D4AF37]' : evaluation < 0 ? 'text-zinc-400' : 'text-zinc-500'}>
                      {showEvalBar ? (evaluation > 0 ? `+${(evaluation/100).toFixed(1)}` : evaluation < 0 ? `${(evaluation/100).toFixed(1)}` : '0.0') : '---'}
                  </span>
                  <button 
                    onClick={() => setShowEvalBar(!showEvalBar)}
                    className="text-zinc-500 hover:text-[#D4AF37] transition-colors"
                    title={showEvalBar ? 'Hide Eval Bar' : 'Show Eval Bar'}
                  >
                    {showEvalBar ? '👁' : '👁‍🗨'}
                  </button>
                </div>
            </div>
            {showEvalBar && (
              <div className="h-2 w-full bg-gradient-to-r from-black via-zinc-900 to-black rounded-full overflow-hidden relative border border-[#D4AF37]/10">
                   <div 
                     className={`absolute top-0 bottom-0 transition-all duration-1000 ease-out ${evaluation > 0 ? 'bg-gradient-to-r from-[#D4AF37] to-[#C9A961]' : 'bg-gradient-to-l from-zinc-600 to-zinc-700'}`}
                     style={{ 
                       width: `${Math.min(50, Math.abs(evaluation) / 20)}%`,
                       left: evaluation > 0 ? '50%' : undefined,
                       right: evaluation < 0 ? '50%' : undefined,
                       boxShadow: evaluation > 0 ? '0 0 10px rgba(212, 175, 55, 0.4)' : 'none'
                     }} 
                   />
                   <div className="absolute top-0 bottom-0 left-1/2 w-px bg-[#D4AF37]/30" />
              </div>
            )}
        </div>

        {/* Game Status / Review Controls */}
        <div className="mt-auto">
            {gameStatus === 'checkmate' && (
                <div className="mb-6 p-6 rounded-2xl relative overflow-hidden" style={{
                    background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.05) 0%, rgba(201, 169, 97, 0.02) 100%)',
                    border: '1px solid rgba(212, 175, 55, 0.15)',
                    boxShadow: '0 4px 20px rgba(212, 175, 55, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.03)'
                }}>
                    <h3 className="text-2xl font-black text-[#D4AF37] tracking-[0.25em] mb-2 uppercase">Checkmate</h3>
                    <p className="text-[#C9A961] text-[10px] uppercase tracking-[0.4em] font-semibold mb-4">Victory Secured</p>
                    
                    {reviewIndex === -1 && (
                        <button onClick={startReview} className="btn-secondary w-full">
                            Review Analysis
                        </button>
                    )}
                </div>
            )}
            
            {(gameStatus !== 'active' || reviewIndex !== -1) && (
                <div className="flex justify-between items-center bg-gradient-to-r from-[#1a1a1a] to-[#0f0f0f] border border-[#D4AF37]/10 p-3 rounded-xl mb-4">
                    <button onClick={prevMove} className="p-2 hover:bg-[#D4AF37]/10 rounded-lg text-zinc-400 hover:text-[#D4AF37] transition-all duration-200" title="Previous Move">◀</button>
                    <span className="font-mono font-bold text-[#C9A961] text-[10px] tracking-[0.3em] uppercase">
                        {reviewIndex === -1 ? 'Live' : `Move ${Math.floor(reviewIndex/2) + 1}`}
                    </span>
                    <button onClick={nextMove} className="p-2 hover:bg-[#D4AF37]/10 rounded-lg text-zinc-400 hover:text-[#D4AF37] transition-all duration-200" title="Next Move">▶</button>
                </div>
            )}
            
            <button onClick={resetGame} className="w-full mt-4 btn-primary">
                New Game
            </button>
            <button onClick={onBack} className="w-full mt-3 text-zinc-500 hover:text-[#D4AF37] text-[10px] uppercase tracking-[0.3em] transition-colors py-3 font-semibold">
                Exit to Menu
            </button>
        </div>

      </motion.div>

      {/* Center: Board with Clocks */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex items-center gap-4"
      >
        <Board />
        {/* Chess Clock on the right side of board */}
        <ChessClock className="hidden md:flex" />
      </motion.div>
      
      {/* Flip Board Button - Below the board */}
      <button
        onClick={flipBoard}
        className="absolute bottom-2 left-1/2 -translate-x-1/2 md:hidden flex items-center gap-2 px-4 py-2 bg-black/60 hover:bg-black/80 text-zinc-400 hover:text-[#D4AF37] rounded-full border border-[#D4AF37]/20 transition-all duration-200"
        title="Flip Board"
      >
        <span className="text-lg">↻</span>
        <span className="text-xs uppercase tracking-wider">Flip</span>
      </button>
      
      {/* Right Panel: Moves */}
      <motion.div 
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        className="hidden md:flex flex-col w-64 h-[600px] glass-panel p-6"
      >
         <h2 className="text-[10px] font-bold text-[#D4AF37] mb-4 uppercase tracking-[0.4em]">Move Log</h2>
         <div className="flex-1 overflow-y-auto font-mono text-sm text-zinc-500 custom-scrollbar pr-2">
            <div className="grid grid-cols-[30px_1fr_1fr] gap-x-2">
              {history.map((move, i) => {
                  if (i % 2 === 0) {
                      const moveNum = (i/2) + 1;
                      const isHighlighed = reviewIndex === i || reviewIndex === i+1;
                      
                      return (
                        <div key={i} className={`contents group ${isHighlighed ? 'text-white' : ''}`}>
                           <div className="py-1 text-[#C9A961]/40 text-[9px] tracking-tight pt-1.5 font-semibold">{moveNum < 10 ? `0${moveNum}` : moveNum}</div>
                           <div className={`py-1 pl-2 border-b border-white/5 transition-colors ${reviewIndex === i ? 'text-[#D4AF37] bg-[#D4AF37]/10' : 'text-zinc-400'}`}>{move}</div>
                           <div className={`py-1 pl-2 border-b border-white/5 transition-colors ${reviewIndex === i+1 ? 'text-[#D4AF37] bg-[#D4AF37]/10' : 'text-zinc-400'}`}>{history[i+1] || ''}</div>
                        </div>
                      );
                  }
                  return null;
              })}
            </div>
         </div>
         
         {/* Flip Board Button for Desktop */}
         <button
           onClick={flipBoard}
           className="mt-4 flex items-center justify-center gap-2 w-full py-2 bg-black/40 hover:bg-black/60 text-zinc-400 hover:text-[#D4AF37] rounded-lg border border-[#D4AF37]/20 transition-all duration-200"
           title="Flip Board"
         >
           <span className="text-lg">↻</span>
           <span className="text-xs uppercase tracking-wider">Flip Board</span>
         </button>
      </motion.div>
    </div>
  );
};

export default GameScreen;
