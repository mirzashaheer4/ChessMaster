import { useEffect, useState, useRef } from 'react';
import { Board } from '../board/Board';
import { useGameStore } from '../../../core/store/game';
import { useGameState, useSettings } from '../../../core/store/selectors';
import { useGameTimer } from '../../../core/hooks/useGameTimer';
import { audio } from '../../../core/audio/audio';
import GameOverModal from '../ui/GameOverModal';
import ChessClock from '../ui/ChessClock';
import {
  Globe,
  RotateCw,
  Flag,
  Handshake,
  X,
  Wifi,
  WifiOff,
  Swords,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Check,
  ArrowLeft,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * OnlineGame — Real-time multiplayer chess via Socket.io
 */
const OnlineGame = () => {
  const { gameStatus, history, game } = useGameState();
  const { flipBoard } = useSettings();
  
  const {
    onlineStatus, onlineColor, opponentName, opponentElo,
    drawOfferedBy, opponentDisconnected,
    resignOnline, offerDraw, acceptDraw, declineDraw, resetOnline,
  } = useGameStore();

  const navigate = useNavigate();
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [showMobileOptions, setShowMobileOptions] = useState(false);
  const moveListRef = useRef<HTMLDivElement>(null);
  const moveListEndRef = useRef<HTMLDivElement>(null);
  const mobileMoveListRef = useRef<HTMLDivElement>(null);
  const mobileMoveListEndRef = useRef<HTMLDivElement>(null);

  // Game clock
  useGameTimer();

  // ── Move Navigation (review) ──
  const noMoves = history.length === 0;
  const reviewIndex = useGameStore((s) => s.reviewIndex);
  const atStart = reviewIndex === -2;
  const atLive = reviewIndex === -1;

  // Auto-scroll moves
  useEffect(() => {
    if (atLive && moveListEndRef.current) {
      moveListEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    if (atLive && mobileMoveListEndRef.current) {
      mobileMoveListEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'end' });
    }
  }, [history.length, atLive]);

  // Auto-execute premoves for online mode
  useEffect(() => {
    const unsub = useGameStore.subscribe((state, prevState) => {
      if (state.moveVersion !== prevState.moveVersion && state.gameStatus === 'active' && state.premoves.length > 0) {
        const isMyTurn = (state.game.turn() === 'w' && state.onlineColor === 'white') ||
                         (state.game.turn() === 'b' && state.onlineColor === 'black');
        if (isMyTurn) {
          // Add brief delay to ensure state and board animations are synced
          setTimeout(() => useGameStore.getState().executePremove(), 50);
        }
      }
    });
    return unsub;
  }, []);

  // Show game-over modal on game end
  useEffect(() => {
    if (onlineStatus === 'ended' && gameStatus !== 'active') {
      audio.playCapture();
      const t = setTimeout(() => setShowGameOverModal(true), 500);
      return () => clearTimeout(t);
    }
  }, [onlineStatus, gameStatus]);

  // Cleanup on unmount (only if actually leaving the page, protecting against React Strict Mode)
  useEffect(() => {
    return () => {
      if (!window.location.hash.includes('/game/online')) {
        const state = useGameStore.getState();
        if (state.onlineStatus === 'queuing') {
          state.leaveQueue();
        }
        state.resetOnline();
      }
    };
  }, []);

  // ── Navigation ──
  const handleBack = () => {
    if (onlineStatus === 'playing') {
      setShowResignConfirm(true);
    } else {
      resetOnline();
      navigate('/play');
    }
  };

  const handleResign = () => {
    resignOnline();
    setShowResignConfirm(false);
  };

  // (Moved reviewIndex declarations up for useEffect dependency)

  const canPrev    = !noMoves && !atStart;
  const canNext    = !noMoves && !atLive;
  const canGoStart = !noMoves && !atStart;
  const canGoLive  = !noMoves && !atLive;

  const handlePrev = () => { if (canPrev) useGameStore.getState().prevMove(); };
  const handleNext = () => { if (canNext) useGameStore.getState().nextMove(); };
  const handleGoToStart = () => { if (canGoStart) useGameStore.getState().setReviewIndex(-2); };
  const handleGoToEnd = () => { if (canGoLive) useGameStore.getState().exitReview(); };

  const navBtnClass = (enabled: boolean) =>
    `w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 ${
      enabled
        ? 'bg-[#e8b34b]/10 hover:bg-[#e8b34b]/20 text-[#e8b34b] border border-[#e8b34b]/30'
        : 'bg-gray-900/50 text-gray-600 border border-gray-800 cursor-not-allowed opacity-50'
    }`;

  // ── Determine whose turn ──
  const isMyTurn = game.turn() === (onlineColor === 'white' ? 'w' : 'b');
  const turnLabel = game.turn() === 'w' ? 'White to Move' : 'Black to Move';

  // ── Matchmaking / Queuing Overlay ──
  if (onlineStatus === 'idle' || onlineStatus === 'connecting' || onlineStatus === 'queuing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#064e3b] to-[#0a0a0a] flex items-center justify-center">
        <div className="text-center space-y-8">
          {/* Animated searching icon */}
          <div className="relative mx-auto w-32 h-32">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-ping" />
            <div className="absolute inset-2 rounded-full border-4 border-emerald-500/30 animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Globe className="w-16 h-16 text-emerald-400 animate-spin" style={{ animationDuration: '3s' }} />
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-white font-['Montserrat'] mb-2">
              {onlineStatus === 'queuing' ? 'Finding Opponent...' : 'Connecting...'}
            </h2>
            <p className="text-emerald-400/70 text-sm">Searching for players with matching time control</p>
          </div>

          {/* Cancel button */}
          <button
            onClick={() => {
              useGameStore.getState().leaveQueue();
              navigate('/play');
            }}
            className="px-8 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all font-semibold"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Main Game View ──
  return (
    <div
      className="w-[100vw] h-[100dvh] lg:w-full lg:h-full flex flex-col lg:flex-row items-center justify-start lg:justify-center lg:p-4 gap-0 lg:gap-6 relative overflow-hidden text-white"
      style={{
        background: 'linear-gradient(135deg, #0a0a0a 0%, #0d1117 40%, #0a0a0a 100%)',
      }}
    >
      {/* Connection Status Bar */}
      {opponentDisconnected && (
        <div className="absolute top-14 lg:top-0 left-0 right-0 z-50 bg-yellow-500/20 border-b border-yellow-500/30 px-4 py-2 text-center mt-10 lg:mt-0">
          <span className="text-yellow-400 text-sm font-semibold flex items-center justify-center gap-2">
            <WifiOff className="w-4 h-4" /> Opponent disconnected — waiting 30s for reconnection...
          </span>
        </div>
      )}

      {/* Draw Offer Banner */}
      {drawOfferedBy && drawOfferedBy !== onlineColor && gameStatus === 'active' && (
        <div className="absolute top-14 lg:top-0 left-0 right-0 z-50 bg-emerald-500/20 border-b border-emerald-500/30 px-4 py-3 flex items-center justify-center gap-4 mt-10 lg:mt-0">
          <span className="text-emerald-300 text-sm font-semibold">
            <Handshake className="w-4 h-4 inline mr-2" />
            {opponentName} offers a draw
          </span>
          <button
            onClick={acceptDraw}
            className="px-4 py-1.5 rounded-lg bg-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider hover:bg-emerald-500/50 transition-all flex items-center gap-1"
          >
            <Check className="w-3.5 h-3.5" /> Accept
          </button>
          <button
            onClick={declineDraw}
            className="px-4 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider hover:bg-red-500/30 transition-all flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" /> Decline
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* MOBILE-ONLY: TOP APP HEADER (Tier 1)                      */}
      {/* ========================================================= */}
      <div className="flex lg:hidden w-full h-14 shrink-0 items-center justify-between px-4 z-40 bg-black/40 border-b border-white/5">
        <button 
          onClick={() => {
            if (onlineStatus === 'playing') setShowResignConfirm(true);
            else { resetOnline(); navigate('/play'); }
          }} 
          className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-emerald-400" />
          <span className="font-['Montserrat'] font-bold text-lg text-white">Online<span className="text-emerald-400">Match</span></span>
        </div>
        <div className="w-10" /> {/* Spacer for centering */}
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
                  <button onClick={() => { if(reviewIndex === -1) useGameStore.getState().startReview(); useGameStore.getState().setReviewIndex(i); }} className={`px-1 rounded ${reviewIndex === i ? 'text-black bg-emerald-400 font-bold' : 'text-gray-300'}`}>{move}</button>
                  {history[i+1] && (
                    <button onClick={() => { if(reviewIndex === -1) useGameStore.getState().startReview(); useGameStore.getState().setReviewIndex(i+1); }} className={`px-1 rounded ${reviewIndex === i+1 ? 'text-black bg-emerald-400 font-bold' : 'text-gray-300'}`}>{history[i+1]}</button>
                  )}
                </div>
              );
            }
            return acc;
          }, [] as any[])
        )}
        <div ref={mobileMoveListEndRef} className="w-1 h-1 shrink-0" />
      </div>

      {/* Main 3-column layout */}
      <div className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-6 px-4 lg:px-8 py-4 min-h-0 w-full relative z-10 w-full lg:w-auto lg:flex-1 lg:min-w-0">

        {/* LEFT PANEL — Opponent Info + Controls */}
        <div className="hidden lg:flex flex-col w-64 gap-4 relative z-10">
          
          {/* Opponent Card */}
          <div className="glass-card rounded-2xl p-5" style={{ border: '1px solid rgba(16, 185, 129, 0.15)' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                <Globe className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-['Montserrat']">{opponentName || 'Opponent'}</h3>
                <span className="text-emerald-400 text-xs font-semibold">{opponentElo || '1200'} ELO</span>
              </div>
              <div className="ml-auto">
                {opponentDisconnected ? (
                  <WifiOff className="w-4 h-4 text-yellow-400" />
                ) : (
                  <Wifi className="w-4 h-4 text-emerald-400" />
                )}
              </div>
            </div>
            <div className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-center ${
              gameStatus === 'active'
                ? isMyTurn ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-gray-500'
                : 'bg-[#e8b34b]/20 text-[#e8b34b]'
            }`}>
              {gameStatus === 'active' ? turnLabel : gameStatus}
            </div>
          </div>

          {/* Player Card (You) */}
          <div className="glass-card rounded-2xl p-5" style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center border border-white/10">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Player&backgroundColor=transparent`} alt="Player" className="w-full h-full" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-['Montserrat']">You</h3>
                <span className="text-gray-400 text-xs font-semibold capitalize">{onlineColor}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="glass-card rounded-2xl p-5 flex flex-col gap-2" style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <button onClick={flipBoard} className="w-full py-2.5 flex items-center justify-center gap-2 rounded-xl text-gray-400 hover:text-[#e8b34b] border border-gray-800 hover:border-[#e8b34b]/30 hover:bg-white/5 transition-all duration-200 text-xs font-semibold uppercase tracking-wider">
              <RotateCw className="w-4 h-4" /> Flip Board
            </button>

            {gameStatus === 'active' && (
              <>
                <button
                  onClick={offerDraw}
                  disabled={drawOfferedBy === onlineColor}
                  className={`w-full py-2.5 flex items-center justify-center gap-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                    drawOfferedBy === onlineColor
                      ? 'bg-gray-800/50 text-gray-600 border border-gray-700 cursor-not-allowed'
                      : 'text-gray-400 hover:text-emerald-400 border border-gray-800 hover:border-emerald-500/30 hover:bg-emerald-500/5'
                  }`}
                >
                  <Handshake className="w-4 h-4" />
                  {drawOfferedBy === onlineColor ? 'Draw Offered' : 'Offer Draw'}
                </button>

                <button
                  onClick={() => setShowResignConfirm(true)}
                  className="w-full py-2.5 flex items-center justify-center gap-2 rounded-xl text-red-400/70 hover:text-red-400 hover:bg-red-400/5 text-xs uppercase tracking-wider transition-all duration-200 font-semibold"
                  style={{ border: '1px solid rgba(220, 38, 38, 0.15)' }}
                >
                  <Flag className="w-3.5 h-3.5" /> Resign
                </button>
              </>
            )}

            {gameStatus !== 'active' && (
              <button
                onClick={() => { resetOnline(); navigate('/play'); }}
                className="w-full py-3 rounded-xl btn-gold text-sm font-semibold flex items-center justify-center gap-2"
              >
                <Swords className="w-4 h-4" /> Play Again
              </button>
            )}

            <button
              onClick={handleBack}
              className="w-full mt-1 text-gray-500 hover:text-[#e8b34b] text-xs uppercase tracking-wider transition-colors py-3 font-semibold"
            >
              Exit to Menu
            </button>
          </div>
        </div>

        {/* CENTER — Board + Clock */}
        {/* ========================================================= */}
        {/* CENTER COLUMN (Responsive)                                */}
        {/* ========================================================= */}
        <div className="flex flex-col items-center justify-center gap-0 lg:gap-4 relative z-10 w-full lg:w-auto lg:flex-1 lg:min-w-0 flex-1">
          
          {/* MOBILE-ONLY: OPPONENT ROW (Tier 3) */}
          <div className="flex lg:hidden w-full px-4 items-center justify-between py-2 z-20">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-md overflow-hidden bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shadow-sm relative">
                 <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${opponentName}&backgroundColor=transparent`} alt="Opponent" className="w-full h-full object-cover" />
                 {opponentDisconnected && (
                   <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-[1px]">
                     <WifiOff className="w-4 h-4 text-yellow-400" />
                   </div>
                 )}
               </div>
               <div className="flex flex-col">
                 <div className="flex items-center gap-2">
                   <span className="text-sm font-bold text-white leading-tight">{opponentName || 'Opponent'}</span>
                 </div>
                 <span className="text-[11px] text-emerald-400 font-medium leading-tight">{opponentElo} ELO</span>
               </div>
             </div>
             <div className="flex justify-center min-w-[70px]">
               <ChessClock mode="top" />
             </div>
          </div>

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
                 <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Player&backgroundColor=transparent`} alt="Player" className="w-full h-full" />
               </div>
               <div className="flex flex-col">
                 <div className="flex items-center gap-2">
                   <span className="text-sm font-bold text-white leading-tight">You</span>
                 </div>
                 <span className="text-[11px] text-gray-400 font-medium leading-tight capitalize">{onlineColor}</span>
               </div>
             </div>
             <div className="flex justify-center min-w-[70px]">
               <ChessClock mode="bottom" />
             </div>
          </div>



        </div>

        {/* RIGHT PANEL — Move List */}
        <div className="hidden lg:flex flex-col w-64 h-[600px] glass-card rounded-2xl p-6 relative z-10" style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.3em] font-['Montserrat']">Move Log</h2>
            <div className="flex items-center gap-1">
              <Swords className="w-3.5 h-3.5 text-emerald-400/50" />
              <span className="text-[10px] text-gray-500 font-semibold">{history.length}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto font-mono text-sm text-gray-500 custom-scrollbar pr-2" ref={moveListRef}>
            <div className="grid grid-cols-[30px_1fr_1fr] gap-x-2">
              {history.map((move, i) => {
                if (i % 2 === 0) {
                  const moveNum = (i / 2) + 1;
                  return (
                    <div key={i} className="contents">
                      <div className="py-1 text-emerald-400/30 text-[9px] pt-1.5 font-semibold text-right pr-1">{moveNum}.</div>
                      <button
                        onClick={() => {
                          const s = useGameStore.getState();
                          if (s.reviewIndex === -1) s.startReview();
                          s.setReviewIndex(i);
                        }}
                        className={`py-1 px-2 rounded text-left transition-all duration-200 ${
                          reviewIndex === i
                            ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                            : 'hover:bg-white/5 text-gray-400'
                        }`}
                      >
                        {move}
                      </button>
                      {history[i + 1] ? (
                        <button
                          onClick={() => {
                            const s = useGameStore.getState();
                            if (s.reviewIndex === -1) s.startReview();
                            s.setReviewIndex(i + 1);
                          }}
                          className={`py-1 px-2 rounded text-left transition-all duration-200 ${
                            reviewIndex === i + 1
                              ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                              : 'hover:bg-white/5 text-gray-400'
                          }`}
                        >
                          {history[i + 1]}
                        </button>
                      ) : <div />}
                    </div>
                  );
                }
                return null;
              })}
              <div ref={moveListEndRef} />
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-center items-center gap-2 mt-3 pt-3 border-t border-white/5">
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
        </div>

      {/* ========================================================= */}
      {/* MOBILE-ONLY: BOTTOM NAV BAR (Tier 6)                        */}
      {/* ========================================================= */}
      <div className="flex lg:hidden w-full h-16 shrink-0 bg-[#0a0a0a] border-t border-white/5 items-center justify-between px-2 pb-safe z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] absolute bottom-0">
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
           <button onClick={() => { if(gameStatus !== 'active') { resetOnline(); navigate('/play'); } }} className={`w-12 h-12 rounded-xl flex items-center justify-center transform transition-all active:scale-95 ${gameStatus === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'btn-gold shadow-lg shadow-[#e8b34b]/20'}`}>
             {gameStatus === 'active' ? <Globe className="w-6 h-6 opacity-50" /> : <Swords className="w-6 h-6" />}
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
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">Match Options</h3>
            
            {gameStatus === 'active' && (
              <>
                 <button
                  onClick={() => { setShowMobileOptions(false); offerDraw(); }}
                  disabled={drawOfferedBy === onlineColor}
                  className={`w-full text-left px-4 py-3.5 rounded-xl font-semibold flex items-center gap-3 transition-colors border ${
                    drawOfferedBy === onlineColor 
                    ? 'text-gray-500 bg-gray-800/50 border-gray-700 cursor-not-allowed'
                    : 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20'
                  }`}
                 >
                   <Handshake className="w-5 h-5" /> {drawOfferedBy === onlineColor ? 'Draw Offered' : 'Offer Draw'}
                 </button>
                 <button onClick={() => { setShowMobileOptions(false); setShowResignConfirm(true); }} className="w-full text-left px-4 py-3.5 rounded-xl text-red-400 bg-red-500/10 hover:bg-red-500/20 font-semibold flex items-center gap-3 transition-colors border border-red-500/20">
                   <Flag className="w-5 h-5" /> Resign Match
                 </button>
              </>
            )}
            {gameStatus !== 'active' && (
              <button onClick={() => { setShowMobileOptions(false); resetOnline(); navigate('/play'); }} className="w-full text-left px-4 py-3.5 rounded-xl text-[#e8b34b] bg-[#e8b34b]/10 hover:bg-[#e8b34b]/20 font-semibold flex items-center gap-3 transition-colors border border-[#e8b34b]/20">
                <Swords className="w-5 h-5" /> Play Again
              </button>
            )}
            <button onClick={() => { setShowMobileOptions(false); resetOnline(); navigate('/play'); }} className="w-full text-left px-4 py-3.5 rounded-xl text-white bg-white/5 hover:bg-white/10 font-semibold flex items-center gap-3 transition-colors border border-white/5">
              <ArrowLeft className="w-5 h-5" /> Exit to Main Menu
            </button>
            <button onClick={() => setShowMobileOptions(false)} className="w-full text-center px-4 py-3.5 mt-2 rounded-xl text-gray-400 hover:text-white font-medium transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      </div>

      {/* Resign Confirmation Modal */}
      {showResignConfirm && (
        <>
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" onClick={() => setShowResignConfirm(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm">
            <div className="glass-panel p-8 text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.2), rgba(220, 38, 38, 0.05))', border: '1px solid rgba(220, 38, 38, 0.3)' }}
              >
                <Flag className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white font-['Montserrat'] mb-2">Resign Game?</h3>
              <p className="text-zinc-400 text-sm mb-6">This will count as a loss. Are you sure?</p>
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

      {/* Game Over Modal */}
        <GameOverModal
          isOpen={showGameOverModal}
          result={
            gameStatus === 'checkmate'
              ? (game.turn() === 'w' && onlineColor === 'white') || (game.turn() === 'b' && onlineColor === 'black')
                ? 'loss'
                : 'win'
              : gameStatus === 'timeout'
                ? (game.turn() === 'w' && onlineColor === 'white') || (game.turn() === 'b' && onlineColor === 'black')
                  ? 'loss'
                  : 'win'
              : gameStatus === 'resign' && onlineStatus === 'ended'
                ? 'loss' // Simplified: true winner calculation relies on standard store if possible, but for now we default. Let's provide a basic one:
              : 'draw'
          }
          reason={gameStatus}
          stats={{ mistakes: 0, blunders: 0, missedWins: 0 }}
          onClose={() => setShowGameOverModal(false)}
          onRematch={() => {
            resetOnline();
            navigate('/play');
          }}
          onGameReview={() => {
             useGameStore.getState().saveReviewState();
             navigate('/review?source=game');
          }}
          onNewGame={() => {
            resetOnline();
            navigate('/play');
          }}
        />
    </div>
  );
};

export default OnlineGame;
