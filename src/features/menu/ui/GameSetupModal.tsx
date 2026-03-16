import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Flame, Timer, Infinity, Play, Swords } from 'lucide-react';
import type { TimeControl, TimeControlCategory } from '../../../core/store/game';

interface GameSetupModalProps {
  isOpen: boolean;
  mode: 'local' | 'ai' | 'dev' | 'online' | null;
  onClose: () => void;
  onStart: (settings: { 
    color: 'white' | 'black' | 'random'; 
    timeControl: TimeControl | null; 
    chessType: 'standard' | 'chess960';
  }) => void;
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

const GameSetupModal: React.FC<GameSetupModalProps> = ({ isOpen, mode, onClose, onStart }) => {
  const [selectedColor, setSelectedColor] = useState<'white' | 'black' | 'random'>('white');
  const [selectedCategory, setSelectedCategory] = useState<TimeControlCategory>('rapid');
  const [selectedTime, setSelectedTime] = useState<TimeControl | null>(RAPID_OPTIONS[0]);
  const [chessType, setChessType] = useState<'standard' | 'chess960'>('standard');

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mode) return null;

  const showColorSelection = mode === 'ai' || mode === 'dev';

  const getOptions = () => {
    switch (selectedCategory) {
      case 'rapid': return RAPID_OPTIONS;
      case 'blitz': return BLITZ_OPTIONS;
      case 'bullet': return BULLET_OPTIONS;
      default: return RAPID_OPTIONS;
    }
  };

