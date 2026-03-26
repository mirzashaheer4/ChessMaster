import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface CaptureEffectProps {
  /** X position as percentage (0-100) of the board width */
  x: number | string;
  /** Y position as percentage (0-100) of the board height */
  y: number | string;
  isAbsolute?: boolean;
}

/**
 * Self-contained capture animation.
 * Mount with a unique `key` prop to re-trigger on each capture.
 * Automatically unmounts itself after animation completes.
 * 
 * PERF: Optimized for mobile — uses CSS transforms instead of box-shadows,
 * reduced particle count, shorter duration, no blur filter.
 */
export const CaptureEffect: React.FC<CaptureEffectProps> = ({ x, y, isAbsolute }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 1200); // Faster cleanup
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  // Reduced from 12 to 6 particles for mobile perf
  const particles = Array.from({ length: 6 }, (_, i) => {
    const angle = (i / 6) * Math.PI * 2;
    const dist = 30 + Math.random() * 20;
    return {
      tx: Math.cos(angle) * dist,
      ty: Math.sin(angle) * dist,
      delay: Math.random() * 0.1,
      size: 3 + Math.random() * 3,
    };
  });

  return (
    <div
      className={`${isAbsolute ? 'absolute' : 'fixed'} pointer-events-none`}
      style={{ left: x, top: y, transform: 'translate(-50%, -50%)', zIndex: 9999 }}
    >
      {/* Flash — no blur, no box-shadow */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 50, height: 50, left: -25, top: -25,
          background: 'radial-gradient(circle, rgba(255,215,0,0.8) 0%, rgba(212,175,55,0.3) 50%, transparent 75%)',
        }}
        initial={{ opacity: 1, scale: 0.3 }}
        animate={{ opacity: 0, scale: 1.8 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />

      {/* Single smoke puff — no blur filter */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 40, height: 40, left: -20, top: -20,
          background: 'radial-gradient(circle, rgba(139,115,85,0.4) 0%, rgba(80,60,40,0.15) 60%, transparent 80%)',
        }}
        initial={{ opacity: 0.6, scale: 0.3 }}
        animate={{ opacity: 0, scale: 2 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />

      {/* Particle burst — reduced count, no box-shadow */}
      {particles.map((p, i) => (
        <motion.div
          key={`p-${i}`}
          className="absolute rounded-full"
          style={{
            width: p.size, height: p.size,
            left: -p.size / 2, top: -p.size / 2,
            background: 'radial-gradient(circle, #FFD700 0%, #D4AF37 80%, transparent 100%)',
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: p.tx, y: p.ty, opacity: 0, scale: 0.3 }}
          transition={{ duration: 0.8, delay: p.delay, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      ))}

      {/* Center dot */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 16, height: 16, left: -8, top: -8,
          background: 'radial-gradient(circle, #FFD700 0%, #D4AF37 60%, transparent 90%)',
        }}
        initial={{ opacity: 1, scale: 1 }}
        animate={{ opacity: 0, scale: 0.1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      />
    </div>
  );
};

export default CaptureEffect;
