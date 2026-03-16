import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/game';

export const useGameTimer = () => {
  const { clockRunning, gameStatus, tickClock } = useGameStore();
  const lastTickRef = useRef<number>(Date.now());
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!clockRunning || gameStatus !== 'active') {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    lastTickRef.current = Date.now();

    const tick = () => {
      const now = Date.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;
      
      tickClock(delta);
      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [clockRunning, gameStatus, tickClock]);
};
