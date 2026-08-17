'use client';

import React from 'react';
import { CHAINS, type Chain } from '@/lib/chains';
import { ChainIcon } from '../../ui/ChainIcon';
import type { TokenBalance } from '../../types';

export function NetworkTokenPicker({
  selectedChain,
  setSelectedChain,
  networkOpen,
  setNetworkOpen,
  selectedToken,
  setSelectedToken,
  tokenOpen,
  setTokenOpen,
  chainTokens,
  box,
}: {
  selectedChain: Chain;
  setSelectedChain: (c: Chain) => void;
  networkOpen: boolean;
  setNetworkOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedToken: TokenBalance | null;
  setSelectedToken: (t: TokenBalance | null) => void;
  tokenOpen: boolean;
  setTokenOpen: React.Dispatch<React.SetStateAction<boolean>>;
  chainTokens: TokenBalance[];
  box: React.CSSProperties;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {/* Network dropdown */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => {
            setNetworkOpen((o) => !o);
            setTokenOpen(false);
          }}
          style={{ ...box, width: '100%', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
        >
          <ChainIcon chain={selectedChain} size={22} />
          <span
            style={{
              flex: 1,
              fontSize: 11,
              fontWeight: 700,
              color: '#23262b',
              textAlign: 'left',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {selectedChain.name}
          </span>
          <svg
            width={12}
            height={12}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#8a8f98"
            strokeWidth={2.5}
            strokeLinecap="round"
            style={{ transform: networkOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {networkOpen && (
          <div
            className="popup-enter"
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              zIndex: 60,
              background: '#e4e6ee',
              border: '1px solid rgba(166,177,198,0.1)',
              borderRadius: '1rem',
              maxHeight: 220,
              overflowY: 'auto',
              boxShadow: '0 8px 32px rgba(166,177,198,0.6)',
            }}
          >
            {CHAINS.map((c) => {
              const active = c.id === selectedChain.id;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedChain(c);
                    setNetworkOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '9px 12px',
                    width: '100%',
                    border: 'none',
                    background: active ? 'rgba(43,45,51,0.08)' : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <ChainIcon chain={c} size={20} />
                  <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: active ? '#2b2d33' : '#8a8f98', textAlign: 'left' }}>
                    {c.name}
                  </span>
                  {active && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#2b2d33', flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Token dropdown */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => {
            setTokenOpen((o) => !o);
            setNetworkOpen(false);
          }}
          style={{ ...box, width: '100%', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
        >
          {selectedToken?.logo ? (
            <img src={selectedToken.logo} width={22} height={22} style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} alt={selectedToken.symbol} />
          ) : (
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: 'rgba(166,177,198,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 9,
                fontWeight: 900,
                color: '#23262b',
                flexShrink: 0,
              }}
            >
              {(selectedToken?.symbol ?? '?').slice(0, 2)}
            </div>
          )}
          <span
            style={{
              flex: 1,
              fontSize: 11,
              fontWeight: 700,
              color: '#23262b',
              textAlign: 'left',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {selectedToken?.symbol ?? 'Select'}
          </span>
          <svg
            width={12}
            height={12}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#8a8f98"
            strokeWidth={2.5}
            strokeLinecap="round"
            style={{ transform: tokenOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {tokenOpen && (
          <div
            className="popup-enter"
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              zIndex: 60,
              background: '#e4e6ee',
              border: '1px solid rgba(166,177,198,0.1)',
              borderRadius: '1rem',
              maxHeight: 200,
              overflowY: 'auto',
              boxShadow: '0 8px 32px rgba(166,177,198,0.6)',
            }}
          >
            {chainTokens.length === 0 ? (
              <p style={{ color: '#8a8f98', fontSize: 11, padding: '12px 14px', textAlign: 'center' }}>No tokens found</p>
            ) : (
              chainTokens.map((t, i) => {
                const active = selectedToken?.contractAddress === t.contractAddress;
                const bal = parseFloat(t.balance || '0');
                return (
                  <button
                    key={i}
                    onClick={() => {
                      setSelectedToken(t);
                      setTokenOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '9px 12px',
                      width: '100%',
                      border: 'none',
                      background: active ? 'rgba(166,177,198,0.06)' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    {t.logo ? (
                      <img src={t.logo} width={20} height={20} style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} alt={t.symbol} />
                    ) : (
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: 'rgba(166,177,198,0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 8,
                          fontWeight: 900,
                          color: '#23262b',
                          flexShrink: 0,
                        }}
                      >
                        {t.symbol.slice(0, 2)}
                      </div>
                    )}
                    <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: active ? '#2b2d33' : '#8a8f98', textAlign: 'left' }}>
                      {t.symbol}
                    </span>
                    <span style={{ fontSize: 9, color: '#8a8f98', fontWeight: 700 }}>
                      {bal > 0 ? (bal < 0.0001 ? '<0.0001' : bal.toFixed(4)) : '0'}
                    </span>
                    {active && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#2b2d33', flexShrink: 0 }} />}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
