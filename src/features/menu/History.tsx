import { useEffect } from 'react';
import { useGameActions, usePastGames } from '../../core/store/selectors';
import { useGameStore } from '../../core/store/game';
import { useAuthStore } from '../../core/store/auth';
import { 
  ArrowLeft,
  Trophy,
  Swords,
  Bot,
  Clock,
  Eye,
  Crown,
  Loader2,
  Cloud,
  HardDrive,
} from 'lucide-react';

import { useNavigate } from 'react-router-dom';

const History = () => {
  const { pastGames } = usePastGames();
  const { loadGame, loadCloudGame } = useGameActions();
  const { user, userGames, isLoadingGames, fetchGames } = useAuthStore();
  const navigate = useNavigate();

  const isAuthenticated = !!user;

  // Fetch games from cloud on mount if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchGames();
    }
  }, [isAuthenticated, fetchGames]);

  // Use cloud games if authenticated, otherwise localStorage fallback
  const displayGames = isAuthenticated ? userGames : pastGames;

  const handleLoad = (id: string) => {
    if (isAuthenticated) {
      const cloudGame = userGames.find(g => g.id === id);
      if (cloudGame) {
        loadCloudGame(cloudGame.pgn, cloudGame.mode || 'local');
        useGameStore.getState().saveReviewState();
        navigate('/review?source=history');
        return;
      }
    }
    loadGame(id);
    useGameStore.getState().saveReviewState();
    navigate('/review?source=history');
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case 'win': case '1-0': return 'text-green-400';
      case 'loss': case '0-1': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'win': case '1-0': return <Trophy className="w-4 h-4 text-[#e8b34b]" />;
      case 'loss': case '0-1': return <Swords className="w-4 h-4 text-red-400" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getResultLabel = (result: string) => {
    switch (result) {
      case '1-0': return 'White Won';
      case '0-1': return 'Black Won';
      case '1/2-1/2': return 'Draw';
      case 'win': return 'Victory';
      case 'loss': return 'Defeat';
      case 'draw': return 'Draw';
      default: return result;
    }
  };

  return (
    <div 
      className="w-full h-full flex flex-col relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0a0a0a 0%, #0f172a 25%, #151515 50%, #0f172a 75%, #0a0a0a 100%)',
      }}
    >
      {/* Background Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-[#e8b34b]/5 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <div className="relative z-10 pt-8 px-8">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-300 group mb-8"
        >
          <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
          <span className="text-sm font-medium">Back to Home</span>
        </button>

        <div className="max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-3 mb-2">
            <Crown className="w-8 h-8 text-[#e8b34b]" />
            <h1 className="text-4xl md:text-5xl font-bold font-['Montserrat'] tracking-tight">
              Game <span className="text-gold-gradient">History</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 ml-11">
            <p className="text-gray-400 text-sm">
              {isAuthenticated ? 'Your cloud-synced game history.' : 'Review your past games and analyze your performance.'}
            </p>
            {isAuthenticated && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <Cloud className="w-3 h-3" />
                Cloud
              </span>
            )}
            {!isAuthenticated && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500 bg-gray-800/50 px-2 py-0.5 rounded-full border border-gray-700">
                <HardDrive className="w-3 h-3" />
                Local
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto relative z-10 px-8 pb-8 mt-8 custom-scrollbar">
        <div className="max-w-4xl mx-auto w-full">
          {/* Loading State */}
          {isLoadingGames && isAuthenticated ? (
            <div className="glass-card rounded-2xl p-16 text-center">
              <Loader2 className="w-10 h-10 text-[#e8b34b] mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-bold font-['Montserrat'] text-gray-300 mb-2">Loading Games</h3>
              <p className="text-gray-500 text-sm">Fetching your game history from the cloud...</p>
            </div>
          ) : displayGames.length === 0 ? (
            <div className="glass-card rounded-2xl p-16 text-center">
              <Swords className="w-16 h-16 text-[#e8b34b]/30 mx-auto mb-6" />
              <h3 className="text-xl font-bold font-['Montserrat'] text-gray-300 mb-2">No Games Yet</h3>
              <p className="text-gray-500 text-sm">
                Start playing to see your game history here. Every match tells a story.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Table Header (Desktop only) */}
              <div className="hidden md:grid grid-cols-5 text-[10px] tracking-wider uppercase text-[#e8b34b]/60 font-semibold px-5 pb-2 border-b border-white/5">
                <span>Date</span>
                <span>Result</span>
                <span>Mode</span>
                <span>Details</span>
                <span className="text-right">Action</span>
              </div>

              {/* Game Rows */}
              {displayGames.map((game: any, i: number) => {
                // Normalize fields for both cloud and local game formats
                const gameId = game.id;
                const gameDate = game.createdAt
                  ? new Date(game.createdAt).toLocaleDateString()
                  : game.date || 'Unknown';
                const gameResult = game.result;
                const gameMode = game.mode || 'local';
                const gameDifficulty = game.difficulty;
                const gameOpponent = game.opponentName;

                return (
                  <div
                    key={gameId}
                    className="flex flex-col md:grid md:grid-cols-5 items-start md:items-center py-3 px-4 md:py-4 md:px-5 glass-card rounded-xl hover-glow cursor-pointer group transition-all duration-300 gap-2 md:gap-0"
                    style={{ animationDelay: `${i * 50}ms` }}
                    onClick={() => handleLoad(gameId)}
                  >
                    {/* Mobile Header: Date + Result */}
                    <div className="flex md:hidden w-full items-center justify-between border-b border-white/5 pb-2 mb-1">
                      <span className="text-gray-400 font-mono text-xs">{gameDate}</span>
                      <div className="flex items-center gap-1.5">
                        {getResultIcon(gameResult)}
                        <span className={`font-bold text-xs uppercase tracking-wider ${getResultColor(gameResult)}`}>
                          {isAuthenticated ? getResultLabel(gameResult) : gameResult}
                        </span>
                      </div>
                    </div>

                    {/* Date (Desktop) */}
                    <span className="hidden md:block text-gray-400 font-mono text-sm">{gameDate}</span>
                    
                    {/* Result (Desktop) */}
                    <div className="hidden md:flex items-center gap-2">
                      {getResultIcon(gameResult)}
                      <span className={`font-bold text-sm uppercase tracking-wider ${getResultColor(gameResult)}`}>
                        {isAuthenticated ? getResultLabel(gameResult) : gameResult}
                      </span>
                    </div>
                    
                    {/* Mode (Mobile & Desktop) */}
                    <div className="flex items-center justify-between w-full md:w-auto">
                      <div className="flex items-center gap-2 text-gray-300 text-sm">
                        {gameMode === 'ai' ? (
                          <>
                            <Bot className="w-4 h-4 text-purple-400" />
                            <span>{gameOpponent || `Stockfish (${gameDifficulty})`}</span>
                          </>
                        ) : (
                          <>
                            <Swords className="w-4 h-4 text-blue-400" />
                            <span>{gameOpponent || 'Local PvP'}</span>
                          </>
                        )}
                      </div>

                      {/* Review Button (Mobile) */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleLoad(gameId); }}
                        className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider text-[#e8b34b] bg-[#e8b34b]/10 border border-[#e8b34b]/20"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Review
                      </button>
                    </div>
                    
                    {/* Details (Desktop) */}
                    <span className="hidden md:block text-gray-500 text-sm">View Details</span>
                    
                    {/* Action (Desktop) */}
                    <div className="hidden md:block text-right">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleLoad(gameId); }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-all duration-300 btn-gold"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Review
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default History;
