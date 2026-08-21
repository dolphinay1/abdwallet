'use client';

import React, { useState } from 'react';
import { useWallet } from '@/context/WalletContext';
import { Zap, Dices, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { ABDCapsule } from '@/components/ABDCapsule';
import { AbdLogo } from '@/components/AbdLogo';
import { MnemonicGeneratorModal } from '@/components/MnemonicGeneratorModal';

export function AuthScreen() {
  const wallet = useWallet();
  const [mnemonic, setMnemonic] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!wallet || isCreating) return;
    setIsCreating(true);
    setError('');
    try {
      await wallet.createABDWallet();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create wallet');
      setIsCreating(false);
    }
  };

  const handleImport = async () => {
    if (!wallet || isRestoring) return;
    const cleanMnemonic = mnemonic.trim();
    if (!cleanMnemonic) {
      setError('Please enter your 12 or 24-word seed phrase');
      return;
    }
    const wordCount = cleanMnemonic.split(/\s+/).length;
    if (wordCount !== 12 && wordCount !== 24) {
      setError(`Expected 12 or 24 words, got ${wordCount} words`);
      return;
    }

    setIsRestoring(true);
    setError('');
    try {
      await wallet.importABDWallet(cleanMnemonic);
    } catch (err) {
      setError('Invalid seed phrase or derivation failure');
      setIsRestoring(false);
    }
  };

  return (
    <main className="min-h-screen w-full bg-[#e4e6ee] text-[#23262b] flex flex-col items-center justify-center p-4 sm:p-6 relative selection:bg-slate-300 font-sans">
      {/* ── Elevated Pure Neumorphic Master Card ── */}
      <div 
        className="w-full max-w-[560px] mx-auto rounded-[32px] sm:rounded-[40px] p-8 sm:p-12 relative z-10 my-auto"
        style={{
          backgroundColor: '#e4e6ee',
          boxShadow: '9px 9px 18px rgba(166, 177, 198, 0.55), -9px -9px 18px rgba(255, 255, 255, 0.9)',
          border: '1px solid rgba(255, 255, 255, 0.6)'
        }}
      >
        {/* 3D Embossed Natural White Theme ABD Logo */}
        <div className="flex justify-center mb-6 pt-1">
          <AbdLogo width={220} className="cursor-pointer hover:scale-[1.03] transition-transform duration-300" />
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-6 flex items-center gap-2 text-rose-700 text-xs font-semibold p-3.5 rounded-2xl bg-rose-50 border border-rose-200 shadow-sm animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Actions Section */}
        {!isImporting ? (
          <div className="space-y-4">
            {/* 1. Primary Action: CREATE NEW WALLET (Red-Edged Inset Monolith Capsule Pill).
                Same red-edge treatment as the "New Wallet" tile on the wallet screen —
                creating a wallet closes any session that is not saved. */}
            <div
              className="neu-pill-inset-red relative p-1.5 rounded-full"
              style={{ border: '1px solid rgba(185, 28, 28, 0.22)' }}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-full"
                style={{
                  background:
                    'radial-gradient(115% 115% at 50% 50%, rgba(185,28,28,0) 40%, rgba(185,28,28,0.05) 68%, rgba(185,28,28,0.13) 100%)',
                  boxShadow: 'inset 0 0 18px rgba(185,28,28,0.10)',
                }}
              />
              <button
                id="create-new-wallet-btn"
                aria-label="Create New Wallet"
                type="button"
                disabled={isCreating}
                onClick={handleCreate}
                className="sf-display-black relative w-full py-3.5 px-6 rounded-full font-black text-[13px] uppercase flex items-center justify-center gap-3 cursor-pointer active:scale-[0.98] transition-all tracking-[0.12em] text-white shadow-md"
                style={{
                  backgroundColor: '#181B22',
                  backgroundImage: 'linear-gradient(180deg, #242831 0%, #151820 100%)',
                  boxShadow: '4px 4px 10px rgba(166, 177, 198, 0.4), -2px -2px 6px #FFFFFF',
                  opacity: isCreating ? 0.85 : 1,
                }}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>CREATING SECURE VAULT...</span>
                  </>
                ) : (
                  <>
                    <span>CREATE NEW WALLET</span>
                  </>
                )}
              </button>
            </div>

            {/* 2. Secondary Action: IMPORT EXISTING (Inset Monolith Capsule Pill) */}
            <div className="neu-pill-inset p-1.5 rounded-full">
              <button
                id="import-existing-wallet-btn"
                aria-label="Import Existing Wallet"
                type="button"
                disabled={isCreating}
                onClick={() => {
                  setError('');
                  setIsImporting(true);
                }}
                className="sf-display-black w-full py-3.5 px-6 rounded-full font-black text-[13px] uppercase flex items-center justify-center cursor-pointer active:scale-[0.98] transition-all tracking-[0.12em] text-[#1e293b] hover:opacity-95"
                style={{
                  backgroundColor: '#FFFFFF',
                  backgroundImage: 'linear-gradient(180deg, #FFFFFF 0%, #EFF2F7 100%)',
                  boxShadow: '4px 4px 10px rgba(166, 177, 198, 0.4), -4px -4px 10px #FFFFFF',
                  border: '1px solid rgba(255, 255, 255, 0.95)'
                }}
              >
                <span>IMPORT EXISTING</span>
              </button>
            </div>

            {/* 3. Helper: Generate 12-Word Mnemonic Modal Trigger (Inset Monolith Capsule) */}
            <div className="pt-2 flex justify-center">
              <button
                type="button"
                aria-label="Generate 12-Word Recovery Phrase"
                onClick={() => setIsModalOpen(true)}
                className="neu-pill-inset sf-bold text-xs font-bold text-slate-700 hover:text-slate-950 transition-colors flex items-center gap-2 py-2.5 px-5 rounded-full cursor-pointer hover:opacity-85"
              >
                <Dices className="w-3.5 h-3.5 text-slate-700" />
                <span>Generate 12-Word Recovery Phrase</span>
              </button>
            </div>
          </div>
        ) : (
          /* ── Import Mnemonic Sub-view ── */
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-2">
              <span className="sf-display-black text-xs font-black uppercase tracking-wider text-slate-700">
                Enter Seed Phrase
              </span>
              <button
                type="button"
                aria-label="Back to main choices"
                onClick={() => {
                  setError('');
                  setIsImporting(false);
                }}
                className="sf-bold text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            </div>

            <ABDCapsule
              type="text"
              placeholder="e.g. quantum matrix shield cipher stellar nexus orbit titan crypto zenith vertex beacon"
              onValue={setMnemonic}
              className="w-full"
            />

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                aria-label="Cancel Import"
                onClick={() => {
                  setError('');
                  setIsImporting(false);
                }}
                className="sf-display-black flex-1 font-black tracking-wider uppercase text-xs py-3.5 rounded-full cursor-pointer transition-all text-slate-700"
                style={{
                  backgroundColor: '#EFF2F7',
                  boxShadow: '4px 4px 10px #CAD2DF, -4px -4px 10px #FFFFFF',
                  border: '1px solid rgba(255,255,255,0.85)'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                aria-label="Restore Wallet"
                disabled={isRestoring}
                onClick={handleImport}
                className="sf-display-black flex-[2] font-black tracking-wider uppercase text-xs py-3.5 rounded-full cursor-pointer transition-all text-white flex items-center justify-center gap-2"
                style={{
                  backgroundColor: '#181B22',
                  backgroundImage: 'linear-gradient(180deg, #242831 0%, #151820 100%)',
                  boxShadow: '6px 6px 14px rgba(166, 177, 198, 0.6), -3px -3px 8px #FFFFFF',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                {isRestoring ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    <span>Restoring...</span>
                  </>
                ) : (
                  <span>Restore Wallet</span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Footer Security Badge */}
        <div className="mt-8 pt-6 border-t border-slate-200/60 w-full flex justify-center text-center">
          <p className="sf-bold text-[8.5px] sm:text-[9.5px] font-bold text-slate-500 uppercase tracking-[0.08em] flex items-center justify-center gap-1.5 leading-relaxed">
            100% Non-Custodial & Client-Side • Zero Logs • Keys never leave your device
          </p>
        </div>
      </div>

      {/* ── 12-Word Mnemonic Generator White Neumorphic Modal ── */}
      <MnemonicGeneratorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </main>
  );
}
