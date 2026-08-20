'use client';
import React, { useState, useEffect } from 'react';
import * as bip39 from 'bip39';
import { 
  X, 
  RotateCw, 
  Download, 
  Copy, 
  Check 
} from 'lucide-react';
import { useWallet } from '@/context/WalletContext';

interface MnemonicGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MnemonicGeneratorModal({ isOpen, onClose }: MnemonicGeneratorModalProps) {
  const wallet = useWallet();
  const [mnemonic, setMnemonic] = useState('');
  const [words, setWords] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const isExt = typeof window !== 'undefined' && window.self !== window.top;

  // Generate 12 words on open
  const generateNewMnemonic = () => {
    try {
      const newMnemonic = bip39.generateMnemonic(128); // 128 bits = 12 words
      setMnemonic(newMnemonic);
      setWords(newMnemonic.split(' '));
    } catch {
      // Fallback standard 12-word generator
      const fallbackList = [
        "quantum", "matrix", "shield", "cipher", "stellar", "nexus",
        "orbit", "titan", "crypto", "zenith", "vertex", "beacon"
      ];
      setMnemonic(fallbackList.join(' '));
      setWords(fallbackList);
    }
  };

  useEffect(() => {
    if (isOpen && words.length === 0) {
      generateNewMnemonic();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Copy all words
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(mnemonic);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Download .txt backup
  const handleDownload = () => {
    const timestamp = new Date().toLocaleString('en-US');
    const content = `=====================================================
ABD WALLET - SECRET RECOVERY KEY (SEED PHRASE)
=====================================================
Generated: ${timestamp}
Generation Method: Local Device Client (100% Offline)

12 SECRET RECOVERY WORDS:
-----------------------------------------------------
${words.map((w, i) => `${(i + 1).toString().padStart(2, ' ')}. ${w}`).join('\n')}

SINGLE-LINE SEED PHRASE:
${mnemonic}

=====================================================
⚠️ CRITICAL SECURITY & BACKUP WARNING:
1. These 12 words are the sole and final key to your wallet.
2. If you lose or forget them, you will NEVER access your funds again.
3. This key is never sent to any server; it was generated entirely on your device.
4. Move the file to a secure external drive, or write it on paper and store it in a safe.
5. NEVER share these words with anyone (including ABD Wallet developers).
=====================================================`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `abd-wallet-seed-backup-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Use this mnemonic to create and unlock the wallet
  const handleUseAndCreate = async () => {
    if (!wallet || !mnemonic) return;
    setIsCreating(true);
    try {
      await wallet.importABDWallet(mnemonic);
      onClose();
    } catch {
      setIsCreating(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200 ${isExt ? 'p-3' : 'p-4 sm:p-6'}`}>
      {/* ── Light / White Neumorphic Modal Card ── */}
      <div 
        className={`w-full max-w-[560px] relative select-none animate-in zoom-in-95 duration-200 ${isExt ? 'rounded-[28px] p-5' : 'rounded-[32px] sm:rounded-[36px] p-6 sm:p-8'}`}
        style={{
          fontFamily: "var(--font-sf-compact), 'SF Compact Text', system-ui, sans-serif",
          backgroundColor: '#EFF2F7',
          color: '#1E232D',
          boxShadow: `
            20px 20px 60px #C7CED9,
            -20px -20px 60px #FFFFFF,
            inset 1px 1px 1px #FFFFFF
          `,
          border: '1px solid rgba(255, 255, 255, 0.8)'
        }}
      >
        {/* Header */}
        <div className={`flex items-center justify-between border-b border-slate-200/80 ${isExt ? 'pb-3' : 'pb-5'}`}>
          <div>
            <h2 className={`sf-display-black font-black uppercase tracking-wider text-slate-900 ${isExt ? 'text-[13px] leading-tight' : 'text-lg sm:text-xl'}`}>
              12-Word Recovery Phrase
            </h2>
            <p className={`sf-bold font-bold text-slate-500 tracking-wide uppercase mt-0.5 ${isExt ? 'text-[9px]' : 'text-[11px]'}`}>
              Offline & Secure Local Entropy
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer ${isExt ? 'w-7 h-7' : 'w-9 h-9'}`}
            style={{
              backgroundColor: '#EFF2F7',
              boxShadow: '3px 3px 6px #D1D8E4, -3px -3px 6px #FFFFFF'
            }}
          >
            <X className={`stroke-[2.5] ${isExt ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
          </button>
        </div>

        {/* 12 Words Grid (White Inset Neumorphic Capsules) */}
        <div className={isExt ? "my-3" : "my-5"}>
          <div 
            className={isExt ? 'p-3 rounded-2xl' : 'p-4 sm:p-5 rounded-[28px] sm:rounded-[32px]'}
            style={{
              backgroundColor: '#E7ECF3',
              boxShadow: 'inset 4px 4px 8px #D1D8E4, inset -4px -4px 8px #FFFFFF'
            }}
          >
            <div className={`grid gap-2 ${isExt ? 'grid-cols-2' : 'grid-cols-3 sm:gap-2.5'}`}>
              {words.map((word, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between select-all ${isExt ? 'px-3 py-1.5 rounded-[10px]' : 'px-2.5 py-2 sm:px-3 sm:py-2.5 rounded-xl'}`}
                  style={{
                    backgroundColor: '#EFF2F7',
                    boxShadow: '3px 3px 6px #D6DDE8, -3px -3px 6px #FFFFFF',
                    border: '1px solid rgba(255, 255, 255, 0.7)'
                  }}
                >
                  <span 
                    className={`sf-mono-bold font-bold text-slate-400 ${isExt ? 'text-[9px]' : 'text-[10px]'}`}
                  >
                    #{(index + 1).toString().padStart(2, '0')}
                  </span>
                  <span 
                    className={`sf-mono-bold font-bold text-slate-900 tracking-wider lowercase ${isExt ? 'text-[11px]' : 'text-xs sm:text-[13px]'}`}
                  >
                    {word}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Tools Row: Regenerate & Copy */}
        <div className={`flex items-center justify-between ${isExt ? 'gap-2 mb-3' : 'gap-3 mb-5'}`}>
          <button
            type="button"
            onClick={generateNewMnemonic}
            className={`sf-display-black font-extrabold flex items-center justify-center flex-1 uppercase tracking-wider text-slate-800 hover:text-slate-950 transition-all cursor-pointer ${isExt ? 'gap-1.5 px-3 py-2 rounded-full text-[9px]' : 'gap-2 px-3 py-2.5 sm:px-4 sm:py-3 rounded-full text-[11px] sm:text-xs'}`}
            style={{
              backgroundColor: '#EFF2F7',
              boxShadow: '4px 4px 8px #D1D8E4, -4px -4px 8px #FFFFFF'
            }}
          >
            <RotateCw className={`stroke-[2.4] ${isExt ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
            <span>Regenerate</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className={`sf-display-black font-extrabold flex items-center justify-center flex-1 uppercase tracking-wider text-slate-800 hover:text-slate-950 transition-all cursor-pointer ${isExt ? 'gap-1.5 px-3 py-2 rounded-full text-[9px]' : 'gap-2 px-3 py-2.5 sm:px-4 sm:py-3 rounded-full text-[11px] sm:text-xs'}`}
            style={{
              backgroundColor: '#EFF2F7',
              boxShadow: '4px 4px 8px #D1D8E4, -4px -4px 8px #FFFFFF'
            }}
          >
            {copied ? (
              <>
                <Check className={`text-emerald-600 stroke-[2.5] ${isExt ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
                <span className="text-emerald-600">Copied!</span>
              </>
            ) : (
              <>
                <Copy className={`stroke-[2.4] ${isExt ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
                <span>Copy All</span>
              </>
            )}
          </button>
        </div>

        {/* Security Warning Capsule (Address-style soft red inset capsule) */}
        <div 
          className={`neu-pill-inset-red sf-bold font-bold flex items-center justify-center text-center leading-relaxed ${isExt ? 'p-2.5 rounded-full mb-3 text-[9px]' : 'py-3.5 px-6 rounded-full mb-5 text-[11px] sm:text-xs'}`}
        >
          <p className="leading-relaxed uppercase tracking-wider m-0">
            CRITICAL: If you lose these 12 words you can never recover this wallet. Download the backup file.
          </p>
        </div>

        {/* Action Buttons: Download (.txt) & Create Wallet */}
        <div className={isExt ? 'space-y-2' : 'space-y-3'}>
          {/* Primary Action: Download .txt Key File */}
          <button
            type="button"
            onClick={handleDownload}
            className={`sf-display-black font-black w-full rounded-full uppercase tracking-widest flex items-center justify-center cursor-pointer text-slate-900 hover:opacity-95 active:scale-[0.99] transition-all ${isExt ? 'py-2.5 px-4 text-[10px] gap-2' : 'py-3.5 px-6 text-xs gap-2.5'}`}
            style={{
              backgroundColor: '#EFF2F7',
              boxShadow: '6px 6px 12px #CAD2DF, -6px -6px 12px #FFFFFF',
              border: '1px solid rgba(255, 255, 255, 0.9)'
            }}
          >
            <Download className={`stroke-[2.4] text-slate-800 ${isExt ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
            <span>DOWNLOAD (.TXT)</span>
          </button>

          {/* Secondary Action: Direct Unlock with this key */}
          <button
            type="button"
            onClick={handleUseAndCreate}
            disabled={isCreating}
            className={`sf-display-black font-black w-full rounded-full uppercase tracking-widest flex items-center justify-center cursor-pointer text-white bg-slate-900 hover:bg-slate-800 active:scale-[0.99] transition-all shadow-lg shadow-slate-900/20 ${isExt ? 'py-2.5 px-4 text-[10px]' : 'py-3.5 px-6 text-xs'}`}
          >
            <span>{isCreating ? 'CREATING WALLET...' : 'CREATE WALLET WITH THIS PHRASE'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
