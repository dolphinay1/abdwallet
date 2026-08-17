'use client';

import React, { useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import type { Chain } from '@/lib/chains';
import type { WalletSnapshot } from '@/lib/wallet-history';
import type { NonEvmMeta } from '../types';

export function SavedVaultsModal({
  vaults,
  currentId,
  onSwitch,
  onDelete,
  onClose,
  liveNonEvm,
  liveChain,
}: {
  vaults: WalletSnapshot[];
  currentId: string | null;
  onSwitch: (snap: WalletSnapshot) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  liveNonEvm: NonEvmMeta | null;
  liveChain: Chain;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const saved = vaults.filter((s) => s.isSaved);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
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
          width: 400,
          maxWidth: '92vw',
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
            className="russo-one-regular"
            style={{
              color: '#23262b',
              fontSize: 20,
              fontWeight: 400,
              fontStyle: 'normal',
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
            }}
          >
            Saved Vaults
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
        <div style={{ padding: '12px 16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {saved.length === 0 ? (
            <p style={{ color: '#8a8f98', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
              No saved vaults yet.
              <br />
              Use Save on a wallet in the history section.
            </p>
          ) : (
            saved.map((snap) => {
              const isCurrent = snap.id === currentId;
              const dispLogo = isCurrent ? (liveNonEvm?.logoUrl ?? liveChain.logoUrl ?? snap.chainLogo) : snap.chainLogo;
              const dispName = isCurrent ? (liveNonEvm?.name ?? liveChain.name ?? snap.chainName ?? '') : (snap.chainName ?? '');
              return (
                <div
                  key={snap.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    background: isCurrent ? 'rgba(43,45,51,0.07)' : 'rgba(166,177,198,0.03)',
                    border: isCurrent ? '1.5px solid rgba(43,45,51,0.3)' : '1px solid rgba(166,177,198,0.07)',
                    borderRadius: 24,
                    padding: '12px 14px',
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: isCurrent ? 'rgba(43,45,51,0.12)' : 'rgba(166,177,198,0.06)',
                      border: `1px solid ${isCurrent ? 'rgba(43,45,51,0.3)' : 'rgba(166,177,198,0.08)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      overflow: 'hidden',
                    }}
                  >
                    {dispLogo ? (
                      <img src={dispLogo} alt={dispName} style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: isCurrent ? '#2b2d33' : '#8a8f98' }}>
                        account_balance_wallet
                      </span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: isCurrent ? '#2b2d33' : '#23262b', fontSize: 12, fontWeight: 700, margin: 0, fontFamily: 'monospace' }}>
                      {snap.shortAddress}
                    </p>
                    <p style={{ color: '#8a8f98', fontSize: 10, margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {dispName && (
                        <span style={{ color: isCurrent ? '#2b2d33' : '#8a8f98', fontWeight: 900, textTransform: 'uppercase', fontSize: 8, letterSpacing: '0.08em' }}>
                          {dispName}
                        </span>
                      )}
                      <span>{snap.vaultMode === 'PERSISTENT' ? 'Persistent' : 'Ephemeral'}</span>
                      {isCurrent && (
                        <span style={{ color: '#2b2d33', fontWeight: 900, textTransform: 'uppercase', fontSize: 8, letterSpacing: '0.1em' }}>
                          · Active
                        </span>
                      )}
                    </p>
                  </div>
                  {!isCurrent && (
                    <button
                      onClick={() => onSwitch(snap)}
                      style={{
                        flexShrink: 0,
                        background: '#2b2d33',
                        border: 'none',
                        borderRadius: 999,
                        padding: '6px 14px',
                        color: '#e4e6ee',
                        fontSize: 11,
                        fontWeight: 900,
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}
                    >
                      Switch
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(snap.id)}
                    style={{
                      flexShrink: 0,
                      background: 'rgba(255,100,100,0.07)',
                      border: '1px solid rgba(255,100,100,0.15)',
                      borderRadius: 999,
                      padding: '6px 8px',
                      cursor: 'pointer',
                      color: '#b91c1c',
                      display: 'flex',
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
