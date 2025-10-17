import React from 'react';
import { motion } from 'framer-motion';

const Default_Gradients = [
  "linear-gradient(135deg, #2d1b69 0%, #11998e 100%)",
  "linear-gradient(135deg, #8e2de2 0%, #4a00e0 100%)",
  "linear-gradient(135deg, #0f3460 0%, #e94560 100%)",
  "linear-gradient(135deg, #134e5e 0%, #71b280 100%)",
  "linear-gradient(135deg, #2d1b69 0%, #11998e 100%)",
];

export function GradientBackground({
  children,
  className = '',
  gradients = Default_Gradients,
  animationDuration = 8,
  animationDelay = 0.5,
  overlay = false,
  overlayOpacity = 0.3,
}) {
  return (
    <div style={{
      width: '100%',
      position: 'relative',
      minHeight: '100vh',
      overflow: 'hidden'
    }}>
      {/* Animated gradient background */}
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          background: gradients[0]
        }}
        animate={{ background: gradients }}
        transition={{
          delay: animationDelay,
          duration: animationDuration,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Optional overlay */}
      {overlay && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'black',
            opacity: overlayOpacity
          }}
        />
      )}

      {/* Content wrapper */}
      {children && (
        <div style={{
          position: 'relative',
          zIndex: 10,
          minHeight: '100vh'
        }}>
          {children}
        </div>
      )}
    </div>
  );
}