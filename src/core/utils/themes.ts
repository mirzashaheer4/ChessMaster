export type BoardTheme = 'glass' | 'wood' | 'green' | 'blue' | 'classic' | 'midnight' | 'purple' | 'cherry' | 'cyberpunk' | 'marble' | 'glass_minimal';
export type PieceTheme = 'neo' | 'classic' | 'alpha' | 'game_room' | 'wood' | 'glass' | 'condal' | 'maya' | 'gothic' | 'neon' | 'marble_pieces';

export const BOARD_THEMES: Record<BoardTheme, {
  name: string;
  light: string;
  dark: string;
  border: string;
  background?: string;
  arrowColors?: {
    default: string;
    alt: string;
    ctrl: string;
    shift: string;
  };
}> = {
  glass: {
    name: 'Glass (Premium)',
    light: 'rgba(255, 255, 255, 0.1)',
    dark: 'rgba(0, 0, 0, 0.3)',
    border: 'rgba(255, 255, 255, 0.1)',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    arrowColors: {
      default: 'rgba(157, 78, 221, 0.9)', // Purple
      alt: 'rgba(0, 255, 255, 0.8)',      // Cyan
      ctrl: 'rgba(255, 215, 0, 0.8)',      // Gold
      shift: 'rgba(255, 0, 100, 0.8)',     // Pink
    }
  },
  wood: {
    name: 'Classic Wood',
    light: '#E8CFA6',
    dark: '#8B5A2B',
    border: '#5C3A1E',
    background: 'linear-gradient(135deg, #3E2723 0%, #291815 100%)',
    arrowColors: {
      default: 'rgba(21, 128, 61, 0.9)',   // Green (Classic)
      alt: 'rgba(37, 99, 235, 0.8)',       // Blue
      ctrl: 'rgba(234, 179, 8, 0.8)',      // Yellow
      shift: 'rgba(220, 38, 38, 0.8)',     // Red
    }
  },
  green: {
    name: 'Tournament Green',
    light: '#EEEED2',
    dark: '#769656',
    border: '#51683B',
    background: '#2F332C',
    arrowColors: {
      default: 'rgba(255, 170, 0, 0.9)',   // Orange
      alt: 'rgba(0, 128, 255, 0.8)',       // Blue
      ctrl: 'rgba(0, 255, 0, 0.8)',        // Green
      shift: 'rgba(255, 0, 0, 0.8)',       // Red
    }
  },
  blue: {
    name: 'Ocean Blue',
    light: '#DEE3E6',
    dark: '#8CA2AD',
    border: '#607079',
    background: '#26292B',
  },
  classic: {
    name: 'Classic Standard',
    light: '#f0d9b5',
    dark: '#b58863',
    border: '#8a684b',
    background: '#262522',
    arrowColors: {
      default: 'rgba(128, 128, 128, 0.9)', // Gray
      alt: 'rgba(37, 99, 235, 0.8)',
      ctrl: 'rgba(22, 163, 74, 0.8)',
      shift: 'rgba(220, 38, 38, 0.8)',
    }
  },
  midnight: {
    name: 'Midnight',
    light: '#6b7280', 
    dark: '#1f2937',  
    border: '#111827',
    background: '#000000',
    arrowColors: {
      default: 'rgba(255, 255, 255, 0.8)', // White
      alt: 'rgba(56, 189, 248, 0.8)',      // Light Blue
      ctrl: 'rgba(74, 222, 128, 0.8)',     // Light Green
      shift: 'rgba(248, 113, 113, 0.8)',   // Light Red
    }
  },
  purple: {
    name: 'Royal Purple',
    light: '#e9d5ff',
    dark: '#7e22ce',  
    border: '#581c87',
    background: '#3b0764',
    arrowColors: {
      default: 'rgba(250, 204, 21, 0.9)',  // Yellow (Contrast)
      alt: 'rgba(34, 211, 238, 0.8)',      // Cyan
      ctrl: 'rgba(168, 85, 247, 0.8)',     // Purple
      shift: 'rgba(244, 63, 94, 0.8)',     // Rose
    }
  },
  cherry: {
    name: 'Cherry Wood',
    light: '#fecaca',
    dark: '#991b1b',  
    border: '#450a0a',
    background: '#450a0a',
    arrowColors: {
      default: 'rgba(255, 255, 255, 0.9)', // White
      alt: 'rgba(96, 165, 250, 0.8)',      // Blue
      ctrl: 'rgba(252, 211, 77, 0.8)',     // Amber
      shift: 'rgba(0, 0, 0, 0.8)',         // Black
    }
  },
  cyberpunk: {
    name: 'Cyberpunk (Premium)',
    light: '#2d0046',
    dark: '#0f0019',
    border: '#00ffcc',
    background: 'linear-gradient(135deg, #090014 0%, #17002b 100%)',
    arrowColors: {
      default: 'rgba(0, 255, 204, 0.9)',  // Neon Cyan
      alt: 'rgba(255, 0, 128, 0.9)',      // Neon Pink
      ctrl: 'rgba(255, 255, 0, 0.9)',     // Neon Yellow
      shift: 'rgba(128, 0, 255, 0.9)',    // Neon Purple
    }
  },
  marble: {
    name: 'Marble & Gold (Premium)',
    light: '#f8f9fa',
    dark: '#212529',
    border: '#d4af37', // Gold 
    background: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)',
    arrowColors: {
      default: 'rgba(212, 175, 55, 0.9)', // Gold
      alt: 'rgba(0, 0, 0, 0.8)',          // Black
      ctrl: 'rgba(100, 100, 100, 0.8)',   // Silver
      shift: 'rgba(220, 20, 60, 0.8)',    // Crimson
    }
  },
  glass_minimal: {
    name: 'Minimal Glass (Premium)',
    light: 'rgba(255, 255, 255, 0.05)',
    dark: 'rgba(0, 0, 0, 0.15)',
    border: 'rgba(255, 255, 255, 0.2)',
    background: 'linear-gradient(135deg, #0f172a 0%, #020617 100%)',
    arrowColors: {
      default: 'rgba(255, 255, 255, 0.7)',
      alt: 'rgba(148, 163, 184, 0.7)',
      ctrl: 'rgba(96, 165, 250, 0.7)',
      shift: 'rgba(248, 113, 113, 0.7)',
    }
  }
};

