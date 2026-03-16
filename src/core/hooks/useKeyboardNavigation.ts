
import { useEffect } from 'react';
import { useGameStore } from '../store/game';

export const useKeyboardNavigation = () => {
  const { 
    nextMove, 
    prevMove, 
    setReviewIndex, 
    history 
  } = useGameStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input (e.g. custom bot modal)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Only allow navigation if game has history
      if (history.length === 0) return;

      switch (e.key) {
        case 'ArrowLeft':
          useGameStore.getState().clearPremoves();
          prevMove();
          break;
        case 'ArrowRight':
          nextMove();
          break;
        case 'ArrowUp':
        case 'Home':
          useGameStore.getState().clearPremoves();
          setReviewIndex(-2); // Go to start
          break;
        case 'ArrowDown':
        case 'End':
          setReviewIndex(-1); // Go to live/end
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextMove, prevMove, setReviewIndex, history.length]);
};
