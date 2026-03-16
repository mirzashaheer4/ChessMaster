import React from 'react';
import { motion } from 'framer-motion';
import type { MoveAnalysis, MoveClassification } from '../../../core/utils/analysisEngine';

interface AnnotatedMoveListProps {
  moves: MoveAnalysis[];
  currentMoveIndex: number;
  onMoveClick: (index: number) => void;
}

/**
 * Move classification styling - Chess.com colors
 */
const classificationStyles: Record<MoveClassification, { 
  bg: string; 
  text: string; 
  symbol: string;
  label: string;
}> = {
  great: { 
    bg: 'bg-[#5c8bb0]', 
    text: 'text-[#5c8bb0]', 
    symbol: '!',
    label: 'Great'
  },
  best: { 
    bg: 'bg-[#96bc4b]', 
    text: 'text-[#96bc4b]', 
    symbol: '✓',
    label: 'Best'
  },
  good: { 
    bg: 'bg-[#96bc4b]/60', 
    text: 'text-[#96bc4b]/80', 
    symbol: '',
    label: 'Good'
  },
  inaccuracy: { 
    bg: 'bg-[#f7c631]', 
    text: 'text-[#f7c631]', 
    symbol: '?!',
    label: 'Inaccuracy'
  },
  mistake: { 
    bg: 'bg-[#e58f2a]', 
    text: 'text-[#e58f2a]', 
    symbol: '?',
    label: 'Mistake'
  },
  blunder: { 
    bg: 'bg-[#ca3431]', 
    text: 'text-[#ca3431]', 
    symbol: '??',
    label: 'Blunder'
  },
  missed_win: {
    bg: 'bg-[#e58f2a]',
    text: 'text-[#e58f2a]',
    symbol: '!?',
    label: 'Missed Win'
  },
};

/**
 * Single move item in the list
 */
const MoveItem: React.FC<{
  analysis: MoveAnalysis;
  isWhite: boolean;
  isCurrent: boolean;
  onClick: () => void;
}> = ({ analysis, isWhite, isCurrent, onClick }) => {
  const style = classificationStyles[analysis.classification];
  const showSymbol = ['great', 'best', 'inaccuracy', 'mistake', 'blunder'].includes(analysis.classification);
  
  return (
    <motion.button
      onClick={onClick}
      className={`
        flex items-center gap-1.5 px-2 py-1 rounded-md text-sm font-medium
        transition-all duration-150 min-w-[60px]
        ${isCurrent 
          ? 'bg-amber-500/30 ring-1 ring-amber-400' 
          : 'hover:bg-white/10'
        }
        ${isWhite ? 'text-white' : 'text-gray-300'}
      `}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Move notation */}
      <span className="font-mono">{analysis.move}</span>
      
      {/* Classification symbol */}
      {showSymbol && (
        <span 
          className={`${style.text} text-xs font-bold`}
          title={style.label}
        >
          {style.symbol}
        </span>
      )}
    </motion.button>
  );
};

/**
 * Chess.com-style annotated move list
 * Shows moves with color-coded classifications
 */
export const AnnotatedMoveList: React.FC<AnnotatedMoveListProps> = ({
  moves,
  currentMoveIndex,
  onMoveClick,
}) => {
  // Group moves into pairs (white, black)
  const movePairs: Array<{ 
    moveNumber: number; 
    white?: MoveAnalysis; 
    black?: MoveAnalysis;
    whiteIndex?: number;
    blackIndex?: number;
  }> = [];

  moves.forEach((move, index) => {
    const moveNumber = Math.floor(index / 2) + 1;
    const isWhite = index % 2 === 0;
    
    if (isWhite) {
      movePairs.push({ 
        moveNumber, 
        white: move, 
        whiteIndex: index 
      });
    } else {
      const lastPair = movePairs[movePairs.length - 1];
      if (lastPair) {
        lastPair.black = move;
        lastPair.blackIndex = index;
      }
    }
  });

  return (
    <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
      <div className="space-y-1">
        {movePairs.map((pair) => (
          <div 
            key={pair.moveNumber} 
            className="flex items-center gap-2"
          >
            {/* Move number */}
            <span className="w-6 text-right text-xs text-gray-500 font-mono">
              {pair.moveNumber}.
            </span>
            
            {/* White's move */}
            {pair.white && pair.whiteIndex !== undefined && (
              <MoveItem
                analysis={pair.white}
                isWhite={true}
                isCurrent={currentMoveIndex === pair.whiteIndex}
                onClick={() => onMoveClick(pair.whiteIndex!)}
              />
            )}
            
            {/* Black's move */}
            {pair.black && pair.blackIndex !== undefined && (
              <MoveItem
                analysis={pair.black}
                isWhite={false}
                isCurrent={currentMoveIndex === pair.blackIndex}
                onClick={() => onMoveClick(pair.blackIndex!)}
              />
            )}
          </div>
        ))}
      </div>
      
      {moves.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          No moves to display
        </div>
      )}
    </div>
  );
};

export default AnnotatedMoveList;
