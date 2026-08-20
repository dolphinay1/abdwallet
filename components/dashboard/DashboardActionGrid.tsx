'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { springs } from '@/lib/animations';
import type { LedgerEntry } from '@/lib/ledger';
import type { WalletSnapshot } from '@/lib/wallet-history';

interface ActionTile {
  icon: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  /** Renders the tile with a faint red edge wash - used for wallet-disabling actions. */
  danger?: boolean;
}

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
  onRequestLedgerDisconnect,
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
  onRequestLedgerDisconnect: () => void;
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

  const primaryActions: ActionTile[] = [
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
    { icon: 'add_card', label: 'Create New Wallet', onClick: () => setShowNewWalletWarning(true), danger: true },
  ];

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
          <div className="flex items-center">
            <span className="text-sm sf-display-black font-black tracking-widest uppercase text-[#f5f6fa]">
              {savedVaultsCount} Saved Vault{savedVaultsCount > 1 ? 's' : ''}
            </span>
          </div>
          <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">arrow_forward</span>
        </motion.button>
      )}

      {/* Extension banners */}
      {extPresent && !extAttached && typeof window !== 'undefined' && window.self === window.top && (
        <div
          className="neu-pill-inset"
          style={{
            borderRadius: 9999,
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div>
            <p className="sf-display-black" style={{ color: '#1e293b', fontSize: 12, fontWeight: 900, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>ABD Wallet Extension detected</p>
            <p className="sf-bold" style={{ color: '#64748b', fontSize: 10.5, fontWeight: 700, margin: '2px 0 0' }}>Connect to use it as a browser wallet for dApps</p>
          </div>
          <button
            onClick={() => setShowPassphraseModal(true)}
            disabled={extAttaching}
            className="sf-display-black"
            style={{
              background: '#1e293b',
              border: 'none',
              borderRadius: 9999,
              color: '#ffffff',
              fontSize: 11,
              fontWeight: 900,
              padding: '9px 18px',
              cursor: extAttaching ? 'not-allowed' : 'pointer',
              opacity: extAttaching ? 0.6 : 1,
              flexShrink: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              boxShadow: '2px 2px 6px rgba(166, 177, 198, 0.4)',
              transition: 'all 0.15s',
            }}
          >
            {extAttaching ? 'Attaching…' : 'Connect Extension'}
          </button>
        </div>
      )}
      {extError && extPresent && !extAttached && typeof window !== 'undefined' && window.self === window.top && (
        <p className="sf-bold" style={{ color: '#b91c1c', fontSize: 11, margin: '-4px 0 4px', padding: '0 4px', fontWeight: 700 }}>{extError}</p>
      )}
      {extAttached && walletUnlocked && typeof window !== 'undefined' && window.self === window.top && (
        <div
          className="neu-pill-inset"
          style={{
            padding: '10px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <p
            className="sf-display-black"
            style={{ color: '#64748b', fontSize: 10.5, fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}
          >
            Extension connected — browser dApps can now use this wallet
          </p>
        </div>
      )}

      {/* Ledger Active Banner */}
      {activeLedger && (
        <div
          className="neu-pill-inset"
          style={{
            borderRadius: 9999,
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#1e293b' }}>
              usb
            </span>
            <div>
              <p className="sf-display-black" style={{ color: '#1e293b', fontSize: 12, fontWeight: 900, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Ledger Active</p>
              <p className="sf-mono-bold" style={{ color: '#64748b', fontSize: 10.5, fontWeight: 700, margin: '1px 0 0' }}>
                {activeLedger.address.slice(0, 10)}...{activeLedger.address.slice(-6)}
              </p>
            </div>
          </div>
          <button
            onClick={onRequestLedgerDisconnect}
            className="sf-display-black neu-badge-inset"
            style={{
              borderRadius: 9999,
              padding: '7px 14px',
              cursor: 'pointer',
              color: '#b91c1c',
              fontSize: 10,
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              border: 'none',
            }}
          >
            Disconnect
          </button>
        </div>
      )}

      {/* Action Grid */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        {primaryActions.map((item) => (
          <motion.button
            key={item.label}
            layout
            onClick={item.onClick}
            whileHover={{ scale: item.disabled ? 1 : 1.03 }}
            whileTap={{ scale: item.disabled ? 1 : 0.96 }}
            transition={springs.snappy}
            style={{
              opacity: item.disabled ? 0.35 : 1,
              borderColor: item.danger ? 'rgba(185,28,28,0.22)' : 'transparent',
            }}
            className="neu-card-sm relative overflow-hidden p-4 md:p-8 rounded-xl flex flex-col items-center gap-2 md:gap-4 hover:bg-[#2b2d33] hover:text-[#f5f6fa] transition-colors group border cursor-pointer"
          >
            {item.danger && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-xl transition-opacity group-hover:opacity-60"
                style={{
                  background:
                    'radial-gradient(115% 115% at 50% 50%, rgba(185,28,28,0) 40%, rgba(185,28,28,0.05) 68%, rgba(185,28,28,0.13) 100%)',
                  boxShadow: 'inset 0 0 18px rgba(185,28,28,0.10)',
                }}
              />
            )}
            <span
              className={`material-symbols-outlined relative text-3xl md:text-5xl group-hover:scale-110 transition-transform ${
                item.danger ? 'text-[#a12b2b] group-hover:text-[#f5f6fa]' : ''
              }`}
            >
              {item.icon}
            </span>
            <span
              className={`sf-display-black relative font-extrabold uppercase tracking-wider text-[0.7rem] sm:text-xs group-hover:text-[#f5f6fa] text-center ${
                item.danger ? 'text-[#8f2727]' : 'text-[#23262b]'
              }`}
            >
              {item.label}
            </span>
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
                className="neu-card-sm p-4 md:p-8 rounded-xl flex flex-col items-center gap-2 md:gap-4 hover:bg-[#2b2d33] hover:text-[#f5f6fa] transition-colors group border border-transparent cursor-pointer"
              >
                <span className="material-symbols-outlined text-2xl md:text-5xl group-hover:scale-110 transition-transform">{item.icon}</span>
                <span className="sf-display-black font-extrabold uppercase tracking-wider text-[0.65rem] sm:text-xs text-[#23262b] group-hover:text-[#f5f6fa] text-center">{item.label}</span>
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
            className="neu-card-sm p-4 md:p-8 rounded-xl flex flex-col items-center gap-2 md:gap-4 hover:bg-[#2b2d33] hover:text-[#f5f6fa] transition-colors group active:scale-95 border border-transparent col-span-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-3xl md:text-5xl group-hover:scale-110 transition-transform">swap_horiz</span>
            <span className="sf-display-black font-extrabold uppercase tracking-wider text-[0.7rem] sm:text-xs text-[#23262b] group-hover:text-[#f5f6fa]">Transfer Between Wallets</span>
          </motion.button>
        )}
      </div>
    </>
  );
}
