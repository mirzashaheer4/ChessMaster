import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface EvaluationBarProps {
  evaluation: number; // centipawns, positive = white advantage
  mateIn?: number | null; // if mate is found
  playerColor?: 'white' | 'black';
}

/**
 * Chess.com-style vertical evaluation bar
 * Engine-grade UI with perspective awareness and smooth animations
 */
export const EvaluationBar: React.FC<EvaluationBarProps> = ({ 
  evaluation, 
  mateIn = null,
  playerColor = 'white',
}) => {
  const prevEvalRef = useRef<number>(evaluation);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
    }
    prevEvalRef.current = evaluation;
  }, [evaluation]);

  // 1️⃣ Clamp centipawns to prevent animation spikes
  const cappedCp = Math.max(-2000, Math.min(2000, evaluation));

  // 2️⃣ Sigmoid with improved sensitivity (divisor 250)
  const evalToPercent = (cp: number): number => {
    if (mateIn !== null) {
      // 3️⃣ Mate handling
      if (mateIn > 0) return 100;
      if (mateIn < 0) return 0;
      // mateIn === 0: checkmate already happened
      if (cp > 0) return 100;
      if (cp < 0) return 0;
      // fallback: side-to-move just lost, assume black won
      return 0;
    }
    const sigmoid = 1 / (1 + Math.exp(-cp / 250));
    return sigmoid * 100;
  };

  const whitePercent = evalToPercent(cappedCp);

  // 4️⃣ Player perspective flip
  const finalPercent = playerColor === 'black' ? 100 - whitePercent : whitePercent;

  // 5️⃣ Dominance threshold
  const dominanceThreshold = 30; // 0.30 pawns
  const isSignificantAdvantage = Math.abs(cappedCp) >= dominanceThreshold || mateIn !== null;

  // 6️⃣ Evaluation text formatting
  const formatEval = (): string => {
    if (mateIn !== null) {
      if (mateIn === 0) return 'Checkmate';
      return `M${mateIn}`;
    }
    const pawns = cappedCp / 100;
    // Sanitize floating precision and avoid -0.0
    const rounded = Math.round(pawns * 10) / 10;
    const display = rounded === 0 ? 0 : rounded;
    if (display >= 0) {
      return `+${display.toFixed(1)}`;
    }
    return display.toFixed(1);
  };

  const evalText = formatEval();

  // Determine winning side for styling (respecting dominance threshold)
  const isWhiteWinning = isSignificantAdvantage && (
    (mateIn !== null && mateIn > 0) ||
    (mateIn !== null && mateIn === 0 && cappedCp > 0) ||
    (mateIn === null && cappedCp > 0)
  );

  // 7️⃣ Animation behavior: snap for large changes, spring for small
  const evalDelta = Math.abs(prevEvalRef.current - evaluation);
  const isMateTransition = mateIn !== null;

  const animationConfig = isMateTransition
    ? { type: 'tween' as const, duration: 0.15 }
    : evalDelta > 300
      ? { type: 'tween' as const, duration: 0.2, ease: 'easeOut' as const }
      : { type: 'spring' as const, stiffness: 120, damping: 18 };

  return (
    <div className="flex flex-col items-center h-full">
      {/* Evaluation text at top */}
      <div 
        className={`text-xs font-bold mb-1 px-1.5 py-0.5 rounded ${
          !isSignificantAdvantage
            ? 'bg-gray-700 text-gray-300'
            : isWhiteWinning 
              ? 'bg-white text-gray-900' 
              : 'bg-gray-900 text-white'
        }`}
      >
        {evalText}
      </div>
      
      {/* Evaluation bar */}
      <div className="relative w-6 flex-1 rounded-full overflow-hidden bg-gray-900 shadow-inner">
        {/* Black side (top) */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-800 to-gray-700" />
        
        {/* White side (bottom) - animated */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white to-gray-100"
          initial={{ height: '50%' }}
          animate={{ height: `${finalPercent}%` }}
          transition={animationConfig}
        />
        
        {/* Center line */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-500 opacity-50" />
      </div>
    </div>
  );
};

export default EvaluationBar;
