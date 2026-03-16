import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

interface ColorSelectionProps {
  isOpen: boolean;
  onSelect: (color: 'white' | 'black') => void;
  onClose: () => void;
}

const ColorSelection: React.FC<ColorSelectionProps> = ({ isOpen, onSelect, onClose }) => {
  // Handle Escape key to close dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
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

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl"
          >
            <div className="glass-panel p-10 relative">
              {/* Back Button */}
              <button 
                onClick={onClose}
                className="absolute top-6 left-6 text-zinc-500 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {/* Title */}
              <div className="text-center mb-8">
                <h3 className="text-[#D4AF37] text-base uppercase tracking-[0.5em] font-black mb-3">
                  Choose Your Side
                </h3>
                <p className="text-zinc-400 text-[10px] uppercase tracking-[0.3em]">
                  Select Your Pieces
                </p>
              </div>

              {/* Color Options */}
              <div className="grid grid-cols-2 gap-6">
                {/* White */}
                <motion.button
                  whileHover={{ scale: 1.03, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelect('white')}
                  className="relative group p-8 rounded-3xl bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-white/15 hover:border-[#D4AF37]/40 transition-all duration-300"
                  style={{
                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
                  }}
                >
                  {/* Gold accent gradient on hover */}
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#D4AF37]/0 to-[#D4AF37]/0 group-hover:from-[#D4AF37]/8 group-hover:to-[#D4AF37]/0 transition-all duration-300" />
                  
                  <div className="relative">
                    {/* King Icon */}
                    <div className="text-8xl mb-4 text-center select-none group-hover:scale-110 transition-transform duration-300">
                      ♔
                    </div>
                    
                    {/* Title */}
                    <div className="text-base uppercase tracking-[0.4em] text-white font-black text-center mb-2">
                      White
                    </div>
                    
                    {/* Description */}
                    <div className="text-[9px] uppercase tracking-[0.3em] text-zinc-500 group-hover:text-[#C9A961] text-center transition-colors">
                      First Move Advantage
                    </div>
                  </div>
                </motion.button>

                {/* Black */}
                <motion.button
                  whileHover={{ scale: 1.03, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelect('black')}
                  className="relative group p-8 rounded-3xl bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-white/15 hover:border-[#D4AF37]/40 transition-all duration-300"
                  style={{
                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
                  }}
                >
                  {/* Gold accent gradient on hover */}
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#D4AF37]/0 to-[#D4AF37]/0 group-hover:from-[#D4AF37]/8 group-hover:to-[#D4AF37]/0 transition-all duration-300" />
                  
                  <div className="relative">
                    {/* King Icon */}
                    <div className="text-8xl mb-4 text-center select-none group-hover:scale-110 transition-transform duration-300">
                      ♚
                    </div>
                    
                    {/* Title */}
                    <div className="text-base uppercase tracking-[0.4em] text-white font-black text-center mb-2">
                      Black
                    </div>
                    
                    {/* Description */}
                    <div className="text-[9px] uppercase tracking-[0.3em] text-zinc-500 group-hover:text-[#C9A961] text-center transition-colors">
                      Strategic Response
                    </div>
                  </div>
                </motion.button>
              </div>

              {/* Hint */}
              <div className="mt-8 text-center">
                <p className="text-zinc-600 text-[9px] uppercase tracking-[0.3em]">
                  Choose wisely — Your strategy begins here
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ColorSelection;
