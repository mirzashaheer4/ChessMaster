import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './features/landing/Landing';
import Dashboard from './features/landing/Dashboard';
import PlayMode from './features/menu/PlayMode';
import Profile from './features/menu/Profile';
import UserAnalytics from './features/menu/UserAnalytics';
import DifficultyScreen from './features/menu/Difficulty';
import About from './features/landing/About';
import HistoryScreen from './features/menu/History';
import LocalGame from './features/game/modes/LocalGame';
import AIGame from './features/game/modes/AIGame';
import OnlineGame from './features/game/modes/OnlineGame';
import GameReview from './features/game/review/GameReview';
import { Privacy, Terms, Cookies, HelpCenter } from './features/landing/StaticPages';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { AuthModal } from './components/ui/AuthModal';
import { FriendsPanel } from './components/ui/FriendsPanel';
import { GameInviteNotification } from './components/ui/GameInviteNotification';
import { useAuthStore } from './core/store/auth';
import { getSocket, disconnectSocket } from './core/api/socketClient';
import { useGameStore } from './core/store/game';
import { useNavigate } from 'react-router-dom';

function AppContent() {
  const [showAuth, setShowAuth] = useState(false);
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const onlineStatus = useGameStore(s => s.onlineStatus);
  const [inviteDeclinedMsg, setInviteDeclinedMsg] = useState('');

  useEffect(() => {
    const handleLoginOpen = () => setShowAuth(true);
    const handleInviteDeclined = (e: any) => {
      setInviteDeclinedMsg(e.detail);
      setTimeout(() => setInviteDeclinedMsg(''), 4000);
    };
    
    window.addEventListener('open-login', handleLoginOpen);
    window.addEventListener('invite-declined', handleInviteDeclined);
    
    return () => {
      window.removeEventListener('open-login', handleLoginOpen);
      window.removeEventListener('invite-declined', handleInviteDeclined);
    };
  }, []);

  // Global navigation to online game when match is found
  useEffect(() => {
    if (onlineStatus === 'playing') {
      navigate('/game/online');
    }
  }, [onlineStatus, navigate]);

  // Auto-connect socket for online presence when user is logged in
  useEffect(() => {
    if (user) {
      try { 
        getSocket(); 
        useGameStore.getState().initSocketListeners();
      } catch {}
    } else {
      useGameStore.getState().cleanupSocketListeners();
      disconnectSocket();
    }
  }, [user]);

  return (
    <DndProvider backend={HTML5Backend}>
      <main className="w-full h-screen bg-black font-sans text-white">
        <Routes>
          <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Landing />} />
          <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/" replace />} />
          <Route path="/play" element={user ? <PlayMode /> : <Navigate to="/" replace />} />
          <Route path="/profile" element={user ? <Profile /> : <Navigate to="/" replace />} />
          <Route path="/difficulty" element={user ? <DifficultyScreen /> : <Navigate to="/" replace />} />
          <Route path="/game/local" element={user ? <LocalGame /> : <Navigate to="/" replace />} />
          <Route path="/game/ai" element={user ? <AIGame /> : <Navigate to="/" replace />} />
          <Route path="/game/online" element={user ? <OnlineGame /> : <Navigate to="/" replace />} />
          <Route path="/user/:userId" element={user ? <UserAnalytics /> : <Navigate to="/" replace />} />
          <Route path="/about" element={<About />} />
          <Route path="/history" element={user ? <HistoryScreen /> : <Navigate to="/" replace />} />
          <Route path="/review" element={user ? <GameReview /> : <Navigate to="/" replace />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/cookies" element={<Cookies />} />
          <Route path="/help" element={<HelpCenter />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
        {user && <FriendsPanel />}
        {user && <GameInviteNotification />}
        
        {/* Global Toast for Declined Invites */}
        {inviteDeclinedMsg && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] bg-red-500/10 text-red-400 px-6 py-3 rounded-full text-sm font-bold border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.2)] animate-in fade-in slide-in-from-top-4 pointer-events-none">
            {inviteDeclinedMsg}
          </div>
        )}
      </main>
    </DndProvider>
  );
}

function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}

export const globalLoginEvent = new Event('open-login');
if (typeof window !== 'undefined') {
  window.addEventListener('open-login', () => {});
}

export default App;
