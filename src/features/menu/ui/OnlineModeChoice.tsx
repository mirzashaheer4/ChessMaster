import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Shuffle, Gamepad2, Loader2, Swords } from 'lucide-react';
import { useFriendsStore } from '../../../core/store/friendsStore';
import { getSocket } from '../../../core/api/socketClient';

interface OnlineModeChoiceProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayRandom: () => void;
  onPlayFriend: (friendId: string) => void;
}

const OnlineModeChoice: React.FC<OnlineModeChoiceProps> = ({ isOpen, onClose, onPlayRandom, onPlayFriend }) => {
  const [mode, setMode] = useState<'choice' | 'friends'>('choice');
  const { friends, fetchFriends } = useFriendsStore();
  const [inviteSent, setInviteSent] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && mode === 'friends') {
      fetchFriends();
      try { getSocket(); } catch {}
    }
  }, [isOpen, mode, fetchFriends]);

  useEffect(() => {
    if (!isOpen) {
      setMode('choice');
      setInviteSent(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const onlineFriends = friends.filter(f => f.isOnline);

  const handleInviteFriend = (friendId: string) => {
    setInviteSent(friendId);
    onPlayFriend(friendId);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-lg bg-zinc-900/90 border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.6)] backdrop-blur-xl rounded-2xl relative overflow-hidden"
        >
          {/* Top glow */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors cursor-pointer z-10 bg-black/20 hover:bg-black/40 p-1.5 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-6 md:p-8">
            {mode === 'choice' ? (
              <>
                {/* Header */}
                <div className="text-center mb-8">
                  <div className="flex justify-center mb-3">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg"
                      style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.3), rgba(16,185,129,0.05))', border: '1px solid rgba(16,185,129,0.2)' }}>
                      <Swords className="w-7 h-7 text-emerald-400" />
                    </div>
                  </div>
                  <h2 className="text-emerald-400 text-lg uppercase tracking-[0.3em] font-black mb-1 font-['Montserrat']">
                    Play Online
                  </h2>
                  <p className="text-zinc-400 text-xs">
                    Choose how you want to play
                  </p>
                </div>

                {/* Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Play with Friend */}
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setMode('friends')}
                    className="p-6 rounded-2xl text-left cursor-pointer transition-all duration-300 group relative overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05))',
                      border: '1px solid rgba(59,130,246,0.2)',
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Users className="w-6 h-6 text-blue-400" />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-1 font-['Montserrat']">Play with Friend</h3>
                      <p className="text-xs text-gray-400">
                        Invite an online friend to a match
                      </p>
                      {onlineFriends.length > 0 && (
                        <div className="mt-3 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[10px] text-emerald-400 font-bold">{onlineFriends.length} online</span>
                        </div>
                      )}
                    </div>
                  </motion.button>

                  {/* Play Random */}
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onPlayRandom}
                    className="p-6 rounded-2xl text-left cursor-pointer transition-all duration-300 group relative overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))',
                      border: '1px solid rgba(16,185,129,0.2)',
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Shuffle className="w-6 h-6 text-emerald-400" />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-1 font-['Montserrat']">Play Random</h3>
                      <p className="text-xs text-gray-400">
                        Match with a random opponent
                      </p>
                    </div>
                  </motion.button>
                </div>
              </>
            ) : (
              <>
                {/* Friends List */}
                <div className="text-center mb-6">
                  <button onClick={() => setMode('choice')} className="text-blue-400 text-xs font-bold hover:underline mb-3 cursor-pointer">
                    ← Back
                  </button>
                  <h2 className="text-blue-400 text-lg uppercase tracking-[0.2em] font-black font-['Montserrat']">
                    Invite a Friend
                  </h2>
                  <p className="text-zinc-400 text-xs mt-1">Select an online friend to invite</p>
                </div>

                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                  {onlineFriends.length === 0 ? (
                    <div className="text-center py-12 text-gray-600">
                      <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium">No friends online</p>
                      <p className="text-xs mt-1">Friends need to be online to receive invites</p>
                    </div>
                  ) : (
                    onlineFriends.map(friend => (
                      <motion.div
                        key={friend.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-blue-500/20 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/10 flex items-center justify-center">
                              <span className="text-sm font-bold text-blue-400">
                                {friend.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-zinc-900 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{friend.username}</p>
                            <p className="text-[10px] text-gray-500">{friend.eloRating} ELO</p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleInviteFriend(friend.id)}
                          disabled={inviteSent === friend.id}
                          className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                            inviteSent === friend.id
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20'
                              : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/20'
                          }`}
                        >
                          {inviteSent === friend.id ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" /> Sent
                            </>
                          ) : (
                            <>
                              <Gamepad2 className="w-3 h-3" /> Invite
                            </>
                          )}
                        </button>
                      </motion.div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OnlineModeChoice;
