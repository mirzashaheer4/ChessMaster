
import { 
  ArrowLeft,
  Crown,
  Cpu,
  Volume2,
  Sparkles,
  Github,
  Heart,
} from 'lucide-react';

import { useNavigate } from 'react-router-dom';

const About = () => {
  const navigate = useNavigate();
  return (
    <div 
      className="w-full h-full flex flex-col items-center justify-center p-8 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0a0a0a 0%, #0f172a 25%, #151515 50%, #0f172a 75%, #0a0a0a 100%)',
      }}
    >
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#e8b34b]/5 rounded-full blur-[100px]" />
      </div>

      {/* Back Button */}
      <div className="absolute top-8 left-8 z-10">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-300 group"
        >
          <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
          <span className="text-sm font-medium">Back</span>
        </button>
      </div>

      <div className="max-w-2xl text-center space-y-8 relative z-10 animate-fade-in-up">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#e8b34b] to-[#d4a03d] flex items-center justify-center">
            <Crown className="w-8 h-8 text-[#0a0a0a]" />
          </div>
        </div>

        <div>
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#e8b34b]/10 border border-[#e8b34b]/30 text-[#e8b34b] text-xs font-semibold tracking-wider uppercase mb-4">
            About
          </span>
          <h1 className="text-5xl md:text-6xl font-bold font-['Montserrat'] tracking-tight">
            Chess<span className="text-gold-gradient">Master</span>
          </h1>
        </div>

        <p className="text-lg text-gray-400 leading-relaxed">
          ChessMaster is a modern re-imagining of the classic game. 
          Built with <span className="text-white font-semibold">React, TypeScript, and Stockfish 16</span>, 
          it delivers a grandmaster-level experience directly in your browser.
        </p>

        {/* Tech Cards */}
        <div className="grid grid-cols-3 gap-4 pt-4">
          {[
            { icon: Cpu, label: 'Engine', value: 'Stockfish WASM' },
            { icon: Volume2, label: 'Audio', value: 'Procedural Synth' },
            { icon: Sparkles, label: 'Visuals', value: 'Premium Design' },
          ].map((item, index) => (
            <div 
              key={index}
              className="glass-card rounded-xl p-5 hover-glow cursor-default"
            >
              <item.icon className="w-6 h-6 text-[#e8b34b] mx-auto mb-3" />
              <h3 className="text-sm font-bold font-['Montserrat'] uppercase tracking-wider mb-1">{item.label}</h3>
              <p className="text-xs text-gray-500">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Credits */}
        <div className="pt-8 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-gray-600 text-sm">
            <span>Made with</span>
            <Heart className="w-4 h-4 text-red-500" />
            <span>by Shahe</span>
          </div>
          <a 
            href="#" 
            className="flex items-center gap-2 text-gray-500 hover:text-[#e8b34b] text-xs transition-colors duration-300"
          >
            <Github className="w-4 h-4" />
            <span>View Source</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default About;
