'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { springs } from '@/lib/animations';
import { upperEn } from '@/lib/text';
import type { Chain } from '@/lib/chains';
import type { WalletSnapshot } from '@/lib/wallet-history';
import { NON_EVM_META, type NonEvmMeta } from '../types';

export function WalletHistorySection({
  walletHistory,
  currentHistoryId,
  selectedNonEvm,
  selectedChain,
  isSavingVault,
  onSwitch,
  onSave,
  onDelete,
  onOpenAdvanced,
}: {
  walletHistory: WalletSnapshot[];
  currentHistoryId: string | null;
  selectedNonEvm: string | null;
  selectedChain: Chain;
  isSavingVault: boolean;
  onSwitch: (snap: WalletSnapshot) => void;
  onSave: (snap: WalletSnapshot, isCurrent: boolean) => void;
  onDelete: (id: string) => void;
  onOpenAdvanced: () => void;
}) {
  if (walletHistory.length === 0) return null;

  return (
    <div style={{ paddingTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span className="russo-one-regular" style={{ fontSize: 9, fontWeight: 400, color: 'rgba(166,177,198,0.3)', letterSpacing: '0.15em' }}>
          {upperEn('Wallet History')}
        </span>
        <div style={{ flex: 1, height: 1, background: 'rgba(166,177,198,0.06)' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        <AnimatePresence>
          {walletHistory.map((snap, i) => {
            const isCurrent = snap.id === currentHistoryId;
            const liveNonEvm: NonEvmMeta | null = isCurrent && selectedNonEvm ? NON_EVM_META[selectedNonEvm] : null;
            const liveChain: Chain | null = isCurrent && !selectedNonEvm ? selectedChain : null;
            const dispLogo = liveNonEvm?.logoUrl ?? liveChain?.logoUrl ?? snap.chainLogo;
            const dispName = liveNonEvm?.name ?? liveChain?.name ?? snap.chainName ?? '';
            
            const badgeText = isCurrent ? 'Active' : (snap.isSaved ? 'Saved' : 'Temp');
            const badgeColor = isCurrent ? '#059669' : (snap.isSaved ? '#3b82f6' : '#8a8f98');

            return (
              <motion.div
                key={snap.id}
                className="dapp-tile"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ ...springs.smooth, delay: i * 0.03 }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  padding: '12px 6px',
                  background: isCurrent ? 'rgba(43,45,51,0.04)' : 'transparent',
                  borderRadius: '1rem',
                  cursor: isCurrent ? 'default' : 'pointer',
                  position: 'relative',
                }}
                onClick={() => {
                  if (!isCurrent) onSwitch(snap);
                }}
              >
                {/* Action Button: Delete (Top Right) */}
                <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 4 }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(snap.id);
                    }}
                    style={{
                      background: 'none', border: 'none', padding: 2, color: '#8a8f98', cursor: 'pointer', borderRadius: '50%', display: 'flex', alignItems: 'center'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#b91c1c')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#8a8f98')}
                  >
                    <X size={12} strokeWidth={3} />
                  </button>
                </div>

                {/* Action Button: Save (only the active wallet has recoverable key material) */}
                {isCurrent && !snap.isSaved && (
                  <div 
                    style={{ 
                      position: 'absolute', 
                      ...(typeof window !== 'undefined' && window.self !== window.top 
                        ? { top: 4, left: 4 } 
                        : { bottom: 8, left: 8 }) 
                    }}
                  >
                    <button
                      disabled={isSavingVault}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSave(snap, isCurrent);
                      }}
                      style={{
                        background: 'none', border: 'none', padding: 2, color: '#8a8f98', cursor: isSavingVault ? 'not-allowed' : 'pointer', borderRadius: '50%', display: 'flex', alignItems: 'center'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#059669')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#8a8f98')}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: typeof window !== 'undefined' && window.self !== window.top ? 15 : 18 }}>save</span>
                    </button>
                  </div>
                )}

                {/* Circular Icon */}
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: '#e4e6ee',
                    boxShadow: 'inset 3px 3px 6px rgba(166,177,198,0.5), inset -3px -3px 6px rgba(255,255,255,0.9)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    overflow: 'hidden',
                  }}
                >
                  {dispLogo ? (
                    <img src={dispLogo} alt={dispName} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#8a8f98' }}>
                      account_balance_wallet
                    </span>
                  )}
                </div>

                {/* Name & Badge */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: '100%' }}>
                  <span
                    className="russo-one-regular"
                    style={{
                      color: '#23262b',
                      fontSize: 10,
                      fontWeight: 400,
                      textAlign: 'center',
                      lineHeight: 1.2,
                      width: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      letterSpacing: '0.02em'
                    }}
                    title={snap.shortAddress}
                  >
                    {dispName || snap.shortAddress}
                  </span>
                  <span
                    className="russo-one-regular"
                    style={{
                      fontSize: 7,
                      fontWeight: 400,
                      padding: '2px 7px',
                      borderRadius: 99,
                      background: `${badgeColor}14`,
                      color: badgeColor,
                      letterSpacing: '0.06em'
                    }}
                  >
                    {badgeText}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div style={{ paddingTop: 8, textAlign: 'center' }}>
        <button
          onClick={onOpenAdvanced}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#8a8f98',
            fontSize: 10,
            fontWeight: 400,
            letterSpacing: '0.05em',
            transition: 'color 0.2s',
          }}
          className="russo-one-regular"
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = '#2b2d33';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = '#8a8f98';
          }}
        >
          Didn&apos;t find what you&apos;re looking for? Try Advanced Mode →
        </button>
      </div>
    </div>
  );
}
