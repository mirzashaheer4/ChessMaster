import React, { useState } from 'react';
import { useGameStore } from '../../core/store/game';
import { useSettings, useGameActions } from '../../core/store/selectors';
import type { Difficulty } from '../../core/store/game';
import GameSetupModal from './ui/GameSetupModal';
import CustomBotModal from './ui/CustomBotModal';
import { 
  ArrowLeft, 
  ChevronRight,
  Zap,
  Snowflake,
  CloudLightning,
  Flame,
  Sparkles,
} from 'lucide-react';

import { useNavigate } from 'react-router-dom';

const levels: { id: Difficulty; label: string; desc: string; icon: React.FC<{ className?: string; color?: string }>; color: string; glow: string }[] = [
  { id: 'easy', label: 'Beginner', desc: 'A gentle start. Mistakes are forgiven. Perfect for learning the basics.', icon: Snowflake, color: '#4ade80', glow: 'rgba(74, 222, 128, 0.3)' },
  { id: 'medium', label: 'Intermediate', desc: 'A balanced challenge. Precision required. The AI plays solid chess.', icon: Zap, color: '#60a5fa', glow: 'rgba(96, 165, 250, 0.3)' },
  { id: 'hard', label: 'Advanced', desc: 'Relentless pressure. Every move counts. Prepare for tactical storms.', icon: CloudLightning, color: '#a78bfa', glow: 'rgba(167, 139, 250, 0.3)' },
  { id: 'extreme', label: 'Grandmaster', desc: 'Maximum strength Stockfish. No mercy. Only the best survive.', icon: Flame, color: '#f87171', glow: 'rgba(248, 113, 113, 0.3)' },
  { id: 'custom', label: 'Custom Bot', desc: 'Create your own challenger. Set the rating. Choose the avatar.', icon: Sparkles, color: '#ec4899', glow: 'rgba(236, 72, 153, 0.3)' },
];

