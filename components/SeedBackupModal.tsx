'use client';

import React from 'react';
import { X, Save } from 'lucide-react';

interface SeedBackupModalProps {
  isOpen: boolean;
  /** The 12 (or 24) recovery words. Held in memory only — never stored or logged. */
  words: string[];
  /** Called when the user presses Save — the caller then runs the verification challenge. */
  onConfirm: () => void;
  /** Called when the user aborts — the caller must abandon the save. */
  onCancel: () => void;
  title?: string;
  subtitle?: string;
  /** Parent-driven busy state. */
  isBusy?: boolean;
}

/**
 * Step 1 of saving a wallet to the vault: show every recovery word so the user
 * can write them down. Step 2 (SeedVerificationModal) then asks them to prove it.
 */
export function SeedBackupModal({
  isOpen,
  words,
  onConfirm,
  onCancel,
  title = 'Your Recovery Phrase',
  subtitle = 'Write every word down before saving',
  isBusy = false,
}: SeedBackupModalProps) {
  const isExt = typeof window !== 'undefined' && window.self !== window.top;

  if (!isOpen || words.length === 0) return null;

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200 ${isExt ? 'p-3' : 'p-4 sm:p-6'}`}
    >
      <div
        className={`w-full max-w-[560px] relative select-none animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto ${isExt ? 'rounded-[28px] p-5' : 'rounded-[32px] sm:rounded-[36px] p-6 sm:p-8'}`}
        style={{
          fontFamily: "var(--font-sf-compact), 'SF Compact Text', system-ui, sans-serif",
          backgroundColor: '#EFF2F7',
          color: '#1E232D',
          boxShadow: `
            20px 20px 60px #C7CED9,
            -20px -20px 60px #FFFFFF,
            inset 1px 1px 1px #FFFFFF
          `,
          border: '1px solid rgba(255, 255, 255, 0.8)',
        }}
      >
        {/* Header */}
        <div className={`flex items-center justify-between border-b border-slate-200/80 ${isExt ? 'pb-3' : 'pb-5'}`}>
          <div>
            <h2
              className={`sf-display-black font-black uppercase tracking-wider text-slate-900 ${isExt ? 'text-[13px] leading-tight' : 'text-lg sm:text-xl'}`}
            >
              {title}
            </h2>
            <p
              className={`sf-bold font-bold text-slate-500 tracking-wide uppercase mt-0.5 ${isExt ? 'text-[9px]' : 'text-[11px]'}`}
            >
              {subtitle}
            </p>
          </div>

          <button
            type="button"
            aria-label="Cancel saving this wallet"
            onClick={onCancel}
            disabled={isBusy}
            className={`rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer ${isExt ? 'w-7 h-7' : 'w-9 h-9'}`}
            style={{
              backgroundColor: '#EFF2F7',
              boxShadow: '3px 3px 6px #D1D8E4, -3px -3px 6px #FFFFFF',
            }}
          >
            <X className={`stroke-[2.5] ${isExt ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
          </button>
        </div>

        {/* All recovery words, fully revealed */}
        <div className={isExt ? 'my-3' : 'my-5'}>
          <div
            className={isExt ? 'p-3 rounded-2xl' : 'p-4 sm:p-5 rounded-[28px] sm:rounded-[32px]'}
            style={{
              backgroundColor: '#E7ECF3',
              boxShadow: 'inset 4px 4px 8px #D1D8E4, inset -4px -4px 8px #FFFFFF',
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
                    border: '1px solid rgba(255, 255, 255, 0.7)',
                  }}
                >
                  <span className={`sf-mono-bold font-bold text-slate-400 ${isExt ? 'text-[9px]' : 'text-[10px]'}`}>
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

        {/* Standing warning */}
        <div
          className={`neu-pill-inset-red sf-bold font-bold flex items-center justify-center text-center leading-relaxed ${isExt ? 'p-2.5 rounded-full mb-3 text-[9px]' : 'py-3 px-6 rounded-full mb-5 text-[11px] sm:text-xs'}`}
        >
          <p className="leading-relaxed uppercase tracking-wider m-0">
            Anyone with these words owns this wallet. Never photograph or paste them anywhere.
          </p>
        </div>

        {/* Confirm Save Wallet */}
        <div
          className={isExt ? 'pt-3 border-t border-slate-200/80' : 'pt-5 border-t border-slate-200/80'}
        >
          <p
            className={`sf-display-black font-black uppercase tracking-[0.08em] text-slate-500 m-0 ${isExt ? 'text-[9px] mb-2.5' : 'text-[11px] mb-3.5'}`}
          >
            Confirm Save Wallet
          </p>

          <div className={`flex ${isExt ? 'gap-2' : 'gap-3'}`}>
            <button
              type="button"
              onClick={onCancel}
              disabled={isBusy}
              className={`sf-display-black font-black flex-1 rounded-full uppercase tracking-widest cursor-pointer text-slate-700 hover:opacity-95 active:scale-[0.99] transition-all ${isExt ? 'py-2.5 px-4 text-[10px]' : 'py-3.5 px-6 text-xs'}`}
              style={{
                backgroundColor: '#EFF2F7',
                boxShadow: '4px 4px 10px #CAD2DF, -4px -4px 10px #FFFFFF',
                border: '1px solid rgba(255,255,255,0.85)',
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={isBusy}
              className={`sf-display-black font-black flex-[2] rounded-full uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer text-white bg-slate-900 hover:bg-slate-800 active:scale-[0.99] transition-all shadow-lg shadow-slate-900/20 disabled:opacity-60 disabled:cursor-not-allowed ${isExt ? 'py-2.5 px-4 text-[10px]' : 'py-3.5 px-6 text-xs'}`}
            >
              <Save className={`stroke-[2.4] ${isExt ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
              <span>Save</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
