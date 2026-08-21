'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { springs } from '@/lib/animations';
import { upperEn } from '@/lib/text';
import type { Chain } from '@/lib/chains';
import { MAX_UNSAVED_HISTORY, type WalletSnapshot } from '@/lib/wallet-history';
import { useWallet } from '@/context/WalletContext';
import { SeedVerificationModal } from '@/components/SeedVerificationModal';
import { SeedBackupModal } from '@/components/SeedBackupModal';
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
  onSwitch: (snap: WalletSnapshot) => Promise<void> | void;
  onSave: (snap: WalletSnapshot, isCurrent: boolean) => void;
  onDelete: (id: string) => void;
  onOpenAdvanced: () => void;
}) {
  const wallet = useWallet();
  // Backup + verification state lives in component memory only and is wiped on close.
  const [revealSave, setRevealSave] = useState<{ snap: WalletSnapshot; isCurrent: boolean } | null>(null);
  const [pendingSave, setPendingSave] = useState<{ snap: WalletSnapshot; isCurrent: boolean } | null>(null);
  const [verifyWords, setVerifyWords] = useState<string[]>([]);
  const [isPreparingVerify, setIsPreparingVerify] = useState(false);

  const closeVerification = () => {
    setRevealSave(null);
    setPendingSave(null);
    setVerifyWords([]);
    setIsPreparingVerify(false);
  };

  // Saving a wallet to the vault is a two-step gate:
  //   1. reveal every recovery word so the user can write them down (SeedBackupModal)
  //   2. make them prove it by re-typing 2 random words (SeedVerificationModal)
  const requestSave = async (snap: WalletSnapshot, isCurrent: boolean) => {
    if (isPreparingVerify || revealSave || pendingSave) return;
    setIsPreparingVerify(true);
    try {
      const mnemonic = await wallet.getMnemonicForExport();
      const words = mnemonic ? mnemonic.trim().split(/\s+/).filter(Boolean) : [];
      if (words.length >= 12) {
        setVerifyWords(words);
        setRevealSave({ snap, isCurrent });
        setIsPreparingVerify(false);
        return;
      }
    } catch {
      // fall through — verification is impossible without the phrase
    }
    // Recovery phrase unavailable (locked/imported session): save without the challenge
    // rather than blocking the user from protecting their wallet.
    setIsPreparingVerify(false);
    onSave(snap, isCurrent);
  };

  // Step 1 → step 2: the user pressed Save under the revealed phrase.
  const handleBackupConfirmed = () => {
    if (!revealSave) return;
    setPendingSave(revealSave);
    setRevealSave(null);
  };

  const handleVerified = async () => {
    const pending = pendingSave;
    closeVerification();
    if (pending) onSave(pending.snap, pending.isCurrent);
  };

  if (walletHistory.length === 0) return null;

  const handleCardClick = async (snap: WalletSnapshot) => {
    const isCurrent = snap.id === currentHistoryId;
    if (isCurrent) return;
    if (!snap.isSaved) {
      alert('This was a temporary ephemeral session and was not saved to vault.');
      return;
    }
    try {
      await onSwitch(snap);
    } catch (err) {
      console.error('Failed to switch wallet:', err);
      alert('Could not switch to this saved wallet.');
    }
  };

  return (
    <div style={{ paddingTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span className="russo-one-regular" style={{ fontSize: 9, fontWeight: 400, color: 'rgba(166,177,198,0.3)', letterSpacing: '0.15em' }}>
          {upperEn('Wallet History')}
        </span>
        <span
          className="russo-one-regular"
          style={{ fontSize: 7.5, fontWeight: 400, color: '#8a8f98', letterSpacing: '0.12em', whiteSpace: 'nowrap', opacity: 0.75 }}
          title={`Only ${MAX_UNSAVED_HISTORY} unsaved wallets are kept in history. Saved wallets are never removed.`}
        >
          {upperEn(`Max ${MAX_UNSAVED_HISTORY} unsaved wallets \u00b7 saved wallets are kept`)}
        </span>
        <div style={{ flex: 1, height: 1, background: 'rgba(166,177,198,0.06)' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        <AnimatePresence mode="popLayout">
          {walletHistory.map((snap, i) => {
            const isCurrent = snap.id === currentHistoryId;
            const liveNonEvm: NonEvmMeta | null = isCurrent && selectedNonEvm ? NON_EVM_META[selectedNonEvm] : null;
            const liveChain: Chain | null = isCurrent && !selectedNonEvm ? selectedChain : null;
            const dispLogo = liveNonEvm?.logoUrl ?? liveChain?.logoUrl ?? snap.chainLogo;
            const dispName = liveNonEvm?.name ?? liveChain?.name ?? snap.chainName ?? '';
            
            const badgeText = isCurrent ? 'Active' : (snap.isSaved ? 'Saved' : 'Temp');

            return (
              <motion.div
                key={snap.id}
                layout
                className={isCurrent ? 'neu-inset' : 'dapp-tile'}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  filter: 'blur(0px)',
                  transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
                }}
                exit={{
                  opacity: 0,
                  scale: 0.75,
                  filter: 'blur(5px)',
                  transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
                }}
                transition={{
                  layout: { duration: 0.95, ease: [0.16, 1, 0.3, 1] },
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  padding: '22px 6px 12px',
                  borderRadius: '1.25rem',
                  cursor: isCurrent ? 'default' : 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onClick={() => handleCardClick(snap)}
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

                {/* Action Button: Save — TOP-LEFT of the capsule (mirrors the delete icon) */}
                {isCurrent && !snap.isSaved && (
                  <div style={{ position: 'absolute', top: 4, left: 4 }}>
                    <button
                      disabled={isSavingVault || isPreparingVerify}
                      onClick={(e) => {
                        e.stopPropagation();
                        void requestSave(snap, isCurrent);
                      }}
                      style={{
                        background: 'none', border: 'none', padding: 2, color: '#8a8f98', cursor: isSavingVault || isPreparingVerify ? 'not-allowed' : 'pointer', borderRadius: '50%', display: 'flex', alignItems: 'center'
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

                {/* Name & Status Indicator */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, width: '100%' }}>
                  <span
                    className="sf-display-black"
                    style={{
                      color: '#23262b',
                      fontSize: 11,
                      fontWeight: 800,
                      textAlign: 'center',
                      lineHeight: 1.2,
                      width: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      letterSpacing: '-0.01em',
                      transition: 'color 0.2s',
                    }}
                    title={snap.shortAddress}
                  >
                    {dispName || snap.shortAddress}
                  </span>

                  {/* Refined Soft Dark SWITCH Status Capsule */}
                  <div
                    className={
                      isCurrent
                        ? 'neu-pill-active'
                        : snap.isSaved
                        ? 'neu-pill-saved'
                        : 'neu-pill-temp'
                    }
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '3px 10px',
                      fontSize: 9,
                      transition: 'all 0.2s',
                    }}
                  >
                    <span>{badgeText}</span>
                  </div>
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

      {/* Step 1 — reveal every recovery word, then Confirm Save Wallet → Save */}
      <SeedBackupModal
        isOpen={!!revealSave}
        words={verifyWords}
        isBusy={isSavingVault}
        onConfirm={handleBackupConfirmed}
        onCancel={closeVerification}
      />

      {/* Step 2 — seed-phrase verification gate before a wallet is written to the vault */}
      <SeedVerificationModal
        isOpen={!!pendingSave}
        words={verifyWords}
        isBusy={isSavingVault}
        title="Verify Before Saving"
        subtitle="Confirm you backed up your recovery phrase"
        confirmLabel="Confirm & Save Wallet"
        onVerified={handleVerified}
        onCancel={closeVerification}
      />
    </div>
  );
}
