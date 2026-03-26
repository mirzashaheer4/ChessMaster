import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, User, Bot, Swords, History, ChevronRight, ChevronLeft, Globe, Cpu } from 'lucide-react';

import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../core/store/game';

// ─── Floating Chess Piece ─────────────────────────────────────────
const FloatingPiece = ({ 
  src, className, style, animationClass = 'animate-float' 
}: { 
  src: string; className?: string; style?: React.CSSProperties; animationClass?: string;
}) => (
  <img 
    src={src} 
    alt="chess piece" 
    className={`absolute pointer-events-none select-none ${animationClass} ${className || ''}`}
    style={style}
  />
);

// ─── Particle Background ──────────────────────────────────────────
const ParticleBackground = ({ theme = 'default', intensity = 1 }: { theme?: 'default' | 'pvp' | 'ai' | 'online' | 'dev', intensity?: number }) => {
  const particles = Array.from({ length: 30 * intensity }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 20}s`,
    duration: `${15 + Math.random() * 10}s`,
    size: `${2 + Math.random() * 3}px`,
  }));

  const getColor = () => {
    switch (theme) {
      case 'pvp': return 'rgba(59, 130, 246, 0.4)';
      case 'ai': return 'rgba(139, 92, 246, 0.4)';
      case 'online': return 'rgba(16, 185, 129, 0.4)';
      case 'dev': return 'rgba(239, 68, 68, 0.4)';
      default: return 'rgba(232, 179, 75, 0.2)';
    }
  };

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
            background: getColor(),
          }}
        />
      ))}
    </div>
  );
};

import GameSetupModal from './ui/GameSetupModal';

// ─── GAME MODES DATA ────────────────────────────────────────────
const GAME_MODES = [
  {
    id: 'pvp',
    title: 'Local Match',
    subtitle: 'Human vs Human',
    desc: 'Challenge a friend in a local multiplayer match. Face off on the same device and prove who is the true chess master.',
    image: '/landing/pvp-kings.png',
    icon: Swords,
    actionIcon: User,
    actionText: 'Start Local Match',
    setupMode: 'local',
    
    // Theme colors & gradients
    themeColor: '#60a5fa',
    baseColor: '#e8b34b',
    cardGradient: 'linear-gradient(135deg, rgba(30,58,138,0.3) 0%, rgba(59,130,246,0.2) 50%, rgba(239,68,68,0.2) 100%)',
    cardBorder: 'rgba(59, 130, 246, 0.5)',
    cardShadow: '0 0 60px rgba(59, 130, 246, 0.3), inset 0 0 60px rgba(59, 130, 246, 0.1)',
    iconGradient: 'linear-gradient(135deg, rgba(59,130,246,0.3) 0%, rgba(239,68,68,0.3) 100%)',
    iconShadow: '0 0 30px rgba(59,130,246,0.5)',
    buttonGradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    buttonShadow: '0 0 30px rgba(59, 130, 246, 0.5)',
    imageFilter: 'drop-shadow(0 0 20px rgba(59,130,246,0.5))',
    imageHoverFilterFallback: 'none',
    imageTransform: 'scale(1.1)',
    
    renderBgEffect: () => <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(90deg, rgba(59,130,246,0.2) 0%, transparent 50%, rgba(239,68,68,0.2) 100%)' }} />
  },
  {
    id: 'ai',
    title: 'Play vs AI',
    subtitle: 'Challenge the Machine',
    desc: 'Test your skills against our advanced AI. Choose from multiple difficulty levels and learn from every move.',
    image: '/landing/ai-battle.png',
    icon: Bot,
    actionIcon: Bot,
    actionText: 'Challenge AI',
    setupMode: 'ai',
    
    themeColor: '#a78bfa',
    baseColor: '#e8b34b',
    cardGradient: 'linear-gradient(135deg, rgba(76,29,149,0.4) 0%, rgba(139,92,246,0.3) 50%, rgba(59,130,246,0.2) 100%)',
    cardBorder: 'rgba(139, 92, 246, 0.5)',
    cardShadow: '0 0 60px rgba(139, 92, 246, 0.4), inset 0 0 60px rgba(139, 92, 246, 0.1)',
    iconGradient: 'linear-gradient(135deg, rgba(139,92,246,0.4) 0%, rgba(59,130,246,0.3) 100%)',
    iconShadow: '0 0 30px rgba(139,92,246,0.5)',
    buttonGradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    buttonShadow: '0 0 30px rgba(139, 92, 246, 0.5)',
    imageFilter: 'drop-shadow(0 0 30px rgba(139,92,246,0.6))',
    imageHoverFilterFallback: 'none',
    imageTransform: 'scale(1.1)',
    
    renderBgEffect: () => <div className="absolute inset-0 pointer-events-none opacity-30" style={{ backgroundImage: `linear-gradient(rgba(139,92,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.3) 1px, transparent 1px)`, backgroundSize: '40px 40px', animation: 'grid-move 20s linear infinite' }} />
  },
  {
    id: 'online',
    title: 'Play Online',
    subtitle: 'Global PVP Matchmaking',
    desc: 'Compete against players globally in real-time. Rise up the leaderboards and prove you are the best.',
    image: '/landing/pvp-kings.png',
    icon: Globe,
    actionIcon: Globe,
    actionText: 'Online Match',
    setupMode: 'online',
    
    themeColor: '#34d399',
    baseColor: '#e8b34b',
    cardGradient: 'linear-gradient(135deg, rgba(6,78,59,0.4) 0%, rgba(4,120,87,0.3) 50%, rgba(16,185,129,0.2) 100%)',
    cardBorder: 'rgba(16, 185, 129, 0.5)',
    cardShadow: '0 0 60px rgba(16, 185, 129, 0.4), inset 0 0 60px rgba(16, 185, 129, 0.1)',
    iconGradient: 'linear-gradient(135deg, rgba(16,185,129,0.4) 0%, rgba(5,150,105,0.3) 100%)',
    iconShadow: '0 0 30px rgba(16,185,129,0.5)',
    buttonGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    buttonShadow: '0 0 30px rgba(16, 185, 129, 0.5)',
    imageFilter: 'drop-shadow(0 0 30px rgba(16,185,129,0.6)) hue-rotate(90deg)',
    imageHoverFilterFallback: 'hue-rotate(60deg)',
    imageTransform: 'scale(1.1)',
    
    renderBgEffect: () => <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: `radial-gradient(circle at center, rgba(16,185,129,1) 0%, transparent 2px)`, backgroundSize: '20px 20px', animation: 'pulse-glow 4s infinite' }} />
  },
  {
    id: 'dev',
    title: 'Beat the Dev',
    subtitle: 'Dev',
    desc: 'Think you\'ve got what it takes? Face off against the ultimate challenge. The creator awaits your best moves.',
    image: '/landing/ai-battle.png',
    icon: Cpu,
    actionIcon: Cpu,
    actionText: 'Challenge Dev',
    setupMode: 'dev',
    
    themeColor: '#fca5a5',
    baseColor: '#e8b34b',
    cardGradient: 'linear-gradient(135deg, rgba(153,27,27,0.4) 0%, rgba(220,38,38,0.3) 50%, rgba(239,68,68,0.2) 100%)',
    cardBorder: 'rgba(239, 68, 68, 0.5)',
    cardShadow: '0 0 60px rgba(239, 68, 68, 0.4), inset 0 0 60px rgba(239, 68, 68, 0.1)',
    iconGradient: 'linear-gradient(135deg, rgba(239,68,68,0.4) 0%, rgba(185,28,28,0.3) 100%)',
    iconShadow: '0 0 30px rgba(239,68,68,0.5)',
    buttonGradient: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
    buttonShadow: '0 0 30px rgba(239, 68, 68, 0.5)',
    imageFilter: 'drop-shadow(0 0 30px rgba(239,68,68,0.6)) hue-rotate(-60deg)',
    imageHoverFilterFallback: 'hue-rotate(-40deg)',
    imageTransform: 'scale(1.1)',
    
    renderBgEffect: () => null
  }
];

// ─── CARD COMPONENT ───────────────────────────────────────────────
const GameModeCard = ({ mode, isActive, isFaded, onClick, onMouseEnter, onMouseLeave }: any) => {
  return (
    <div
      className={`relative group cursor-pointer transition-all duration-700 h-full ${
        isFaded ? 'opacity-40 scale-[0.98]' : 'opacity-100 scale-100'
      }`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div 
        className="relative overflow-hidden rounded-3xl p-6 xl:p-8 h-full min-h-[400px] flex flex-col"
        style={{
          backgroundImage: isActive ? mode.cardGradient : 'none',
          backgroundColor: isActive ? '#0a0a0f' : 'rgba(21, 21, 21, 0.95)',
          backdropFilter: 'blur(20px)',
          border: isActive ? `2px solid ${mode.cardBorder}` : '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: isActive ? mode.cardShadow : '0 8px 32px rgba(0, 0, 0, 0.3)',
          transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {isActive && mode.renderBgEffect?.()}
        
        <div className="relative z-10 flex flex-col h-full pointer-events-none">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500"
            style={{ background: isActive ? mode.iconGradient : 'rgba(232,179,75,0.1)', boxShadow: isActive ? mode.iconShadow : 'none' }}>
            <mode.icon className="w-8 h-8 transition-colors duration-500" style={{ color: isActive ? mode.themeColor : mode.baseColor }} />
          </div>
          <h3 className="text-2xl md:text-3xl font-bold font-['Montserrat'] mb-2">{mode.title}</h3>
          <p className="text-lg mb-4 transition-colors duration-500 flex items-center gap-2" style={{ color: isActive ? mode.themeColor : mode.baseColor }}>
            {mode.subtitle}
          </p>
          <p className="text-gray-400 text-sm leading-relaxed mb-6 flex-1">{mode.desc}</p>
          <div className="relative h-32 md:h-40 mt-auto">
            <img src={mode.image} alt={mode.title} className="absolute inset-0 w-full h-full object-contain transition-all duration-700 pointer-events-none"
              style={{ transform: isActive ? mode.imageTransform : 'scale(1)', filter: isActive ? mode.imageFilter : mode.imageHoverFilterFallback }} />
          </div>
          <button className="mt-6 w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-500 pointer-events-auto"
            style={{ background: isActive ? mode.buttonGradient : 'rgba(255, 255, 255, 0.05)', color: isActive ? 'white' : '#9ca3af', boxShadow: isActive ? mode.buttonShadow : 'none' }}>
            <mode.actionIcon className="w-5 h-5" /> {mode.actionText} <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default function PlayMode() {
  const [hoveredMode, setHoveredMode] = useState<'none' | 'pvp' | 'ai' | 'online' | 'dev'>('none');
  const [setupMode, setSetupMode] = useState<'local' | 'dev' | 'online' | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Carousel specific state
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize(); // initial set
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleStartLocal = (settings: any) => {
    useGameStore.getState().setMode('local');
    useGameStore.getState().setTimeControl(settings.timeControl);
    useGameStore.getState().setChessType(settings.chessType);
    useGameStore.getState().resetGame();
    navigate('/game/local');
  };

  const handleStartDev = (settings: any) => {
    useGameStore.getState().setMode('ai');
    useGameStore.getState().setDifficulty('hard');
    useGameStore.getState().setPlayerColor(settings.color);
    useGameStore.getState().setTimeControl(settings.timeControl);
    useGameStore.getState().setChessType(settings.chessType);
    useGameStore.getState().resetGame();
    navigate('/game/ai');
  };

  const handleStartOnline = (settings: any) => {
    const tc = settings.timeControl;
    useGameStore.getState().setMode('online');
    useGameStore.getState().setTimeControl(tc);
    useGameStore.getState().setChessType('standard');
    useGameStore.getState().joinQueue(tc.category, tc.initial, tc.increment);
    navigate('/game/online');
  };

  const handleCardAction = (modeId: string) => {
    if (modeId === 'ai') navigate('/difficulty');
    else if (modeId === 'pvp') setSetupMode('local');
    else if (modeId === 'online') setSetupMode('online');
    else if (modeId === 'dev') setSetupMode('dev');
  };

  // Parallax mouse tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isMobile && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePos({
          x: (e.clientX - rect.left - rect.width / 2) / 50,
          y: (e.clientY - rect.top - rect.height / 2) / 50,
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isMobile]);

  // Compute the currently active theme mode key based on mobile or desktop interaction
  const activeThemeModeId = isMobile ? GAME_MODES[activeIndex].id : (hoveredMode !== 'none' ? hoveredMode : 'none');

  const getBackgroundGradient = () => {
    switch (activeThemeModeId) {
      case 'pvp': return 'linear-gradient(135deg, #0a0a0a 0%, #1a1a3e 25%, #1e1b4b 50%, #312e81 75%, #0a0a0a 100%)';
      case 'ai': return 'linear-gradient(135deg, #0a0a0a 0%, #1e1b4b 25%, #4c1d95 50%, #7c3aed 75%, #0a0a0a 100%)';
      case 'online': return 'linear-gradient(135deg, #0a0a0a 0%, #064e3b 25%, #065f46 50%, #047857 75%, #0a0a0a 100%)';
      case 'dev': return 'linear-gradient(135deg, #0a0a0a 0%, #450a0a 25%, #7f1d1d 50%, #991b1b 75%, #0a0a0a 100%)';
      default: return 'linear-gradient(135deg, #0a0a0a 0%, #0f172a 25%, #151515 50%, #0f172a 75%, #0a0a0a 100%)';
    }
  };

  const getGlowColor = () => {
    switch (activeThemeModeId) {
      case 'pvp': return 'rgba(59, 130, 246, 0.3)';
      case 'ai': return 'rgba(139, 92, 246, 0.3)';
      case 'online': return 'rgba(16, 185, 129, 0.3)';
      case 'dev': return 'rgba(239, 68, 68, 0.3)';
      default: return 'rgba(232, 179, 75, 0.2)';
    }
  };

  const isFaded = (modeId: string) => !isMobile && hoveredMode !== 'none' && hoveredMode !== modeId;

  // Touch handlers for mobile
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

  const nextSlide = () => setActiveIndex((prev) => (prev === GAME_MODES.length - 1 ? 0 : prev + 1));
  const prevSlide = () => setActiveIndex((prev) => (prev === 0 ? GAME_MODES.length - 1 : prev - 1));

  return (
    <div 
      ref={containerRef}
      className={`min-h-screen relative ${isMobile ? 'overflow-hidden' : 'overflow-y-auto'}`}
      style={{
        background: getBackgroundGradient(),
        transition: 'background 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Dynamic Background Glow */}
      <div 
        className="fixed inset-0 pointer-events-none transition-all duration-1000"
        style={{
          background: isMobile ? `radial-gradient(ellipse at 50% 50%, ${getGlowColor()} 0%, transparent 70%)` : `radial-gradient(ellipse at ${50 + mousePos.x}% ${50 + mousePos.y}%, ${getGlowColor()} 0%, transparent 60%)`,
        }}
      />

      {/* Theme-specific Particles */}
      <div className="fixed inset-0 pointer-events-none">
        <ParticleBackground theme={activeThemeModeId as 'default'|'pvp'|'ai'|'online'|'dev'} intensity={activeThemeModeId === 'none' ? 1 : 1.5} />
      </div>

      {/* Floating Pieces with Parallax */}
      <FloatingPiece 
        src="/landing/chess-king.png" 
        className="w-20 md:w-32 opacity-30 fixed"
        style={{ 
          top: '10%', 
          left: '5%', 
          animationDelay: '0s',
          transform: isMobile ? 'none' : `translate(${mousePos.x * -2}px, ${mousePos.y * -2}px)`,
          transition: 'transform 0.3s ease-out',
        }}
      />
      <FloatingPiece 
        src="/landing/robot-queen.png" 
        className="w-16 md:w-24 opacity-40 fixed"
        style={{ 
          top: '70%', 
          right: '8%', 
          animationDelay: '1s',
          transform: isMobile ? 'none' : `translate(${mousePos.x * 1.5}px, ${mousePos.y * 1.5}px)`,
          transition: 'transform 0.3s ease-out',
        }}
        animationClass="animate-float-reverse"
      />
      
      {/* Scan Line Effect for AI/Dev Mode */}
      {(activeThemeModeId === 'ai' || activeThemeModeId === 'dev') && (
        <div 
          className="fixed inset-0 pointer-events-none overflow-hidden"
          style={{
            background: `linear-gradient(to bottom, transparent 0%, ${activeThemeModeId === 'dev' ? 'rgba(239,68,68,0.1)' : 'rgba(139, 92, 246, 0.1)'} 50%, transparent 100%)`,
            animation: 'scan-line 3s linear infinite',
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col pt-16 md:pt-24 pb-12 px-6">
        {/* Top bar with back and history */}
        <div className="max-w-7xl mx-auto w-full mb-6 md:mb-8 flex items-center justify-between">
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-300 group cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            <span className="text-sm font-medium">Back</span>
          </button>
          
          <button
            onClick={() => navigate('/history')}
            className="flex items-center gap-2 text-[#e8b34b] hover:text-[#ffd700] transition-colors duration-300 cursor-pointer"
          >
            <History className="w-5 h-5" />
            <span className="text-sm font-medium">History</span>
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-6 md:mb-12">
          {!isMobile && (
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#e8b34b]/10 border border-[#e8b34b]/30 text-[#e8b34b] text-xs font-semibold tracking-wider uppercase mb-4">
              Select Game Mode
            </span>
          )}
          <h1 className="text-3xl md:text-6xl font-bold font-['Montserrat']">
            Choose Your <span className="text-gold-gradient">Battle</span>
          </h1>
          {isMobile && (
             <div className="mt-6 text-[#34d399] tracking-[0.2em] text-[10px] font-bold uppercase pointer-events-none opacity-80" style={{ color: GAME_MODES[activeIndex].themeColor }}>
               Swipe to Rotate
             </div>
          )}
        </div>

        {/* Mode Selection Area */}
        <div className="flex-1 flex items-center justify-center w-full px-0 sm:px-8">
          
          {/* Desktop Grid Layout */}
          <div className="hidden md:grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 xl:gap-8 max-w-[1600px] w-full pb-20">
            {GAME_MODES.map((mode) => (
              <GameModeCard
                key={mode.id}
                mode={mode}
                isActive={hoveredMode === mode.id}
                isFaded={isFaded(mode.id)}
                onClick={() => handleCardAction(mode.id)}
                onMouseEnter={() => setHoveredMode(mode.id as any)}
                onMouseLeave={() => setHoveredMode('none')}
              />
            ))}
          </div>

          {/* Mobile Carousel Layout */}
          <div 
            className="md:hidden relative w-full h-[520px] flex items-center justify-center -mx-6 px-4"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEndEvent}
          >
            {/* Left Arrow */}
            <button onClick={prevSlide} className="absolute left-2 z-30 p-2 rounded-full bg-black/40 text-white/70 hover:text-white pointer-events-auto backdrop-blur-md border border-white/10 active:scale-90 transition-transform">
              <ChevronLeft className="w-6 h-6" />
            </button>

            <div className="relative w-full h-full flex items-center justify-center" style={{ perspective: '1200px' }}>
              {GAME_MODES.map((mode, index) => {
                let offset = index - activeIndex;
                if (offset < -1) offset += GAME_MODES.length;
                if (offset > 1) offset -= GAME_MODES.length;
                
                const isCenter = offset === 0;
                const isLeft = offset === -1;
                const isRight = offset === 1;
                const isVisible = isCenter || isLeft || isRight;
                
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
                    key={mode.id}
                    className="absolute w-[85%] max-w-[340px] h-full transition-all duration-500 ease-[cubic-bezier(0.25,0.8,0.25,1)]"
                    style={{ 
                      transform, 
                      opacity, 
                      zIndex, 
                      filter,
                      visibility: isVisible ? 'visible' : 'hidden' 
                    }}
                    onClick={() => {
                      if (isLeft) prevSlide();
                      else if (isRight) nextSlide();
                      else handleCardAction(mode.id);
                    }}
                  >
                    <GameModeCard
                      mode={mode}
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
            <div className="absolute -bottom-8 left-0 right-0 flex justify-center mt-2 pointer-events-none">
               <div className="text-[10px] text-white/30 tracking-widest font-mono select-none flex items-center gap-2">
                 <span>&lt;</span> DRAG <span>&gt;</span>
               </div>
            </div>
          </div>
        </div>
      </div>

      <GameSetupModal 
        isOpen={setupMode !== null}
        mode={setupMode}
        onClose={() => setSetupMode(null)}
        onStart={(settings) => {
           if (setupMode === 'local') handleStartLocal(settings);
           if (setupMode === 'dev') handleStartDev(settings);
           if (setupMode === 'online') handleStartOnline(settings);
           setSetupMode(null);
        }}
      />

      {/* CSS Animations */}
      <style>{`
        @keyframes scan-line {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes grid-move {
          0% { background-position: 0 0; }
          100% { background-position: 40px 40px; }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
