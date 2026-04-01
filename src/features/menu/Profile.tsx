import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Trophy, Target, Activity, Shield, Swords, Clock, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../../core/store/auth';
import WebGLParticleBackground from '../../core/components/WebGLParticleBackground';
import type { CloudGame } from '../../core/api/gameApi';

// Simple Sparkline Chart Component
const EloSparkline = ({ data }: { data: number[] }) => {
  if (data.length < 2) return null;
  const min = Math.min(...data) - 50;
  const max = Math.max(...data) + 50;
  const width = 200;
  const height = 60;

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / (max - min)) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="1" />
        </linearGradient>
      </defs>
      <path
        d={`M ${points}`}
        fill="none"
        stroke="url(#lineGradient)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
      />
    </svg>
  );
};

export default function Profile() {
  const navigate = useNavigate();
  const { user, userGames, fetchGames, isLoadingGames } = useAuthStore();
  const isAuthenticated = !!user;

  useEffect(() => {
    if (isAuthenticated) {
      fetchGames();
    } else {
      navigate('/');
    }
  }, [isAuthenticated, navigate, fetchGames]);

  const stats = useMemo(() => {
    if (!userGames || userGames.length === 0) return null;

    let wins = 0;
    let losses = 0;
    let draws = 0;
    let totalAccuracy = 0;
    
    // Generate Elo History (Mocked starting from 1200)
    let currentElo = 1200;
    const eloHistory = [currentElo];

    // Sort by date ascending to build history
    const sortedGames = [...userGames].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    sortedGames.forEach((game: CloudGame | any) => {
      const res = game.result?.toLowerCase() || '';
      const isWin = res === 'win' || res === '1-0';
      const isLoss = res === 'loss' || res === '0-1';
      const isDraw = res === 'draw' || res === '1/2-1/2';
      
      if (isWin) { wins++; currentElo += 15 + Math.floor(Math.random() * 10); }
      else if (isLoss) { losses++; currentElo -= 10 + Math.floor(Math.random() * 5); }
      else if (isDraw) { draws++; currentElo += (Math.random() > 0.5 ? 2 : -2); }

      eloHistory.push(currentElo);
      totalAccuracy += Math.floor(Math.random() * 20) + 75; 
    });

    const total = userGames.length;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
    const avgAccuracy = total > 0 ? Math.round(totalAccuracy / total) : 0;

    return { wins, losses, draws, total, winRate, avgAccuracy, eloHistory, currentElo };
  }, [userGames]);

  const recentMatches = useMemo(() => {
    return [...userGames]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [userGames]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0a0f]">
      {/* Background */}
      <WebGLParticleBackground color={['#60a5fa', '#3b82f6']} intensity={0.5} />
      
      {/* Grid Overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: `linear-gradient(rgba(59,130,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.3) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 min-h-screen flex flex-col pt-16 md:pt-24 pb-12 px-4 md:px-6">
        <div className="max-w-5xl mx-auto w-full mb-8 flex items-center justify-between">
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-300 group cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            <span className="text-sm font-medium uppercase tracking-widest">Exit to Home</span>
          </button>
        </div>

        <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col items-center">
          
          {/* Header Card */}
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="md:col-span-2 bg-[#11111a]/80 backdrop-blur-3xl border border-white/5 rounded-[2rem] p-8 flex flex-col md:flex-row items-center gap-8 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                 <Shield className="w-32 h-32 text-blue-500" />
               </div>

              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-blue-600 via-purple-500 to-amber-500 p-1 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                  <div className="w-full h-full bg-[#0a0a0f] rounded-full flex items-center justify-center overflow-hidden">
                     <User className="w-16 h-16 text-blue-400" />
                  </div>
                </div>
                <div className="absolute -bottom-2 -right-2 px-3 py-1 bg-black rounded-full border border-blue-500/50 text-xs font-bold text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.5)] uppercase tracking-tighter">
                  LVL 42
                </div>
              </div>

              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                  <h1 className="text-4xl font-black font-['Montserrat'] tracking-tight text-white">{user?.username || 'Grandmaster'}</h1>
                  <div className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[10px] font-bold uppercase tracking-widest">Pro</div>
                </div>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-y-2 gap-x-4 text-gray-400 font-medium text-sm">
                  <span className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-blue-400" /> Rank #1,402</span>
                  <span className="text-gray-700">•</span>
                  <span className="flex items-center gap-1.5"><Trophy className="w-4 h-4 text-amber-400" /> {stats?.currentElo || 1450} ELO</span>
                  <span className="text-gray-700">•</span>
                  <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-emerald-400" /> Joined Mar 2024</span>
                </div>
              </div>
            </div>

            {/* Elo Sparkline Card */}
            <div className="bg-[#11111a]/80 backdrop-blur-3xl border border-white/5 rounded-[2rem] p-8 flex flex-col justify-between shadow-2xl">
               <div>
                 <h3 className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] mb-1">Performance Index</h3>
                 <div className="text-3xl font-black text-blue-400">+{stats ? (stats.currentElo - 1200) : 0}</div>
               </div>
               <div className="mt-4 flex items-center justify-center">
                 {stats && <EloSparkline data={stats.eloHistory} />}
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
            
            {/* Stats Column */}
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
                {/* Win Rate Panel */}
                <div className="bg-[#11111a]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 group hover:border-blue-500/30 transition-all">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-blue-500/20 rounded-xl text-blue-400">
                      <Target className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-sm text-gray-300 uppercase tracking-widest">Win Rate</h3>
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="text-5xl font-black text-white">{stats?.winRate || 0}%</div>
                    <div className="text-right">
                      <div className="text-[10px] text-gray-500 uppercase font-bold">Matches</div>
                      <div className="text-lg font-mono text-white leading-none">{stats?.total || 0}</div>
                    </div>
                  </div>
                </div>

                {/* Accuracy Panel */}
                <div className="bg-[#11111a]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 group hover:border-emerald-500/30 transition-all">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-emerald-500/20 rounded-xl text-emerald-400">
                      <Activity className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-sm text-gray-300 uppercase tracking-widest">Avg Accuracy</h3>
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="text-5xl font-black text-white">{stats?.avgAccuracy || 0}%</div>
                    <div className="text-right">
                       <div className="text-[10px] text-emerald-500/50 uppercase font-bold">Tier</div>
                       <div className="text-lg font-bold text-emerald-400 leading-none">Elite</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Match Record Progress */}
              <div className="bg-[#11111a]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 group hover:border-amber-500/20 transition-all">
                 <div className="flex items-center justify-between mb-6">
                   <h3 className="font-bold text-sm text-gray-300 uppercase tracking-widest flex items-center gap-2">
                     <Swords className="w-5 h-5 text-amber-500/70" /> Match Record
                   </h3>
                   <div className="text-xs font-mono text-gray-500">HISTORY OF {stats?.total || 0} GAMES</div>
                 </div>
                 
                 <div className="w-full h-10 bg-black/40 rounded-2xl overflow-hidden flex font-mono text-[10px] font-bold shadow-inner border border-white/5 p-1">
                   {stats && stats.total > 0 && (
                     <>
                        <div style={{width: `${stats.winRate}%`}} className="bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-xl h-full flex items-center pl-3 text-white transition-all duration-1000">
                          {stats.wins} W
                        </div>
                        <div style={{width: `${(stats.draws/stats.total)*100}%`}} className="bg-gray-700 mx-1 rounded-xl h-full flex items-center justify-center text-gray-300 transition-all duration-1000">
                          {stats.draws > 0 ? `${stats.draws}D` : ''}
                        </div>
                        <div style={{width: `${(stats.losses/stats.total)*100}%`}} className="bg-gradient-to-l from-red-600 to-rose-500 rounded-xl h-full flex items-center pr-3 justify-end text-white transition-all duration-1000">
                          {stats.losses} L
                        </div>
                     </>
                   )}
                 </div>
              </div>
            </div>

            {/* Recent Matches Column */}
            <div className="lg:col-span-1">
               <div className="bg-[#11111a]/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 h-full flex flex-col">
                  <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-6 flex items-center gap-2 px-2">
                    <Clock className="w-4 h-4 text-blue-400" /> Recent Battles
                  </h3>
                  
                  <div className="space-y-3 flex-1">
                    {isLoadingGames ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-blue-400/50">
                        <Activity className="w-10 h-10 animate-spin mb-4" />
                        <span className="text-xs font-bold animate-pulse">SYNCING DATA...</span>
                      </div>
                    ) : recentMatches.length === 0 ? (
                      <div className="text-center py-12 text-gray-600 text-xs">NO RECENT ACTIVITY</div>
                    ) : (
                      recentMatches.map((game) => (
                        <div 
                          key={game.id} 
                          className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between group hover:bg-white/10 hover:border-blue-500/20 transition-all cursor-pointer"
                          onClick={() => navigate('/history')}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-2 h-10 rounded-full ${
                              game.result === 'win' || game.result === '1-0' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' :
                              game.result === 'loss' || game.result === '0-1' ? 'bg-red-500' : 'bg-gray-500'
                            }`} />
                            <div>
                               <div className="text-xs font-black text-white uppercase tracking-tighter">{game.mode || 'LOCAL'} MATCH</div>
                               <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                                 {new Date(game.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                               </div>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-blue-400 transition-colors" />
                        </div>
                      ))
                    )}
                  </div>

                  <button 
                    onClick={() => navigate('/history')}
                    className="w-full mt-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-400 hover:text-white transition-all uppercase tracking-widest border border-white/5"
                  >
                    View All History
                  </button>
               </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
