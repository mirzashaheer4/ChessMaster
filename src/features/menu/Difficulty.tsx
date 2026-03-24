import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../core/store/game';
import { useSettings, useGameActions } from '../../core/store/selectors';
import type { Difficulty } from '../../core/store/game';
import GameSetupModal from './ui/GameSetupModal';
import CustomBotModal from './ui/CustomBotModal';
import { 
  ArrowLeft, 
  ChevronRight,
  ChevronLeft,
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
const ParticleBackground = ({ color = 'rgba(139, 92, 246, 0.4)' }: { color?: string }) => {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 20}s`,
    duration: `${15 + Math.random() * 10}s`,
    size: `${2 + Math.random() * 3}px`,
  }));

  return (
    <div className="particles-bg pointer-events-none">
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
            background: color,
            boxShadow: `0 0 ${p.size} ${color}`,
          }}
        />
      ))}
    </div>
  );
};

// Extracted Card Component
const DifficultyCard = ({ level, i, isActive, isFaded, onClick, onMouseEnter, onMouseLeave }: any) => {
  const Icon = level.icon;

  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`group relative h-[340px] md:h-80 flex flex-col justify-between p-6 md:p-8 text-left overflow-hidden rounded-3xl transition-all duration-500 w-full ${
        isFaded ? 'opacity-40 scale-[0.98]' : 'opacity-100 scale-100'
      }`}
      style={{
        backgroundImage: isActive 
          ? `linear-gradient(135deg, ${level.glow} 0%, rgba(21, 21, 21, 0.1) 100%)`
          : 'none',
        backgroundColor: isActive ? '#0a0a0f' : 'rgba(21, 21, 21, 0.95)',
        backdropFilter: 'blur(20px)',
        border: isActive 
          ? `2px solid ${level.color}80` 
          : '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: isActive 
          ? `0 0 40px ${level.glow}, inset 0 0 40px ${level.glow.replace('0.3', '0.05')}`
          : '0 8px 32px rgba(0, 0, 0, 0.3)',
        transform: isActive ? 'translateY(-8px)' : 'translateY(0)',
      }}
    >
      {/* Top: Number + Icon */}
      <div className="flex justify-between items-start pointer-events-none w-full">
        <span className="text-gray-600 font-mono text-xs font-semibold">0{i+1}</span>
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500 shrink-0"
          style={{
            background: isActive ? `${level.color}20` : 'rgba(232, 179, 75, 0.1)',
            boxShadow: isActive ? `0 0 20px ${level.glow}` : 'none',
          }}
        >
          <Icon 
            className="w-6 h-6 transition-colors duration-500" 
            color={isActive ? level.color : '#e8b34b'}
          />
        </div>
      </div>

      {/* Bottom: Title + Description */}
      <div className="pointer-events-none flex-1 flex flex-col justify-end mt-4">
        <h3 
          className="text-2xl font-bold font-['Montserrat'] mb-2 transition-colors duration-300"
          style={{ color: isActive ? level.color : 'white' }}
        >
          {level.label}
        </h3>
        <p className="text-gray-400 text-sm leading-relaxed mb-4 line-clamp-3 md:line-clamp-none whitespace-normal break-words">{level.desc}</p>
        
        <div 
          className="flex items-center gap-2 transition-all duration-300 pointer-events-auto mt-auto"
          style={{ color: isActive ? level.color : '#9ca3af' }}
        >
          <span className="text-xs font-semibold uppercase tracking-wider">Select</span>
          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </div>
      </div>

      {/* Hover top-line accent */}
      <div 
        className="absolute top-0 left-0 w-full h-1 transition-transform duration-500 pointer-events-none"
        style={{
          background: `linear-gradient(90deg, ${level.color}, ${level.color}80)`,
          transform: isActive ? 'scaleX(1)' : 'scaleX(0)',
          transformOrigin: 'left',
        }}
      />
    </button>
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

  // Carousel specific state
  const [activeIndex, setActiveIndex] = useState(2); // start at medium/hard
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // Compute active theme colors
  const activeLevelValue = isMobile ? activeIndex : (hoveredLevel !== null ? hoveredLevel : null);
  const activeColor = activeLevelValue !== null ? levels[activeLevelValue].color : '#a78bfa'; // default purple
  const activeColorWithOpacity = activeColor + '10'; // highly transparent version for gradient

  // Touch handlers for mobile loop
  const minSwipeDistance = 50;
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
  const onTouchEndEvent = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) nextSlide();
    else if (distance < -minSwipeDistance) prevSlide();
  };

  const nextSlide = () => setActiveIndex((prev) => (prev === levels.length - 1 ? 0 : prev + 1));
  const prevSlide = () => setActiveIndex((prev) => (prev === 0 ? levels.length - 1 : prev - 1));

  return (
    <div 
      className={`w-full h-full relative ${isMobile ? 'overflow-hidden' : 'overflow-y-auto min-h-screen'} flex flex-col items-center justify-center`}
      style={{
        background: `linear-gradient(135deg, #0a0a0a 0%, ${activeColorWithOpacity} 25%, #0a0a0a 50%, ${activeColorWithOpacity} 75%, #0a0a0a 100%)`,
        transition: 'background 0.8s ease',
      }}
    >
      {/* Background Effects */}
      <ParticleBackground color={activeColor.replace('rgb', 'rgba').replace(')', ', 0.4)')} />
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[100px] transition-colors duration-700"
          style={{ background: `${activeColor}15` }}
        />
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
      <div className="absolute top-6 md:top-8 left-6 md:left-8 z-20">
        <button 
          onClick={() => navigate('/play')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-300 group"
        >
          <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
          <span className="text-sm font-medium">Back</span>
        </button>
      </div>

      <div className="relative z-10 w-full flex flex-col items-center flex-1 justify-center pt-24 pb-12">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12 animate-fade-in-up px-4">
          {!isMobile && (
            <span 
              className="inline-block px-4 py-1.5 rounded-full border text-xs font-semibold tracking-wider uppercase mb-4 transition-colors duration-500"
              style={{ 
                backgroundColor: `${activeColor}15`, 
                borderColor: `${activeColor}40`,
                color: activeColor 
              }}
            >
              AI Challenge
            </span>
          )}
          <h1 className="text-3xl md:text-6xl font-bold font-['Montserrat']">
            Select Your <span className="text-gold-gradient">Difficulty</span>
          </h1>
          <p className="text-gray-400 mt-4 max-w-lg mx-auto text-sm md:text-base px-4">
            Choose how strong the Stockfish AI will play against you.
          </p>
          
          {isMobile && (
             <div 
               className="mt-6 tracking-[0.2em] text-[10px] font-bold uppercase pointer-events-none opacity-80 transition-colors duration-500"
               style={{ color: activeColor }}
             >
               Swipe to Rotate
             </div>
          )}
        </div>

        {/* Difficulty Selection Area */}
        <div className="w-full relative px-0 sm:px-8 flex-1 flex flex-col justify-center max-w-[1600px] mx-auto">
        
          {/* Desktop Grid Layout */}
          <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 w-full px-8 relative mx-auto">
            {levels.map((level, i) => (
              <DifficultyCard
                key={level.id}
                level={level}
                i={i}
                isActive={hoveredLevel === i}
                isFaded={hoveredLevel !== null && hoveredLevel !== i}
                onClick={() => handleDifficultySelect(level.id)}
                onMouseEnter={() => setHoveredLevel(i)}
                onMouseLeave={() => setHoveredLevel(null)}
              />
            ))}
          </div>

          {/* Mobile Carousel Layout */}
          <div 
            className="md:hidden relative w-full h-[380px] flex items-center justify-center -mx-4 px-4 overflow-hidden"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEndEvent}
          >
            {/* Left Arrow */}
            <button onClick={prevSlide} className="absolute left-2 z-30 p-2 rounded-full bg-black/40 text-white/70 hover:text-white pointer-events-auto backdrop-blur-md border border-white/10 active:scale-90 transition-transform">
              <ChevronLeft className="w-6 h-6" />
            </button>

            <div className="relative w-full h-full flex items-center justify-center" style={{ perspective: '1200px' }}>
              {levels.map((level, index) => {
                let offset = index - activeIndex;
                const half = Math.floor(levels.length / 2);
                
                // Infinite loop logic for 5 items
                if (offset < -half) offset += levels.length;
                if (offset > half) offset -= levels.length;
                
                const isCenter = offset === 0;
                const isLeft = offset === -1;
                const isRight = offset === 1;
                
                // Keep only -1, 0, 1 visible to maintain clean look
                const isVisible = Math.abs(offset) <= 1;
                
                let transform = '';
                let opacity = 0;
                let zIndex = 0;
                let filter = 'none';
                
                if (isCenter) {
                  transform = 'translateX(0) scale(1) translateZ(0)';
                  opacity = 1;
                  zIndex = 20;
                  filter = 'brightness(1)';
                } else if (isLeft) {
                  transform = 'translateX(-22%) scale(0.85) translateZ(-50px)';
                  opacity = 0.5;
                  zIndex = 10;
                  filter = 'brightness(0.5)';
                } else if (isRight) {
                  transform = 'translateX(22%) scale(0.85) translateZ(-50px)';
                  opacity = 0.5;
                  zIndex = 10;
                  filter = 'brightness(0.5)';
                }
                
                return (
                  <div 
                    key={level.id}
                    className="absolute w-[75%] max-w-[280px] transition-all duration-500 ease-[cubic-bezier(0.25,0.8,0.25,1)]"
                    style={{ 
                      transform, 
                      opacity, 
                      zIndex, 
                      filter,
                      visibility: isVisible ? 'visible' : 'hidden',
                    }}
                    onClick={() => {
                      if (isLeft) prevSlide();
                      else if (isRight) nextSlide();
                      else handleDifficultySelect(level.id);
                    }}
                  >
                    <DifficultyCard
                      level={level}
                      i={index}
                      isActive={isCenter}
                      isFaded={false}
                      onClick={undefined}
                      onMouseEnter={undefined}
                      onMouseLeave={undefined}
                    />
                  </div>
                )
              })}
            </div>

            {/* Right Arrow */}
            <button onClick={nextSlide} className="absolute right-2 z-30 p-2 rounded-full bg-black/40 text-white/70 hover:text-white pointer-events-auto backdrop-blur-md border border-white/10 active:scale-90 transition-transform">
              <ChevronRight className="w-6 h-6" />
            </button>
            
            {/* Drag Hint */}
            <div className="absolute -bottom-2 md:-bottom-8 left-0 right-0 flex justify-center mt-4 pointer-events-none">
               <div className="text-[10px] text-white/30 tracking-widest font-mono select-none flex items-center gap-2">
                 <span>&lt;</span> DRAG <span>&gt;</span>
               </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DifficultyScreen;
