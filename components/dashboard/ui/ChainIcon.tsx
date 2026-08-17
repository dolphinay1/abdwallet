'use client';

import React from 'react';
import type { Chain } from '@/lib/chains';
import { CoinIcon } from './CoinIcon';

const BASE_SVG_PATH = 'M256 128C256 198.692 198.592 256 127.777 256C60.5909 256 5.47394 204.417 0 138.759H169.482V117.24H0C5.47394 51.583 60.5909 0 127.777 0C198.592 0 256 57.3074 256 128Z';

export function ChainIcon({ chain, size = 40, inset = false }: { chain: Chain; size?: number; inset?: boolean }) {
  if (chain.id === 8453 || chain.id === 84532) {
    const inner = inset ? Math.round(size * 0.66) : size;
    return (
      <div style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        overflow: 'hidden',
        ...(inset ? {
          background: '#e4e6ee',
          boxShadow: 'inset 3px 3px 6px rgba(166,177,198,0.5), inset -3px -3px 6px rgba(255,255,255,0.9)',
        } : {}),
      }}>
        <svg width={inner} height={inner} viewBox="0 0 256 256" fill="none">
          <path fillRule="evenodd" clipRule="evenodd" d={BASE_SVG_PATH} fill="#0052FF" />
        </svg>
      </div>
    );
  }
  return <CoinIcon symbol={chain.shortName} color={chain.color} logoUrl={chain.logoUrl} size={size} label={chain.shortName} inset={inset} />;
}
