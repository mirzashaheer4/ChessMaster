import React from 'react';
import { motion } from 'framer-motion';
import type { MoveAnalysis, MoveClassification } from '../../../core/utils/analysisEngine';

interface AnalysisSummaryProps {
  analysis: MoveAnalysis[];
  playerColor: 'white' | 'black';
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
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        {/* Background circle */}
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="48"
            cy="48"
            r="40"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-gray-700"
          />
          <motion.circle
            cx="48"
            cy="48"
            r="40"
            stroke={color}
            strokeWidth="8"
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
          <span className="text-2xl font-bold text-white">{accuracy}</span>
          <span className="text-xs text-gray-400">%</span>
        </div>
      </div>
      <span className="mt-2 text-sm font-medium text-gray-300">{label}</span>
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
      <span className={`${color} font-bold text-sm`}>{symbol}</span>
      <span className="text-sm text-gray-300">{label}</span>
    </div>
    <span className="text-sm font-medium text-white">{count}</span>
  </div>
);

/**
 * Chess.com-style analysis summary
 * Shows accuracy gauges and move breakdown
 */
export const AnalysisSummary: React.FC<AnalysisSummaryProps> = ({
  analysis,
  playerColor,
}) => {
  const isWhite = playerColor === 'white';
  const playerAccuracy = calculateAccuracy(analysis, isWhite);
  const opponentAccuracy = calculateAccuracy(analysis, !isWhite);
  const counts = countByClassification(analysis, isWhite);
  
  // Determine accuracy color
  const getAccuracyColor = (acc: number): string => {
    if (acc >= 90) return '#96bc4b'; // Green
    if (acc >= 70) return '#f7c631'; // Yellow
    if (acc >= 50) return '#e58f2a'; // Orange
    return '#ca3431'; // Red
  };

  return (
    <div className="bg-black/40 rounded-xl p-4 backdrop-blur-sm border border-white/10">
      {/* Accuracy Section */}
      <div className="flex justify-around mb-6">
        <AccuracyGauge 
          accuracy={playerAccuracy} 
          label="You" 
          color={getAccuracyColor(playerAccuracy)}
        />
        <AccuracyGauge 
          accuracy={opponentAccuracy} 
          label="Opponent" 
          color={getAccuracyColor(opponentAccuracy)}
        />
      </div>
      
      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-4" />
      
      {/* Move Breakdown */}
      <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">
        Your Moves
      </h3>
      
      <div className="space-y-0.5">
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
  );
};

export default AnalysisSummary;
