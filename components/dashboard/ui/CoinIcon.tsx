'use client';

import React, { useState } from 'react';

export function CoinIcon({ symbol, color, logoUrl, size = 34, label, inset = false }: {
  symbol: string;
  color: string;
  logoUrl?: string;
  size?: number;
  label?: string;
  inset?: boolean;
}) {
  const [err1, setErr1] = useState(false);
  const [err2, setErr2] = useState(false);
  const cdn = `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/${symbol.toLowerCase()}.png`;
  const src = (!err1 && logoUrl) ? logoUrl : (!err2 ? cdn : null);
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
      {src ? (
        <img
          src={src}
          alt={symbol}
          width={inner}
          height={inner}
          style={{ borderRadius: '50%', objectFit: 'cover' }}
          onError={() => {
            if (!err1 && logoUrl) {
              setErr1(true);
            } else {
              setErr2(true);
            }
          }}
        />
      ) : (
        <div style={{
          width: inner,
          height: inner,
          background: 'rgba(43,45,51,0.08)',
          border: '1px solid rgba(43,45,51,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
        }}>
          <span style={{ color: '#2b2d33', fontSize: inner * 0.28, fontWeight: 800, lineHeight: 1 }}>
            {(label ?? symbol).slice(0, 3)}
          </span>
        </div>
      )}
    </div>
  );
}
