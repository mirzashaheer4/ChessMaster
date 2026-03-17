import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../core/store/auth';

export const AuthModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const setAuth = useAuthStore(state => state.setAuth);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const SERVER_URL = import.meta.env.VITE_SERVER_URL || '';
      const endpoint = isLogin ? `${SERVER_URL}/api/auth/login` : `${SERVER_URL}/api/auth/register`;
      const payload = isLogin ? { email, password } : { username, email, password };
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      setAuth(data.token, data.user);
      // Immediately load the user's cloud game history
      useAuthStore.getState().fetchGames();
      onClose();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div 
        className="border border-indigo-500/20 shadow-[0_0_50px_rgba(30,58,138,0.3)] relative overflow-hidden rounded-[2rem] p-10 max-w-md w-full"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(10, 10, 10, 0.98) 100%)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#e8b34b] to-transparent opacity-70" />

        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"
        >
          ✕
        </button>
        
        <h2 className="text-3xl font-black font-['Montserrat'] mb-2 text-white text-center">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="text-gray-400 text-sm text-center mb-8">
          {isLogin ? 'Enter your credentials to access the arena.' : 'Join the world\'s premiere chess community.'}
        </p>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 mb-6 rounded text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-gray-400 text-xs font-bold mb-2 uppercase tracking-wide">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-[#e8b34b] focus:ring-1 focus:ring-[#e8b34b] transition-all"
                required
              />
            </div>
          )}
          
          <div>
            <label className="block text-gray-400 text-xs font-bold mb-2 uppercase tracking-wide">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-[#e8b34b] focus:ring-1 focus:ring-[#e8b34b] transition-all"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-400 text-xs font-bold mb-2 uppercase tracking-wide">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-[#e8b34b] focus:ring-1 focus:ring-[#e8b34b] transition-all"
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full btn-gold shadow-lg font-bold py-4 px-4 rounded-full transition-transform hover:-translate-y-1 mt-8 text-lg uppercase tracking-wider"
          >
            {isLogin ? 'Play Now' : 'Join the Arena'}
          </button>
        </form>

        <p className="text-center text-gray-400 mt-6 text-sm">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            type="button" 
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-[#e8b34b] hover:text-[#fcd34d] font-bold transition-colors ml-2"
          >
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  );
};
