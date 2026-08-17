'use client';
// Adapted from TempWallets/temp-wallets-website marquee-cards.tsx

import React from 'react';
import { CHAINS } from '@/lib/chains';

interface ChainPillProps {
  color: string;
  shortName: string;
  name: string;
}

function ChainPill({ color, shortName, name }: ChainPillProps) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '5px 12px',
        borderRadius: 20,
        background: '#e4e6ee',
        boxShadow: '3px 3px 6px rgba(166,177,198,0.55), -3px -3px 6px rgba(255,255,255,0.9)',
        flexShrink: 0,
        whiteSpace: 'nowrap',
      }}
    >
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2b2d33', flexShrink: 0 }} />
      <span style={{ color: '#23262b', fontSize: 10, fontWeight: 600 }}>{shortName}</span>
      <span style={{ color: '#8a8f98', fontSize: 9 }}>{name}</span>
    </div>
  );
}

interface MarqueeRowProps {
  chains: typeof CHAINS;
  reverse?: boolean;
  speed?: number;
}

function MarqueeRow({ chains, reverse = false, speed = 30 }: MarqueeRowProps) {
  // Duplicate chains for seamless loop
  const items = [...chains, ...chains];

  return (
    <div style={{ overflow: 'hidden', position: 'relative' }}>
      <div
        style={{
          display: 'flex',
          gap: 8,
          animation: `marquee-${reverse ? 'reverse' : 'forward'} ${speed}s linear infinite`,
          width: 'max-content',
        }}
      >
        {items.map((c, i) => (
          <ChainPill key={`${c.id}-${i}`} color={c.color} shortName={c.shortName} name={c.name} />
        ))}
      </div>
      <style>{`
        @keyframes marquee-forward {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes marquee-reverse {
          0%   { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

export function ChainMarquee() {
  const half = Math.ceil(CHAINS.length / 2);
  const row1 = CHAINS.slice(0, half);
  const row2 = CHAINS.slice(half);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden', padding: '2px 0', position: 'relative' }}>
      {/* Fade edges */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
        background: 'linear-gradient(to right, #e4e6ee 0%, transparent 12%, transparent 88%, #e4e6ee 100%)',
      }} />
      <MarqueeRow chains={row1} speed={28} />
      <MarqueeRow chains={row2} reverse speed={32} />
    </div>
  );
}
