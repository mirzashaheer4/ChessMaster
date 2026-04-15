import React, { useEffect, useRef, useState } from 'react';
import { 
  Crown, 
  Brain, 
  BarChart3,
  Zap,
  Dices,
  Menu,
  X,
} from 'lucide-react';

import { useNavigate } from 'react-router-dom';
import { HeroBoard } from './HeroBoard';
import WebGLParticleBackground from '../../core/components/WebGLParticleBackground';
import { fetchLeaderboard, type Leader } from '../../core/api/statsApi';

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
// Migrated to WebGLParticleBackground

// ─── Navbar ───────────────────────────────────────────────────────
const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Home', href: '#home' },
    { label: 'Features', href: '#features' },
    { label: 'Leaderboard', href: '#leaderboard' },
    { label: 'About', action: () => navigate('/about') },
  ];

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled || mobileMenuOpen ? 'glass-navbar py-3' : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <div 
          className="flex items-center gap-3 group cursor-pointer"
          onClick={() => {
            navigate('/');
            setMobileMenuOpen(false);
          }}
        >
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#e8b34b] to-[#d4a03d] flex items-center justify-center transition-transform duration-300 group-hover:rotate-12">
            <Crown className="w-6 h-6 text-[#0a0a0a]" />
          </div>
          <span className="text-xl font-bold font-['Montserrat'] tracking-tight">
            Chess<span className="text-[#e8b34b]">Master</span>
          </span>
        </div>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((item) => (
            <a
              key={item.label}
              href={item.href || '#'}
              onClick={(e) => {
                if (item.action) { e.preventDefault(); item.action(); }
              }}
              className="nav-link text-sm font-medium text-gray-300 hover:text-white transition-colors duration-300"
            >
              {item.label}
            </a>
          ))}
          <button 
            onClick={() => window.dispatchEvent(new Event('open-login'))}
            className="px-5 py-2 rounded-lg bg-[#e8b34b] hover:bg-[#d4a03d] text-[#0a0a0a] text-sm font-bold transition-colors cursor-pointer"
          >
            Sign In
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden p-2 text-gray-300 hover:text-white transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <div 
        className={`md:hidden absolute top-full left-0 right-0 glass-navbar border-t border-white/5 transition-all duration-300 overflow-hidden ${
          mobileMenuOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-6 py-8 flex flex-col gap-6">
          {navLinks.map((item) => (
            <a
              key={item.label}
              href={item.href || '#'}
              onClick={(e) => {
                setMobileMenuOpen(false);
                if (item.action) { e.preventDefault(); item.action(); }
              }}
              className="text-lg font-medium text-gray-300 hover:text-[#e8b34b] transition-colors"
            >
              {item.label}
            </a>
          ))}
          <button 
            onClick={() => {
              setMobileMenuOpen(false);
              window.dispatchEvent(new Event('open-login'));
            }}
            className="w-full py-4 rounded-xl bg-[#e8b34b] text-[#0a0a0a] text-lg font-bold shadow-[0_0_20px_rgba(232,179,75,0.2)]"
          >
            Sign In
          </button>
        </div>
      </div>
    </nav>
  );
};

// ─── Hero Section ─────────────────────────────────────────────────
const HeroSection = () => (
  <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden">
    {/* Animated Gradient Background */}
    <div 
      className="absolute inset-0 animate-gradient"
      style={{
        background: 'linear-gradient(135deg, #0a0a0a 0%, #0f172a 25%, #151515 50%, #0f172a 75%, #0a0a0a 100%)',
      }}
    />
    
    {/* Particle Background */}
    <WebGLParticleBackground />
    
    {/* Floating Chess Pieces */}
    <FloatingPiece src="/landing/chess-king.png" className="w-24 md:w-40 opacity-60 pointer-events-none" style={{ top: '15%', left: '5%', animationDelay: '0s' }} />
    <FloatingPiece src="/landing/chess-queen.png" className="w-20 md:w-32 opacity-50 pointer-events-none" style={{ top: '60%', left: '8%', animationDelay: '2s' }} animationClass="animate-float-reverse" />
    <FloatingPiece src="/landing/chess-knight.png" className="w-16 md:w-28 opacity-50 pointer-events-none" style={{ top: '20%', right: '10%', animationDelay: '1s' }} animationClass="animate-float-slow" />
    <FloatingPiece src="/landing/chess-rook.png" className="w-14 md:w-24 opacity-40 pointer-events-none" style={{ top: '65%', right: '5%', animationDelay: '3s' }} />
    <FloatingPiece src="/landing/chess-bishop.png" className="w-12 md:w-20 opacity-40 pointer-events-none" style={{ top: '40%', left: '2%', animationDelay: '4s' }} animationClass="animate-float-slow" />
    <FloatingPiece src="/landing/chess-pawn.png" className="w-10 md:w-16 opacity-30 pointer-events-none" style={{ bottom: '20%', right: '15%', animationDelay: '2.5s' }} animationClass="animate-float-reverse" />

    {/* Content Grid */}
    <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-12 w-full flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-20">
      
      {/* Left Column: Interactive Animated Board */}
      <div className="flex-1 w-full flex items-center justify-center lg:justify-end animate-fade-in-up">
        <HeroBoard />
      </div>

      {/* Right Column: CTA Typography */}
      <div className="flex-1 text-center lg:text-left z-10 w-full relative">
        <div className="animate-fade-in-up">
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#e8b34b]/10 border border-[#e8b34b]/30 text-[#e8b34b] text-xs font-semibold tracking-wider uppercase mb-6 shadow-[0_0_15px_rgba(232,179,75,0.2)]">
            Premium Chess Experience
          </span>
        </div>
        
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold font-['Montserrat'] mb-6 animate-fade-in-up stagger-1 leading-[1.1] text-white drop-shadow-lg">
          Play Chess Online
        </h1>
        
        <p className="text-lg md:text-xl text-gray-300 max-w-md mx-auto lg:mx-0 mb-10 animate-fade-in-up stagger-2 drop-shadow-md font-medium">
          Master the game of kings. Learn, play, and dominate.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 animate-fade-in-up stagger-3">
          <button 
            onClick={() => window.dispatchEvent(new Event('open-login'))}
            className="w-full sm:w-auto btn-gold px-10 py-4 rounded-full text-xl font-bold flex items-center justify-center gap-3 hover:-translate-y-1 transition-transform cursor-pointer"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>

    {/* Bottom Gradient Fade */}
    <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0a0a] to-transparent pointer-events-none" />
  </section>
);

// ─── Features Section ─────────────────────────────────────────────
const FeaturesSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); } },
      { threshold: 0.2 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const features = [
    { icon: Zap, title: 'Lightning Premoves', description: 'Queue up multiple moves in advance. The ultimate tool for bullet and blitz time controls.' },
    { icon: Dices, title: 'Freestyle (Chess960)', description: 'Play Fischer Random Chess. 960 different starting positions to test your pure tactical intuition.' },
    { icon: BarChart3, title: 'Post-Game Review', description: 'Deep engine analysis of every match. Find your brilliant moves and learn from your blunders.' },
    { icon: Brain, title: 'Stockfish AI', description: 'Train against the world\'s strongest chess engine with adjustable difficulty ratings.' },
  ];

  return (
    <section id="features" ref={sectionRef} className="relative py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6">
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`glass-card rounded-2xl p-6 hover-glow cursor-pointer transition-all duration-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#e8b34b]/20 to-[#e8b34b]/5 flex items-center justify-center mb-5">
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

// ─── Leaderboard Section ──────────────────────────────────────────
const LeaderboardSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [leaders, setLeaders] = useState<Leader[]>([]);

  useEffect(() => {
    fetchLeaderboard().then(data => {
      if (data && data.leaders) {
        setLeaders(data.leaders);
      }
    });
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); } },
      { threshold: 0.2 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="leaderboard" ref={sectionRef} className="relative py-24 md:py-32">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#e8b34b]/5 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-5xl mx-auto px-6 relative z-10">
        <div className={`text-center mb-12 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#e8b34b]/10 border border-[#e8b34b]/30 text-[#e8b34b] text-xs font-semibold tracking-wider uppercase mb-4">
            Leaderboard
          </span>
          <h2 className="text-4xl md:text-5xl font-bold font-['Montserrat'] mb-4">
            Top <span className="text-gold-gradient">Grandmasters</span>
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            The highest-rated players. Compete to see your name on the leaderboard.
          </p>
        </div>

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
      </div>
    </section>
  );
};

// ─── CTA Section ──────────────────────────────────────────────────
const CTASection = ({ onPlayNow }: { onPlayNow: () => void }) => {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); } },
      { threshold: 0.3 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-24 md:py-32 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-[#e8b34b]/5 via-transparent to-[#e8b34b]/5" />
        <FloatingPiece src="/landing/chess-king.png" className="w-32 md:w-48 opacity-20" style={{ bottom: '-5%', right: '5%', animationDelay: '0s' }} />
        <FloatingPiece src="/landing/chess-queen.png" className="w-24 md:w-36 opacity-15" style={{ top: '10%', left: '5%', animationDelay: '2s' }} animationClass="animate-float-reverse" />
      </div>

      <div className="max-w-4xl mx-auto px-6 relative z-10">
        <div className={`glass-card rounded-3xl p-10 md:p-16 text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-4xl md:text-5xl font-bold font-['Montserrat'] mb-6">
            Ready to <span className="text-gold-gradient">Start Your Journey</span>?
          </h2>
          <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">
            Play for free, improve your skills, and become a chess master.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={onPlayNow}
              className="w-full sm:w-auto btn-gold px-10 py-4 rounded-full text-xl font-bold flex items-center justify-center uppercase hover:-translate-y-1 transition-transform"
            >
              Get Started Today
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

// ─── Footer ───────────────────────────────────────────────────────
const Footer = () => {
  const navigate = useNavigate();
  return (
  <footer className="relative pt-20 pb-8 border-t border-white/5">
    <div className="max-w-7xl mx-auto px-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
        {/* Brand */}
        <div className="md:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#e8b34b] to-[#d4a03d] flex items-center justify-center cursor-pointer" onClick={() => window.scrollTo(0,0)}>
              <Crown className="w-6 h-6 text-[#0a0a0a]" />
            </div>
            <span className="text-xl font-bold font-['Montserrat'] cursor-pointer" onClick={() => window.scrollTo(0,0)}>
              Chess<span className="text-[#e8b34b]">Master</span>
            </span>
          </div>
          <p className="text-gray-500 text-sm mb-6 max-w-md">
            Master the game, one move at a time. The ultimate chess experience.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider border-b border-white/10 pb-2 inline-block">Quick Links</h4>
          <ul className="space-y-3 mt-2">
            <li><a href="#" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new Event('open-login')); }} className="text-gray-400 hover:text-[#e8b34b] text-sm transition-colors duration-300">Play Online</a></li>
            <li><a href="#leaderboard" className="text-gray-400 hover:text-[#e8b34b] text-sm transition-colors duration-300">Leaderboard</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new Event('open-login')); }} className="text-gray-400 hover:text-[#e8b34b] text-sm transition-colors duration-300">History & Analysis</a></li>
          </ul>
        </div>

        {/* Resources */}
        <div>
          <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider border-b border-white/10 pb-2 inline-block">Resources</h4>
          <ul className="space-y-3 mt-2">
            <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/about'); }} className="text-gray-400 hover:text-[#e8b34b] text-sm transition-colors duration-300">About Us</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/help'); }} className="text-gray-400 hover:text-[#e8b34b] text-sm transition-colors duration-300">Help Center</a></li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-gray-600 text-sm">© 2026 ChessMaster. All rights reserved.</p>
        <div className="flex items-center gap-6">
          {[
            { label: 'Privacy', path: '/privacy' },
            { label: 'Terms', path: '/terms' },
            { label: 'Cookies', path: '/cookies' }
          ].map((item) => (
            <a 
              key={item.label} 
              href="#" 
              onClick={(e) => { e.preventDefault(); navigate(item.path); }}
              className="text-gray-500 hover:text-[#e8b34b] text-sm transition-colors"
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  </footer>
  );
};

// ─── Main Landing Component ───────────────────────────────────────
const Landing = () => {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-[#e8b34b]/30 selection:text-white font-sans overflow-x-hidden">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <LeaderboardSection />
      <CTASection onPlayNow={() => window.dispatchEvent(new Event('open-login'))} />
      <Footer />
    </div>
  );
};

export default Landing;
