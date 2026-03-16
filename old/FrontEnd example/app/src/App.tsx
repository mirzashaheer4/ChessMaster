import { useEffect, useRef, useState } from 'react';
import { 
  Crown, 
  Brain, 
  BarChart3, 
  Users, 
  Palette, 
  Twitter, 
  Facebook, 
  Instagram, 
  Youtube,
  ChevronRight,
  Play,
  Activity,
  ArrowLeft,
  User,
  Bot,
  Swords
} from 'lucide-react';
import './App.css';

// Page type for navigation
type PageType = 'home' | 'play';

// Floating Chess Piece Component
const FloatingPiece = ({ 
  src, 
  className, 
  style, 
  animationClass = 'animate-float' 
}: { 
  src: string; 
  className?: string; 
  style?: React.CSSProperties;
  animationClass?: string;
}) => (
  <img 
    src={src} 
    alt="chess piece" 
    className={`absolute pointer-events-none select-none ${animationClass} ${className || ''}`}
    style={style}
  />
);

// Particle Background Component
const ParticleBackground = ({ theme = 'default', intensity = 1 }: { theme?: 'default' | 'pvp' | 'ai'; intensity?: number }) => {
  const getParticleColor = () => {
    switch (theme) {
      case 'pvp': return 'rgba(59, 130, 246, 0.5)';
      case 'ai': return 'rgba(139, 92, 246, 0.5)';
      default: return 'rgba(232, 179, 75, 0.4)';
    }
  };

  const particles = Array.from({ length: 30 * intensity }, (_, i) => ({
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
            background: getParticleColor(),
          }}
        />
      ))}
    </div>
  );
};

// Navbar Component
const Navbar = ({ onNavigate }: { onNavigate?: (page: PageType) => void }) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'glass-navbar py-3' : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <div 
          className="flex items-center gap-3 group cursor-pointer"
          onClick={() => onNavigate?.('home')}
        >
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#e8b34b] to-[#d4a03d] flex items-center justify-center transition-transform duration-300 group-hover:rotate-12">
            <Crown className="w-6 h-6 text-[#0a0a0a]" />
          </div>
          <span className="text-xl font-bold font-['Montserrat'] tracking-tight">
            Chess<span className="text-[#e8b34b]">Master</span>
          </span>
        </div>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-8">
          {['Home', 'Play', 'Leaderboard', 'About'].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              onClick={(e) => {
                if (item === 'Home') {
                  e.preventDefault();
                  onNavigate?.('home');
                }
              }}
              className="nav-link text-sm font-medium text-gray-300 hover:text-white transition-colors duration-300"
            >
              {item}
            </a>
          ))}
        </div>

        {/* CTA Button */}
        <button className="btn-gold px-5 py-2 rounded-full text-sm font-semibold hidden sm:block">
          Sign In
        </button>
      </div>
    </nav>
  );
};

