import React from 'react';
import { BOARD_THEMES, type BoardTheme } from '../../../core/utils/themes';

export interface Arrow {
  from: string;
  to: string;
  color: string;
}

export interface Highlight {
  square: string;
  color: string;
}

interface BoardOverlayProps {
  squareSize: number;
  boardFlipped: boolean;
  playerColor: 'white' | 'black' | null;
  arrows: Arrow[];
  highlights: Highlight[];
  drawingArrow: { from: string; to: string; color: string } | null;
  theme: BoardTheme;
}

// Colors for right-click actions (exported for use in Board.tsx)
export const COLORS = {
  default: 'rgba(255, 170, 0, 0.8)',    // Orange (default)
  alt: 'rgba(0, 128, 255, 0.8)',        // Blue (Alt+right-click)
  ctrl: 'rgba(0, 255, 0, 0.8)',         // Green (Ctrl+right-click)
  shift: 'rgba(255, 0, 0, 0.8)',        // Red (Shift+right-click)
};

/**
 * Convert square notation (e.g., 'e4') to x/y coordinates
 */
export function squareToCoords(
  square: string, 
  squareSize: number, 
  flipped: boolean
): { x: number; y: number } {
  const file = square.charCodeAt(0) - 97; // 'a' = 0, 'b' = 1, etc.
  const rank = parseInt(square[1]) - 1;   // '1' = 0, '2' = 1, etc.
  
  const x = flipped ? (7 - file) : file;
  const y = flipped ? rank : (7 - rank);
  
  return {
    x: x * squareSize + squareSize / 2,
    y: y * squareSize + squareSize / 2,
  };
}

/**
 * Generate SVG path for arrow (straight or L-shaped for knights)
 */
function getArrowPath(
  fromX: number, 
  fromY: number, 
  toX: number, 
  toY: number, 
  squareSize: number
): string {
  const dx = Math.abs(toX - fromX);
  const dy = Math.abs(toY - fromY);
  
  // Check for Knight move geometry (approx 1x2 or 2x1 squares)
  // Allow small tolerance for floating point
  const isKnightMove = (
    (Math.abs(dx - squareSize) < 1 && Math.abs(dy - 2 * squareSize) < 1) || 
    (Math.abs(dx - 2 * squareSize) < 1 && Math.abs(dy - squareSize) < 1)
  );

  if (isKnightMove) {
    // L-Shaped Move
    let midX = fromX;
    let midY = fromY;
    
    // Check direction (Long L)
    if (dx > dy) {
       midX = toX;
       midY = fromY;
    } else {
       midX = fromX;
       midY = toY;
    }
    
    return `M ${fromX} ${fromY} L ${midX} ${midY} L ${toX} ${toY}`;
  }
  
  // Straight line for everything else
  return `M ${fromX} ${fromY} L ${toX} ${toY}`;
}

/**
 * Board Overlay Component
 */
export const BoardOverlay: React.FC<BoardOverlayProps> = ({
  squareSize,
  boardFlipped,
  playerColor,
  arrows,
  highlights,
  drawingArrow,
  theme,
}) => {
  const isFlipped = boardFlipped 
    ? playerColor !== 'black'
    : playerColor === 'black';

  const boardSize = squareSize * 8;
  
  // Get theme colors or fallback
  const themeColors = BOARD_THEMES[theme]?.arrowColors || COLORS;
  
  // Robustly map input color (which might be RGBA string) to theme color
  const getThemeColor = (inputColor: string) => {
      // 1. Check if inputColor matches one of the "ID" colors from COLORS
      if (inputColor === COLORS.default) return themeColors.default;
      if (inputColor === COLORS.alt) return themeColors.alt;
      if (inputColor === COLORS.ctrl) return themeColors.ctrl;
      if (inputColor === COLORS.shift) return themeColors.shift;
      
      // 2. Check if it matches a theme color directly
      if (Object.values(themeColors).includes(inputColor)) return inputColor;

      // 3. Fallback
      return inputColor; 
  };
  
  // Helper to get key for marker ID
  const getMarkerKey = (finalColor: string) => {
      // safe lookup
      const entry = Object.entries(themeColors).find(([, c]) => c === finalColor);
      return entry ? entry[0] : 'default';
  };

  return (
    <div
      className="absolute inset-0 pointer-events-none z-20"
      style={{ width: boardSize, height: boardSize }}
    >
      {/* SVG for arrows */}
      <svg 
        className="absolute inset-0 pointer-events-none"
        width={boardSize}
        height={boardSize}
      >
        <defs>
          {/* Arrow markers for each theme color type */}
          {Object.entries(themeColors).map(([key, color]) => (
            <marker
              key={key}
              id={`arrowhead-${key}`}
              markerWidth="3"
              markerHeight="3"
              refX="2"
              refY="1.5"
              orient="auto"
            >
              <polygon
                points="0 0, 3 1.5, 0 3"
                fill={color}
              />
            </marker>
          ))}
          {/* Engine best-move marker (green) */}
          <marker
            id="arrowhead-engine"
            markerWidth="3"
            markerHeight="3"
            refX="2"
            refY="1.5"
            orient="auto"
          >
            <polygon
              points="0 0, 3 1.5, 0 3"
              fill="rgba(0, 180, 100, 0.85)"
            />
          </marker>
        </defs>
        
        {/* Existing arrows */}
        {arrows.map((arrow, idx) => {
          const from = squareToCoords(arrow.from, squareSize, isFlipped);
          const to = squareToCoords(arrow.to, squareSize, isFlipped);
          
          const finalColor = getThemeColor(arrow.color);
          const markerKey = getMarkerKey(finalColor);
          // Use engine marker for green engine arrows, theme marker for others
          const markerId = arrow.color.startsWith('rgba(0, 180, 100') 
            ? 'arrowhead-engine' 
            : `arrowhead-${markerKey}`;
          
          return (
            <path
              key={idx}
              d={getArrowPath(from.x, from.y, to.x, to.y, squareSize)}
              stroke={finalColor}
              strokeWidth={squareSize * 0.15}
              strokeLinecap="round"
              strokeLinejoin="round" 
              fill="none"
              markerEnd={`url(#${markerId})`}
              opacity="0.8"
            />
          );
        })}
        
        {/* Currently drawing arrow */}
        {drawingArrow && drawingArrow.from !== drawingArrow.to && (() => {
          const from = squareToCoords(drawingArrow.from, squareSize, isFlipped);
          const to = squareToCoords(drawingArrow.to, squareSize, isFlipped);
          
          const finalColor = getThemeColor(drawingArrow.color);
          const markerId = `arrowhead-${getMarkerKey(finalColor)}`;
          
          return (
            <path
              d={getArrowPath(from.x, from.y, to.x, to.y, squareSize)}
              stroke={finalColor}
              strokeWidth={squareSize * 0.15}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              markerEnd={`url(#${markerId})`}
              opacity="0.6"
            />
          );
        })()}
      </svg>
      
      {/* Highlight squares */}
      {highlights.map((highlight, idx) => {
        const coords = squareToCoords(highlight.square, squareSize, isFlipped);
        const finalColor = getThemeColor(highlight.color);
        return (
          <div
            key={idx}
            className="absolute pointer-events-none"
            style={{
              left: coords.x - squareSize / 2,
              top: coords.y - squareSize / 2,
              width: squareSize,
              height: squareSize,
              backgroundColor: finalColor.replace(/[\d.]+\)$/, '0.4)'), // Hacky opacity adjust
            }}
          />
        );
      })}
    </div>
  );
};

export default BoardOverlay;
