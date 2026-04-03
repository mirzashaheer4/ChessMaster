import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, UserPlus, Users, Bell, Check, XCircle, Gamepad2, User, Trash2, Loader2 } from 'lucide-react';
import { useFriendsStore } from '../../core/store/friendsStore';
import { getSocket } from '../../core/api/socketClient';
import { useNavigate } from 'react-router-dom';

type Tab = 'friends' | 'requests' | 'search';

export const FriendsPanel: React.FC = () => {
  const navigate = useNavigate();
  const {
    isPanelOpen, setPanelOpen,
    friends, pendingRequests, searchResults, isLoading,
    fetchFriends, fetchRequests, searchUsers, sendRequest, respondToRequest, removeFriend,
  } = useFriendsStore();

  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const [searchInput, setSearchInput] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (isPanelOpen) {
      fetchFriends();
      fetchRequests();
      // Make sure socket is connected
      try { getSocket(); } catch {}
    }
  }, [isPanelOpen, fetchFriends, fetchRequests]);

  // Debounced search
  useEffect(() => {
    if (activeTab !== 'search') return;
    const timer = setTimeout(() => {
      if (searchInput.length >= 2) {
        searchUsers(searchInput);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, activeTab, searchUsers]);

  const showFeedback = useCallback((msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  }, []);

  const handleSendRequest = async (userId: string) => {
    const result = await sendRequest(userId);
    if (result.success) {
      showFeedback('Friend request sent!');
      // Notify via socket
      try {
        const socket = getSocket();
        socket.emit('notify_friend_request', { receiverId: userId });
      } catch {}
    } else {
      showFeedback(result.error || 'Failed to send');
    }
  };

  const handleRespond = async (requestId: string, accept: boolean, senderId: string) => {
    await respondToRequest(requestId, accept, senderId);
    showFeedback(accept ? 'Friend added!' : 'Request declined');
    if (accept) {
      try {
        const socket = getSocket();
        socket.emit('notify_friend_accepted', { senderId });
      } catch {}
    }
  };

  const handleInviteFriend = (friendId: string) => {
    // Navigate to play mode with friend invite context
    setPanelOpen(false);
    navigate('/play', { state: { inviteFriendId: friendId } });
  };

  const handleRemoveFriend = async (friendshipId: string) => {
    await removeFriend(friendshipId);
    showFeedback('Friend removed');
  };

  if (!isPanelOpen) return null;

  const onlineFriends = friends.filter(f => f.isOnline);
  const offlineFriends = friends.filter(f => !f.isOnline);

  return (
    <AnimatePresence>
      {isPanelOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]"
            onClick={() => setPanelOpen(false)}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-full max-w-md z-[91] flex flex-col"
            style={{
              background: 'linear-gradient(180deg, rgba(10,10,15,0.98) 0%, rgba(15,15,25,0.98) 100%)',
              borderLeft: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(40px)',
            }}
          >
            {/* Header */}
            <div className="p-6 pb-4 border-b border-white/5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#e8b34b]/20 to-[#e8b34b]/5 flex items-center justify-center">
                    <Users className="w-5 h-5 text-[#e8b34b]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold font-['Montserrat'] text-white">Friends</h2>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                      {onlineFriends.length} online · {friends.length} total
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setPanelOpen(false)}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 p-1 bg-black/40 rounded-xl border border-white/5">
                {([
                  { id: 'friends' as Tab, label: 'Friends', icon: Users },
                  { id: 'requests' as Tab, label: 'Requests', icon: Bell, badge: pendingRequests.length },
                  { id: 'search' as Tab, label: 'Search', icon: Search },
                ]).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 relative ${
                      activeTab === tab.id
                        ? 'bg-[#e8b34b]/20 text-[#e8b34b] shadow-[0_0_10px_rgba(232,179,75,0.1)]'
                        : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                    {tab.badge && tab.badge > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Bar (in search tab) */}
            {activeTab === 'search' && (
              <div className="px-6 pt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search by username..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#e8b34b]/50 transition-colors"
                    autoFocus
                  />
                </div>
              </div>
            )}

            {/* Feedback toast */}
            <AnimatePresence>
              {feedback && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mx-6 mt-3 px-4 py-2 rounded-lg bg-[#e8b34b]/20 border border-[#e8b34b]/30 text-[#e8b34b] text-xs font-bold text-center"
                >
                  {feedback}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2 scrollbar-thin">
              {/* ── Friends Tab ── */}
              {activeTab === 'friends' && (
                <>
                  {friends.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-600">
                      <Users className="w-12 h-12 mb-4 opacity-30" />
                      <p className="text-sm font-medium mb-1">No friends yet</p>
                      <p className="text-xs">Search for players to add them!</p>
                    </div>
                  ) : (
                    <>
                      {/* Online friends */}
                      {onlineFriends.length > 0 && (
                        <div className="mb-4">
                          <p className="text-[10px] text-emerald-500 uppercase tracking-widest font-bold mb-2 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Online — {onlineFriends.length}
                          </p>
                          {onlineFriends.map(friend => (
                            <FriendCard
                              key={friend.id}
                              friend={friend}
                              onViewProfile={() => { setPanelOpen(false); navigate(`/user/${friend.id}`); }}
                              onInvite={() => handleInviteFriend(friend.id)}
                              onRemove={() => handleRemoveFriend(friend.friendshipId)}
                            />
                          ))}
                        </div>
                      )}
                      {/* Offline friends */}
                      {offlineFriends.length > 0 && (
                        <div>
                          <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold mb-2">
                            Offline — {offlineFriends.length}
                          </p>
                          {offlineFriends.map(friend => (
                            <FriendCard
                              key={friend.id}
                              friend={friend}
                              onViewProfile={() => { setPanelOpen(false); navigate(`/user/${friend.id}`); }}
                              onRemove={() => handleRemoveFriend(friend.friendshipId)}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {/* ── Requests Tab ── */}
              {activeTab === 'requests' && (
                <>
                  {pendingRequests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-600">
                      <Bell className="w-12 h-12 mb-4 opacity-30" />
                      <p className="text-sm font-medium">No pending requests</p>
                    </div>
                  ) : (
                    pendingRequests.map(req => (
                      <motion.div
                        key={req.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-[#e8b34b]/20 transition-all mb-2"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/30 to-amber-600/10 flex items-center justify-center">
                            <User className="w-5 h-5 text-amber-400" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{req.sender.username}</p>
                            <p className="text-[10px] text-gray-500">{req.sender.eloRating} ELO</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRespond(req.id, true, req.senderId)}
                            className="p-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition-colors cursor-pointer"
                            title="Accept"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRespond(req.id, false, req.senderId)}
                            className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors cursor-pointer"
                            title="Decline"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </>
              )}

              {/* ── Search Tab ── */}
              {activeTab === 'search' && (
                <>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 text-[#e8b34b] animate-spin" />
                    </div>
                  ) : searchResults.length === 0 && searchInput.length >= 2 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-600">
                      <Search className="w-12 h-12 mb-4 opacity-30" />
                      <p className="text-sm font-medium">No users found</p>
                    </div>
                  ) : searchInput.length < 2 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-600">
                      <Search className="w-12 h-12 mb-4 opacity-30" />
                      <p className="text-sm font-medium">Type at least 2 characters</p>
                    </div>
                  ) : (
                    searchResults.map(user => (
                      <motion.div
                        key={user.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all mb-2"
                      >
                        <div
                          className="flex items-center gap-3 cursor-pointer flex-1"
                          onClick={() => { setPanelOpen(false); navigate(`/user/${user.id}`); }}
                        >
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/10 flex items-center justify-center">
                              <User className="w-5 h-5 text-blue-400" />
                            </div>
                            {user.isOnline && (
                              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0a0a0f] shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{user.username}</p>
                            <p className="text-[10px] text-gray-500">{user.eloRating} ELO</p>
                          </div>
                        </div>
                        <div>
                          {user.isFriend ? (
                            <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                              Friends
                            </span>
                          ) : user.requestPending ? (
                            <span className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                              Pending
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSendRequest(user.id)}
                              className="p-2 rounded-lg bg-[#e8b34b]/20 hover:bg-[#e8b34b]/30 text-[#e8b34b] transition-colors cursor-pointer"
                              title="Send friend request"
                            >
                              <UserPlus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ))
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ─── Friend Card Sub-Component ──────────────────────────────────────
const FriendCard: React.FC<{
  friend: { id: string; username: string; eloRating: number; isOnline: boolean; friendshipId: string };
  onViewProfile: () => void;
  onInvite?: () => void;
  onRemove: () => void;
}> = ({ friend, onViewProfile, onInvite, onRemove }) => {


  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all mb-1.5 group"
    >
      <div
        className="flex items-center gap-3 cursor-pointer flex-1"
        onClick={onViewProfile}
      >
        <div className="relative">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/10 flex items-center justify-center">
            <span className="text-xs font-bold text-blue-400">
              {friend.username.charAt(0).toUpperCase()}
            </span>
          </div>
          {friend.isOnline && (
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#0a0a0f] shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{friend.username}</p>
          <p className="text-[10px] text-gray-500">{friend.eloRating} ELO</p>
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {friend.isOnline && onInvite && (
          <button
            onClick={onInvite}
            className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition-colors cursor-pointer"
            title="Invite to play"
          >
            <Gamepad2 className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={onRemove}
          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400/50 hover:text-red-400 transition-colors cursor-pointer"
          title="Remove friend"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
};

export default FriendsPanel;
