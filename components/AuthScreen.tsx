'use client';
import React, { useState } from 'react';
import { useWallet } from '@/context/WalletContext';
import { Zap, ShieldAlert, Key } from 'lucide-react';
import { ABDCapsule } from '@/components/ABDCapsule';
import { upperEn } from '@/lib/text';

export function AuthScreen() {
  const wallet = useWallet();
  const [mnemonic, setMnemonic] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState('');
  
  const handleCreate = async () => {
    if (!wallet) return;
    try {
      await wallet.createABDWallet();
    } catch (err) {
      setError('Failed to create wallet');
    }
  };

  const handleImport = async () => {
    if (!wallet) return;
    if (!mnemonic) {
      setError('Enter your 12 or 24-word seed phrase');
      return;
    }
    try {
      await wallet.importABDWallet(mnemonic);
    } catch (err) {
      setError('Invalid seed phrase');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 bg-surface p-8 rounded-[2rem] border border-white/5 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-tertiary/10 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="text-center space-y-2 relative z-10">
          <div className="mx-auto w-16 h-16 rounded-full bg-tertiary/10 flex items-center justify-center border border-tertiary/30 mb-6 shadow-[0_0_30px_rgba(82,255,172,0.15)]">
            <ShieldAlert size={28} className="text-tertiary" />
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase">ABD Wallet</h1>
          <p className="text-on-surface-variant font-bold text-sm tracking-widest uppercase opacity-70">
            Encrypted • Ephemeral • Untraceable
          </p>
        </div>

        <div className="space-y-4 pt-4 relative z-10">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold tracking-wider uppercase p-3 rounded-xl text-center">
              {error}
            </div>
          )}

          {!isImporting ? (
            <>
              <button
                onClick={handleCreate}
                className="w-full bg-tertiary text-background font-black tracking-widest uppercase text-sm py-4 rounded-xl hover:bg-white transition-all flex items-center justify-center gap-2"
              >
                <Zap size={18} />
                Create New Wallet
              </button>
              <button
                onClick={() => setIsImporting(true)}
                className="w-full bg-surface-container-high text-white font-bold tracking-widest text-sm py-4 rounded-xl border border-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2"
              >
                <Key size={18} />
                {upperEn('Import Existing')}
              </button>
            </>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <ABDCapsule 
                type="text" 
                placeholder="Enter 12/24 word seed phrase" 
                onValue={setMnemonic} 
                className="w-full"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setIsImporting(false)}
                  className="flex-1 bg-surface-container-high text-white font-bold tracking-widest uppercase text-xs py-3 rounded-xl border border-white/10 hover:border-white/20 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  className="flex-[2] bg-tertiary text-background font-black tracking-widest uppercase text-xs py-3 rounded-xl hover:bg-white transition-all"
                >
                  Restore Wallet
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
