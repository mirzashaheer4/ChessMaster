import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, User, Trophy, Target, Activity, Shield, Swords, Clock, Loader2 } from 'lucide-react';
import WebGLParticleBackground from '../../core/components/WebGLParticleBackground';
import { getUserPublicProfile, type UserPublicProfile } from '../../core/api/friendsApi';
import { useFriendsStore } from '../../core/store/friendsStore';

// Simple Sparkline Chart
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
        <linearGradient id="lineGradientPublic" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#e8b34b" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#e8b34b" stopOpacity="1" />
        </linearGradient>
      </defs>
      <path
        d={`M ${points}`}
        fill="none"
        stroke="url(#lineGradientPublic)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="drop-shadow-[0_0_8px_rgba(232,179,75,0.5)]"
      />
    </svg>
  );
};

export default function UserAnalytics() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserPublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { onlineUserIds } = useFriendsStore();

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    getUserPublicProfile(userId).then(data => {
      setProfile(data);
      setLoading(false);
    });
  }, [userId]);

  const eloHistory = useMemo(() => {
    if (!profile) return [];
    // Generate mock elo history based on total games
    const total = profile.stats.total;
    if (total === 0) return [profile.eloRating];
    const history = [1200];
    let elo = 1200;
    for (let i = 0; i < total; i++) {
      const change = Math.floor(Math.random() * 30) - 12;
      elo = Math.max(800, elo + change);
      history.push(elo);
    }
    // Ensure last point matches current elo
    history[history.length - 1] = profile.eloRating;
    return history;
  }, [profile]);

  const isOnline = userId ? onlineUserIds.has(userId) : false;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <WebGLParticleBackground color={['#e8b34b', '#d4a03d']} intensity={0.4} />
        <Loader2 className="w-10 h-10 text-[#e8b34b] animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-white">
        <WebGLParticleBackground color={['#e8b34b', '#d4a03d']} intensity={0.4} />
        <User className="w-16 h-16 text-gray-600 mb-4" />
        <h2 className="text-2xl font-bold mb-2">User Not Found</h2>
        <button onClick={() => navigate(-1)} className="text-[#e8b34b] hover:underline cursor-pointer">Go back</button>
      </div>
    );
  }

  const { stats } = profile;

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0a0f]">
      <WebGLParticleBackground color={['#e8b34b', '#d4a03d']} intensity={0.4} />

      {/* Grid Overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: `linear-gradient(rgba(232,179,75,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(232,179,75,0.3) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 min-h-screen flex flex-col pt-16 md:pt-24 pb-12 px-4 md:px-6">
        {/* Back button */}
        <div className="max-w-5xl mx-auto w-full mb-8 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-300 group cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            <span className="text-sm font-medium uppercase tracking-widest">Back</span>
          </button>
        </div>

        <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col items-center">
          {/* Header Card */}
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="md:col-span-2 bg-[#11111a]/80 backdrop-blur-3xl border border-white/5 rounded-[2rem] p-8 flex flex-col md:flex-row items-center gap-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Shield className="w-32 h-32 text-[#e8b34b]" />
              </div>

              <div className="relative">
                <div className={`w-32 h-32 rounded-full p-1 shadow-[0_0_30px_rgba(232,179,75,0.3)] ${isOnline ? 'bg-gradient-to-tr from-emerald-500 via-[#e8b34b] to-amber-500' : 'bg-gradient-to-tr from-gray-600 via-gray-500 to-gray-400'}`}>
                  <div className="w-full h-full bg-[#0a0a0f] rounded-full flex items-center justify-center overflow-hidden">
                    <User className="w-16 h-16 text-[#e8b34b]" />
                  </div>
                </div>
                {isOnline && (
                  <div className="absolute -bottom-1 -right-1 px-3 py-1 bg-emerald-500 rounded-full text-[10px] font-bold text-white uppercase tracking-tighter shadow-[0_0_15px_rgba(16,185,129,0.6)]">
                    Online
                  </div>
                )}
              </div>

              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                  <h1 className="text-4xl font-black font-['Montserrat'] tracking-tight text-white">
                    {profile.username}
                  </h1>
                </div>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-y-2 gap-x-4 text-gray-400 font-medium text-sm">
                  <span className="flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-400" /> {profile.eloRating} ELO
                  </span>
                  <span className="text-gray-700">•</span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-400" /> Joined {new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                  </span>
                  <span className="text-gray-700">•</span>
                  <span className="flex items-center gap-1.5">
                    <Swords className="w-4 h-4 text-blue-400" /> {stats.total} Games
                  </span>
                </div>
              </div>
            </div>

            {/* Elo Sparkline Card */}
            <div className="bg-[#11111a]/80 backdrop-blur-3xl border border-white/5 rounded-[2rem] p-8 flex flex-col justify-between shadow-2xl">
              <div>
                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] mb-1">ELO Rating</h3>
                <div className="text-3xl font-black text-[#e8b34b]">{profile.eloRating}</div>
              </div>
              <div className="mt-4 flex items-center justify-center">
                {eloHistory.length > 1 && <EloSparkline data={eloHistory} />}
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
                {/* Win Rate */}
                <div className="bg-[#11111a]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 group hover:border-[#e8b34b]/30 transition-all">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-[#e8b34b]/20 rounded-xl text-[#e8b34b]">
                      <Target className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-sm text-gray-300 uppercase tracking-widest">Win Rate</h3>
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="text-5xl font-black text-white">{stats.winRate}%</div>
                    <div className="text-right">
                      <div className="text-[10px] text-gray-500 uppercase font-bold">Matches</div>
                      <div className="text-lg font-mono text-white leading-none">{stats.total}</div>
                    </div>
                  </div>
                </div>

                {/* Games Played */}
                <div className="bg-[#11111a]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 group hover:border-emerald-500/30 transition-all">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-emerald-500/20 rounded-xl text-emerald-400">
                      <Activity className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-sm text-gray-300 uppercase tracking-widest">Performance</h3>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-2xl font-black text-emerald-400">{stats.wins}W</div>
                      <div className="text-lg font-bold text-gray-500">{stats.draws}D / {stats.losses}L</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-gray-500 uppercase font-bold">Win %</div>
                      <div className="text-lg font-bold text-emerald-400 leading-none">{stats.winRate}%</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Match Record Bar */}
              <div className="bg-[#11111a]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 group hover:border-amber-500/20 transition-all">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-sm text-gray-300 uppercase tracking-widest flex items-center gap-2">
                    <Swords className="w-5 h-5 text-amber-500/70" /> Match Record
                  </h3>
                  <div className="text-xs font-mono text-gray-500">{stats.total} GAMES TOTAL</div>
                </div>

                <div className="w-full h-10 bg-black/40 rounded-2xl overflow-hidden flex font-mono text-[10px] font-bold shadow-inner border border-white/5 p-1">
                  {stats.total > 0 && (
                    <>
                      <div style={{ width: `${stats.winRate}%` }} className="bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-xl h-full flex items-center pl-3 text-white transition-all duration-1000">
                        {stats.wins} W
                      </div>
                      <div style={{ width: `${(stats.draws / stats.total) * 100}%` }} className="bg-gray-700 mx-1 rounded-xl h-full flex items-center justify-center text-gray-300 transition-all duration-1000">
                        {stats.draws > 0 ? `${stats.draws}D` : ''}
                      </div>
                      <div style={{ width: `${(stats.losses / stats.total) * 100}%` }} className="bg-gradient-to-l from-red-600 to-rose-500 rounded-xl h-full flex items-center pr-3 justify-end text-white transition-all duration-1000">
                        {stats.losses} L
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-[#11111a]/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 h-full flex flex-col">
                <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-6 flex items-center gap-2 px-2">
                  <Shield className="w-4 h-4 text-[#e8b34b]" /> Player Stats
                </h3>

                <div className="space-y-4 flex-1">
                  <StatRow label="Total Games" value={stats.total.toString()} />
                  <StatRow label="Wins" value={stats.wins.toString()} color="text-emerald-400" />
                  <StatRow label="Losses" value={stats.losses.toString()} color="text-red-400" />
                  <StatRow label="Draws" value={stats.draws.toString()} color="text-gray-400" />
                  <StatRow label="Win Rate" value={`${stats.winRate}%`} color="text-[#e8b34b]" />
                  <StatRow label="ELO Rating" value={profile.eloRating.toString()} color="text-amber-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const StatRow: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color = 'text-white' }) => (
  <div className="flex items-center justify-between py-3 px-3 rounded-xl bg-white/[0.03] border border-white/5">
    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{label}</span>
    <span className={`text-sm font-black ${color}`}>{value}</span>
  </div>
);
