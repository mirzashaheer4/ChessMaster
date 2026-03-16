import React, { useState, useEffect } from 'react';
import { X, User, Sparkles, Swords, Shield, Scale } from 'lucide-react';
import { motion } from 'framer-motion';

interface CustomBotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (bot: { name: string; avatar: string; elo: number; playStyle: 'aggressive' | 'defensive' | 'balanced' }) => void;
}

const AVATAR_SEEDS = ['Robot', 'Chess', 'Master', 'Grand', 'Alpha', 'Zero'];

const CustomBotModal: React.FC<CustomBotModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_SEEDS[0]);
  const [elo, setElo] = useState(1200);
  const [playStyle, setPlayStyle] = useState<'aggressive' | 'defensive' | 'balanced'>('balanced');

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setName('');
      setSelectedAvatar(AVATAR_SEEDS[0]);
      setElo(1200);
      setPlayStyle('balanced');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    onCreate({
      name: name.trim(),
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedAvatar}`,
      elo,
      playStyle
    });
  };

  const getEloColor = (rating: number) => {
    if (rating < 1000) return 'text-green-400';
    if (rating < 1600) return 'text-blue-400';
    if (rating < 2200) return 'text-[#e8b34b]';
    return 'text-red-400';
  };

  const getEloLabel = (rating: number) => {
    if (rating < 1000) return 'Beginner';
    if (rating < 1600) return 'Intermediate';
    if (rating < 2200) return 'Advanced';
    return 'Grandmaster';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md glass-card rounded-3xl p-6 overflow-hidden border border-white/10 shadow-2xl"
        style={{ background: 'linear-gradient(145deg, rgba(20, 20, 30, 0.95), rgba(10, 10, 15, 0.98))' }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-pink-400" />
            </div>
            <h2 className="text-xl font-bold text-white font-['Montserrat']">Create Custom Bot</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Input */}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-gray-400 font-semibold ml-1">Bot Name</label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. ChessMaster 3000"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all font-['Montserrat']"
                autoFocus
              />
              <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            </div>
          </div>

          {/* Elo Slider */}
          <div className="space-y-2">
             <div className="flex justify-between items-end">
               <label className="text-xs uppercase tracking-wider text-gray-400 font-semibold ml-1">Strength (Elo)</label>
               <div className="text-right">
                  <div className={`text-xl font-bold font-mono ${getEloColor(elo)}`}>{elo}</div>
                  <div className={`text-[10px] font-bold uppercase tracking-wider ${getEloColor(elo)}`}>{getEloLabel(elo)}</div>
               </div>
             </div>
             <input
               type="range"
               min="400"
               max="3200"
               step="50"
               value={elo}
               onChange={(e) => setElo(parseInt(e.target.value))}
               className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
             />
             <div className="flex justify-between text-[10px] text-gray-600 font-bold uppercase">
               <span>Beginner</span>
               <span>Impossible</span>
             </div>
          </div>

          {/* Play Style Selection */}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-gray-400 font-semibold ml-1">Play Style</label>
            <div className="grid grid-cols-3 gap-2">
               <button
                 type="button"
                 onClick={() => setPlayStyle('aggressive')}
                 className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${playStyle === 'aggressive' ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10'}`}
               >
                 <Swords className="w-5 h-5" />
                 <span className="text-[10px] font-bold uppercase">Aggressive</span>
               </button>
               
               <button
                 type="button"
                 onClick={() => setPlayStyle('balanced')}
                 className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${playStyle === 'balanced' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10'}`}
               >
                 <Scale className="w-5 h-5" />
                 <span className="text-[10px] font-bold uppercase">Balanced</span>
               </button>

               <button
                 type="button"
                 onClick={() => setPlayStyle('defensive')}
                 className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${playStyle === 'defensive' ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10'}`}
               >
                 <Shield className="w-5 h-5" />
                 <span className="text-[10px] font-bold uppercase">Defensive</span>
               </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold text-sm uppercase tracking-wider shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 transform hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Bot
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default CustomBotModal;
