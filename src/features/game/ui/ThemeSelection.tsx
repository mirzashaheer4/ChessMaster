import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../../core/store/game';
import { BOARD_THEMES, PIECE_THEMES, type BoardTheme, type PieceTheme } from '../../../core/utils/themes';
import { Check, X, Palette, Image as ImageIcon, LayoutGrid } from 'lucide-react';
import { motion } from 'framer-motion';

interface ThemeSelectionProps {
  onClose: () => void;
}

export const ThemeSelection: React.FC<ThemeSelectionProps> = ({ onClose }) => {
  const { boardTheme, pieceTheme, setBoardTheme, setPieceTheme } = useGameStore();
  const [activeTab, setActiveTab] = useState<'board' | 'pieces'>('board');
  
  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-[#1a1a2e] rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#16213e]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg">
              <Palette className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white font-['Montserrat']">Appearance</h2>
              <p className="text-xs text-gray-400">Customize your chess experience</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab('board')}
            className={`flex-1 py-4 text-sm font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'board' ? 'bg-white/5 text-amber-400 border-b-2 border-amber-400' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
            }`}
          >
            <LayoutGrid className="w-4 h-4" /> Board Theme
          </button>
          <button
            onClick={() => setActiveTab('pieces')}
            className={`flex-1 py-4 text-sm font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'pieces' ? 'bg-white/5 text-amber-400 border-b-2 border-amber-400' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
            }`}
          >
            <ImageIcon className="w-4 h-4" /> Piece Set
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#0f0f1a]">
          
          {/* Board Themes */}
          {activeTab === 'board' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {Object.entries(BOARD_THEMES).map(([key, theme]) => (
                <button
                  key={key}
                  onClick={() => setBoardTheme(key as BoardTheme)}
                  className={`group relative rounded-xl overflow-hidden aspect-square border-2 transition-all duration-200 ${
                    boardTheme === key 
                      ? 'border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.2)]' 
                      : 'border-transparent hover:border-white/20'
                  }`}
                >
                  {/* Preview of board colors */}
                  <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                    <div style={{ background: theme.light }} />
                    <div style={{ background: theme.dark }} />
                    <div style={{ background: theme.dark }} />
                    <div style={{ background: theme.light }} />
                  </div>
                  
                  {/* Selected Indicator */}
                  {boardTheme === key && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center shadow-lg">
                      <Check className="w-4 h-4 text-black font-bold" />
                    </div>
                  )}
                  
                  {/* Label */}
                  <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-sm p-2 text-center">
                    <span className={`text-xs font-semibold ${boardTheme === key ? 'text-amber-400' : 'text-gray-300'}`}>
                      {theme.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Piece Themes */}
          {activeTab === 'pieces' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {Object.entries(PIECE_THEMES).map(([key, theme]) => (
                <button
                  key={key}
                  onClick={() => setPieceTheme(key as PieceTheme)}
                  className={`group relative rounded-xl overflow-hidden aspect-square border-2 bg-white/5 transition-all duration-200 ${
                    pieceTheme === key 
                      ? 'border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.2)]' 
                      : 'border-transparent hover:border-white/20'
                  }`}
                >
                  {/* Preview items */}
                  <div className="absolute inset-0 flex items-center justify-center gap-1 p-2">
                    <img src={theme.getIcon('w', 'n')} className="w-[45%] object-contain drop-shadow-lg" alt="White Knight" />
                    <img src={theme.getIcon('b', 'n')} className="w-[45%] object-contain drop-shadow-lg" alt="Black Knight" />
                  </div>
                  
                  {/* Selected Indicator */}
                  {pieceTheme === key && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center shadow-lg">
                      <Check className="w-4 h-4 text-black font-bold" />
                    </div>
                  )}
                  
                  {/* Label */}
                  <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-sm p-2 text-center">
                    <span className={`text-xs font-semibold ${pieceTheme === key ? 'text-amber-400' : 'text-gray-300'}`}>
                      {theme.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-[#16213e] flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
};