export const PIECE_THEMES: Record<PieceTheme, {
  name: string;
  getIcon: (color: 'w' | 'b', type: string) => string;
}> = {
  neo: {
    name: 'Neo (Premium)',
    getIcon: (c, t) => `https://images.chesscomfiles.com/chess-themes/pieces/neo/150/${c}${t}.png`,
  },
  classic: {
    name: 'Classic',
    getIcon: (c, t) => `https://images.chesscomfiles.com/chess-themes/pieces/classic/150/${c}${t}.png`,
  },
  alpha: {
    name: 'Alpha',
    getIcon: (c, t) => `https://images.chesscomfiles.com/chess-themes/pieces/alpha/150/${c}${t}.png`,
  },
  game_room: {
    name: 'Game Room',
    getIcon: (c, t) => `https://images.chesscomfiles.com/chess-themes/pieces/game_room/150/${c}${t}.png`,
  },
  wood: {
    name: 'Wood',
    getIcon: (c, t) => `https://images.chesscomfiles.com/chess-themes/pieces/wood/150/${c}${t}.png`,
  },
  condal: {
    name: 'Condal',
    getIcon: (c, t) => `https://images.chesscomfiles.com/chess-themes/pieces/condal/150/${c}${t}.png`,
  },
  maya: {
    name: 'Maya',
    getIcon: (c, t) => `https://images.chesscomfiles.com/chess-themes/pieces/maya/150/${c}${t}.png`,
  },
  gothic: {
    name: 'Gothic',
    getIcon: (c, t) => `https://images.chesscomfiles.com/chess-themes/pieces/gothic/150/${c}${t}.png`,
  },
  glass: { 
    name: 'Glass',
    getIcon: (c, t) => `https://images.chesscomfiles.com/chess-themes/pieces/glass/150/${c}${t}.png`,
  },
  neon: {
    name: 'Neon',
    getIcon: (c, t) => `https://images.chesscomfiles.com/chess-themes/pieces/neon/150/${c}${t}.png`,
  },
  marble_pieces: {
    name: 'Marble',
    getIcon: (c, t) => `https://images.chesscomfiles.com/chess-themes/pieces/marble/150/${c}${t}.png`,
  }
};
