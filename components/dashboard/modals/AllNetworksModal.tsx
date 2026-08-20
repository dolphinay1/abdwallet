'use client';

import React from 'react';
import { X } from 'lucide-react';
import { CHAINS, type Chain } from '@/lib/chains';
import { ChainIcon } from '../ui/ChainIcon';
import { CoinIcon } from '../ui/CoinIcon';
import { NON_EVM_META } from '../types';

export function AllNetworksModal({
  selected,
  onSelect,
  selectedNonEvm,
  onSelectNonEvm,
  onClose,
}: {
  selected: Chain;
  onSelect: (c: Chain) => void;
  selectedNonEvm: string | null;
  onSelectNonEvm: (coin: string) => void;
  onClose: () => void;
}) {
  const smart = CHAINS.filter((c) => c.isAlchemy && !c.isTestnet);
  const eoa = CHAINS.filter((c) => !c.isAlchemy && !c.isTestnet);
  const testnets = CHAINS.filter((c) => c.isTestnet);

  const ChainCard = ({ c }: { c: Chain }) => {
    const isActive = !selectedNonEvm && selected.id === c.id;
    return (
      <button
        onClick={() => {
          onSelect(c);
          onClose();
        }}
        className={isActive ? 'neu-inset' : ''}
        style={{
          background: isActive ? undefined : 'rgba(166,177,198,0.03)',
          border: isActive ? undefined : '1px solid rgba(166,177,198,0.06)',
          borderRadius: '1.25rem',
          padding: '12px 8px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 0.15s',
          width: '100%',
        }}
      >
        <ChainIcon chain={c} size={44} inset />
        <span className="sf-display-black" style={{ color: '#1e293b', fontSize: 12, fontWeight: 900, letterSpacing: '-0.01em' }}>{c.symbol}</span>
        <span className="sf-bold" style={{ color: '#64748b', fontSize: 10, fontWeight: 700 }}>{c.name}</span>
        {c.isTestnet ? (
          <span
            className="neu-badge-inset sf-display-black"
            style={{
              color: '#475569',
              fontSize: 8.5,
              padding: '3px 8px',
              borderRadius: 9999,
              fontWeight: 900,
              letterSpacing: '0.06em',
            }}
          >
            TESTNET
          </span>
        ) : c.isAlchemy ? (
          <span
            className="neu-badge-inset sf-display-black"
            style={{
              color: '#047857',
              fontSize: 8.5,
              padding: '3px 8px',
              borderRadius: 9999,
              fontWeight: 900,
              letterSpacing: '0.06em',
            }}
          >
            GASLESS
          </span>
        ) : (
          <span
            className="neu-badge-inset sf-display-black"
            style={{
              color: '#334155',
              fontSize: 8.5,
              padding: '3px 8px',
              borderRadius: 9999,
              fontWeight: 900,
              letterSpacing: '0.06em',
            }}
          >
            EOA
          </span>
        )}
      </button>
    );
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="popup-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(166,177,198,0.88)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        className="popup-enter"
        style={{
          background: '#e4e6ee',
          boxShadow: '9px 9px 18px rgba(166,177,198,0.55), -9px -9px 18px rgba(255,255,255,0.9)',
          borderRadius: '2rem',
          width: 380,
          maxWidth: '92vw',
          maxHeight: '82vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px 14px',
            borderBottom: '1px solid rgba(166,177,198,0.08)',
          }}
        >
          <span
            className="sf-display-black"
            style={{
              color: '#1e293b',
              fontSize: 20,
              fontWeight: 900,
              fontStyle: 'normal',
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
            }}
          >
            All Networks
          </span>
          <button
            onClick={onClose}
            style={{
              color: '#23262b',
              background: '#e4e6ee',
              boxShadow: '3px 3px 6px rgba(166,177,198,0.55), -3px -3px 6px rgba(255,255,255,0.9)',
              border: 'none',
              borderRadius: '0.75rem',
              padding: 8,
              cursor: 'pointer',
              display: 'flex',
            }}
          >
            <X size={16} />
          </button>
        </div>
        <div style={{ overflowY: 'auto', padding: '16px 24px', flex: 1 }}>
          <p
            className="sf-display-black"
            style={{
              color: '#475569',
              fontSize: 10,
              letterSpacing: '0.1em',
              fontWeight: 800,
              marginBottom: 12,
              textTransform: 'uppercase',
            }}
          >
            Smart Wallets (Gasless)
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
            {smart.map((c) => (
              <ChainCard key={c.id} c={c} />
            ))}
          </div>
          <p
            className="sf-display-black"
            style={{
              color: '#475569',
              fontSize: 10,
              letterSpacing: '0.1em',
              fontWeight: 800,
              marginBottom: 12,
              textTransform: 'uppercase',
            }}
          >
            EOA Wallets
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
            {eoa.map((c) => (
              <ChainCard key={c.id} c={c} />
            ))}
          </div>
          <p
            className="sf-display-black"
            style={{
              color: '#475569',
              fontSize: 10,
              letterSpacing: '0.1em',
              fontWeight: 800,
              marginBottom: 12,
              textTransform: 'uppercase',
            }}
          >
            Testnets (Free)
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
            {testnets.map((c) => (
              <ChainCard key={c.id} c={c} />
            ))}
          </div>
          <p
            className="russo-one-regular"
            style={{
              color: '#23262b',
              fontSize: 9,
              letterSpacing: '0.15em',
              fontWeight: 400,
              marginBottom: 12,
              textTransform: 'uppercase',
            }}
          >
            Non-EVM Chains
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
            {Object.values(NON_EVM_META).map((m) => {
              const isActive = selectedNonEvm === m.coin;
              return (
                <button
                  key={m.coin}
                  onClick={() => {
                    onSelectNonEvm(m.coin);
                    onClose();
                  }}
                  className={isActive ? 'neu-inset' : ''}
                  style={{
                    background: isActive ? undefined : 'rgba(166,177,198,0.03)',
                    border: isActive ? undefined : '1px solid rgba(166,177,198,0.06)',
                    borderRadius: '1.25rem',
                    padding: '12px 8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.15s',
                    width: '100%',
                  }}
                >
                  <CoinIcon symbol={m.symbol} color={m.color} logoUrl={m.logoUrl} size={44} inset />
                  <span className="sf-display-black" style={{ color: '#1e293b', fontSize: 12, fontWeight: 900, letterSpacing: '-0.01em' }}>{m.symbol}</span>
                  <span className="sf-bold" style={{ color: '#64748b', fontSize: 10, fontWeight: 700 }}>{m.name}</span>
                  <span
                    className="neu-badge-inset sf-display-black"
                    style={{
                      color: '#475569',
                      fontSize: 8.5,
                      padding: '3px 8px',
                      borderRadius: 9999,
                      fontWeight: 900,
                      letterSpacing: '0.06em',
                    }}
                  >
                    NON-EVM
                  </span>
                </button>
              );
            })}
          </div>
          <p style={{ color: '#5b6270', fontSize: 9, textAlign: 'center' }}>
            {CHAINS.length} EVM + {Object.keys(NON_EVM_META).length} non-EVM networks
          </p>
        </div>
      </div>
    </div>
  );
}
