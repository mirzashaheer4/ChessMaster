import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface CaptureEffectProps {
  x: number | string;
  y: number | string;
  isAbsolute?: boolean;
}

/**
 * Self-contained capture animation.
 * Mount with a unique `key` prop to re-trigger on each capture.
 * Automatically unmounts itself after animation completes.
 */
export const CaptureEffect: React.FC<CaptureEffectProps> = ({ x, y, isAbsolute }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(timer);
  }, []); // Runs once on mount

  if (!visible) return null;

  // Generate particles in a circular burst
  const particles = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2;
    const dist = 40 + Math.random() * 30;
    return {
      tx: Math.cos(angle) * dist,
      ty: Math.sin(angle) * dist,
      delay: Math.random() * 0.15,
      size: 4 + Math.random() * 4,
    };
  });

  return (
    <div
      className={`${isAbsolute ? 'absolute' : 'fixed'} pointer-events-none`}
      style={{ left: x, top: y, transform: 'translate(-50%, -50%)', zIndex: 9999 }}
    >
      {/* Flash */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 70, height: 70, left: -35, top: -35,
          background: 'radial-gradient(circle, rgba(255,215,0,0.9) 0%, rgba(212,175,55,0.3) 40%, transparent 70%)',
        }}
        initial={{ opacity: 1, scale: 0.3 }}
        animate={{ opacity: 0, scale: 2 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />

      {/* Smoke puffs */}
      {[0, 0.15, 0.3, 0.5].map((delay, i) => (
        <motion.div
          key={`smoke-${i}`}
          className="absolute rounded-full"
          style={{
            width: 50 + i * 10, height: 50 + i * 10,
            left: -(25 + i * 5), top: -(25 + i * 5),
            background: 'radial-gradient(circle, rgba(139,115,85,0.5) 0%, rgba(80,60,40,0.2) 50%, transparent 75%)',
            filter: 'blur(4px)',
          }}
          initial={{ opacity: 0.7, scale: 0.2 }}
          animate={{ opacity: 0, scale: 2.5 }}
          transition={{ duration: 2.0, delay, ease: 'easeOut' }}
        />
      ))}

      {/* Particle burst */}
      {particles.map((p, i) => (
        <motion.div
          key={`particle-${i}`}
          className="absolute rounded-full"
          style={{
            width: p.size, height: p.size,
            left: -p.size / 2, top: -p.size / 2,
            background: 'radial-gradient(circle, #FFD700 0%, #D4AF37 60%, transparent 100%)',
            boxShadow: '0 0 6px #D4AF37',
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: p.tx, y: p.ty, opacity: 0, scale: 0.2 }}
          transition={{ duration: 1.5, delay: p.delay, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      ))}

      {/* Center glow fade */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 24, height: 24, left: -12, top: -12,
          background: 'radial-gradient(circle, #FFD700 0%, #D4AF37 50%, transparent 80%)',
          boxShadow: '0 0 20px rgba(212,175,55,0.8)',
        }}
        initial={{ opacity: 1, scale: 1 }}
        animate={{ opacity: 0, scale: 0.1 }}
        transition={{ duration: 1.0, delay: 0.2 }}
      />
    </div>
  );
};

export default CaptureEffect;
