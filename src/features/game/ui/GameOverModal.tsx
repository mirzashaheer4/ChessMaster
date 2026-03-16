import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Frown, Handshake, AlertTriangle, XCircle, Lightbulb, Eye, RotateCw, ArrowRight, X } from 'lucide-react';

interface GameOverModalProps {
  isOpen: boolean;
  result: 'win' | 'loss' | 'draw';
  reason: string;
  stats: {
    mistakes: number;
    blunders: number;
    missedWins: number;
  };
  onGameReview: () => void;
  onRematch: () => void;
  onNewGame: () => void;
  onClose: () => void;
}

const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  result,
  reason,
  stats,
  onGameReview,
  onRematch,
  onNewGame,
  onClose
}) => {
  const getResultText = () => {
    switch (result) {
      case 'win': return 'You Won!';
      case 'loss': return 'You Lost!';
      case 'draw': return 'Draw!';
    }
  };

  const getResultColor = () => {
    switch (result) {
      case 'win': return '#D4AF37';
      case 'loss': return '#DC2626';
      case 'draw': return '#9CA3AF';
    }
  };

  const getResultIcon = () => {
    switch (result) {
      case 'win': return <Trophy className="w-12 h-12" style={{ color: '#D4AF37' }} />;
      case 'loss': return <Frown className="w-12 h-12" style={{ color: '#DC2626' }} />;
      case 'draw': return <Handshake className="w-12 h-12" style={{ color: '#9CA3AF' }} />;
    }
  };

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div className="glass-panel p-8 relative">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Result Icon */}
              <div className="flex justify-center mb-4">
                <div 
                  className="w-20 h-20 rounded-2xl flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${getResultColor()}20, ${getResultColor()}05)`,
                    border: `1px solid ${getResultColor()}30`,
                    boxShadow: `0 0 30px ${getResultColor()}15`,
                  }}
                >
                  {getResultIcon()}
                </div>
              </div>

              {/* Result Text */}
              <div className="text-center mb-2">
                <h2
                  className="text-3xl font-black tracking-tight mb-1 font-['Montserrat']"
                  style={{ color: getResultColor() }}
                >
                  {getResultText()}
                </h2>
                <p className="text-zinc-400 text-sm">
                  {reason}
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 my-6">
                {/* Mistakes */}
                <div className="text-center glass-card rounded-xl p-3" style={{ border: '1px solid rgba(251, 146, 60, 0.15)' }}>
                  <AlertTriangle className="w-5 h-5 text-orange-400 mx-auto mb-1" />
                  <div className="text-xl font-bold text-orange-400">{stats.mistakes}</div>
                  <div className="text-[9px] uppercase tracking-wider text-orange-400/60 font-semibold">
                    Mistakes
                  </div>
                </div>

                {/* Blunders */}
                <div className="text-center glass-card rounded-xl p-3" style={{ border: '1px solid rgba(248, 113, 113, 0.15)' }}>
                  <XCircle className="w-5 h-5 text-red-400 mx-auto mb-1" />
                  <div className="text-xl font-bold text-red-400">{stats.blunders}</div>
                  <div className="text-[9px] uppercase tracking-wider text-red-400/60 font-semibold">
                    Blunders
                  </div>
                </div>

                {/* Missed Wins */}
                <div className="text-center glass-card rounded-xl p-3" style={{ border: '1px solid rgba(250, 204, 21, 0.15)' }}>
                  <Lightbulb className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                  <div className="text-xl font-bold text-yellow-400">{stats.missedWins}</div>
                  <div className="text-[9px] uppercase tracking-wider text-yellow-400/60 font-semibold">
                    Missed Win
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {/* Game Review - Primary */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onGameReview}
                  className="w-full py-4 rounded-2xl font-bold text-sm uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, #88B04B 0%, #6B8E3D 100%)',
                    color: 'white',
                    boxShadow: '0 4px 15px rgba(136, 176, 75, 0.3)'
                  }}
                >
                  <Eye className="w-4 h-4" />
                  Game Review
                </motion.button>

                {/* Secondary Actions */}
                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onRematch}
                    className="py-3 rounded-xl glass-card hover:border-[#D4AF37]/30 transition-all font-semibold text-sm uppercase tracking-wider text-zinc-300 flex items-center justify-center gap-2"
                    style={{ border: '1px solid rgba(255, 255, 255, 0.1)' }}
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    Rematch
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onNewGame}
                    className="py-3 rounded-xl glass-card hover:border-[#D4AF37]/30 transition-all font-semibold text-sm uppercase tracking-wider text-zinc-300 flex items-center justify-center gap-2"
                    style={{ border: '1px solid rgba(255, 255, 255, 0.1)' }}
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    New Game
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default GameOverModal;
