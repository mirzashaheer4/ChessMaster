import React from 'react';
import { useGameStore } from '../../../core/store/game';

interface ChessClockProps {
  className?: string;
  mode?: 'both' | 'top' | 'bottom';
}

// Format milliseconds to MM:SS
const formatTime = (ms: number): string => {
  if (ms <= 0) return '0:00';
  
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const ChessClock: React.FC<ChessClockProps> = ({ className = '', mode = 'both' }) => {
  const { 
    whiteTime, 
    blackTime, 
    clockRunning, 
    game,
    timeControl,
    playerColor,
    boardFlipped
  } = useGameStore();
  


  // Don't render if no time control
  if (!timeControl) return null;

  const currentTurn = game.turn();
  const isWhiteTurn = currentTurn === 'w';
  
  // Determine which clock should be on top based on board orientation
  // When playerColor is null (local mode), follow boardFlipped directly
  const showBlackOnTop = playerColor === null 
    ? !boardFlipped  // local mode: default white at bottom (black on top), flip swaps
    : boardFlipped ? playerColor === 'black' : playerColor === 'white';
  
  const whiteLow = whiteTime < 30000; // Less than 30 seconds
  const blackLow = blackTime < 30000;

  const ClockDisplay = ({ 
    time, 
    isActive, 
    isLow, 
  }: { 
    time: number; 
    isActive: boolean; 
    isLow: boolean; 
  }) => (
    <div 
      className={`
        px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-mono text-xl md:text-2xl font-bold transition-all
        ${isActive 
          ? isLow 
            ? 'bg-red-500/20 text-red-400 ring-2 ring-red-500 animate-pulse drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]' 
            : 'bg-[#D4AF37]/20 text-[#D4AF37] ring-2 ring-[#D4AF37] drop-shadow-[0_0_15px_rgba(212,175,55,0.6)]'
          : 'bg-zinc-800/50 text-zinc-400 border border-white/5'
        }
      `}
    >
      <div className="tabular-nums tracking-wider">{formatTime(time)}</div>
    </div>
  );

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {mode !== 'bottom' && (
        showBlackOnTop ? (
          <ClockDisplay time={blackTime} isActive={!isWhiteTurn && clockRunning} isLow={blackLow} />
        ) : (
          <ClockDisplay time={whiteTime} isActive={isWhiteTurn && clockRunning} isLow={whiteLow} />
        )
      )}
      {mode !== 'top' && (
        showBlackOnTop ? (
          <ClockDisplay time={whiteTime} isActive={isWhiteTurn && clockRunning} isLow={whiteLow} />
        ) : (
          <ClockDisplay time={blackTime} isActive={!isWhiteTurn && clockRunning} isLow={blackLow} />
        )
      )}
    </div>
  );
};

export default ChessClock;