// Particle Background
const ParticleBackground = () => {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 20}s`,
    duration: `${15 + Math.random() * 10}s`,
    size: `${2 + Math.random() * 3}px`,
  }));

  return (
    <div className="particles-bg">
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: p.left,
            animationDelay: p.delay,
            animationDuration: p.duration,
            width: p.size,
            height: p.size,
            background: 'rgba(139, 92, 246, 0.4)',
          }}
        />
      ))}
    </div>
  );
};

const DifficultyScreen = () => {
  const { setDifficulty, setPlayerColor, setChessType } = useSettings();
  const { setTimeControl } = useGameActions();
  const navigate = useNavigate();
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [_selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);
  const [hoveredLevel, setHoveredLevel] = useState<number | null>(null);
  const [showCustomBotModal, setShowCustomBotModal] = useState(false);

  const handleDifficultySelect = (diff: Difficulty) => {
    if (diff === 'custom') {
      setShowCustomBotModal(true);
      return;
    }
    setDifficulty(diff);
    setSelectedDifficulty(diff);
    useGameStore.getState().setMode('ai'); // Ensure AI mode is set
    setShowSetupModal(true);
  };
  
  const handleCreateBot = (bot: { name: string; avatar: string; elo: number; playStyle: 'aggressive' | 'defensive' | 'balanced' }) => {
    useGameStore.getState().setCustomBot(bot);
    useGameStore.getState().setMode('ai'); // Ensure AI mode is set
    setDifficulty('custom');
    setSelectedDifficulty('custom');
    setShowCustomBotModal(false);
    setShowSetupModal(true);
  };

  const handleStartGame = (settings: any) => {
    setPlayerColor(settings.color);
    setTimeControl(settings.timeControl);
    setChessType(settings.chessType);
    useGameStore.getState().resetGame();
    setShowSetupModal(false);
    navigate('/game/ai');
  };

  return (
    <div 
      className="w-full h-full relative overflow-hidden flex flex-col items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1e1b4b 25%, #0a0a0a 50%, #1e1b4b 75%, #0a0a0a 100%)',
      }}
    >
      {/* Background Effects */}
      <ParticleBackground />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[100px]" />
      </div>

      {/* Game Setup Modal */}
      <GameSetupModal
        isOpen={showSetupModal}
        mode="ai"
        onClose={() => setShowSetupModal(false)}
        onStart={handleStartGame}
      />
      
      {/* Custom Bot Modal */}
      <CustomBotModal
        isOpen={showCustomBotModal}
        onClose={() => setShowCustomBotModal(false)}
        onCreate={handleCreateBot}
      />

      {/* Back Button */}
      <div className="absolute top-8 left-8 z-10">
        <button 
          onClick={() => navigate('/play')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-300 group"
        >
          <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
          <span className="text-sm font-medium">Back</span>
        </button>
      </div>

      {/* Header */}
      <div className="text-center mb-12 relative z-10 animate-fade-in-up">
        <span className="inline-block px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-semibold tracking-wider uppercase mb-4">
          AI Challenge
        </span>
        <h1 className="text-4xl md:text-6xl font-bold font-['Montserrat']">
          Select Your <span className="text-gold-gradient">Difficulty</span>
        </h1>
        <p className="text-gray-400 mt-4 max-w-lg mx-auto">
          Choose how strong the Stockfish AI will play against you.
        </p>
      </div>

      {/* Difficulty Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 w-full max-w-7xl px-8 relative z-10">
        {levels.map((level, i) => {
          const isHovered = hoveredLevel === i;
          const Icon = level.icon;
          
          return (
            <button
              key={level.id}
              onClick={() => handleDifficultySelect(level.id)}
              onMouseEnter={() => setHoveredLevel(i)}
              onMouseLeave={() => setHoveredLevel(null)}
              className="group relative h-80 flex flex-col justify-between p-8 text-left overflow-hidden rounded-3xl transition-all duration-500"
              style={{
                background: isHovered 
                  ? `linear-gradient(135deg, ${level.glow} 0%, rgba(21, 21, 21, 0.8) 100%)`
                  : 'rgba(21, 21, 21, 0.6)',
                backdropFilter: 'blur(20px)',
                border: isHovered 
                  ? `2px solid ${level.color}80` 
                  : '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: isHovered 
                  ? `0 0 40px ${level.glow}, inset 0 0 40px ${level.glow.replace('0.3', '0.05')}`
                  : '0 8px 32px rgba(0, 0, 0, 0.3)',
                transform: isHovered ? 'translateY(-8px)' : 'translateY(0)',
                animationDelay: `${i * 100}ms`,
              }}
            >
              {/* Top: Number + Icon */}
              <div className="flex justify-between items-start">
                <span className="text-gray-600 font-mono text-xs font-semibold">0{i+1}</span>
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500"
                  style={{
                    background: isHovered ? `${level.color}20` : 'rgba(232, 179, 75, 0.1)',
                    boxShadow: isHovered ? `0 0 20px ${level.glow}` : 'none',
                  }}
                >
                  <Icon 
                    className="w-6 h-6 transition-colors duration-500" 
                    color={isHovered ? level.color : '#e8b34b'}
                  />
                </div>
              </div>

              {/* Bottom: Title + Description */}
              <div>
                <h3 
                  className="text-2xl font-bold font-['Montserrat'] mb-2 transition-colors duration-300"
                  style={{ color: isHovered ? level.color : 'white' }}
                >
                  {level.label}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-4">{level.desc}</p>
                
                <div 
                  className="flex items-center gap-2 transition-all duration-300"
                  style={{ color: isHovered ? level.color : '#9ca3af' }}
                >
                  <span className="text-xs font-semibold uppercase tracking-wider">Select</span>
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>

              {/* Hover top-line accent */}
              <div 
                className="absolute top-0 left-0 w-full h-1 transition-transform duration-500"
                style={{
                  background: `linear-gradient(90deg, ${level.color}, ${level.color}80)`,
                  transform: isHovered ? 'scaleX(1)' : 'scaleX(0)',
                  transformOrigin: 'left',
                }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DifficultyScreen;
