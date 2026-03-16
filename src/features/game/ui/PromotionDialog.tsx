import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PromotionDialogProps {
  isOpen: boolean;
  onSelect: (piece: 'q' | 'r' | 'b' | 'n') => void;
  playerColor: 'w' | 'b';
}

const PromotionDialog: React.FC<PromotionDialogProps> = ({ isOpen, onSelect, playerColor }) => {
  const pieces = [
    { value: 'q', name: 'Queen', icon: playerColor === 'w' ? '♕' : '♛' },
    { value: 'r', name: 'Rook', icon: playerColor === 'w' ? '♖' : '♜' },
    { value: 'b', name: 'Bishop', icon: playerColor === 'w' ? '♗' : '♝' },
    { value: 'n', name: 'Knight', icon: playerColor === 'w' ? '♘' : '♞' },
  ] as const;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={() => onSelect('q')} // Default to queen if clicked outside
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div className="glass-panel p-8">
              {/* Title */}
              <h3 className="text-[#D4AF37] text-sm uppercase tracking-[0.4em] font-bold mb-2 text-center">
                Pawn Promotion
              </h3>
              <p className="text-zinc-400 text-[10px] uppercase tracking-[0.3em] text-center mb-6">
                Choose Your Piece
              </p>

              {/* Piece Selection Grid */}
              <div className="grid grid-cols-2 gap-3">
                {pieces.map((piece) => (
                  <motion.button
                    key={piece.value}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onSelect(piece.value)}
                    className="relative group p-6 rounded-2xl bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/10 hover:border-[#D4AF37]/30 transition-all duration-300"
                    style={{
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                    }}
                  >
                    {/* Gold accent on hover */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#D4AF37]/0 to-[#D4AF37]/0 group-hover:from-[#D4AF37]/5 group-hover:to-[#D4AF37]/0 transition-all duration-300" />
                    
                    {/* Piece Icon */}
                    <div className="relative text-6xl mb-2 text-center select-none group-hover:scale-110 transition-transform duration-200">
                      {piece.icon}
                    </div>
                    
                    {/* Piece Name */}
                    <div className="relative text-[10px] uppercase tracking-[0.3em] text-zinc-400 group-hover:text-[#D4AF37] text-center font-semibold transition-colors">
                      {piece.name}
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Hint */}
              <p className="text-zinc-600 text-[9px] uppercase tracking-[0.3em] text-center mt-6">
                Click anywhere to choose Queen
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PromotionDialog;
