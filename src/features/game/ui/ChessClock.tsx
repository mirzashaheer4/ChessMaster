import React from 'react';
import { useGameStore } from '../../../core/store/game';

interface ChessClockProps {
  className?: string;
}

// Format milliseconds to MM:SS
const formatTime = (ms: number): string => {
  if (ms <= 0) return '0:00';
  
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const ChessClock: React.FC<ChessClockProps> = ({ className = '' }) => {
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
    : boardFlipped ? playerColor !== 'black' : playerColor === 'black';
  
  const whiteLow = whiteTime < 30000; // Less than 30 seconds
  const blackLow = blackTime < 30000;

  const ClockDisplay = ({ 
    time, 
    isActive, 
    isLow, 
    label 
  }: { 
    time: number; 
    isActive: boolean; 
    isLow: boolean; 
    label: string;
  }) => (
    <div 
      className={`
        px-4 py-2 rounded-lg font-mono text-lg font-bold transition-all
        ${isActive 
          ? isLow 
            ? 'bg-red-500/20 text-red-400 ring-2 ring-red-500 animate-pulse' 
            : 'bg-[#D4AF37]/20 text-[#D4AF37] ring-2 ring-[#D4AF37]'
          : 'bg-zinc-800/50 text-zinc-400'
        }
      `}
    >
      <div className="text-[10px] uppercase tracking-wider opacity-60 mb-0.5">{label}</div>
      <div className="text-xl tabular-nums">{formatTime(time)}</div>
    </div>
  );

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {showBlackOnTop ? (
        <>
          <ClockDisplay time={blackTime} isActive={!isWhiteTurn && clockRunning} isLow={blackLow} label="Black" />
          <ClockDisplay time={whiteTime} isActive={isWhiteTurn && clockRunning} isLow={whiteLow} label="White" />
        </>
      ) : (
        <>
          <ClockDisplay time={whiteTime} isActive={isWhiteTurn && clockRunning} isLow={whiteLow} label="White" />
          <ClockDisplay time={blackTime} isActive={!isWhiteTurn && clockRunning} isLow={blackLow} label="Black" />
        </>
      )}
    </div>
  );
};

export default ChessClock;