  const handleStart = () => {
    let actColor = selectedColor;
    if (actColor === 'random') {
      actColor = Math.random() > 0.5 ? 'white' : 'black';
    }
    
    onStart({
      color: actColor,
      timeControl: selectedTime,
      chessType
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-md bg-zinc-900/80 border border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.6)] backdrop-blur-xl rounded-2xl relative my-auto mt-6 mb-6 overflow-hidden"
        >
          {/* Subtle top glow */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent opacity-50" />
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors cursor-pointer z-10 bg-black/20 hover:bg-black/40 p-1.5 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-6 md:p-8">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="flex justify-center mb-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                  style={{ background: 'linear-gradient(135deg, rgba(232, 179, 75, 0.2), rgba(232, 179, 75, 0.05))', border: '1px solid rgba(232, 179, 75, 0.1)' }}>
                  <Swords className="w-6 h-6 text-[#e8b34b]" />
                </div>
              </div>
              <h2 className="text-[#D4AF37] text-lg uppercase tracking-[0.3em] font-black mb-1 font-['Montserrat']">
                Game Setup
              </h2>
              <p className="text-zinc-400 text-[10px] uppercase tracking-[0.2em]">
                Configure your match settings
              </p>
            </div>

            {/* Chess Type Selection */}
            <div className="mb-6">
              <label className="block text-zinc-400 text-[10px] uppercase tracking-[0.2em] font-bold mb-2 text-center">Chess Variant</label>
              <div className="flex bg-black/40 border border-white/5 p-1 rounded-xl w-full">
                {['standard', 'chess960'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setChessType(type as any)}
                    className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                      chessType === type 
                        ? 'bg-[#D4AF37] text-black shadow-[0_0_15px_rgba(212,175,55,0.4)]' 
                        : 'text-zinc-500 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {type === 'chess960' ? 'Chess960' : 'Standard'}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Selection */}
            {showColorSelection && (
              <div className="mb-6">
                <label className="block text-zinc-400 text-[10px] uppercase tracking-[0.2em] font-bold mb-2 text-center">Your Color</label>
                <div className="grid grid-cols-3 gap-3 w-full">
                  <button
                    onClick={() => setSelectedColor('white')}
                    className={`relative p-3 rounded-xl transition-all duration-300 cursor-pointer flex flex-col items-center gap-1.5 ${selectedColor === 'white' ? 'bg-white/10 border-white text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'bg-black/40 border-transparent text-zinc-500 hover:bg-white/5'}`}
                    style={{ border: `1px solid ${selectedColor === 'white' ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.05)'}` }}
                  >
                    <span className="text-3xl font-serif">♔</span>
                    <span className="text-[9px] uppercase tracking-wider font-bold">White</span>
                  </button>
                  <button
                    onClick={() => setSelectedColor('random')}
                    className={`relative p-3 rounded-xl transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-1.5 ${selectedColor === 'random' ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.2)]' : 'bg-black/40 border-transparent text-zinc-500 hover:bg-white/5'}`}
                    style={{ border: `1px solid ${selectedColor === 'random' ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.05)'}` }}
                  >
                    <span className="text-2xl font-serif">?</span>
                    <span className="text-[9px] uppercase tracking-wider font-bold mt-1">Random</span>
                  </button>
                  <button
                    onClick={() => setSelectedColor('black')}
                    className={`relative p-3 rounded-xl transition-all duration-300 cursor-pointer flex flex-col items-center gap-1.5 ${selectedColor === 'black' ? 'bg-zinc-800 border-zinc-500 text-zinc-200 shadow-[0_0_15px_rgba(0,0,0,0.5)]' : 'bg-black/40 border-transparent text-zinc-500 hover:bg-white/5'}`}
                    style={{ border: `1px solid ${selectedColor === 'black' ? 'rgba(113,113,122,0.8)' : 'rgba(255,255,255,0.05)'}` }}
                  >
                    <span className="text-3xl font-serif">♚</span>
                    <span className="text-[9px] uppercase tracking-wider font-bold">Black</span>
                  </button>
                </div>
              </div>
            )}

            {/* Time Control Section */}
            <div className="mb-6">
              <label className="block text-zinc-400 text-[10px] uppercase tracking-[0.2em] font-bold mb-2 text-center">Time Control</label>
              
              <div className="flex justify-center gap-2 mb-4 flex-wrap">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const isActive = selectedCategory === cat.id && selectedTime !== null;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => { setSelectedCategory(cat.id); setSelectedTime(getOptions()[0]); }}
                      className="relative px-4 py-2 rounded-lg font-semibold text-[10px] uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 cursor-pointer flex-1 justify-center whitespace-nowrap"
                      style={{
                        background: isActive ? `linear-gradient(135deg, ${cat.color}30, ${cat.color}10)` : 'rgba(0, 0, 0, 0.4)',
                        border: isActive ? `1px solid ${cat.color}60` : '1px solid rgba(255, 255, 255, 0.05)',
                        color: isActive ? cat.color : '#9ca3af',
                        boxShadow: isActive ? `0 0 15px ${cat.color}15` : 'none',
                      }}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3 w-full">
                {getOptions().map((option, i) => {
                  const isActive = selectedTime?.label === option.label;
                  const activeCategoryObj = categories.find(c => c.id === selectedCategory)!;
                  return (
                    <motion.button
                      key={option.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      onClick={() => setSelectedTime(option)}
                      className="group p-3 rounded-xl cursor-pointer transition-all duration-300 text-center relative overflow-hidden bg-black/40 hover:bg-white/5"
                      style={{
                        background: isActive ? `${activeCategoryObj.color}20` : undefined,
                        border: `1px solid ${isActive ? activeCategoryObj.color : 'rgba(255,255,255,0.05)'}`,
                        boxShadow: isActive ? `0 0 15px ${activeCategoryObj.color}15` : 'none'
                      }}
                    >
                      <div className="relative">
                        <div className={`text-sm md:text-base font-bold mb-0.5 font-['Montserrat'] ${isActive ? 'text-white' : 'text-zinc-400'}`}>{option.label}</div>
                        <div className={`text-[8px] uppercase tracking-wider ${isActive ? 'text-white/80' : 'text-zinc-600'}`}>
                          {option.increment > 0 ? `+${option.increment / 1000}s` : 'No inc'}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              <div className="w-full">
                <button
                  onClick={() => setSelectedTime(null)}
                  className={`w-full py-2.5 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer text-[10px] uppercase tracking-wider font-semibold
                    ${selectedTime === null 
                      ? 'bg-zinc-800 text-white border-zinc-600 shadow-lg' 
                      : 'bg-black/40 text-zinc-500 border-white/5 hover:text-white hover:bg-white/5'}`}
                  style={{ border: '1px solid' }}
                >
                  <Infinity className="w-3.5 h-3.5" />
                  Unlimited Time
                </button>
              </div>
            </div>

            {/* Start Game Action */}
            <div className="pt-4 mt-2">
              <button 
                onClick={handleStart}
                className="btn-gold w-full py-3.5 rounded-xl text-sm font-bold font-['Montserrat'] uppercase tracking-[0.2em] flex items-center justify-center gap-2 cursor-pointer group shadow-[0_0_20px_rgba(212,175,55,0.2)] hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] transition-all duration-300"
              >
                Start Game
                <Play className="w-4 h-4 fill-current transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GameSetupModal;
