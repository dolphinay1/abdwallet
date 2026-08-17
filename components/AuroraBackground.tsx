'use client';
// Adapted from TempWallets/temp-wallets-website — light neumorphic ambience

import React from 'react';

interface AuroraBackgroundProps {
  children: React.ReactNode;
  showRadialGradient?: boolean;
  className?: string;
}

export function AuroraBackground({ children, showRadialGradient = true, className }: AuroraBackgroundProps) {
  return (
    <div
      className={className}
      style={{ position: 'relative', display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#e4e6ee', color: '#23262b', overflow: 'hidden' }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        <div
          style={{
            backgroundImage: [
              'radial-gradient(ellipse at 15% 0%, rgba(255, 255, 255, 0.85) 0%, transparent 55%)',
              'radial-gradient(ellipse at 90% 100%, rgba(166, 177, 198, 0.35) 0%, transparent 60%)',
            ].join(', '),
            maskImage: showRadialGradient
              ? 'radial-gradient(ellipse at 50% 50%, black 55%, transparent 100%)'
              : undefined,
            WebkitMaskImage: showRadialGradient
              ? 'radial-gradient(ellipse at 50% 50%, black 55%, transparent 100%)'
              : undefined,
            position: 'absolute',
            inset: 0,
          }}
        />
      </div>
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
        {children}
      </div>
    </div>
  );
}
