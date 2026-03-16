import React from 'react';
import { motion } from 'framer-motion';
import { Play, Cpu } from 'lucide-react';
import { useGameStore } from '../store/game';

interface HomeProps {
  onStart: () => void;
}

const Home: React.FC<HomeProps> = ({ onStart }) => {
  const { setMode } = useGameStore();

  const handleSelectMode = (mode: 'local' | 'ai') => {
    setMode(mode);
    onStart(); // Go to next screen (Difficulty or Game)
  };

  return (
    <div className="relative h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-zinc-950">
      {/* Background Ambient Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px] animate-pulse decoration-clone" />
      </div>

      <div className="z-10 flex flex-col items-center gap-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center"
        >
          <h1 className="text-6xl md:text-8xl font-thin tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-500">
            CHESS
          </h1>
          <p className="mt-4 text-zinc-400 text-lg tracking-widest uppercase">
            Master the Game
          </p>
        </motion.div>

        <div className="flex flex-col md:flex-row gap-6">
          <MenuButton 
            title="Play Local" 
            icon={<Play className="w-6 h-6" />}
            onClick={() => handleSelectMode('local')}
            delay={0.2}
          />
          <MenuButton 
            title="Play vs AI" 
            icon={<Cpu className="w-6 h-6" />}
            onClick={() => handleSelectMode('ai')}
            delay={0.4}
          />
        </div>
      </div>
    </div>
  );
};

interface MenuButtonProps {
  title: string;
  icon: React.ReactNode;
  onClick: () => void;
  delay: number;
}

const MenuButton: React.FC<MenuButtonProps> = ({ title, icon, onClick, delay }) => {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="group relative px-8 py-6 w-64 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-purple-500/20"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
      <div className="flex items-center justify-center gap-4 text-white group-hover:text-purple-200 transition-colors">
        {icon}
        <span className="text-xl font-light tracking-wide">{title}</span>
      </div>
    </motion.button>
  );
};

export default Home;
