import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, User, Bot, Swords, History, ChevronRight, Globe, Cpu } from 'lucide-react';

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
            boxShadow: `0 0 ${p.size} ${getColor()}`,
          }}
        />
      ))}
    </div>
  );
};

import GameSetupModal from './ui/GameSetupModal';

export default function PlayMode() {
  const [hoveredMode, setHoveredMode] = useState<'none' | 'pvp' | 'ai' | 'online' | 'dev'>('none');
  const [setupMode, setSetupMode] = useState<'local' | 'dev' | 'online' | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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
    // Join matchmaking queue — the game will start via socket events
    useGameStore.getState().joinQueue(tc.category, tc.initial, tc.increment);
    navigate('/game/online');
  };

  // Parallax mouse tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePos({
          x: (e.clientX - rect.left - rect.width / 2) / 50,
          y: (e.clientY - rect.top - rect.height / 2) / 50,
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const getBackgroundGradient = () => {
    switch (hoveredMode) {
      case 'pvp':
        return 'linear-gradient(135deg, #0a0a0a 0%, #1a1a3e 25%, #1e1b4b 50%, #312e81 75%, #0a0a0a 100%)';
      case 'ai':
        return 'linear-gradient(135deg, #0a0a0a 0%, #1e1b4b 25%, #4c1d95 50%, #7c3aed 75%, #0a0a0a 100%)';
      case 'online':
        return 'linear-gradient(135deg, #0a0a0a 0%, #064e3b 25%, #065f46 50%, #047857 75%, #0a0a0a 100%)';
      case 'dev':
        return 'linear-gradient(135deg, #0a0a0a 0%, #450a0a 25%, #7f1d1d 50%, #991b1b 75%, #0a0a0a 100%)';
      default:
        return 'linear-gradient(135deg, #0a0a0a 0%, #0f172a 25%, #151515 50%, #0f172a 75%, #0a0a0a 100%)';
    }
  };

  const getGlowColor = () => {
    switch (hoveredMode) {
      case 'pvp': return 'rgba(59, 130, 246, 0.3)';
      case 'ai': return 'rgba(139, 92, 246, 0.3)';
      case 'online': return 'rgba(16, 185, 129, 0.3)';
      case 'dev': return 'rgba(239, 68, 68, 0.3)';
      default: return 'rgba(232, 179, 75, 0.2)';
    }
  };

  const isFaded = (mode: 'pvp' | 'ai' | 'online' | 'dev') => hoveredMode !== 'none' && hoveredMode !== mode;

  return (
    <div 
      ref={containerRef}
      className="min-h-screen relative overflow-y-auto"
      style={{
        background: getBackgroundGradient(),
        transition: 'background 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Dynamic Background Glow */}
      <div 
        className="fixed inset-0 pointer-events-none transition-all duration-1000"
        style={{
          background: `radial-gradient(ellipse at ${50 + mousePos.x}% ${50 + mousePos.y}%, ${getGlowColor()} 0%, transparent 60%)`,
        }}
      />

      {/* Theme-specific Particles */}
      <div className="fixed inset-0 pointer-events-none">
        <ParticleBackground theme={hoveredMode === 'none' ? 'default' : hoveredMode} intensity={hoveredMode === 'none' ? 1 : 1.5} />
      </div>

      {/* Floating Pieces with Parallax */}
      <FloatingPiece 
        src="/landing/chess-king.png" 
        className="w-20 md:w-32 opacity-30 fixed"
        style={{ 
          top: '10%', 
          left: '5%', 
          animationDelay: '0s',
          transform: `translate(${mousePos.x * -2}px, ${mousePos.y * -2}px)`,
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
          transform: `translate(${mousePos.x * 1.5}px, ${mousePos.y * 1.5}px)`,
          transition: 'transform 0.3s ease-out',
        }}
        animationClass="animate-float-reverse"
      />
      
      {/* Scan Line Effect for AI/Dev Mode */}
      {(hoveredMode === 'ai' || hoveredMode === 'dev') && (
        <div 
          className="fixed inset-0 pointer-events-none overflow-hidden"
          style={{
            background: `linear-gradient(to bottom, transparent 0%, ${hoveredMode === 'dev' ? 'rgba(239,68,68,0.1)' : 'rgba(139, 92, 246, 0.1)'} 50%, transparent 100%)`,
            animation: 'scan-line 3s linear infinite',
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col pt-24 pb-12 px-6">
        {/* Top bar with back and history */}
        <div className="max-w-7xl mx-auto w-full mb-8 flex items-center justify-between">
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
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#e8b34b]/10 border border-[#e8b34b]/30 text-[#e8b34b] text-xs font-semibold tracking-wider uppercase mb-4">
            Select Game Mode
          </span>
          <h1 className="text-4xl md:text-6xl font-bold font-['Montserrat']">
            Choose Your <span className="text-gold-gradient">Battle</span>
          </h1>
        </div>

        {/* Mode Selection Cards (4 Columns) */}
        <div className="flex-1 flex items-center justify-center w-full px-4 sm:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 xl:gap-8 max-w-[1600px] w-full pb-20">
            
            {/* PVP Mode Card */}
            <div
              className={`relative group cursor-pointer transition-all duration-700 ${
                isFaded('pvp') ? 'opacity-40 scale-[0.98]' : 'opacity-100 scale-100'
              }`}
              onClick={() => setSetupMode('local')}
              onMouseEnter={() => setHoveredMode('pvp')}
              onMouseLeave={() => setHoveredMode('none')}
            >
              <div 
                className="relative overflow-hidden rounded-3xl p-6 xl:p-8 h-full min-h-[400px] flex flex-col"
                style={{
                  background: hoveredMode === 'pvp' ? 'linear-gradient(135deg, rgba(30,58,138,0.3) 0%, rgba(59,130,246,0.2) 50%, rgba(239,68,68,0.2) 100%)' : 'rgba(21, 21, 21, 0.6)',
                  backdropFilter: 'blur(20px)',
                  border: hoveredMode === 'pvp' ? '2px solid rgba(59, 130, 246, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: hoveredMode === 'pvp' ? '0 0 60px rgba(59, 130, 246, 0.3), inset 0 0 60px rgba(59, 130, 246, 0.1)' : '0 8px 32px rgba(0, 0, 0, 0.3)',
                  transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {hoveredMode === 'pvp' && <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(90deg, rgba(59,130,246,0.2) 0%, transparent 50%, rgba(239,68,68,0.2) 100%)' }} />}
                
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500"
                    style={{ background: hoveredMode === 'pvp' ? 'linear-gradient(135deg, rgba(59,130,246,0.3) 0%, rgba(239,68,68,0.3) 100%)' : 'rgba(232,179,75,0.1)', boxShadow: hoveredMode === 'pvp' ? '0 0 30px rgba(59,130,246,0.5)' : 'none' }}>
                    <Swords className="w-8 h-8 transition-colors duration-500" style={{ color: hoveredMode === 'pvp' ? '#60a5fa' : '#e8b34b' }} />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold font-['Montserrat'] mb-2">Local Match</h3>
                  <p className="text-lg mb-4 transition-colors duration-500" style={{ color: hoveredMode === 'pvp' ? '#60a5fa' : '#e8b34b' }}>Human vs Human</p>
                  <p className="text-gray-400 text-sm leading-relaxed mb-6 flex-1">Challenge a friend in a local multiplayer match. Face off on the same device and prove who is the true chess master.</p>
                  <div className="relative h-32 md:h-40 mt-auto">
                    <img src="/landing/pvp-kings.png" alt="PVP Battle" className="absolute inset-0 w-full h-full object-contain transition-all duration-700"
                      style={{ transform: hoveredMode === 'pvp' ? 'scale(1.1)' : 'scale(1)', filter: hoveredMode === 'pvp' ? 'drop-shadow(0 0 20px rgba(59,130,246,0.5))' : 'none' }} />
                  </div>
                  <button className="mt-6 w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-500 cursor-pointer"
                    style={{ background: hoveredMode === 'pvp' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'rgba(255, 255, 255, 0.05)', color: hoveredMode === 'pvp' ? 'white' : '#9ca3af', boxShadow: hoveredMode === 'pvp' ? '0 0 30px rgba(59, 130, 246, 0.5)' : 'none' }}>
                    <User className="w-5 h-5" /> Start Local Match <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* AI Mode Card */}
            <div 
                className={`relative group cursor-pointer transition-all duration-700 ${isFaded('ai') ? 'opacity-40 scale-[0.98]' : 'opacity-100 scale-100'}`}
                onClick={() => navigate('/difficulty')}
              onMouseEnter={() => setHoveredMode('ai')}
              onMouseLeave={() => setHoveredMode('none')}
            >
              <div 
                className="relative overflow-hidden rounded-3xl p-6 xl:p-8 h-full min-h-[400px] flex flex-col"
                style={{
                  background: hoveredMode === 'ai' ? 'linear-gradient(135deg, rgba(76,29,149,0.4) 0%, rgba(139,92,246,0.3) 50%, rgba(59,130,246,0.2) 100%)' : 'rgba(21, 21, 21, 0.6)',
                  backdropFilter: 'blur(20px)',
                  border: hoveredMode === 'ai' ? '2px solid rgba(139, 92, 246, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: hoveredMode === 'ai' ? '0 0 60px rgba(139, 92, 246, 0.4), inset 0 0 60px rgba(139, 92, 246, 0.1)' : '0 8px 32px rgba(0, 0, 0, 0.3)',
                  transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {hoveredMode === 'ai' && (
                  <div className="absolute inset-0 pointer-events-none opacity-30" style={{ backgroundImage: `linear-gradient(rgba(139,92,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.3) 1px, transparent 1px)`, backgroundSize: '40px 40px', animation: 'grid-move 20s linear infinite' }} />
                )}
                
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500"
                    style={{ background: hoveredMode === 'ai' ? 'linear-gradient(135deg, rgba(139,92,246,0.4) 0%, rgba(59,130,246,0.3) 100%)' : 'rgba(232,179,75,0.1)', boxShadow: hoveredMode === 'ai' ? '0 0 30px rgba(139,92,246,0.5)' : 'none' }}>
                    <Bot className="w-8 h-8 transition-colors duration-500" style={{ color: hoveredMode === 'ai' ? '#a78bfa' : '#e8b34b' }} />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold font-['Montserrat'] mb-2">Play vs AI</h3>
                  <p className="text-lg mb-4 transition-colors duration-500" style={{ color: hoveredMode === 'ai' ? '#a78bfa' : '#e8b34b' }}>Challenge the Machine</p>
                  <p className="text-gray-400 text-sm leading-relaxed mb-6 flex-1">Test your skills against our advanced AI. Choose from multiple difficulty levels and learn from every move.</p>
                  <div className="relative h-32 md:h-40 mt-auto">
                    <img src="/landing/ai-battle.png" alt="AI Battle" className="absolute inset-0 w-full h-full object-contain transition-all duration-700"
                      style={{ transform: hoveredMode === 'ai' ? 'scale(1.1)' : 'scale(1)', filter: hoveredMode === 'ai' ? 'drop-shadow(0 0 30px rgba(139,92,246,0.6))' : 'none' }} />
                  </div>
                  <button className="mt-6 w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-500 cursor-pointer"
                    style={{ background: hoveredMode === 'ai' ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : 'rgba(255, 255, 255, 0.05)', color: hoveredMode === 'ai' ? 'white' : '#9ca3af', boxShadow: hoveredMode === 'ai' ? '0 0 30px rgba(139, 92, 246, 0.5)' : 'none' }}>
                    <Bot className="w-5 h-5" /> Challenge AI <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* PVP Online Card */}
            <div
              className={`relative group cursor-pointer transition-all duration-700 ${
                isFaded('online') ? 'opacity-40 scale-[0.98]' : 'opacity-100 scale-100'
              }`}
              onClick={() => setSetupMode('online')}
              onMouseEnter={() => setHoveredMode('online')}
              onMouseLeave={() => setHoveredMode('none')}
            >
              <div 
                className="relative overflow-hidden rounded-3xl p-6 xl:p-8 h-full min-h-[400px] flex flex-col"
                style={{
                  background: hoveredMode === 'online' ? 'linear-gradient(135deg, rgba(6,78,59,0.4) 0%, rgba(4,120,87,0.3) 50%, rgba(16,185,129,0.2) 100%)' : 'rgba(21, 21, 21, 0.6)',
                  backdropFilter: 'blur(20px)',
                  border: hoveredMode === 'online' ? '2px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: hoveredMode === 'online' ? '0 0 60px rgba(16, 185, 129, 0.4), inset 0 0 60px rgba(16, 185, 129, 0.1)' : '0 8px 32px rgba(0, 0, 0, 0.3)',
                  transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {hoveredMode === 'online' && (
                  <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: `radial-gradient(circle at center, rgba(16,185,129,1) 0%, transparent 2px)`, backgroundSize: '20px 20px', animation: 'pulse-glow 4s infinite' }} />
                )}
                
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500"
                    style={{ background: hoveredMode === 'online' ? 'linear-gradient(135deg, rgba(16,185,129,0.4) 0%, rgba(5,150,105,0.3) 100%)' : 'rgba(232,179,75,0.1)', boxShadow: hoveredMode === 'online' ? '0 0 30px rgba(16,185,129,0.5)' : 'none' }}>
                    <Globe className="w-8 h-8 transition-colors duration-500" style={{ color: hoveredMode === 'online' ? '#34d399' : '#e8b34b' }} />
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-2xl md:text-3xl font-bold font-['Montserrat']">Play Online</h3>
                  </div>
                  <p className="text-lg mb-4 transition-colors duration-500" style={{ color: hoveredMode === 'online' ? '#34d399' : '#e8b34b' }}>Global PVP Matchmaking</p>
                  <p className="text-gray-400 text-sm leading-relaxed mb-6 flex-1">Compete against players globally in real-time. Rise up the leaderboards and prove you are the best.</p>
                  <div className="relative h-32 md:h-40 mt-auto">
                    <img src="/landing/pvp-kings.png" alt="Online PVP" className="absolute inset-0 w-full h-full object-contain transition-all duration-700"
                      style={{ transform: hoveredMode === 'online' ? 'scale(1.1)' : 'scale(1)', filter: hoveredMode === 'online' ? 'drop-shadow(0 0 30px rgba(16,185,129,0.6)) hue-rotate(90deg)' : 'hue-rotate(60deg)' }} />
                  </div>
                  <button className="mt-6 w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-500 cursor-pointer"
                    style={{ background: hoveredMode === 'online' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'rgba(255, 255, 255, 0.05)', color: hoveredMode === 'online' ? 'white' : '#9ca3af', boxShadow: hoveredMode === 'online' ? '0 0 30px rgba(16, 185, 129, 0.5)' : 'none' }}>
                    <Globe className="w-5 h-5" /> Online Match <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Beat the Dev Card */}
            <div
              className={`relative group cursor-pointer transition-all duration-700 ${
                isFaded('dev') ? 'opacity-40 scale-[0.98]' : 'opacity-100 scale-100'
              }`}
              onClick={() => setSetupMode('dev')}
              onMouseEnter={() => setHoveredMode('dev')}
              onMouseLeave={() => setHoveredMode('none')}
            >
              <div 
                className="relative overflow-hidden rounded-3xl p-6 xl:p-8 h-full min-h-[400px] flex flex-col"
                style={{
                  background: hoveredMode === 'dev' ? 'linear-gradient(135deg, rgba(153,27,27,0.4) 0%, rgba(220,38,38,0.3) 50%, rgba(239,68,68,0.2) 100%)' : 'rgba(21, 21, 21, 0.6)',
                  backdropFilter: 'blur(20px)',
                  border: hoveredMode === 'dev' ? '2px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: hoveredMode === 'dev' ? '0 0 60px rgba(239, 68, 68, 0.4), inset 0 0 60px rgba(239, 68, 68, 0.1)' : '0 8px 32px rgba(0, 0, 0, 0.3)',
                  transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500"
                    style={{ background: hoveredMode === 'dev' ? 'linear-gradient(135deg, rgba(239,68,68,0.4) 0%, rgba(185,28,28,0.3) 100%)' : 'rgba(232,179,75,0.1)', boxShadow: hoveredMode === 'dev' ? '0 0 30px rgba(239,68,68,0.5)' : 'none' }}>
                    <Cpu className="w-8 h-8 transition-colors duration-500" style={{ color: hoveredMode === 'dev' ? '#fca5a5' : '#e8b34b' }} />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold font-['Montserrat'] mb-2">Beat the Dev</h3>
                  <p className="text-lg mb-4 transition-colors duration-500 flex items-center gap-2" style={{ color: hoveredMode === 'dev' ? '#fca5a5' : '#e8b34b' }}>
                    Dev
                  </p>
                  <p className="text-gray-400 text-sm leading-relaxed mb-6 flex-1">Think you've got what it takes? Face off against the ultimate challenge. The creator awaits your best moves.</p>
                  <div className="relative h-32 md:h-40 mt-auto">
                    <img src="/landing/ai-battle.png" alt="Beat the Dev" className="absolute inset-0 w-full h-full object-contain transition-all duration-700"
                      style={{ transform: hoveredMode === 'dev' ? 'scale(1.1)' : 'scale(1)', filter: hoveredMode === 'dev' ? 'drop-shadow(0 0 30px rgba(239,68,68,0.6)) hue-rotate(-60deg)' : 'hue-rotate(-40deg)' }} />
                  </div>
                  <button className="mt-6 w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-500 cursor-pointer"
                    style={{ background: hoveredMode === 'dev' ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' : 'rgba(255, 255, 255, 0.05)', color: hoveredMode === 'dev' ? 'white' : '#9ca3af', boxShadow: hoveredMode === 'dev' ? '0 0 30px rgba(239, 68, 68, 0.5)' : 'none' }}>
                    <Cpu className="w-5 h-5" /> Challenge Dev <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
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
