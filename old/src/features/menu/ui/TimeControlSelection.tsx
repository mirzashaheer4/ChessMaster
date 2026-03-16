import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, type TimeControl, type TimeControlCategory } from '../../../core/store/game';
import { Clock, Zap, Flame, Timer, X, Infinity } from 'lucide-react';

interface TimeControlSelectionProps {
  isOpen: boolean;
  onSelect: (tc: TimeControl) => void;
  onClose: () => void; // close = no clock
  onNoClock: () => void;
}

const RAPID_OPTIONS: TimeControl[] = [
  { category: 'rapid', initial: 10 * 60 * 1000, increment: 0, label: '10 min' },
  { category: 'rapid', initial: 15 * 60 * 1000, increment: 2 * 1000, label: '15|2' },
  { category: 'rapid', initial: 30 * 60 * 1000, increment: 0, label: '30 min' },
];

const BLITZ_OPTIONS: TimeControl[] = [
  { category: 'blitz', initial: 3 * 60 * 1000, increment: 0, label: '3 min' },
  { category: 'blitz', initial: 3 * 60 * 1000, increment: 2 * 1000, label: '3|2' },
  { category: 'blitz', initial: 5 * 60 * 1000, increment: 0, label: '5 min' },
];

const BULLET_OPTIONS: TimeControl[] = [
  { category: 'bullet', initial: 1 * 60 * 1000, increment: 0, label: '1 min' },
  { category: 'bullet', initial: 1 * 60 * 1000, increment: 1 * 1000, label: '1|1' },
  { category: 'bullet', initial: 2 * 60 * 1000, increment: 1 * 1000, label: '2|1' },
];

const categories: { id: TimeControlCategory; label: string; icon: React.FC<{ className?: string }>; color: string }[] = [
  { id: 'bullet', label: 'BULLET', icon: Zap, color: '#f87171' },
  { id: 'blitz', label: 'BLITZ', icon: Flame, color: '#fbbf24' },
  { id: 'rapid', label: 'RAPID', icon: Timer, color: '#4ade80' },
];

const TimeControlSelection: React.FC<TimeControlSelectionProps> = ({ isOpen, onSelect, onClose, onNoClock }) => {
  const [selectedCategory, setSelectedCategory] = useState<TimeControlCategory>('rapid');

  const getOptions = () => {
    switch (selectedCategory) {
      case 'rapid': return RAPID_OPTIONS;
      case 'blitz': return BLITZ_OPTIONS;
      case 'bullet': return BULLET_OPTIONS;
      default: return RAPID_OPTIONS;
    }
  };

  const activeCategory = categories.find(c => c.id === selectedCategory)!;
  const { chessType, setChessType } = useGameStore();

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
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg"
          >
            <div className="glass-panel p-8 relative">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header */}
              <div className="text-center mb-6">
                <div className="flex justify-center mb-3">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, rgba(232, 179, 75, 0.2), rgba(232, 179, 75, 0.05))' }}>
                    <Clock className="w-7 h-7 text-[#e8b34b]" />
                  </div>
                </div>
                <h2 className="text-[#D4AF37] text-base uppercase tracking-[0.5em] font-black mb-2 font-['Montserrat']">
                  Time Control
                </h2>
                <p className="text-zinc-500 text-[10px] uppercase tracking-[0.3em]">
                  Select your game speed
                </p>
              </div>
              
              {/* Chess Type Selection */}
              <div className="mb-6">
                <div className="flex bg-white/5 p-1 rounded-xl">
                  {['standard', 'chess960'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setChessType(type as any)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                        chessType === type 
                          ? 'bg-[#D4AF37] text-black shadow-lg' 
                          : 'text-zinc-500 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {type === 'chess960' ? 'Chess960' : 'Standard'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Tabs */}
              <div className="flex justify-center gap-3 mb-6">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const isActive = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className="relative px-5 py-2.5 rounded-xl font-semibold text-xs tracking-wider transition-all duration-300 flex items-center gap-2"
                      style={{
                        background: isActive
                          ? `linear-gradient(135deg, ${cat.color}30, ${cat.color}10)`
                          : 'rgba(255, 255, 255, 0.03)',
                        border: isActive
                          ? `1px solid ${cat.color}60`
                          : '1px solid rgba(255, 255, 255, 0.08)',
                        color: isActive ? cat.color : '#9ca3af',
                        boxShadow: isActive ? `0 0 20px ${cat.color}15` : 'none',
                      }}
                    >
                      <Icon className="w-4 h-4" />
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              {/* Time Options */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {getOptions().map((option, i) => (
                  <motion.button
                    key={option.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    onClick={() => onSelect(option)}
                    className="group p-5 rounded-xl cursor-pointer transition-all duration-300 text-center relative overflow-hidden"
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${activeCategory.color}20`,
                    }}
                    whileHover={{
                      scale: 1.03,
                      borderColor: `${activeCategory.color}60`,
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ background: `linear-gradient(135deg, ${activeCategory.color}10, transparent)` }} />
                    <div className="relative">
                      <div className="text-xl font-bold text-white mb-1 font-['Montserrat']">{option.label}</div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
                        {option.increment > 0 ? `+${option.increment / 1000}s/move` : 'No increment'}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* No Clock Option */}
              <button
                onClick={onNoClock}
                className="w-full py-3 rounded-xl text-zinc-500 hover:text-[#e8b34b] text-xs uppercase tracking-wider font-semibold transition-all duration-300 flex items-center justify-center gap-2"
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <Infinity className="w-4 h-4" />
                No Clock — Unlimited Time
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default TimeControlSelection;
