'use client';

import React from 'react';
import { AlertTriangle, AlertCircle, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { springs, variants } from '@/lib/animations';

export type WarningType =
  | 'send-large'
  | 'wipe'
  | 'new-wallet'
  | 'non-evm-first'
  | 'transfer-confirm'
  | 'delete-wallet'
  // Wallet-disabling actions — every one of these can cut access to the
  // wallet that is currently open, so they must be confirmed explicitly.
  | 'switch-wallet'
  | 'restore-wallet'
  | 'disable-persistent'
  | 'clear-history'
  | 'remove-saved-vault'
  | 'lock-session'
  | 'import-wallet';

interface WarningBannerProps {
  type: WarningType;
  onConfirm: () => void;
  onCancel?: () => void;
  data?: { amount?: number; coin?: string; address?: string; chain?: string };
  inline?: boolean; // true = no backdrop overlay
}

const MESSAGES: Record<WarningType, { icon: React.ReactNode; title: string; body: (d?: WarningBannerProps['data']) => string; confirmLabel: string; confirmDanger?: boolean }> = {
  'send-large': {
    icon: <AlertTriangle size={18} color="#23262b" />,
    title: 'Large Transfer',
    body: (d) => `You're about to send $${(d?.amount ?? 0).toFixed(2)} worth of ${d?.coin ?? 'crypto'}. Double-check the recipient address — transactions cannot be reversed.`,
    confirmLabel: 'Proceed',
    confirmDanger: true,
  },
  'wipe': {
    icon: <AlertTriangle size={18} color="#b91c1c" />,
    title: 'Wipe Wallet',
    body: () => 'Warning: this permanently erases every key from memory. If you have not saved your vault or written down your seed phrase, this wallet and any funds in it are gone for good.',
    confirmLabel: 'Wipe',
    confirmDanger: true,
  },
  'new-wallet': {
    icon: <AlertCircle size={18} color="#23262b" />,
    title: 'New Wallet',
    body: () => 'Warning: creating a new wallet closes the wallet you are using now. If it has not been saved, its keys are wiped from memory and cannot be recovered by anyone. Save the current wallet first if you may need it again.',
    confirmLabel: 'Create New',
    confirmDanger: true,
  },
  'non-evm-first': {
    icon: <AlertCircle size={18} color="var(--theme-accent)" />,
    title: 'Non-EVM Blockchain',
    body: (d) => `${d?.chain ?? 'This'} is a separate blockchain from Ethereum. It uses a different address format and different transaction fees. Your seed phrase works on both, but the addresses are different.`,
    confirmLabel: 'Got it',
  },
  'transfer-confirm': {
    icon: <AlertTriangle size={18} color="#b91c1c" />,
    title: 'Confirm Transfer',
    body: (d) => `Transfer ${d?.coin ?? ''} to ${d?.address ? `${d.address.slice(0, 8)}…${d.address.slice(-4)}` : 'another wallet'}? This is an on-chain transaction with network fees.`,
    confirmLabel: 'Confirm Transfer',
    confirmDanger: true,
  },
  'delete-wallet': {
    icon: <AlertTriangle size={18} color="#b91c1c" />,
    title: 'Remove Wallet',
    body: () => 'Warning: removing this wallet from history is permanent. Unless it is saved to a vault, its keys cannot be recovered by anyone — including you — and any funds it holds will be lost forever.',
    confirmLabel: 'Remove',
    confirmDanger: true,
  },
  'switch-wallet': {
    icon: <AlertTriangle size={18} color="#b91c1c" />,
    title: 'Switch Wallet',
    body: () => 'Warning: switching wallets closes the wallet you are using right now. If it has not been saved, its keys are wiped from memory and cannot be restored. Save it first if you still need access.',
    confirmLabel: 'Switch Anyway',
    confirmDanger: true,
  },
  'restore-wallet': {
    icon: <AlertTriangle size={18} color="#b91c1c" />,
    title: 'Restore Saved Wallet',
    body: () => 'Warning: restoring a saved wallet replaces the active session. Any unsaved wallet currently open will be wiped from memory permanently. Continue only if the current wallet is saved or empty.',
    confirmLabel: 'Restore',
    confirmDanger: true,
  },
  'disable-persistent': {
    icon: <AlertTriangle size={18} color="#b91c1c" />,
    title: 'Disable Persistent Mode',
    body: () => 'Warning: disabling persistent mode deletes the encrypted vault stored in this browser. Without your seed phrase written down, this wallet becomes unrecoverable the moment the session ends.',
    confirmLabel: 'Disable',
    confirmDanger: true,
  },
  'clear-history': {
    icon: <AlertTriangle size={18} color="#b91c1c" />,
    title: 'Clear Wallet History',
    body: () => 'Warning: this erases every wallet listed in your history. Unsaved wallets are gone for good — there is no undo and no backup on our side.',
    confirmLabel: 'Clear All',
    confirmDanger: true,
  },
  'remove-saved-vault': {
    icon: <AlertTriangle size={18} color="#b91c1c" />,
    title: 'Delete Saved Vault',
    body: () => 'Warning: deleting this saved vault removes the only encrypted copy stored in this browser. If you have not written down the seed phrase, the wallet and its funds are lost permanently.',
    confirmLabel: 'Delete Vault',
    confirmDanger: true,
  },
  'lock-session': {
    icon: <AlertTriangle size={18} color="#b91c1c" />,
    title: 'End Session',
    body: () => 'Warning: ending the session clears all keys from memory. Any wallet that has not been saved will be unrecoverable after this point.',
    confirmLabel: 'End Session',
    confirmDanger: true,
  },
  'import-wallet': {
    icon: <AlertTriangle size={18} color="#b91c1c" />,
    title: 'Import Wallet',
    body: () => 'Warning: importing a seed phrase replaces the wallet currently open. If that wallet is unsaved, it will be wiped from memory and cannot be brought back.',
    confirmLabel: 'Import',
    confirmDanger: true,
  },
};

export function WarningBanner({ type, onConfirm, onCancel, data, inline = false }: WarningBannerProps) {
  const msg = MESSAGES[type];

  const content = (
    <motion.div
      variants={variants.modalEnter}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={springs.bouncy}
      style={{
        background: '#e4e6ee',
        borderRadius: '1.5rem',
        boxShadow: '9px 9px 18px rgba(166,177,198,0.55), -9px -9px 18px rgba(255,255,255,0.9)',
        padding: '1rem',
        maxWidth: 360,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        color: '#23262b',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
        <div style={{ flexShrink: 0, marginTop: 2 }}>{msg.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.25rem' }}>{msg.title}</div>
          <div style={{ fontSize: '0.8rem', color: '#8a8f98', lineHeight: 1.5 }}>{msg.body(data)}</div>
        </div>
        {onCancel && (
          <button onClick={onCancel} style={{ background: 'none', border: 'none', color: '#8a8f98', cursor: 'pointer', flexShrink: 0 }}>
            <X size={16} />
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {onCancel && (
          <button onClick={onCancel}
            style={{ flex: 1, padding: '0.5rem', background: '#e4e6ee', boxShadow: '4px 4px 8px rgba(166,177,198,0.55), -4px -4px 8px rgba(255,255,255,0.9)', border: 'none', borderRadius: '9999px', color: '#23262b', cursor: 'pointer', fontSize: '0.82rem' }}>
            Cancel
          </button>
        )}
        <button onClick={onConfirm}
          style={{ flex: 1, padding: '0.5rem', background: msg.confirmDanger ? '#b91c1c' : '#2b2d33', border: 'none', borderRadius: '9999px', color: '#f5f6fa', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', boxShadow: '4px 4px 8px rgba(166,177,198,0.55), -4px -4px 8px rgba(255,255,255,0.9)' }}>
          <Check size={13} />
          {msg.confirmLabel}
        </button>
      </div>
    </motion.div>
  );

  if (inline) return content;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(228,230,238,0.7)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={(e) => { if (e.target === e.currentTarget && onCancel) onCancel(); }}
    >
      {content}
    </motion.div>
  );
}

// Lightweight inline alert strip (no buttons)
export function InlineWarning({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#e4e6ee', boxShadow: 'inset 4px 4px 8px rgba(166,177,198,0.5), inset -4px -4px 8px rgba(255,255,255,0.9)', borderRadius: '9999px', padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: '#23262b' }}>
      <AlertTriangle size={13} color="#23262b" />
      {children}
    </div>
  );
}
