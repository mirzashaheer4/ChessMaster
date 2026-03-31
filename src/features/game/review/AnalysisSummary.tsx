import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { MoveAnalysis, MoveClassification } from '../../../core/utils/analysisEngine';

interface AnalysisSummaryProps {
  analysis: MoveAnalysis[];
  playerColor: 'white' | 'black';
  playerName?: string;
}

/**
 * Calculate accuracy from move analysis
 * Chess.com-style accuracy calculation
 */
function calculateAccuracy(moves: MoveAnalysis[], isWhite: boolean): number {
  const playerMoves = moves.filter((_, idx) => 
    isWhite ? idx % 2 === 0 : idx % 2 === 1
  );
  
  if (playerMoves.length === 0) return 100;
  
  // Weight moves by their quality
  let totalScore = 0;
  
  playerMoves.forEach(move => {
    switch (move.classification) {
      case 'great': totalScore += 100; break;
      case 'best': totalScore += 98; break;
      case 'good': totalScore += 90; break;
      case 'inaccuracy': totalScore += 60; break;
      case 'mistake': totalScore += 30; break;
      case 'blunder': totalScore += 0; break;
      case 'missed_win': totalScore += 20; break;
    }
  });
  
  return Math.round(totalScore / playerMoves.length);
}

/**
 * Count moves by classification
 */
function countByClassification(
  moves: MoveAnalysis[], 
  isWhite: boolean
): Record<MoveClassification, number> {
  const counts: Record<MoveClassification, number> = {
    great: 0,
    best: 0,
    good: 0,
    inaccuracy: 0,
    mistake: 0,
    blunder: 0,
    missed_win: 0,
  };
  
  moves.forEach((move, idx) => {
    const isPlayerMove = isWhite ? idx % 2 === 0 : idx % 2 === 1;
    if (isPlayerMove) {
      counts[move.classification]++;
    }
  });
  
  return counts;
}

/**
 * Circular accuracy gauge component
 */
const AccuracyGauge: React.FC<{ 
  accuracy: number; 
  label: string;
  color: string;
}> = ({ accuracy, label, color }) => {
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (accuracy / 100) * circumference;
  
  return (
    <div className="flex items-center gap-2 lg:flex-col lg:items-center">
      <div className="relative w-10 h-10 lg:w-24 lg:h-24 shrink-0">
        {/* Background circle */}
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 96 96">
          <circle
            cx="48"
            cy="48"
            r="40"
            stroke="currentColor"
            strokeWidth="10"
            fill="none"
            className="text-white/10"
          />
          <motion.circle
            cx="48"
            cy="48"
            r="40"
            stroke={color}
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        
        {/* Accuracy text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs lg:text-2xl font-bold text-white leading-none">{accuracy}</span>
        </div>
      </div>
      <div className="flex flex-col justify-center lg:items-center lg:mt-2">
        <span className="text-[11px] lg:text-sm font-semibold text-gray-300 truncate max-w-[70px] lg:max-w-none">{label}</span>
      </div>
    </div>
  );
};

/**
 * Move breakdown item
 */
const BreakdownItem: React.FC<{
  label: string;
  count: number;
  color: string;
  symbol: string;
}> = ({ label, count, color, symbol }) => (
  <div className="flex items-center justify-between py-1">
    <div className="flex items-center gap-2">
      <span className={`${color} font-bold text-[10px] w-3 text-center`}>{symbol}</span>
      <span className="text-xs text-gray-300">{label}</span>
    </div>
    <span className="text-xs font-semibold text-white">{count}</span>
  </div>
);

/**
 * Chess.com-style analysis summary
 * Shows accuracy gauges and move breakdown
 */
export const AnalysisSummary: React.FC<AnalysisSummaryProps> = ({
  analysis,
  playerColor,
  playerName = 'You'
}) => {
  const isWhite = playerColor === 'white';
  const playerAccuracy = calculateAccuracy(analysis, isWhite);
  const opponentAccuracy = calculateAccuracy(analysis, !isWhite);
  const counts = countByClassification(analysis, isWhite);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Determine accuracy color
  const getAccuracyColor = (acc: number): string => {
    if (acc >= 90) return '#96bc4b'; // Green
    if (acc >= 70) return '#f7c631'; // Yellow
    if (acc >= 50) return '#e58f2a'; // Orange
    return '#ca3431'; // Red
  };

  return (
    <div className="bg-black/40 rounded-xl p-2 lg:p-4 backdrop-blur-md border border-white/10 relative z-50">
      {/* Accuracy Section */}
      <div className="flex justify-between px-2 lg:justify-around mb-1 lg:mb-6">
        <AccuracyGauge 
          accuracy={playerAccuracy} 
          label={playerName} 
          color={getAccuracyColor(playerAccuracy)}
        />
        <div className="w-px bg-white/10 mx-2 lg:hidden" />
        <AccuracyGauge 
          accuracy={opponentAccuracy} 
          label="Opponent" 
          color={getAccuracyColor(opponentAccuracy)}
        />
      </div>
      
      {/* Mobile Accordion Toggle */}
      <div className="lg:hidden flex justify-center -mb-2 mt-1">
        <button 
          onClick={() => setIsExpanded(!isExpanded)} 
          className="p-1 px-4 text-gray-400 hover:text-[#e8b34b] transition-colors rounded-full hover:bg-white/5"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
        </button>
      </div>
      
      {/* Breakdown Area */}
      <div className={`
        lg:block /* Always visible on desktop */
        ${isExpanded ? 'block absolute top-full left-0 w-full mt-2 bg-[#0a0a0a]/95 backdrop-blur-xl rounded-xl border border-white/10 p-3 shadow-2xl z-50' : 'hidden'}
      `}>
        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-4 hidden lg:block" />
        
        {/* Move Breakdown */}
        <h3 className="text-[9px] lg:text-xs font-bold text-gray-500 mb-1 lg:mb-2 uppercase tracking-widest pl-1">
          {playerName}'s Moves
        </h3>
        
        <div className="space-y-0 p-1">
          {counts.great > 0 && (
            <BreakdownItem label="Great" count={counts.great} color="text-[#5c8bb0]" symbol="!" />
          )}
          <BreakdownItem label="Best" count={counts.best} color="text-[#96bc4b]" symbol="✓" />
          <BreakdownItem label="Good" count={counts.good} color="text-[#96bc4b]/60" symbol="" />
          <BreakdownItem label="Inaccuracy" count={counts.inaccuracy} color="text-[#f7c631]" symbol="?!" />
          <BreakdownItem label="Mistake" count={counts.mistake} color="text-[#e58f2a]" symbol="?" />
          <BreakdownItem label="Blunder" count={counts.blunder} color="text-[#ca3431]" symbol="??" />
        </div>
      </div>
    </div>
  );
};

export default AnalysisSummary;
