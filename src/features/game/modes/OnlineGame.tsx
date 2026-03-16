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
  const moveListRef = useRef<HTMLDivElement>(null);
  const moveListEndRef = useRef<HTMLDivElement>(null);

  // Game clock
  useGameTimer();

  // Auto-scroll moves
  useEffect(() => {
    if (moveListEndRef.current) {
      moveListEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history.length]);

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

  // ── Move Navigation (review) ──
  const noMoves = history.length === 0;
  const reviewIndex = useGameStore((s) => s.reviewIndex);
  const atStart = reviewIndex === -2;
  const atLive = reviewIndex === -1;

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
      className="min-h-screen relative flex flex-col overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0a0a0a 0%, #0d1117 40%, #0a0a0a 100%)',
      }}
    >
      {/* Connection Status Bar */}
      {opponentDisconnected && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-yellow-500/20 border-b border-yellow-500/30 px-4 py-2 text-center">
          <span className="text-yellow-400 text-sm font-semibold flex items-center justify-center gap-2">
            <WifiOff className="w-4 h-4" /> Opponent disconnected — waiting 30s for reconnection...
          </span>
        </div>
      )}

      {/* Draw Offer Banner */}
      {drawOfferedBy && drawOfferedBy !== onlineColor && gameStatus === 'active' && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-emerald-500/20 border-b border-emerald-500/30 px-4 py-3 flex items-center justify-center gap-4">
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

      {/* Main 3-column layout */}
      <div className="flex-1 flex items-center justify-center gap-4 md:gap-6 px-4 md:px-8 py-4 min-h-0">

        {/* LEFT PANEL — Opponent Info + Controls */}
        <div className="hidden md:flex flex-col w-64 gap-4 relative z-10">
          
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
        <div className="flex flex-col items-center gap-4 relative z-10 w-full md:w-auto md:flex-1 md:min-w-0">
          {/* Mobile Top Bar */}
          <div className="md:hidden flex justify-between items-center w-full px-4 glass-panel py-2 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Globe className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">{opponentName || 'Opponent'}</span>
                <span className="text-[10px] text-emerald-400">{opponentElo} ELO</span>
              </div>
            </div>
            <ChessClock className="scale-75 origin-right" />
          </div>

          {/* Board + Desktop Clock Container */}
          <div className="flex items-stretch justify-center gap-3 md:gap-4 w-full mt-2 md:mt-0">
            <div className="flex flex-col justify-center min-w-0" style={{ width: 'min(95vh, calc(100% - 110px))' }}>
              <div className="w-full aspect-square relative">
                <Board />
              </div>
            </div>
            <div className="hidden md:flex flex-col justify-between flex-shrink-0 w-[90px] py-1">
              <ChessClock className="h-full justify-between" />
            </div>
          </div>
        </div>

        {/* RIGHT PANEL — Move List */}
        <div className="hidden md:flex flex-col w-64 h-[600px] glass-card rounded-2xl p-6 relative z-10" style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }}>
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