// Page Transition Component
const PageTransition = ({ isActive, onComplete }: { isActive: boolean; onComplete: () => void }) => {
  useEffect(() => {
    if (isActive) {
      const timer = setTimeout(onComplete, 800);
      return () => clearTimeout(timer);
    }
  }, [isActive, onComplete]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Zoom blur effect */}
      <div 
        className="absolute inset-0 bg-[#0a0a0a] transition-all duration-700"
        style={{
          animation: 'page-transition-zoom 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      />
      {/* Glow streak */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at center, rgba(232, 179, 75, 0.3) 0%, transparent 50%)',
          animation: 'page-transition-glow 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      />
      {/* Motion lines */}
      <div className="absolute inset-0 flex items-center justify-center">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 bg-gradient-to-t from-transparent via-[#e8b34b] to-transparent"
            style={{
              height: '200%',
              transform: `rotate(${i * 30}deg)`,
              animation: `motion-line 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.05}s forwards`,
              opacity: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
};

// Play Mode Selection Page
const PlayModePage = ({ onBack }: { onBack: () => void }) => {
  const [hoveredMode, setHoveredMode] = useState<'none' | 'pvp' | 'ai'>('none');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

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
      default:
        return 'linear-gradient(135deg, #0a0a0a 0%, #0f172a 25%, #151515 50%, #0f172a 75%, #0a0a0a 100%)';
    }
  };

  const getGlowColor = () => {
    switch (hoveredMode) {
      case 'pvp':
        return 'rgba(59, 130, 246, 0.3)';
      case 'ai':
        return 'rgba(139, 92, 246, 0.3)';
      default:
        return 'rgba(232, 179, 75, 0.2)';
    }
  };

  return (
    <div 
      ref={containerRef}
      className="min-h-screen relative overflow-hidden"
      style={{
        background: getBackgroundGradient(),
        transition: 'background 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Dynamic Background Glow */}
      <div 
        className="absolute inset-0 pointer-events-none transition-all duration-1000"
        style={{
          background: `radial-gradient(ellipse at ${50 + mousePos.x}% ${50 + mousePos.y}%, ${getGlowColor()} 0%, transparent 60%)`,
        }}
      />

      {/* Theme-specific Particles */}
      <ParticleBackground theme={hoveredMode === 'none' ? 'default' : hoveredMode} intensity={hoveredMode === 'none' ? 1 : 1.5} />

      {/* Floating Pieces with Parallax */}
      <FloatingPiece 
        src="/chess-king.png" 
        className="w-20 md:w-32 opacity-30"
        style={{ 
          top: '10%', 
          left: '5%', 
          animationDelay: '0s',
          transform: `translate(${mousePos.x * -2}px, ${mousePos.y * -2}px)`,
          transition: 'transform 0.3s ease-out',
        }}
      />
      <FloatingPiece 
        src="/robot-queen.png" 
        className="w-16 md:w-24 opacity-40"
        style={{ 
          top: '70%', 
          right: '8%', 
          animationDelay: '1s',
          transform: `translate(${mousePos.x * 1.5}px, ${mousePos.y * 1.5}px)`,
          transition: 'transform 0.3s ease-out',
        }}
        animationClass="animate-float-reverse"
      />
      <FloatingPiece 
        src="/chess-knight.png" 
        className="w-14 md:w-20 opacity-25"
        style={{ 
          bottom: '15%', 
          left: '10%', 
          animationDelay: '2s',
          transform: `translate(${mousePos.x * -1}px, ${mousePos.y * -1}px)`,
          transition: 'transform 0.3s ease-out',
        }}
        animationClass="animate-float-slow"
      />

      {/* Scan Line Effect for AI Mode */}
      {hoveredMode === 'ai' && (
        <div 
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{
            background: 'linear-gradient(to bottom, transparent 0%, rgba(139, 92, 246, 0.1) 50%, transparent 100%)',
            animation: 'scan-line 3s linear infinite',
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col pt-24 pb-12 px-6">
        {/* Back Button */}
        <div className="max-w-7xl mx-auto w-full mb-8">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-300 group"
          >
            <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            <span className="text-sm font-medium">Back to Home</span>
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

        {/* Mode Selection Cards */}
        <div className="flex-1 flex items-center justify-center">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-5xl w-full">
            {/* PVP Mode Card */}
            <div
              className={`relative group cursor-pointer transition-all duration-700 ${
                hoveredMode === 'ai' ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
              }`}
              onMouseEnter={() => setHoveredMode('pvp')}
              onMouseLeave={() => setHoveredMode('none')}
            >
              <div 
                className="relative overflow-hidden rounded-3xl p-8 md:p-10 h-full min-h-[400px] md:min-h-[500px] flex flex-col"
                style={{
                  background: hoveredMode === 'pvp' 
                    ? 'linear-gradient(135deg, rgba(30, 58, 138, 0.3) 0%, rgba(59, 130, 246, 0.2) 50%, rgba(239, 68, 68, 0.2) 100%)'
                    : 'rgba(21, 21, 21, 0.6)',
                  backdropFilter: 'blur(20px)',
                  border: hoveredMode === 'pvp' 
                    ? '2px solid rgba(59, 130, 246, 0.5)' 
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: hoveredMode === 'pvp' 
                    ? '0 0 60px rgba(59, 130, 246, 0.3), inset 0 0 60px rgba(59, 130, 246, 0.1)' 
                    : '0 8px 32px rgba(0, 0, 0, 0.3)',
                  transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {/* Split Light Effect */}
                {hoveredMode === 'pvp' && (
                  <div 
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.2) 0%, transparent 50%, rgba(239, 68, 68, 0.2) 100%)',
                    }}
                  />
                )}

                {/* Card Content */}
                <div className="relative z-10 flex flex-col h-full">
                  {/* Icon */}
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500"
                    style={{
                      background: hoveredMode === 'pvp' 
                        ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(239, 68, 68, 0.3) 100%)'
                        : 'rgba(232, 179, 75, 0.1)',
                      boxShadow: hoveredMode === 'pvp' 
                        ? '0 0 30px rgba(59, 130, 246, 0.5)' 
                        : 'none',
                    }}
                  >
                    <Swords 
                      className="w-8 h-8 transition-colors duration-500"
                      style={{ color: hoveredMode === 'pvp' ? '#60a5fa' : '#e8b34b' }}
                    />
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl md:text-3xl font-bold font-['Montserrat'] mb-2">
                    Local Match
                  </h3>
                  <p 
                    className="text-lg mb-4 transition-colors duration-500"
                    style={{ color: hoveredMode === 'pvp' ? '#60a5fa' : '#e8b34b' }}
                  >
                    Human vs Human
                  </p>

                  {/* Description */}
                  <p className="text-gray-400 text-sm leading-relaxed mb-6 flex-1">
                    Challenge a friend in a local multiplayer match. Face off on the same device 
                    and prove who is the true chess master.
                  </p>

                  {/* Visual */}
                  <div className="relative h-32 md:h-40 mt-auto">
                    <img 
                      src="/pvp-kings.png" 
                      alt="PVP Battle"
                      className="absolute inset-0 w-full h-full object-contain transition-all duration-700"
                      style={{
                        transform: hoveredMode === 'pvp' ? 'scale(1.1)' : 'scale(1)',
                        filter: hoveredMode === 'pvp' ? 'drop-shadow(0 0 20px rgba(59, 130, 246, 0.5))' : 'none',
                      }}
                    />
                  </div>

                  {/* CTA */}
                  <button 
                    className="mt-6 w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-500"
                    style={{
                      background: hoveredMode === 'pvp' 
                        ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                        : 'rgba(255, 255, 255, 0.05)',
                      color: hoveredMode === 'pvp' ? 'white' : '#9ca3af',
                      boxShadow: hoveredMode === 'pvp' ? '0 0 30px rgba(59, 130, 246, 0.5)' : 'none',
                    }}
                  >
                    <User className="w-5 h-5" />
                    Start Local Match
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* AI Mode Card */}
            <div
              className={`relative group cursor-pointer transition-all duration-700 ${
                hoveredMode === 'pvp' ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
              }`}
              onMouseEnter={() => setHoveredMode('ai')}
              onMouseLeave={() => setHoveredMode('none')}
            >
              <div 
                className="relative overflow-hidden rounded-3xl p-8 md:p-10 h-full min-h-[400px] md:min-h-[500px] flex flex-col"
                style={{
                  background: hoveredMode === 'ai' 
                    ? 'linear-gradient(135deg, rgba(76, 29, 149, 0.4) 0%, rgba(139, 92, 246, 0.3) 50%, rgba(59, 130, 246, 0.2) 100%)'
                    : 'rgba(21, 21, 21, 0.6)',
                  backdropFilter: 'blur(20px)',
                  border: hoveredMode === 'ai' 
                    ? '2px solid rgba(139, 92, 246, 0.5)' 
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: hoveredMode === 'ai' 
                    ? '0 0 60px rgba(139, 92, 246, 0.4), inset 0 0 60px rgba(139, 92, 246, 0.1)' 
                    : '0 8px 32px rgba(0, 0, 0, 0.3)',
                  transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {/* Digital Grid Effect */}
                {hoveredMode === 'ai' && (
                  <div 
                    className="absolute inset-0 pointer-events-none opacity-30"
                    style={{
                      backgroundImage: `
                        linear-gradient(rgba(139, 92, 246, 0.3) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(139, 92, 246, 0.3) 1px, transparent 1px)
                      `,
                      backgroundSize: '40px 40px',
                      animation: 'grid-move 20s linear infinite',
                    }}
                  />
                )}

                {/* Card Content */}
                <div className="relative z-10 flex flex-col h-full">
                  {/* Icon */}
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500"
                    style={{
                      background: hoveredMode === 'ai' 
                        ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.4) 0%, rgba(59, 130, 246, 0.3) 100%)'
                        : 'rgba(232, 179, 75, 0.1)',
                      boxShadow: hoveredMode === 'ai' 
                        ? '0 0 30px rgba(139, 92, 246, 0.5)' 
                        : 'none',
                    }}
                  >
                    <Bot 
                      className="w-8 h-8 transition-colors duration-500"
                      style={{ color: hoveredMode === 'ai' ? '#a78bfa' : '#e8b34b' }}
                    />
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl md:text-3xl font-bold font-['Montserrat'] mb-2">
                    Play vs AI
                  </h3>
                  <p 
                    className="text-lg mb-4 transition-colors duration-500"
                    style={{ color: hoveredMode === 'ai' ? '#a78bfa' : '#e8b34b' }}
                  >
                    Challenge the Machine
                  </p>

                  {/* Description */}
                  <p className="text-gray-400 text-sm leading-relaxed mb-6 flex-1">
                    Test your skills against our advanced AI. Choose from multiple difficulty 
                    levels and learn from every move.
                  </p>

                  {/* Visual */}
                  <div className="relative h-32 md:h-40 mt-auto">
                    <img 
                      src="/ai-battle.png" 
                      alt="AI Battle"
                      className="absolute inset-0 w-full h-full object-contain transition-all duration-700"
                      style={{
                        transform: hoveredMode === 'ai' ? 'scale(1.1)' : 'scale(1)',
                        filter: hoveredMode === 'ai' ? 'drop-shadow(0 0 30px rgba(139, 92, 246, 0.6))' : 'none',
                      }}
                    />
                  </div>

                  {/* CTA */}
                  <button 
                    className="mt-6 w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-500"
                    style={{
                      background: hoveredMode === 'ai' 
                        ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
                        : 'rgba(255, 255, 255, 0.05)',
                      color: hoveredMode === 'ai' ? 'white' : '#9ca3af',
                      boxShadow: hoveredMode === 'ai' ? '0 0 30px rgba(139, 92, 246, 0.5)' : 'none',
                    }}
                  >
                    <Bot className="w-5 h-5" />
                    Challenge AI
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Tips */}
        <div className="max-w-3xl mx-auto mt-12 text-center">
          <p className="text-gray-500 text-sm">
            <span className="text-[#e8b34b]">Pro Tip:</span> Hover over each mode to preview the experience. 
            New to chess? Start with AI on Easy mode to learn the basics.
          </p>
        </div>
      </div>

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
      `}</style>
    </div>
  );
};

// Hero Section
const HeroSection = ({ onPlayNow }: { onPlayNow: () => void }) => {
  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated Gradient Background */}
      <div 
        className="absolute inset-0 animate-gradient"
        style={{
          background: 'linear-gradient(135deg, #0a0a0a 0%, #0f172a 25%, #151515 50%, #0f172a 75%, #0a0a0a 100%)',
        }}
      />
      
      {/* Particle Background */}
      <ParticleBackground />
      
      {/* Floating Chess Pieces */}
      <FloatingPiece 
        src="/chess-king.png" 
        className="w-24 md:w-40 opacity-60"
        style={{ top: '15%', left: '5%', animationDelay: '0s' }}
      />
      <FloatingPiece 
        src="/chess-queen.png" 
        className="w-20 md:w-32 opacity-50"
        style={{ top: '60%', left: '8%', animationDelay: '2s' }}
        animationClass="animate-float-reverse"
      />
      <FloatingPiece 
        src="/chess-knight.png" 
        className="w-16 md:w-28 opacity-50"
        style={{ top: '20%', right: '10%', animationDelay: '1s' }}
        animationClass="animate-float-slow"
      />
      <FloatingPiece 
        src="/chess-rook.png" 
        className="w-14 md:w-24 opacity-40"
        style={{ top: '65%', right: '5%', animationDelay: '3s' }}
      />
      <FloatingPiece 
        src="/chess-bishop.png" 
        className="w-12 md:w-20 opacity-40"
        style={{ top: '40%', left: '2%', animationDelay: '4s' }}
        animationClass="animate-float-slow"
      />
      <FloatingPiece 
        src="/chess-pawn.png" 
        className="w-10 md:w-16 opacity-30"
        style={{ bottom: '20%', right: '15%', animationDelay: '2.5s' }}
        animationClass="animate-float-reverse"
      />

      {/* Blurred Chessboard Background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <img 
          src="/hero-chessboard.jpg" 
          alt="" 
          className="w-[600px] h-[600px] object-contain opacity-10 blur-3xl"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center pt-20">
        <div className="animate-fade-in-up">
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#e8b34b]/10 border border-[#e8b34b]/30 text-[#e8b34b] text-xs font-semibold tracking-wider uppercase mb-6">
            Premium Chess Experience
          </span>
        </div>
        
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold font-['Montserrat'] mb-6 animate-fade-in-up stagger-1">
          Master the
          <br />
          <span className="text-gold-gradient">Game of Intelligence</span>
        </h1>
        
        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 animate-fade-in-up stagger-2">
          Play, analyze, and dominate with next-level chess technology. 
          Experience the future of chess with AI-powered insights and global multiplayer.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up stagger-3">
          <button 
            onClick={onPlayNow}
            className="btn-gold px-8 py-4 rounded-full text-base font-semibold flex items-center gap-2 group"
          >
            <Play className="w-5 h-5" />
            Play Now
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
          <button className="btn-outline px-8 py-4 rounded-full text-base font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Analyze Game
          </button>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 mt-16 animate-fade-in-up stagger-4">
          {[
            { value: '1M+', label: 'Active Players' },
            { value: '50M+', label: 'Games Played' },
            { value: '4.9', label: 'User Rating' },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-[#e8b34b]">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
    </section>
  );
};

// Features Section
const FeaturesSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const features = [
    {
      icon: Brain,
      title: 'AI Opponent',
      description: 'Challenge our advanced AI with multiple difficulty levels. From beginner to grandmaster, find your perfect match.',
    },
    {
      icon: BarChart3,
      title: 'Game Analysis',
      description: 'Deep analysis of every move with AI-powered insights. Learn from your mistakes and improve faster.',
    },
    {
      icon: Users,
      title: 'Online Multiplayer',
      description: 'Play against opponents from around the world in real-time. Rated and casual matches available 24/7.',
    },
    {
      icon: Palette,
      title: 'Custom Boards',
      description: 'Personalize your chess experience with premium themes, piece styles, and board designs.',
    },
  ];

  return (
    <section ref={sectionRef} className="relative py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className={`text-center mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#e8b34b]/10 border border-[#e8b34b]/30 text-[#e8b34b] text-xs font-semibold tracking-wider uppercase mb-4">
            Features
          </span>
          <h2 className="text-4xl md:text-5xl font-bold font-['Montserrat'] mb-4">
            Everything You Need to <span className="text-gold-gradient">Dominate</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Powerful tools and features designed to elevate your chess game to the next level.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`glass-card rounded-2xl p-6 hover-glow cursor-pointer transition-all duration-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#e8b34b]/20 to-[#e8b34b]/5 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <feature.icon className="w-7 h-7 text-[#e8b34b]" />
              </div>
              <h3 className="text-xl font-bold font-['Montserrat'] mb-3">{feature.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Leaderboard Section
const LeaderboardSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const leaders = [
    { rank: 1, name: 'Magnus Carlsen', rating: 2830, country: 'NO', wins: 1247 },
    { rank: 2, name: 'Fabiano Caruana', rating: 2804, country: 'US', wins: 1189 },
    { rank: 3, name: 'Hikaru Nakamura', rating: 2788, country: 'US', wins: 1156 },
    { rank: 4, name: 'Ding Liren', rating: 2762, country: 'CN', wins: 1087 },
    { rank: 5, name: 'Ian Nepomniachtchi', rating: 2758, country: 'RU', wins: 1054 },
  ];

  return (
    <section id="leaderboard" ref={sectionRef} className="relative py-24 md:py-32">
      {/* Background Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#e8b34b]/5 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-5xl mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className={`text-center mb-12 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#e8b34b]/10 border border-[#e8b34b]/30 text-[#e8b34b] text-xs font-semibold tracking-wider uppercase mb-4">
            Leaderboard
          </span>
          <h2 className="text-4xl md:text-5xl font-bold font-['Montserrat'] mb-4">
            Top <span className="text-gold-gradient">Grandmasters</span>
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            The highest-rated players on our platform. Compete to see your name on the leaderboard.
          </p>
        </div>

        {/* Leaderboard Table */}
        <div className={`glass-card rounded-2xl overflow-hidden transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Rating</th>
                <th className="hidden sm:table-cell">Wins</th>
              </tr>
            </thead>
            <tbody>
              {leaders.map((player, index) => (
                <tr key={index} className="group">
                  <td>
                    <span className={`rank-badge ${player.rank <= 3 ? `rank-${player.rank}` : 'bg-gray-800 text-gray-400'}`}>
                      {player.rank}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#e8b34b]/30 to-[#e8b34b]/10 flex items-center justify-center text-xs font-bold">
                        {player.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold">{player.name}</div>
                        <div className="text-xs text-gray-500">{player.country}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="text-[#e8b34b] font-bold">{player.rating}</span>
                  </td>
                  <td className="hidden sm:table-cell text-gray-400">
                    {player.wins.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* View All Button */}
        <div className={`text-center mt-8 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <button className="btn-outline px-6 py-3 rounded-full text-sm font-semibold inline-flex items-center gap-2 group">
            View Full Leaderboard
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </section>
  );
};

// CTA Section
const CTASection = ({ onPlayNow }: { onPlayNow: () => void }) => {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-24 md:py-32 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-[#e8b34b]/5 via-transparent to-[#e8b34b]/5" />
        <FloatingPiece 
          src="/chess-king.png" 
          className="w-32 md:w-48 opacity-20"
          style={{ bottom: '-5%', right: '5%', animationDelay: '0s' }}
        />
        <FloatingPiece 
          src="/chess-queen.png" 
          className="w-24 md:w-36 opacity-15"
          style={{ top: '10%', left: '5%', animationDelay: '2s' }}
          animationClass="animate-float-reverse"
        />
      </div>

      <div className="max-w-4xl mx-auto px-6 relative z-10">
        <div className={`glass-card rounded-3xl p-10 md:p-16 text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-4xl md:text-5xl font-bold font-['Montserrat'] mb-6">
            Ready to <span className="text-gold-gradient">Start Your Journey</span>?
          </h2>
          <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">
            Join millions of players worldwide. Play for free, improve your skills, and become a chess master.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={onPlayNow}
              className="btn-gold px-8 py-4 rounded-full text-base font-semibold animate-glow-pulse"
            >
              Create Free Account
            </button>
            <button className="btn-outline px-8 py-4 rounded-full text-base font-semibold">
              Learn More
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

// Footer
const Footer = () => {
  return (
    <footer id="about" className="relative pt-20 pb-8 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#e8b34b] to-[#d4a03d] flex items-center justify-center">
                <Crown className="w-6 h-6 text-[#0a0a0a]" />
              </div>
              <span className="text-xl font-bold font-['Montserrat']">
                Chess<span className="text-[#e8b34b]">Master</span>
              </span>
            </div>
            <p className="text-gray-500 text-sm mb-6">
              Master the game, one move at a time. The ultimate chess experience for players of all levels.
            </p>
            <div className="flex items-center gap-4">
              {[Twitter, Facebook, Instagram, Youtube].map((Icon, index) => (
                <a key={index} href="#" className="social-icon text-gray-400">
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-3">
              {['Play Online', 'Learn Chess', 'Puzzles', 'Tournaments'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-gray-500 hover:text-[#e8b34b] text-sm transition-colors duration-300">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider">Resources</h4>
            <ul className="space-y-3">
              {['Help Center', 'Contact Us', 'Terms of Service', 'Privacy Policy'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-gray-500 hover:text-[#e8b34b] text-sm transition-colors duration-300">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider">Stay Updated</h4>
            <p className="text-gray-500 text-sm mb-4">
              Get the latest chess news and updates.
            </p>
            <div className="flex gap-2">
              <input 
                type="email" 
                placeholder="Enter your email"
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-[#e8b34b]/50 transition-colors"
              />
              <button className="btn-gold px-4 py-2 rounded-lg">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-600 text-sm">
            © 2024 ChessMaster. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            {['Privacy', 'Terms', 'Cookies'].map((item) => (
              <a key={item} href="#" className="text-gray-600 hover:text-gray-400 text-sm transition-colors">
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

// Home Page Component
const HomePage = ({ onPlayNow }: { onPlayNow: () => void }) => (
  <div className="min-h-screen bg-[#0a0a0a] text-white">
    <Navbar onNavigate={(page) => page === 'home' && window.scrollTo({ top: 0, behavior: 'smooth' })} />
    <HeroSection onPlayNow={onPlayNow} />
    <FeaturesSection />
    <LeaderboardSection />
    <CTASection onPlayNow={onPlayNow} />
    <Footer />
  </div>
);

// Main App
function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handlePlayNow = () => {
    setIsTransitioning(true);
  };

  const handleTransitionComplete = () => {
    setIsTransitioning(false);
    setCurrentPage('play');
  };

  const handleBackToHome = () => {
    setCurrentPage('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <PageTransition isActive={isTransitioning} onComplete={handleTransitionComplete} />
      
      {currentPage === 'home' ? (
        <HomePage onPlayNow={handlePlayNow} />
      ) : (
        <PlayModePage onBack={handleBackToHome} />
      )}
    </>
  );
}

export default App;
