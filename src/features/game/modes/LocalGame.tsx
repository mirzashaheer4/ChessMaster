import { useEffect, useState, useRef } from 'react';
import { Board } from '../board/Board';
import { ThemeSelection } from '../ui/ThemeSelection';
import { AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../../core/store/game';
import { useGameState, useEval, useReview, useClocks, useSettings, useGameActions } from '../../../core/store/selectors';
import { audio } from '../../../core/audio/audio';
import GameOverModal from '../ui/GameOverModal';
import { CapturedPieces } from '../ui/CapturedPieces';
import ChessClock from '../ui/ChessClock';
import { useChessAI } from '../../../core/hooks/useChessAI';
import { useKeyboardNavigation } from '../../../core/hooks/useKeyboardNavigation';
import { useGameTimer } from '../../../core/hooks/useGameTimer';
import { useGameSave } from '../../../core/hooks/useGameSave';
import { useGameResult } from '../../../core/hooks/useGameResult';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Flag,
  RefreshCw,
  RotateCw,
  Eye,
  EyeOff,
  Crown,
  Swords,
  User,
  Settings,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Local PVP Game Screen — ChessMaster Theme
 * Play against a friend on the same device
 */
const LocalGame = () => {
  const { fen, gameStatus, history, game } = useGameState();
  const { evaluation, mateIn } = useEval();
  const { reviewIndex, startReview } = useReview();
  const { pauseClock } = useClocks();
  const { setBoardFlipped, flipBoard } = useSettings();
  const { resetGame, setGameStatus } = useGameActions();
  
  const navigate = useNavigate();
  useKeyboardNavigation();
  useChessAI();
  useGameTimer();
  
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [timeoutHandled, setTimeoutHandled] = useState(false);
  const [showEvalBar, setShowEvalBar] = useState(true);
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [showThemeSelection, setShowThemeSelection] = useState(false);
  const [showMobileOptions, setShowMobileOptions] = useState(false);
  const mobileMoveListRef = useRef<HTMLDivElement>(null);
  const mobileMoveListEndRef = useRef<HTMLDivElement>(null);

  // Close resign confirm on Escape
  useEffect(() => {
    if (!showResignConfirm) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowResignConfirm(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showResignConfirm]);
  const { saveOnce, getSafePgn, markSaved, resetGuard } = useGameSave();
  const { getGameResult, getGameReason } = useGameResult();



  // Initialize game on mount
  // NOTE: resetGame() is already called by App.tsx's handleStartLocal BEFORE navigating here.
  useEffect(() => { 
    const gs = useGameStore.getState();
    if (gs.gameStatus !== 'active' && gs.history.length > 0) {
      // Game has ended — returning from review. Show final position + popup.
      markSaved();
      gs.startReview();
      setShowGameOverModal(true);
    } else if (gs.history.length === 0) {
      // Fresh game start
      resetGuard();
      useGameStore.getState().setPlayerColor(null as any);
      setBoardFlipped(false);
      audio.playGameStart();
    }
  }, []);



  // Auto-flip board
  useEffect(() => {
    if (gameStatus !== 'active' || reviewIndex !== -1) return;
    setBoardFlipped(game.turn() === 'b');
  }, [fen, gameStatus, reviewIndex, game, setBoardFlipped]);

  // Detect timeout - rely on store logic, just update handled state if needed
  useEffect(() => {
     if (gameStatus === 'timeout' && !timeoutHandled) {
        setTimeoutHandled(true);
     }
  }, [gameStatus, timeoutHandled]);

  useEffect(() => {
    if (gameStatus === 'active' && history.length === 0) setTimeoutHandled(false);
  }, [gameStatus, history.length]);

  // Stats only — real per-move analysis runs lazily in GameReview.
  const analyzeFinishedGame = () => {
    const stats = { mistakes: 0, blunders: 0, missedWins: 0, accuracy: 0 };
    return { analysis: undefined, stats };
  };

  // Handle Game Over Logic (Modal + Sound) - CRITICAL: Only run when gameStatus changes
  useEffect(() => {
    // 1. Checkmate
    if (gameStatus === 'checkmate' && history.length > 0) {
      audio.playGameOver();
      const result = getGameResult();
      const resultCode = result === 'win' ? '1-0' : '0-1';
      
      const generated = analyzeFinishedGame();
      saveOnce(result, generated.analysis, generated.stats, getSafePgn(resultCode));
      setTimeout(() => setShowGameOverModal(true), 500);
    }
    
    // 2. Draw
    if (gameStatus === 'draw' && history.length > 0) {
      audio.playDraw();
      const generated = analyzeFinishedGame();
      saveOnce('draw', generated.analysis, generated.stats, getSafePgn('1/2-1/2'));
      setTimeout(() => setShowGameOverModal(true), 500);
    }

    // 3. Timeout
    if (gameStatus === 'timeout') {
        audio.playGameOver();
        const generated = analyzeFinishedGame();
        saveOnce('loss', generated.analysis, generated.stats); // or win depending on exact mode logic
        setTimeout(() => { 
            startReview(); 
            setShowGameOverModal(true); 
        }, 500);
    }
  }, [gameStatus]);


  const handleResign = () => {
    pauseClock(); 
    setGameStatus('resign');
    // Save game requires the updated status to derive result correctly in next render, 
    // but we need to do it now. The store `setGameStatus` updates immediately, 
    // but the hook uses state from component body. Let's just pass loss manually for resign
    saveOnce('loss');
    audio.playResign();
    setShowResignConfirm(false);
    setTimeout(() => { startReview(); setShowGameOverModal(true); }, 300);
  };

  const handleGameReview = () => { setShowGameOverModal(false); startReview(); useGameStore.getState().saveReviewState(); navigate('/review?source=game'); };
  const handleRematch = () => { setShowGameOverModal(false); resetGame(); audio.playGameStart(); };
  const handleNewGame = () => { setShowGameOverModal(false); navigate('/play'); };

  // === NAVIGATION STATE ===
  const noMoves  = history.length === 0;
  const atStart  = reviewIndex === -2;
  const atLive   = reviewIndex === -1;

  const canPrev    = !noMoves && !atStart;
  const canNext    = !noMoves && !atLive;
  const canGoStart = !noMoves && !atStart;
  const canGoLive  = !noMoves && !atLive;

  const handlePrev = () => { if (canPrev) { useGameStore.getState().clearPremoves(); useGameStore.getState().prevMove(); } };
  const handleNext = () => { if (canNext) useGameStore.getState().nextMove(); };

  const handleGoToStart = () => { 
    if (!canGoStart) return;
    if (atLive) useGameStore.getState().pauseClock();
    useGameStore.getState().setReviewIndex(-2); 
  };
  const handleGoToEnd = () => { if (canGoLive) useGameStore.getState().exitReview(); };

  const navBtnClass = (enabled: boolean) => 
    `w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 ${
      enabled 
        ? 'bg-[#e8b34b]/10 hover:bg-[#e8b34b]/20 text-[#e8b34b] border border-[#e8b34b]/30 hover:shadow-[0_0_15px_rgba(232,179,75,0.2)]' 
        : 'bg-gray-900/50 text-gray-600 border border-gray-800 cursor-not-allowed opacity-50'
    }`;

  // 🚨 UI EVALUATION SYSTEM LOCK: 
  // 1. Mate MUST display purely as M1 or M-1 (no alphabetical prefixes).
  // 2. Overrides for game checkmates MUST check `atLive` (reviewIndex -1) to prevent locking Review history states blindly.
  const isCheckmate = gameStatus === 'checkmate';
  const displayMate = (isCheckmate && atLive) ? 0 : mateIn;
  const displayEval = (isCheckmate && atLive) ? (game.turn() === 'w' ? -10000 : 10000) : evaluation;

  return (
    <div 
      className="w-[100vw] min-h-[100dvh] lg:w-full lg:min-h-screen flex flex-col lg:flex-row items-center justify-start lg:justify-center lg:p-4 gap-0 lg:gap-6 relative overflow-x-hidden overflow-y-auto text-white custom-scrollbar"
      style={{
        background: 'linear-gradient(135deg, #0a0a0a 0%, #0f0f1a 30%, #0a0a0a 60%, #0f0f1a 100%)',
      }}
    >
      {/* Subtle Background Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      {/* ========================================================= */}
      {/* MOBILE-ONLY: TOP APP HEADER (Tier 1)                      */}
      {/* ========================================================= */}
      <div className="flex lg:hidden w-full h-14 shrink-0 items-center justify-between px-4 z-40 bg-black/40 border-b border-white/5">
        <button 
          onClick={() => {
            if (gameStatus === 'active' && history.length > 0) setShowResignConfirm(true);
            else navigate('/play');
          }} 
          className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-[#e8b34b]" />
          <span className="font-['Montserrat'] font-bold text-lg text-white">Chess<span className="text-[#e8b34b]">Master</span></span>
        </div>
        <button onClick={() => setShowThemeSelection(true)} className="p-2 -mr-2 text-gray-400 hover:text-[#e8b34b] transition-colors">
          <Settings className="w-6 h-6" />
        </button>
      </div>

      {/* ========================================================= */}
      {/* MOBILE-ONLY: HORIZONTAL MOVE LIST (Tier 2)                */}
      {/* ========================================================= */}
      <div className="flex lg:hidden w-full h-10 shrink-0 bg-black/60 border-b border-white/5 items-center px-4 overflow-x-auto custom-scrollbar z-30 gap-3" ref={mobileMoveListRef}>
        {history.length === 0 ? (
          <span className="text-gray-500 text-xs italic">No moves yet...</span>
        ) : (
          history.reduce((acc, move, i) => {
            if (i % 2 === 0) {
              const moveNum = Math.floor(i / 2) + 1;
              acc.push(
                <div key={i} className="flex items-center gap-1.5 text-sm whitespace-nowrap">
                  <span className="text-gray-500 font-medium">{moveNum}.</span>
                  <button onClick={() => { if(reviewIndex === -1) startReview(); useGameStore.getState().setReviewIndex(i); }} className={`px-1 rounded ${reviewIndex === i ? 'text-black bg-[#e8b34b] font-bold' : 'text-gray-300'}`}>{move}</button>
                  {history[i+1] && (
                    <button onClick={() => { if(reviewIndex === -1) startReview(); useGameStore.getState().setReviewIndex(i+1); }} className={`px-1 rounded ${reviewIndex === i+1 ? 'text-black bg-[#e8b34b] font-bold' : 'text-gray-300'}`}>{history[i+1]}</button>
                  )}
                </div>
              );
            }
            return acc;
          }, [] as any[])
        )}
        <div ref={mobileMoveListEndRef} className="w-1 h-1 shrink-0" />
      </div>

      <AnimatePresence>
        {showThemeSelection && <ThemeSelection onClose={() => setShowThemeSelection(false)} />}
      </AnimatePresence>

      {/* Game Over Modal */}
      <GameOverModal
        isOpen={showGameOverModal}
        result={getGameResult()}
        reason={getGameReason()}
        stats={{ mistakes: 0, blunders: 0, missedWins: 0 }}
        onGameReview={handleGameReview}
        onRematch={handleRematch}
        onNewGame={handleNewGame}
        onClose={() => setShowGameOverModal(false)}
      />

      {showResignConfirm && (
        <>
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" onClick={() => setShowResignConfirm(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm">
            <div className="glass-panel p-8 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.2), rgba(220, 38, 38, 0.05))', border: '1px solid rgba(220, 38, 38, 0.3)' }}>
                <Flag className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white font-['Montserrat'] mb-2">Resign Game?</h3>
              <p className="text-zinc-400 text-sm mb-6">
                {game.turn() === 'w' ? 'White' : 'Black'} will forfeit the game.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowResignConfirm(false)}
                  className="py-3 rounded-xl glass-card text-zinc-300 font-semibold text-sm uppercase tracking-wider transition-all hover:border-white/20"
                  style={{ border: '1px solid rgba(255, 255, 255, 0.1)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleResign}
                  className="py-3 rounded-xl bg-red-500/20 text-red-400 font-semibold text-sm uppercase tracking-wider transition-all hover:bg-red-500/30"
                  style={{ border: '1px solid rgba(220, 38, 38, 0.3)' }}
                >
                  Resign
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* Left Panel: Info */}
      <div className="hidden md:flex flex-col w-64 min-h-[600px] h-fit glass-card rounded-2xl p-5 relative z-10 my-auto">
        {/* Back Button */}
        <button 
          onClick={() => {
            if (gameStatus === 'active' && history.length > 0) {
              setShowResignConfirm(true);
            } else {
              navigate('/play');
            }
          }}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-300 group mb-6"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span className="text-xs font-medium">Exit</span>
        </button>

        {/* Settings Button - Desktop (Absolute in Top Right of Panel) */}
        <button 
          onClick={() => setShowThemeSelection(true)}
          className="absolute top-6 right-6 p-2 text-gray-400 hover:text-[#e8b34b] transition-colors rounded-full hover:bg-white/5"
          title="Theme Settings"
        >
          <Settings className="w-5 h-5" />
        </button>

        {/* Player 2 (Black) */}
        <div className="mb-4">
          <h2 className="text-[10px] font-bold text-[#e8b34b] mb-3 uppercase tracking-[0.3em] font-['Montserrat']">
            {game.turn() === 'b' ? '● Black' : 'Black'}
          </h2>
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500"
              style={{
                background: game.turn() === 'b'
                  ? 'linear-gradient(135deg, rgba(232,179,75,0.25), rgba(232,179,75,0.08))'
                  : 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
                boxShadow: game.turn() === 'b' ? '0 0 20px rgba(232,179,75,0.25)' : 'none',
                border: `1px solid ${game.turn() === 'b' ? 'rgba(232,179,75,0.3)' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              <User className="w-6 h-6" style={{ color: game.turn() === 'b' ? '#e8b34b' : '#4b5563' }} />
            </div>
            <div>
              <p className="font-bold text-white text-sm font-['Montserrat']">Player 2</p>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: game.turn() === 'b' ? '#e8b34b' : '#6b7280' }}>Black</p>
            </div>
          </div>
          <CapturedPieces color="white" className="mt-2" />
        </div>

        <div className="border-t border-white/5 my-2" />

        {/* Player 1 (White) */}
        <div className="mb-5">
          <h2 className="text-[10px] font-bold text-[#e8b34b] mb-3 uppercase tracking-[0.3em] font-['Montserrat']">
            {game.turn() === 'w' ? '● White' : 'White'}
          </h2>
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500"
              style={{
                background: game.turn() === 'w'
                  ? 'linear-gradient(135deg, rgba(232,179,75,0.25), rgba(232,179,75,0.08))'
                  : 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
                boxShadow: game.turn() === 'w' ? '0 0 20px rgba(232,179,75,0.25)' : 'none',
                border: `1px solid ${game.turn() === 'w' ? 'rgba(232,179,75,0.3)' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              <User className="w-6 h-6" style={{ color: game.turn() === 'w' ? '#e8b34b' : '#4b5563' }} />
            </div>
            <div>
              <p className="font-bold text-white text-sm font-['Montserrat']">Player 1</p>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: game.turn() === 'w' ? '#e8b34b' : '#6b7280' }}>White</p>
            </div>
          </div>
          <CapturedPieces color="black" className="mt-2" />
        </div>

        {/* Evaluation Bar */}
        <div className="mb-6">
          <div className="flex justify-end items-center text-[11px] font-bold mb-1.5">
            <span className={displayMate !== null ? (displayEval > 0 ? 'text-[#e8b34b]' : 'text-gray-400') : displayEval > 0 ? 'text-[#e8b34b]' : displayEval < 0 ? 'text-gray-400' : 'text-gray-500'}>
              {showEvalBar ? (displayMate !== null ? (displayMate === 0 ? 'Checkmate' : `M${displayMate}`) : (displayEval > 0 ? `+${(displayEval/100).toFixed(1)}` : (displayEval/100).toFixed(1))) : '0.0'}
            </span>
          </div>
          {showEvalBar && (
            <div className="h-2 w-full bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-full overflow-hidden relative border border-[#e8b34b]/10">
              <div 
                className={`absolute top-0 bottom-0 transition-all duration-1000 ease-out rounded-full ${(displayMate !== null && displayEval > 0) || (displayMate === null && displayEval > 0) ? 'bg-gradient-to-r from-[#e8b34b] to-[#d4a03d]' : 'bg-gradient-to-l from-gray-500 to-gray-600'}`}
                style={{ 
                  width: displayMate !== null ? '50%' : `${Math.min(50, Math.abs(displayEval) / 20)}%`,
                  left: displayEval > 0 ? '50%' : undefined,
                  right: displayEval < 0 ? '50%' : undefined,
                  boxShadow: displayEval > 0 ? '0 0 10px rgba(232, 179, 75, 0.4)' : 'none'
                }} 
              />
              <div className="absolute top-0 bottom-0 left-1/2 w-px bg-[#e8b34b]/20" />
            </div>
          )}
        </div>

        {/* Game Status / Controls */}
        <div className="mt-auto">
          {gameStatus === 'checkmate' && (
            <div className="mb-4 glass-card rounded-xl p-4 text-center" style={{
              border: '1px solid rgba(232, 179, 75, 0.2)',
              boxShadow: '0 0 20px rgba(232, 179, 75, 0.1)',
            }}>
              <Crown className="w-6 h-6 text-[#e8b34b] mx-auto mb-2" />
              <h3 className="text-lg font-bold text-[#e8b34b] font-['Montserrat'] uppercase tracking-wider">Checkmate</h3>
              <p className="text-[#d4a03d] text-xs uppercase tracking-wider font-semibold mt-1">
                {game.turn() === 'w' ? 'Black Wins!' : 'White Wins!'}
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-center items-center gap-1.5 glass-card rounded-xl p-2 mb-3" style={{ border: '1px solid rgba(232, 179, 75, 0.1)' }}>
            <button onClick={handleGoToStart} disabled={!canGoStart} className={navBtnClass(canGoStart)} title="First Move">
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button onClick={handlePrev} disabled={!canPrev} className={navBtnClass(canPrev)} title="Previous">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={handleNext} disabled={!canNext} className={navBtnClass(canNext)} title="Next">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={handleGoToEnd} disabled={!canGoLive} className={navBtnClass(canGoLive)} title="Latest">
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>

          {/* Game Review Action Button */}
          {gameStatus !== 'active' && (
            <button 
              onClick={() => { startReview(); useGameStore.getState().saveReviewState(); navigate('/review?source=game'); }}
              className="w-full mb-3 py-2.5 flex items-center justify-center gap-2 rounded-xl text-white text-xs font-semibold uppercase tracking-wider transition-all duration-300 hover:-translate-y-0.5"
              style={{
                background: 'linear-gradient(135deg, #88B04B 0%, #6B8E3D 100%)',
                boxShadow: '0 4px 15px rgba(136, 176, 75, 0.3)'
              }}
            >
              <Eye className="w-4 h-4" />
              Game Review
            </button>
          )}

          {/* Eval Bar Toggle */}
          <button 
            onClick={() => setShowEvalBar(!showEvalBar)}
            className="w-full mb-3 py-2.5 flex items-center justify-center gap-2 rounded-xl text-gray-400 hover:text-[#e8b34b] border border-gray-800 hover:border-[#e8b34b]/30 hover:bg-white/5 transition-all duration-200 text-xs font-semibold uppercase tracking-wider"
          >
            {showEvalBar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showEvalBar ? 'Hide Eval Bar' : 'Show Eval Bar'}
          </button>

          <button 
            onClick={() => { if (gameStatus !== 'active') { resetGame(); audio.playGameStart(); } }}
            disabled={gameStatus === 'active'}
            className={`w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 ${
              gameStatus === 'active'
                ? 'bg-gray-800/50 text-gray-600 border border-gray-700 cursor-not-allowed opacity-50'
                : 'btn-gold'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            New Game
          </button>

          {/* Resign */}
          {gameStatus === 'active' && history.length > 0 && (
            <button
              onClick={() => setShowResignConfirm(true)}
              className="w-full mt-2 py-2.5 rounded-xl text-red-400/70 hover:text-red-400 hover:bg-red-400/5 text-xs uppercase tracking-wider transition-all duration-200 font-semibold flex items-center justify-center gap-2"
              style={{ border: '1px solid rgba(220, 38, 38, 0.15)' }}
            >
              <Flag className="w-3.5 h-3.5" />
              Resign
            </button>
          )}

          <button 
            onClick={() => {
              if (gameStatus === 'active' && history.length > 0) {
                setShowResignConfirm(true);
              } else {
                navigate('/play');
              }
            }}
            className="w-full mt-2 text-gray-500 hover:text-[#e8b34b] text-xs uppercase tracking-wider transition-colors py-3 font-semibold"
          >
            Exit to Menu
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* CENTER COLUMN (Responsive)                                */}
      {/* ========================================================= */}
      <div className="flex flex-col items-center justify-center gap-0 lg:gap-4 relative z-10 w-full lg:w-auto lg:flex-1 lg:min-w-0 flex-1">
        
        {/* MOBILE-ONLY: OPPONENT ROW (Tier 3) */}
        <div className="flex lg:hidden w-full px-4 items-center justify-between py-2 z-20">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-md overflow-hidden bg-white/10 flex items-center justify-center border border-white/10 shadow-sm">
               <User className="w-6 h-6 text-[#4b5563]" />
             </div>
             <div className="flex flex-col">
               <div className="flex items-center gap-2">
                 <span className="text-sm font-bold text-white leading-tight">Player 2</span>
                 {displayEval < 0 && <span className="text-[10px] font-bold text-gray-900 bg-white/80 px-1 rounded-sm leading-tight tracking-wider">{(Math.abs(displayEval)/100).toFixed(1)}</span>}
               </div>
               <span className="text-[11px] text-gray-400 font-medium leading-tight">Black</span>
             </div>
           </div>
           <div className="flex justify-center min-w-[70px]">
             <ChessClock mode="top" />
           </div>
        </div>

        {/* MOBILE-ONLY: Horizontal Evaluation Bar (Tier 3.5) */}
        {showEvalBar && (
          <div className="lg:hidden w-full px-4 mt-1 mb-1 relative z-20">
            <div className="flex justify-between items-center text-[9px] font-bold mb-1 px-1">
              <span className="text-gray-500">Black</span>
              <span className={displayMate !== null ? (displayEval > 0 ? 'text-[#e8b34b]' : 'text-gray-400') : displayEval > 0 ? 'text-[#e8b34b]' : displayEval < 0 ? 'text-gray-400' : 'text-gray-500'}>
                {displayMate !== null ? (displayMate === 0 ? 'Checkmate' : `M${displayMate}`) : (displayEval > 0 ? `+${(displayEval/100).toFixed(1)}` : (displayEval/100).toFixed(1))}
              </span>
              <span className="text-[#e8b34b]">White</span>
            </div>
            <div className="h-1.5 w-full bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-full overflow-hidden relative border border-white/5 shadow-inner">
              <div 
                className={`absolute top-0 bottom-0 transition-all duration-1000 ease-out rounded-full ${(displayMate !== null && displayEval > 0) || (displayMate === null && displayEval > 0) ? 'bg-gradient-to-r from-[#e8b34b] to-[#d4a03d]' : 'bg-gradient-to-l from-gray-500 to-gray-600'}`}
                style={{ 
                  width: displayMate !== null ? '50%' : `${Math.min(50, Math.abs(displayEval) / 20)}%`,
                  left: displayEval > 0 ? '50%' : undefined,
                  right: displayEval < 0 ? '50%' : undefined,
                }} 
              />
              <div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-white/20" />
            </div>
          </div>
        )}

        {/* Board + Desktop Clock Container */}
        <div className="flex items-stretch justify-center gap-3 lg:gap-4 w-full">
          {/* Board Wrapper */}
          <div className="board-wrapper flex flex-col justify-center min-w-0" style={{ width: 'min(95vh, calc(100% - 110px))' }}>
            <div className="w-full aspect-square relative">
              <Board />
            </div>
          </div>
          {/* Desktop Clock */}
          <div className="hidden lg:flex flex-col justify-between flex-shrink-0 w-[90px] py-1">
            <ChessClock className="h-full justify-between" />
          </div>
        </div>

        {/* MOBILE-ONLY: PLAYER ROW (Tier 5) */}
        <div className="flex lg:hidden w-full px-4 items-center justify-between py-2 z-20">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-md overflow-hidden bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center border border-white/10 shadow-sm">
               <User className="w-6 h-6 text-[#e8b34b]" />
             </div>
             <div className="flex flex-col">
               <div className="flex items-center gap-2">
                 <span className="text-sm font-bold text-white leading-tight">Player 1</span>
                 {displayEval > 0 && <span className="text-[10px] font-bold text-gray-900 bg-white/80 px-1 rounded-sm leading-tight tracking-wider">+{(Math.abs(displayEval)/100).toFixed(1)}</span>}
               </div>
               <span className="text-[11px] text-gray-400 font-medium leading-tight">White</span>
             </div>
           </div>
           <div className="flex justify-center min-w-[70px]">
             <ChessClock mode="bottom" />
           </div>
        </div>
      </div>
      
      {/* Right Panel: Moves */}
      <div className="hidden md:flex flex-col w-64 h-[600px] glass-card rounded-2xl p-6 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[10px] font-bold text-[#e8b34b] uppercase tracking-wider font-['Montserrat']">Move Log</h2>
          <div className="flex items-center gap-1">
            <Swords className="w-3.5 h-3.5 text-[#e8b34b]/50" />
            <span className="text-[10px] text-gray-500 font-semibold">{history.length}</span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto font-mono text-sm text-gray-500 custom-scrollbar pr-2">
          <div className="grid grid-cols-[30px_1fr_1fr] gap-x-2">
            {history.map((move, i) => {
              if (i % 2 === 0) {
                const moveNum = (i/2) + 1;
                return (
                  <div key={i} className="contents">
                    <div className="py-1 text-[#e8b34b]/30 text-[9px] pt-1.5 font-semibold">{moveNum < 10 ? `0${moveNum}` : moveNum}</div>
                    <div className={`py-1 pl-2 border-b border-white/5 transition-colors rounded-sm ${(reviewIndex === -1 && i === history.length - 1) || reviewIndex === i ? 'text-[#e8b34b] bg-[#e8b34b]/10' : 'text-gray-400'}`}>{move}</div>
                    <div className={`py-1 pl-2 border-b border-white/5 transition-colors rounded-sm ${(reviewIndex === -1 && i + 1 === history.length - 1) || reviewIndex === i+1 ? 'text-[#e8b34b] bg-[#e8b34b]/10' : 'text-gray-400'}`}>{history[i+1] || ''}</div>
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
        
        {/* Flip Board - Desktop */}
        <button
          onClick={flipBoard}
          className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-gray-400 hover:text-[#e8b34b] transition-all duration-200"
          style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(232, 179, 75, 0.1)' }}
          title="Flip Board"
        >
          <RotateCw className="w-4 h-4" />
          <span className="text-xs uppercase tracking-wider font-medium">Flip Board</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* MOBILE-ONLY: BOTTOM NAV BAR (Tier 6)                        */}
      {/* ========================================================= */}
      <div className="flex lg:hidden w-full h-16 shrink-0 bg-[#0a0a0a] border-t border-white/5 items-center justify-between px-2 pb-safe z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
        <button onClick={() => setShowMobileOptions(true)} className="flex flex-col items-center justify-center w-14 h-full text-gray-400 hover:text-white transition-colors">
          <div className="flex flex-col gap-1 items-center justify-center w-5 h-5 mb-1">
            <div className="w-4 h-[2px] bg-current rounded-full" />
            <div className="w-4 h-[2px] bg-current rounded-full" />
            <div className="w-4 h-[2px] bg-current rounded-full" />
          </div>
          <span className="text-[10px] font-medium">Options</span>
        </button>
        <button onClick={flipBoard} className="flex flex-col items-center justify-center w-14 h-full text-gray-400 hover:text-white transition-colors">
          <RotateCw className="w-4 h-4 mb-1" />
          <span className="text-[10px] font-medium">Flip</span>
        </button>

        <div className="relative group flex items-center justify-center px-2">
           {/* Central Action Button */}
           <button onClick={() => { if(gameStatus !== 'active') { resetGame(); audio.playGameStart(); } }} className={`w-12 h-12 rounded-xl flex items-center justify-center transform transition-all active:scale-95 ${gameStatus === 'active' ? 'bg-[#e8b34b]/10 text-[#e8b34b] border border-[#e8b34b]/20' : 'btn-gold shadow-lg shadow-[#e8b34b]/20'}`}>
             {gameStatus === 'active' ? <Crown className="w-6 h-6 opacity-50" /> : <RefreshCw className="w-6 h-6" />}
           </button>
        </div>

        <button onClick={handlePrev} disabled={!canPrev} className={`flex flex-col items-center justify-center w-14 h-full transition-colors ${canPrev ? 'text-gray-400 hover:text-white' : 'text-gray-700'}`}>
          <ChevronLeft className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-medium">Back</span>
        </button>
        <button onClick={handleNext} disabled={!canNext} className={`flex flex-col items-center justify-center w-14 h-full transition-colors ${canNext ? 'text-gray-400 hover:text-white' : 'text-gray-700'}`}>
          <ChevronRight className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-medium">Forward</span>
        </button>
      </div>

      {/* Mobile Options Modal */}
      {showMobileOptions && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end pointer-events-none">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto transition-opacity" onClick={() => setShowMobileOptions(false)} />
          <div className="w-full glass-panel rounded-t-2xl p-4 flex flex-col gap-2 pointer-events-auto animate-in slide-in-from-bottom-2 duration-200 border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-2" />
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">Options</h3>
            
            {gameStatus === 'active' && (
              <button onClick={() => { setShowMobileOptions(false); setShowResignConfirm(true); }} className="w-full text-left px-4 py-3.5 rounded-xl text-red-400 bg-red-500/10 hover:bg-red-500/20 font-semibold flex items-center gap-3 transition-colors border border-red-500/20">
                <Flag className="w-5 h-5" /> Resign Game
              </button>
            )}
            {gameStatus !== 'active' && (
              <button onClick={() => { setShowMobileOptions(false); resetGame(); audio.playGameStart(); }} className="w-full text-left px-4 py-3.5 rounded-xl text-[#e8b34b] bg-[#e8b34b]/10 hover:bg-[#e8b34b]/20 font-semibold flex items-center gap-3 transition-colors border border-[#e8b34b]/20">
                <RefreshCw className="w-5 h-5" /> New Game
              </button>
            )}
            <button onClick={() => { setShowMobileOptions(false); navigate('/play'); }} className="w-full text-left px-4 py-3.5 rounded-xl text-white bg-white/5 hover:bg-white/10 font-semibold flex items-center gap-3 transition-colors border border-white/5">
              <ArrowLeft className="w-5 h-5" /> Exit to Main Menu
            </button>
            <button onClick={() => setShowMobileOptions(false)} className="w-full text-center px-4 py-3.5 mt-2 rounded-xl text-gray-400 hover:text-white font-medium transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default LocalGame;
