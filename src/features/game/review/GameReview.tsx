import { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';

import { useGameState, useSettings, useReview } from '../../../core/store/selectors';
import { useGameStore } from '../../../core/store/game';
import { Board } from '../board/Board';
import { EvaluationBar } from '../ui/EvaluationBar';
import { AnnotatedMoveList } from './AnnotatedMoveList';
import { AnalysisSummary } from './AnalysisSummary';
import { AnalysisEngine } from '../../../core/utils/analysisEngine';
import type { MoveAnalysis } from '../../../core/utils/analysisEngine';
import { reconstructGame } from '../../../core/utils/chess960';
import {
  ArrowLeft,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  BarChart3,
} from 'lucide-react';

import { useNavigate, useSearchParams } from 'react-router-dom';

/**
 * Game Review Screen — ChessMaster Theme
 */
export const GameReview = () => {
  const { history, startFen, castlingRights, historyLan } = useGameState();
  const { playerColor, chessType } = useSettings();
  const { currentGameAnalysis, setCurrentGameAnalysis } = useReview();
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const source = searchParams.get('source') || 'game';
  
  const handleBack = () => {
    if (source === 'history') {
      navigate('/history');
    } else if (source === 'game') {
      const mode = useGameStore.getState().mode;
      if (mode === 'ai') navigate('/game/ai');
      else if (mode === 'local') navigate('/game/local');
      else navigate('/dashboard');
    } else {
      navigate('/dashboard');
    }
  };
  
  // Restore review state from sessionStorage if store is empty (e.g. after page refresh)
  useEffect(() => {
    const storeHistory = useGameStore.getState().history;
    if (storeHistory.length === 0) {
      useGameStore.getState().restoreReviewState();
    }
  }, []);

  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [displayGame] = useState(() => new Chess());
  
  // ── Real Stockfish analysis state ──
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisFailed, setAnalysisFailed] = useState(false);
  const engineRef = useRef<AnalysisEngine | null>(null);
  const flipBoard = useGameStore(state => state.flipBoard);
  
  // Dedicated Stockfish worker for instant per-move evaluation (separate from game-wide analysis)
  const [reviewEval, setReviewEval] = useState(0);
  const [reviewMate, setReviewMate] = useState<number | null>(null);
  const [isEngineThinking, setIsEngineThinking] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  // Initialize dedicated worker
  const evalTurnRef = useRef<'w' | 'b'>('w'); // Turn for the position being evaluated

  useEffect(() => {
    const w = new Worker('/stockfish.js');
    workerRef.current = w;
    w.postMessage('uci');

    w.onmessage = (e: MessageEvent) => {
      const msg = e.data as string;
      
      // Handle bestmove — final engine arrow (overrides any pv-based arrow)
      if (msg.startsWith('bestmove')) {
        const moveString = msg.split(' ')[1];
        if (moveString && moveString !== '(none)') {
          const from = moveString.substring(0, 2);
          const to = moveString.substring(2, 4);
          useGameStore.getState().setEngineArrows([
            { from, to, color: 'rgba(0, 180, 100, 0.85)' }
          ]);
        }
        setIsEngineThinking(false);
        return;
      }
      
      if (!msg.startsWith('info')) return;
      
      // Only update the arrow from the FINAL bestmove response (not during intermediate depth searches)
      // Removing pv-based intermediate arrow updates prevents the confusing rapid arrow flickering
      // where the arrow keeps jumping between e.g. e4 → d4 → e4 as depth increases.
      
      let rawScore: number | null = null;
      let isMate = false;

      if (msg.includes('score mate')) {
        const match = msg.match(/score mate (-?\d+)/);
        if (match) { rawScore = parseInt(match[1]); isMate = true; }
      } else if (msg.includes('score cp')) {
        const match = msg.match(/score cp (-?\d+)/);
        if (match) { rawScore = parseInt(match[1]); }
      }

      if (rawScore !== null) {
        // Use the FEN-derived turn (stored when position was sent), NOT reviewIndex
        // Stockfish scores are ALWAYS from the side-to-move's perspective
        const turn = evalTurnRef.current;

        if (isMate) {
          const mateVal = turn === 'w' ? rawScore : -rawScore;
          setReviewMate(mateVal);
          setReviewEval(mateVal > 0 ? 10000 : -10000);
        } else {
          const evalVal = turn === 'w' ? rawScore : -rawScore;
          setReviewEval(evalVal);
          setReviewMate(null);
        }
      }
    };

    return () => {
      w.terminate();
      // Clear engine arrows when leaving review
      useGameStore.getState().setEngineArrows([]);
    };
  }, []);

  // Evaluate the current position instantly on every move change
  useEffect(() => {
    if (!workerRef.current) return;
    const w = workerRef.current;

    // Cancel any in-progress evaluation and clear stale arrow
    w.postMessage('stop');
    useGameStore.getState().setEngineArrows([]);

    // Build the FEN for the current position
    let targetFen: string;
    if (currentMoveIndex < 0) {
      // Start position
      targetFen = startFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    } else {
      if (chessType === 'chess960' && historyLan.length > 0) {
        const movesToReplay = historyLan.slice(0, currentMoveIndex + 1);
        const replayed = reconstructGame('chess960', startFen, movesToReplay, castlingRights);
        targetFen = replayed.fen();
      } else {
        const tempGame = new Chess();
        for (let i = 0; i <= currentMoveIndex && i < history.length; i++) {
          try { tempGame.move(history[i]); } catch { break; }
        }
        targetFen = tempGame.fen();
      }
    }

    // Store the turn from the FEN so the onmessage handler uses the correct sign
    const fenTurn = targetFen.split(' ')[1] as 'w' | 'b';
    evalTurnRef.current = fenTurn;

    setIsEngineThinking(true);
    w.postMessage(`position fen ${targetFen}`);
    w.postMessage('go depth 12');
  }, [currentMoveIndex, history, chessType, startFen, castlingRights, historyLan]);

  // ── Trigger real Stockfish game-wide analysis on mount ──
  useEffect(() => {
    // Skip if we already have analysis (e.g. coming back from navigation)
    if (currentGameAnalysis && currentGameAnalysis.length > 0) return;
    if (history.length === 0) return;

    let cancelled = false;
    const engine = new AnalysisEngine();
    engineRef.current = engine;

    const runAnalysis = async () => {
      setIsAnalyzing(true);
      setAnalysisProgress(0);
      setAnalysisFailed(false);

      try {
        await engine.init();
        if (cancelled) return;

        const results = await engine.analyzeGame(
          history,
          // Progress callback
          (current, total) => {
            if (!cancelled) setAnalysisProgress(Math.round((current / total) * 100));
          },
          // Streaming callback — update store with partial results so UI shows moves immediately
          (partialAnalyses) => {
            if (!cancelled) setCurrentGameAnalysis(partialAnalyses);
          },
        );

        if (!cancelled && results.length > 0) {
          setCurrentGameAnalysis(results);
        }
      } catch (err) {
        console.error('Game analysis failed:', err);
        if (!cancelled) setAnalysisFailed(true);
      } finally {
        if (!cancelled) setIsAnalyzing(false);
        engine.terminate();
      }
    };

    runAnalysis();

    return () => {
      cancelled = true;
      engine.terminate();
    };
  }, []); // Run once on mount

  // The analysis data — use real results if available, empty array while loading
  const analysis: MoveAnalysis[] = currentGameAnalysis && currentGameAnalysis.length > 0
    ? currentGameAnalysis
    : [];
  
  // Sync local navigation state to the global store so <Board /> re-renders
  useEffect(() => {
    // GameReview: -1 = start (no moves) → Store: -2 = start
    // GameReview: 0+ = after move N   → Store: 0+ = after move N
    const storeIndex = currentMoveIndex < 0 ? -2 : currentMoveIndex;
    useGameStore.getState().setReviewIndex(storeIndex);
  }, [currentMoveIndex]);



  useEffect(() => {
    if (chessType === 'chess960' && historyLan.length > 0) {
      // For Chess960, use reconstructGame which handles castling moves
      const movesToReplay = historyLan.slice(0, currentMoveIndex + 1);
      const replayed = reconstructGame('chess960', startFen, movesToReplay, castlingRights);
      // Load the replayed position into displayGame for rendering
      try { displayGame.load(replayed.fen()); } catch { /* fallback */ }
    } else {
      // Standard chess — use simple SAN replay
      displayGame.reset();
      for (let i = 0; i <= currentMoveIndex && i < history.length; i++) {
        try { displayGame.move(history[i]); } catch { /* skip */ }
      }
    }
  }, [currentMoveIndex, history, displayGame, chessType, startFen, castlingRights, historyLan]);
  
  const goToStart = () => setCurrentMoveIndex(-1);
  const goToEnd = () => setCurrentMoveIndex(history.length - 1);
  const goToPrev = () => setCurrentMoveIndex(prev => Math.max(-1, prev - 1));
  const goToNext = () => setCurrentMoveIndex(prev => Math.min(history.length - 1, prev + 1));
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft': goToPrev(); break;
        case 'ArrowRight': goToNext(); break;
        case 'Home': goToStart(); break;
        case 'End': goToEnd(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navBtnClass = "p-3 rounded-xl glass-card text-gray-400 hover:text-[#e8b34b] hover:bg-[#e8b34b]/5 transition-all duration-200";

  return (
    <div
      className="h-screen flex flex-col p-4 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0a0a0a 0%, #0f0f1a 30%, #0a0a0a 60%, #0f0f1a 100%)',
      }}
    >
      {/* Background Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-[#e8b34b]/5 rounded-full blur-[100px]" />
      </div>

      {/* Header - Made absolute to free up vertical space for 95vh board */}
      <div className="absolute top-4 left-20 z-50">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-300 group bg-black/40 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/5"
        >
          <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
          <span className="text-sm font-medium">Back</span>
        </button>
      </div>

      {/* ============================================== */}
      {/* DESKTOP LAYOUT (Original 3-Column)             */}
      {/* ============================================== */}
      <div className="hidden lg:flex flex-1 gap-4 min-h-0 w-full relative z-10 pt-16 md:pt-0">
        {/* Left: Evaluation Bar */}
        <div className="w-10 flex-shrink-0 flex items-center">
          <EvaluationBar 
            evaluation={reviewEval} 
            mateIn={reviewMate}
            playerColor={playerColor || 'white'}
          />
        </div>
        
        {/* Center: Board */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-0">
          <div className="flex-1 min-h-0 w-full flex items-center justify-center">
            <div className="flex flex-col justify-center min-w-0" style={{ width: 'min(95vh, 100%)' }}>
              <div className="w-full aspect-square relative">
                <Board />
              </div>
            </div>
          </div>
        </div>
        
        {/* Right: Analysis Panel */}
        <div className="w-[320px] lg:w-[360px] flex-shrink-0 flex flex-col gap-4 min-h-0">
          
          {/* Game Review Header (Moved from Center) */}
          <div className="glass-card p-4 rounded-xl flex flex-col gap-3 flex-shrink-0" style={{ border: '1px solid rgba(232, 179, 75, 0.1)' }}>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#e8b34b]" />
              <h1 className="text-xl font-bold font-['Montserrat'] text-gold-gradient flex-1">
                Game Review
              </h1>
              
              <div className="flex items-center gap-2 ml-auto">
                {(isEngineThinking || isAnalyzing) && (
                  <div className="w-4 h-4 rounded-full border-2 border-[#e8b34b]/30 border-t-[#e8b34b] animate-spin" title="Engine analyzing..." />
                )}
                <button
                  onClick={flipBoard}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-[#e8b34b] hover:bg-white/5 transition-colors"
                  title="Flip Board"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {isAnalyzing && (
              <div className="w-full">
                <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                  <span>Analyzing game...</span>
                  <span>{analysisProgress}%</span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#e8b34b] to-[#f0c960] transition-all duration-300"
                    style={{ width: `${analysisProgress}%` }}
                  />
                </div>
              </div>
            )}
            
            {analysisFailed && analysis.length === 0 && (
              <div className="text-xs text-red-500/80 italic">
                Analysis unavailable
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="flex-shrink-0">
            <AnalysisSummary 
              analysis={analysis}
              playerColor={playerColor || 'white'}
            />
          </div>
          
          {/* Move List & Controls */}
          <div className="flex-1 min-h-0 glass-card rounded-xl p-4 flex flex-col gap-3" style={{ border: '1px solid rgba(232, 179, 75, 0.1)' }}>
             <h3 className="text-[10px] font-semibold text-[#e8b34b] uppercase tracking-wider font-['Montserrat'] flex-shrink-0">
               Moves
             </h3>
             <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
               <AnnotatedMoveList
                 moves={analysis}
                 currentMoveIndex={currentMoveIndex}
                 onMoveClick={setCurrentMoveIndex}
               />
             </div>
             
             {/* Navigation Controls (Moved from Center) */}
             <div className="flex items-center justify-between gap-1 mt-auto pt-3 border-t border-white/5 flex-shrink-0">
                 <button onClick={goToStart} title="Start" className={navBtnClass} style={{ border: '1px solid rgba(232, 179, 75, 0.1)' }}>
                   <ChevronsLeft className="w-4 h-4" />
                 </button>
                 <button onClick={goToPrev} title="Previous" className={navBtnClass} style={{ border: '1px solid rgba(232, 179, 75, 0.1)' }}>
                   <ChevronLeft className="w-4 h-4" />
                 </button>
                 
                 <div className="px-3 py-2 glass-card rounded-xl text-white font-mono text-sm" style={{ border: '1px solid rgba(232, 179, 75, 0.1)' }}>
                   <span className="text-[#e8b34b] font-bold">{currentMoveIndex + 1}</span><span className="text-gray-500 mx-1">/</span>{history.length}
                 </div>
                 
                 <button onClick={goToNext} title="Next" className={navBtnClass} style={{ border: '1px solid rgba(232, 179, 75, 0.1)' }}>
                   <ChevronRight className="w-4 h-4" />
                 </button>
                 <button onClick={goToEnd} title="End" className={navBtnClass} style={{ border: '1px solid rgba(232, 179, 75, 0.1)' }}>
                   <ChevronsRight className="w-4 h-4" />
                 </button>
             </div>
          </div>
        </div>
        </div>
      </div>

      {/* ============================================== */}
      {/* MOBILE LAYOUT                                  */}
      {/* ============================================== */}
      <div className="flex lg:hidden flex-col flex-1 w-full relative z-10 pt-4 md:pt-12 min-h-0 pb-2">
        
        {/* Top Header */}
        <div className="flex items-center justify-between mb-2 shrink-0">
            <h1 className="text-xl font-bold font-['Montserrat'] text-gold-gradient flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#e8b34b]" /> Game Review
            </h1>
            <div className="flex items-center gap-2">
              {(isEngineThinking || isAnalyzing) && (
                <div className="w-4 h-4 rounded-full border-2 border-[#e8b34b]/30 border-t-[#e8b34b] animate-spin" title="Engine analyzing..." />
              )}
              <button onClick={flipBoard} className="p-1.5 rounded-lg text-gray-400 hover:text-[#e8b34b] hover:bg-white/5 transition-colors" title="Flip Board">
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
        </div>
        
        {/* Analyzing Progress */}
        {isAnalyzing && (
          <div className="w-full mb-2 shrink-0">
            <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
              <span>Analyzing game...</span>
              <span>{analysisProgress}%</span>
            </div>
            <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#e8b34b] to-[#f0c960] transition-all duration-300"
                style={{ width: `${analysisProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Stats Panel (Accuracy Circles + Dropdown Overlay) */}
        <div className="mb-2 shrink-0 relative z-[60]">
          <AnalysisSummary analysis={analysis} playerColor={playerColor || 'white'} />
        </div>

        {/* Horizontal Evaluation Bar */}
        <div className="mb-2 shrink-0 relative z-10">
          <div className="flex justify-end items-center text-[10px] font-bold mb-1">
            <span className={reviewMate !== null ? (reviewEval > 0 ? 'text-[#e8b34b]' : 'text-gray-400') : reviewEval > 0 ? 'text-[#e8b34b]' : reviewEval < 0 ? 'text-gray-400' : 'text-gray-500'}>
              {reviewMate !== null ? (reviewMate === 0 ? 'Checkmate' : `M${reviewMate}`) : (reviewEval > 0 ? `+${(reviewEval/100).toFixed(1)}` : (reviewEval/100).toFixed(1))}
            </span>
          </div>
          <div className="h-1.5 w-full bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-full overflow-hidden relative border border-[#e8b34b]/10">
            <div 
              className={`absolute top-0 bottom-0 transition-all duration-1000 ease-out rounded-full ${(reviewMate !== null && reviewEval > 0) || (reviewMate === null && reviewEval > 0) ? 'bg-gradient-to-r from-[#e8b34b] to-[#d4a03d]' : 'bg-gradient-to-l from-gray-500 to-gray-600'}`}
              style={{ 
                width: reviewMate !== null ? '50%' : `${Math.min(50, Math.abs(reviewEval) / 20)}%`,
                left: reviewEval > 0 ? '50%' : undefined,
                right: reviewEval < 0 ? '50%' : undefined,
                boxShadow: reviewEval > 0 ? '0 0 10px rgba(232, 179, 75, 0.4)' : 'none'
              }} 
            />
            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-[#e8b34b]/20" />
          </div>
        </div>
        
        {/* Board */}
        <div className="flex-1 min-h-[300px] w-full flex items-center justify-center relative z-10">
          <div className="w-full aspect-square relative mx-auto max-w-[95vh]">
            <Board />
          </div>
        </div>

        {/* Sliding Horizontal Move List */}
        <div className="w-full h-12 my-2 shrink-0 overflow-x-auto whitespace-nowrap custom-scrollbar flex items-center bg-[#0a0a0a]/60 rounded-xl px-2 border border-white/10 relative z-10 shadow-inner">
           {history.length === 0 && <span className="text-gray-500 text-[11px] italic mx-auto">No moves yet...</span>}
           {history.map((moveSAN, index) => {
             const moveData = analysis[index];
             const isActive = index === currentMoveIndex;
             
             let symbol = '';
             let symbolColor = '';
             if (moveData?.classification === 'great') { symbol = '!'; symbolColor = 'text-[#5c8bb0]'; }
             else if (moveData?.classification === 'best') { symbol = '✓'; symbolColor = 'text-[#96bc4b]'; }
             else if (moveData?.classification === 'inaccuracy') { symbol = '?!'; symbolColor = 'text-[#f7c631]'; }
             else if (moveData?.classification === 'mistake') { symbol = '?'; symbolColor = 'text-[#e58f2a]'; }
             else if (moveData?.classification === 'blunder') { symbol = '??'; symbolColor = 'text-[#ca3431]'; }
             
             // Auto-scroll logic: add id to active element
             return (
                <button 
                  key={index} 
                  id={isActive ? 'active-mobile-move' : ''}
                  onClick={() => setCurrentMoveIndex(index)}
                  className={`flex-shrink-0 px-2.5 py-1.5 mx-1 rounded-lg text-sm font-mono font-bold transition-colors flex items-center gap-1 border border-transparent ${
                    isActive ? 'bg-[#e8b34b] text-black shadow-[0_0_15px_rgba(232,179,75,0.4)] border-[#fcd34d]' : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <span className={isActive ? 'text-black/60 text-xs' : 'text-gray-500 text-xs'}>
                    {index % 2 === 0 ? `${(index/2)+1}.` : ''}
                  </span>
                  <span>{moveSAN}</span>
                  {symbol && <span className={`text-[10px] ${isActive && symbolColor !== 'text-[#ca3431]' && symbolColor !== 'text-[#5c8bb0]' ? 'text-black font-extrabold' : symbolColor}`}>{symbol}</span>}
                </button>
             )
           })}
        </div>

        {/* Navigation Arrows */}
        <div className="flex items-center justify-between gap-2 w-full shrink-0 relative z-10 mb-2">
             <button onClick={goToStart} title="Start" className="p-3 md:p-4 rounded-xl text-gray-400 hover:text-[#e8b34b] transition-all bg-[#0a0a0a]/60 border border-white/10 flex-shrink-0"> <ChevronsLeft className="w-5 h-5" /> </button>
             <button onClick={goToPrev} title="Previous" className="p-3 md:p-4 rounded-xl text-gray-400 hover:text-[#e8b34b] transition-all bg-[#0a0a0a]/60 border border-white/10 flex-shrink-0"> <ChevronLeft className="w-5 h-5" /> </button>
             
             <div className="px-3 py-3 md:py-4 rounded-xl text-white font-mono text-sm border-white/10 border flex-1 text-center font-bold bg-[#0a0a0a]/60 flex items-center justify-center">
               <span className="text-[#e8b34b]">{currentMoveIndex + 1}</span><span className="text-gray-500 mx-1">/</span>{history.length}
             </div>
             
             <button onClick={goToNext} title="Next" className="p-3 md:p-4 rounded-xl text-gray-400 hover:text-[#e8b34b] transition-all bg-[#0a0a0a]/60 border border-white/10 flex-shrink-0"> <ChevronRight className="w-5 h-5" /> </button>
             <button onClick={goToEnd} title="End" className="p-3 md:p-4 rounded-xl text-gray-400 hover:text-[#e8b34b] transition-all bg-[#0a0a0a]/60 border border-white/10 flex-shrink-0"> <ChevronsRight className="w-5 h-5" /> </button>
        </div>
      </div>

      {/* ============================================== */}
      {/* MOBILE LAYOUT                                  */}
      {/* ============================================== */}
      <div className="flex lg:hidden flex-col flex-1 w-full relative z-10 pt-4 md:pt-12 min-h-0 pb-2">
        
        {/* Top Header */}
        <div className="flex items-center justify-between mb-2 shrink-0">
            <h1 className="text-xl font-bold font-['Montserrat'] text-gold-gradient flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#e8b34b]" /> Game Review
            </h1>
            <div className="flex items-center gap-2">
              {(isEngineThinking || isAnalyzing) && (
                <div className="w-4 h-4 rounded-full border-2 border-[#e8b34b]/30 border-t-[#e8b34b] animate-spin" title="Engine analyzing..." />
              )}
              <button onClick={flipBoard} className="p-1.5 rounded-lg text-gray-400 hover:text-[#e8b34b] hover:bg-white/5 transition-colors" title="Flip Board">
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
        </div>
        
        {/* Analyzing Progress */}
        {isAnalyzing && (
          <div className="w-full mb-2 shrink-0">
            <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
              <span>Analyzing game...</span>
              <span>{analysisProgress}%</span>
            </div>
            <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#e8b34b] to-[#f0c960] transition-all duration-300"
                style={{ width: `${analysisProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Stats Panel (Accuracy Circles + Dropdown Overlay) */}
        <div className="mb-2 shrink-0 relative z-[60]">
          <AnalysisSummary analysis={analysis} playerColor={playerColor || 'white'} />
        </div>

        {/* Horizontal Evaluation Bar */}
        <div className="mb-2 shrink-0 relative z-10">
          <div className="flex justify-end items-center text-[10px] font-bold mb-1">
            <span className={reviewMate !== null ? (reviewEval > 0 ? 'text-[#e8b34b]' : 'text-gray-400') : reviewEval > 0 ? 'text-[#e8b34b]' : reviewEval < 0 ? 'text-gray-400' : 'text-gray-500'}>
              {reviewMate !== null ? (reviewMate === 0 ? 'Checkmate' : `M${reviewMate}`) : (reviewEval > 0 ? `+${(reviewEval/100).toFixed(1)}` : (reviewEval/100).toFixed(1))}
            </span>
          </div>
          <div className="h-1.5 w-full bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-full overflow-hidden relative border border-[#e8b34b]/10">
            <div 
              className={`absolute top-0 bottom-0 transition-all duration-1000 ease-out rounded-full ${(reviewMate !== null && reviewEval > 0) || (reviewMate === null && reviewEval > 0) ? 'bg-gradient-to-r from-[#e8b34b] to-[#d4a03d]' : 'bg-gradient-to-l from-gray-500 to-gray-600'}`}
              style={{ 
                width: reviewMate !== null ? '50%' : `${Math.min(50, Math.abs(reviewEval) / 20)}%`,
                left: reviewEval > 0 ? '50%' : undefined,
                right: reviewEval < 0 ? '50%' : undefined,
                boxShadow: reviewEval > 0 ? '0 0 10px rgba(232, 179, 75, 0.4)' : 'none'
              }} 
            />
            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-[#e8b34b]/20" />
          </div>
        </div>
        
        {/* Board */}
        <div className="flex-1 min-h-[300px] w-full flex items-center justify-center relative z-10">
          <div className="w-full aspect-square relative mx-auto max-w-[95vh]">
            <Board />
          </div>
        </div>

        {/* Sliding Horizontal Move List */}
        <div className="w-full h-12 my-2 shrink-0 overflow-x-auto whitespace-nowrap custom-scrollbar flex items-center bg-[#0a0a0a]/60 rounded-xl px-2 border border-white/10 relative z-10 shadow-inner">
           {history.length === 0 && <span className="text-gray-500 text-[11px] italic mx-auto">No moves yet...</span>}
           {history.map((moveSAN, index) => {
             const moveData = analysis[index];
             const isActive = index === currentMoveIndex;
             
             let symbol = '';
             let symbolColor = '';
             if (moveData?.classification === 'great') { symbol = '!'; symbolColor = 'text-[#5c8bb0]'; }
             else if (moveData?.classification === 'best') { symbol = '✓'; symbolColor = 'text-[#96bc4b]'; }
             else if (moveData?.classification === 'inaccuracy') { symbol = '?!'; symbolColor = 'text-[#f7c631]'; }
             else if (moveData?.classification === 'mistake') { symbol = '?'; symbolColor = 'text-[#e58f2a]'; }
             else if (moveData?.classification === 'blunder') { symbol = '??'; symbolColor = 'text-[#ca3431]'; }
             
             // Auto-scroll logic: add id to active element
             return (
                <button 
                  key={index} 
                  id={isActive ? 'active-mobile-move' : ''}
                  onClick={() => setCurrentMoveIndex(index)}
                  className={`flex-shrink-0 px-2.5 py-1.5 mx-1 rounded-lg text-sm font-mono font-bold transition-colors flex items-center gap-1 border border-transparent ${
                    isActive ? 'bg-[#e8b34b] text-black shadow-[0_0_15px_rgba(232,179,75,0.4)] border-[#fcd34d]' : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <span className={isActive ? 'text-black/60 text-xs' : 'text-gray-500 text-xs'}>
                    {index % 2 === 0 ? `${(index/2)+1}.` : ''}
                  </span>
                  <span>{moveSAN}</span>
                  {symbol && <span className={`text-[10px] ${isActive && symbolColor !== 'text-[#ca3431]' && symbolColor !== 'text-[#5c8bb0]' ? 'text-black font-extrabold' : symbolColor}`}>{symbol}</span>}
                </button>
             )
           })}
        </div>

        {/* Navigation Arrows */}
        <div className="flex items-center justify-between gap-2 w-full shrink-0 relative z-10 mb-2">
             <button onClick={goToStart} title="Start" className="p-3 md:p-4 rounded-xl text-gray-400 hover:text-[#e8b34b] transition-all bg-[#0a0a0a]/60 border border-white/10 flex-shrink-0"> <ChevronsLeft className="w-5 h-5" /> </button>
             <button onClick={goToPrev} title="Previous" className="p-3 md:p-4 rounded-xl text-gray-400 hover:text-[#e8b34b] transition-all bg-[#0a0a0a]/60 border border-white/10 flex-shrink-0"> <ChevronLeft className="w-5 h-5" /> </button>
             
             <div className="px-3 py-3 md:py-4 rounded-xl text-white font-mono text-sm border-white/10 border flex-1 text-center font-bold bg-[#0a0a0a]/60 flex items-center justify-center">
               <span className="text-[#e8b34b]">{currentMoveIndex + 1}</span><span className="text-gray-500 mx-1">/</span>{history.length}
             </div>
             
             <button onClick={goToNext} title="Next" className="p-3 md:p-4 rounded-xl text-gray-400 hover:text-[#e8b34b] transition-all bg-[#0a0a0a]/60 border border-white/10 flex-shrink-0"> <ChevronRight className="w-5 h-5" /> </button>
             <button onClick={goToEnd} title="End" className="p-3 md:p-4 rounded-xl text-gray-400 hover:text-[#e8b34b] transition-all bg-[#0a0a0a]/60 border border-white/10 flex-shrink-0"> <ChevronsRight className="w-5 h-5" /> </button>
        </div>
      </div>
    </div>
  );
};

export default GameReview;
