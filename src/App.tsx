import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './features/landing/Landing';
import Dashboard from './features/landing/Dashboard';
import PlayMode from './features/menu/PlayMode';
import Profile from './features/menu/Profile';
import DifficultyScreen from './features/menu/Difficulty';
import About from './features/landing/About';
import HistoryScreen from './features/menu/History';
import LocalGame from './features/game/modes/LocalGame';
import AIGame from './features/game/modes/AIGame';
import OnlineGame from './features/game/modes/OnlineGame';
import GameReview from './features/game/review/GameReview';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { AuthModal } from './components/ui/AuthModal';
import { useAuthStore } from './core/store/auth';

function AppContent() {
  const [showAuth, setShowAuth] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    const handleLoginOpen = () => setShowAuth(true);
    window.addEventListener('open-login', handleLoginOpen);
    return () => window.removeEventListener('open-login', handleLoginOpen);
  }, []);

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
          <Route path="/about" element={<About />} />
          <Route path="/history" element={user ? <HistoryScreen /> : <Navigate to="/" replace />} />
          <Route path="/review" element={user ? <GameReview /> : <Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
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
