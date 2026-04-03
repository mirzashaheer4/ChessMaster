import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, Check, X, Clock } from 'lucide-react';
import { useFriendsStore, type GameInvite } from '../../core/store/friendsStore';
import { getSocket } from '../../core/api/socketClient';
import { useAuthStore } from '../../core/store/auth';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../core/store/game';

export const GameInviteNotification: React.FC = () => {
  const { gameInvites, removeGameInvite } = useFriendsStore();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  if (gameInvites.length === 0) return null;

  const handleAccept = (invite: GameInvite) => {
    try {
      const socket = getSocket();
      socket.emit('accept_invite', {
        inviteId: invite.inviteId,
        elo: user?.eloRating || 1200,
      });

      // Set up game store for the match
      const tc = {
        category: invite.timeCategory as 'bullet' | 'blitz' | 'rapid',
        initial: invite.timeInitial * 1000,
        increment: invite.timeIncrement * 1000,
        label: `${invite.timeInitial / 60}min`,
      };
      useGameStore.getState().setMode('online');
      useGameStore.getState().setTimeControl(tc);
      useGameStore.getState().setChessType('standard');

      removeGameInvite(invite.inviteId);
      navigate('/game/online');
    } catch {}
  };

  const handleDecline = (invite: GameInvite) => {
    try {
      const socket = getSocket();
      socket.emit('decline_invite', { inviteId: invite.inviteId });
    } catch {}
    removeGameInvite(invite.inviteId);
  };

  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {gameInvites.map(invite => (
          <InviteCard
            key={invite.inviteId}
            invite={invite}
            onAccept={() => handleAccept(invite)}
            onDecline={() => handleDecline(invite)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

const InviteCard: React.FC<{
  invite: GameInvite;
  onAccept: () => void;
  onDecline: () => void;
}> = ({ invite, onAccept, onDecline }) => {
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getTimeLabel = () => {
    const mins = Math.floor(invite.timeInitial / 60);
    const inc = invite.timeIncrement;
    return inc > 0 ? `${mins}+${inc}` : `${mins} min`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className="pointer-events-auto"
    >
      <div
        className="rounded-2xl p-5 shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-white/10 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(10,10,15,0.97), rgba(20,20,30,0.97))',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Animated glow border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-[#e8b34b] to-emerald-500 animate-pulse" />

        {/* Timer bar */}
        <div className="absolute bottom-0 left-0 h-0.5 bg-emerald-500/30 transition-all duration-1000 ease-linear"
          style={{ width: `${(timeLeft / 30) * 100}%` }}
        />

        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/30 to-blue-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <Gamepad2 className="w-6 h-6 text-emerald-400" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-bold text-white truncate">{invite.from.username}</p>
              <span className="text-[10px] text-gray-500">({invite.from.elo} ELO)</span>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Invites you to play • <span className="text-[#e8b34b] font-semibold">{getTimeLabel()}</span> {invite.timeCategory}
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={onAccept}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" /> Accept
              </button>
              <button
                onClick={onDecline}
                className="flex-1 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" /> Decline
              </button>
            </div>

            <div className="flex items-center justify-end mt-2">
              <span className="text-[10px] text-gray-600 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {timeLeft}s
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default GameInviteNotification;
