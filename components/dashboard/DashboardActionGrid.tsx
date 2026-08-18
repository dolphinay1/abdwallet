'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { springs } from '@/lib/animations';
import type { LedgerEntry } from '@/lib/ledger';
import type { WalletSnapshot } from '@/lib/wallet-history';

export function DashboardActionGrid({
  walletUnlocked,
  walletHistory,
  setShowSavedVaults,
  extPresent,
  extAttached,
  extError,
  extAttaching,
  setShowPassphraseModal,
  activeLedger,
  setActiveLedger,
  selectedNonEvm,
  setShowWC,
  setShowSend,
  setShowNonEvmSend,
  setShowQR,
  setShowNewWalletWarning,
  mode,
  setShowSwap,
  setShowAddressBook,
  setShowLedger,
  setShowCustomChainModal,
  setShowCustomTokenModal,
  setShowCustomAPIModal,
  setShowTransfer,
  currentHistoryId,
  hasTokensOnChain,
}: {
  walletUnlocked: boolean;
  walletHistory: WalletSnapshot[];
  setShowSavedVaults: (v: boolean) => void;
  extPresent: boolean;
  extAttached: boolean;
  extError: string | null;
  extAttaching: boolean;
  setShowPassphraseModal: (v: boolean) => void;
  activeLedger: LedgerEntry | null;
  setActiveLedger: (entry: LedgerEntry | null) => void;
  selectedNonEvm: string | null;
  setShowWC: (v: boolean) => void;
  setShowSend: (v: boolean) => void;
  setShowNonEvmSend: (v: boolean) => void;
  setShowQR: (v: boolean) => void;
  setShowNewWalletWarning: (v: boolean) => void;
  mode: 'simple' | 'advanced';
  setShowSwap: (v: boolean) => void;
  setShowAddressBook: (v: boolean) => void;
  setShowLedger: (v: boolean) => void;
  setShowCustomChainModal: (v: boolean) => void;
  setShowCustomTokenModal: (v: boolean) => void;
  setShowCustomAPIModal: (v: boolean) => void;
  setShowTransfer: (v: boolean) => void;
  currentHistoryId: string | null;
  hasTokensOnChain: boolean;
}) {
  const savedVaultsCount = walletHistory.filter((s) => s.isSaved).length;
  const hasOtherSaved = walletHistory.filter((s) => s.isSaved && s.id !== currentHistoryId).length >= 1;

  return (
    <>
      {/* Saved Vaults switcher banner */}
      {walletUnlocked && savedVaultsCount > 0 && (
        <motion.button
          onClick={() => setShowSavedVaults(true)}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="w-full group bg-[#2b2d33] hover:bg-[#3a3d45] text-[#f5f6fa] p-5 md:p-7 rounded-full flex justify-between items-center transition-all shadow-[0_8px_30px_rgba(43,45,51,0.15)] active:scale-[0.98]"
        >
          <div className="flex items-center gap-4">
            <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
            <span className="text-sm russo-one-regular tracking-widest uppercase">
              {savedVaultsCount} Saved Vault{savedVaultsCount > 1 ? 's' : ''}
            </span>
          </div>
          <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">arrow_forward</span>
        </motion.button>
      )}

      {/* Extension banners */}
      {extPresent && !extAttached && walletUnlocked && typeof window !== 'undefined' && window.self === window.top && (
        <div
          style={{
            background: 'rgba(138,143,152,0.07)',
            border: '1px solid rgba(138,143,152,0.2)',
            borderRadius: 9999,
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div>
            <p style={{ color: '#8a8f98', fontSize: 12, fontWeight: 700, margin: 0 }}>ABD Wallet Extension detected</p>
            <p style={{ color: '#8a8f98', fontSize: 11, margin: '2px 0 0' }}>Connect to use it as a browser wallet for dApps</p>
          </div>
          <button
            onClick={() => setShowPassphraseModal(true)}
            disabled={extAttaching}
            style={{
              background: '#8a8f98',
              border: 'none',
              borderRadius: 999,
              color: '#23262b',
              fontSize: 11,
              fontWeight: 400,
              padding: '8px 16px',
              cursor: extAttaching ? 'not-allowed' : 'pointer',
              opacity: extAttaching ? 0.6 : 1,
              flexShrink: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
            className="russo-one-regular"
          >
            {extAttaching ? 'Attaching…' : 'Connect Extension'}
          </button>
        </div>
      )}
      {extError && extPresent && !extAttached && typeof window !== 'undefined' && window.self === window.top && (
        <p style={{ color: '#b91c1c', fontSize: 11, margin: '-4px 0 4px', padding: '0 4px' }}>{extError}</p>
      )}
      {extAttached && walletUnlocked && typeof window !== 'undefined' && window.self === window.top && (
        <div
          style={{
            background: 'rgba(43,45,51,0.05)',
            border: '1px solid rgba(43,45,51,0.15)',
            borderRadius: 9999,
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2b2d33', boxShadow: '0 0 6px rgba(43,45,51,0.6)', flexShrink: 0 }} />
          <p
            className="russo-one-regular"
            style={{ color: '#8a8f98', fontSize: 11, fontWeight: 400, margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}
          >
            Extension connected — browser dApps can now use this wallet
          </p>
        </div>
      )}

      {/* Ledger Active Banner */}
      {activeLedger && (
        <div
          style={{
            background: 'rgba(138,143,152,0.08)',
            border: '1px solid rgba(138,143,152,0.25)',
            borderRadius: 9999,
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#8a8f98' }}>
              usb
            </span>
            <div>
              <p style={{ color: '#8a8f98', fontSize: 12, fontWeight: 700, margin: 0 }}>Ledger Active</p>
              <p style={{ color: '#8a8f98', fontSize: 10, fontFamily: 'monospace', margin: '1px 0 0' }}>
                {activeLedger.address.slice(0, 10)}...{activeLedger.address.slice(-6)}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveLedger(null)}
            style={{
              background: '#e4e6ee',
              boxShadow: 'inset 3px 3px 6px rgba(166,177,198,0.5), inset -3px -3px 6px rgba(255,255,255,0.9)',
              borderRadius: 999,
              padding: '6px 14px',
              cursor: 'pointer',
              color: '#8a8f98',
              fontSize: 11,
              fontWeight: 400,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
            className="russo-one-regular"
          >
            Disconnect
          </button>
        </div>
      )}

      {/* Action Grid */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        {[
          {
            icon: 'power',
            label: 'Connect',
            onClick: () => {
              if (!selectedNonEvm) setShowWC(true);
            },
            disabled: !!selectedNonEvm,
          },
          {
            icon: 'north_east',
            label: 'Send',
            onClick: () => {
              if (selectedNonEvm) setShowNonEvmSend(true);
              else setShowSend(true);
            },
          },
          { icon: 'qr_code_2', label: 'QR / Receive', onClick: () => setShowQR(true) },
          { icon: 'add_card', label: 'Create New Wallet', onClick: () => setShowNewWalletWarning(true) },
        ].map((item) => (
          <motion.button
            key={item.label}
            layout
            onClick={item.onClick}
            whileHover={{ scale: item.disabled ? 1 : 1.03 }}
            whileTap={{ scale: item.disabled ? 1 : 0.96 }}
            transition={springs.snappy}
            style={{ opacity: item.disabled ? 0.35 : 1 }}
            className="neu-card-sm p-4 md:p-8 rounded-xl flex flex-col items-center gap-1.5 md:gap-4 hover:bg-[#2b2d33] hover:text-[#f5f6fa] transition-colors group border border-transparent cursor-pointer"
          >
            <span className="material-symbols-outlined text-3xl md:text-5xl group-hover:scale-110 transition-transform">{item.icon}</span>
            <span className="russo-one-regular uppercase tracking-widest text-[0.6rem]">{item.label}</span>
          </motion.button>
        ))}

        <AnimatePresence>
          {mode === 'advanced' &&
            [
              {
                icon: 'swap_vert',
                label: 'Swap',
                onClick: () => {
                  if (!selectedNonEvm) setShowSwap(true);
                },
                disabled: !!selectedNonEvm,
              },
              { icon: 'contacts', label: 'Address Book', onClick: () => setShowAddressBook(true) },
              { icon: 'usb', label: 'Ledger', onClick: () => setShowLedger(true) },
              { icon: 'link', label: 'Custom Chain', onClick: () => setShowCustomChainModal(true) },
              { icon: 'token', label: 'Custom Token', onClick: () => setShowCustomTokenModal(true) },
              { icon: 'api', label: 'Custom API', onClick: () => setShowCustomAPIModal(true) },
            ].map((item, i) => (
              <motion.button
                key={item.label}
                layout
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ ...springs.smooth, delay: i * 0.04 }}
                onClick={item.onClick}
                whileHover={{ scale: item.disabled ? 1 : 1.03 }}
                whileTap={{ scale: item.disabled ? 1 : 0.96 }}
                style={{ opacity: item.disabled ? 0.35 : 1 }}
                className="neu-card-sm p-4 md:p-8 rounded-xl flex flex-col items-center gap-1.5 md:gap-4 hover:bg-[#2b2d33] hover:text-[#f5f6fa] transition-colors group border border-transparent cursor-pointer"
              >
                <span className="material-symbols-outlined text-2xl md:text-5xl group-hover:scale-110 transition-transform">{item.icon}</span>
                <span className="russo-one-regular uppercase tracking-widest text-[0.55rem] md:text-[0.6rem]">{item.label}</span>
              </motion.button>
            ))}
        </AnimatePresence>

        {hasOtherSaved && hasTokensOnChain && (
          <motion.button
            layout
            onClick={() => setShowTransfer(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={springs.snappy}
            className="neu-card-sm p-4 md:p-8 rounded-xl flex flex-col items-center gap-1.5 md:gap-4 hover:bg-[#2b2d33] hover:text-[#f5f6fa] transition-colors group active:scale-95 border border-transparent col-span-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-3xl md:text-5xl group-hover:scale-110 transition-transform">swap_horiz</span>
            <span className="russo-one-regular uppercase tracking-widest text-[0.6rem]">Transfer Between Wallets</span>
          </motion.button>
        )}
      </div>
    </>
  );
}
