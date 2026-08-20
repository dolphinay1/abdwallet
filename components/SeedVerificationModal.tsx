'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, ShieldCheck, Loader2 } from 'lucide-react';

interface SeedVerificationModalProps {
  isOpen: boolean;
  /** The 12 (or 24) recovery words. Held in memory only — never stored or logged. */
  words: string[];
  /** Called once both hidden words are typed back correctly. */
  onVerified: () => void | Promise<void>;
  /** Called when the user aborts — the caller must abandon the save/creation. */
  onCancel: () => void;
  title?: string;
  subtitle?: string;
  confirmLabel?: string;
  /** Parent-driven busy state (e.g. vault write in flight). */
  isBusy?: boolean;
}

/** Pick `count` distinct indices from [0, length) — fresh on every verification. */
function pickHiddenIndices(length: number, count: number): number[] {
  const pool = Array.from({ length }, (_, i) => i);
  const picked: number[] = [];
  const cryptoObj = typeof window !== 'undefined' ? window.crypto : undefined;
  const randomInt = (max: number) => {
    if (cryptoObj?.getRandomValues) {
      const buf = new Uint32Array(1);
      cryptoObj.getRandomValues(buf);
      return buf[0] % max;
    }
    return Math.floor(Math.random() * max);
  };
  while (picked.length < Math.min(count, length)) {
    const [idx] = pool.splice(randomInt(pool.length), 1);
    picked.push(idx);
  }
  return picked.sort((a, b) => a - b);
}

const normalize = (value: string) => value.trim().toLowerCase();

export function SeedVerificationModal({
  isOpen,
  words,
  onVerified,
  onCancel,
  title = 'Confirm Your Recovery Phrase',
  subtitle = 'Prove you wrote the words down',
  confirmLabel = 'CONFIRM & SAVE',
  isBusy = false,
}: SeedVerificationModalProps) {
  const [hiddenIndices, setHiddenIndices] = useState<number[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  const isExt = typeof window !== 'undefined' && window.self !== window.top;

  // Fresh challenge each time the modal opens; wiped from memory when it closes.
  useEffect(() => {
    if (isOpen && words.length >= 2) {
      setHiddenIndices(pickHiddenIndices(words.length, 2));
      setAnswers({});
      setError('');
      setChecking(false);
    } else if (!isOpen) {
      setHiddenIndices([]);
      setAnswers({});
      setError('');
      setChecking(false);
    }
  }, [isOpen, words]);

  useEffect(() => {
    if (isOpen && hiddenIndices.length > 0) {
      const t = setTimeout(() => firstInputRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [isOpen, hiddenIndices]);

  const promptLabel = useMemo(
    () => hiddenIndices.map(i => `#${i + 1}`).join(' and '),
    [hiddenIndices]
  );

  if (!isOpen || words.length === 0) return null;

  const allFilled = hiddenIndices.every(i => normalize(answers[i] ?? '').length > 0);

  const handleConfirm = async () => {
    if (checking || isBusy) return;
    const wrong = hiddenIndices.filter(i => normalize(answers[i] ?? '') !== normalize(words[i] ?? ''));
    if (wrong.length > 0) {
      setError(
        wrong.length === hiddenIndices.length
          ? 'Both words are incorrect. Check your backup and try again.'
          : `Word ${wrong.map(i => `#${i + 1}`).join(', ')} is incorrect. Try again.`
      );
      return;
    }
    setError('');
    setChecking(true);
    try {
      await onVerified();
    } finally {
      setChecking(false);
    }
  };

  const busy = checking || isBusy;

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
            aria-label="Cancel verification"
            onClick={onCancel}
            disabled={busy}
            className={`rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer ${isExt ? 'w-7 h-7' : 'w-9 h-9'}`}
            style={{
              backgroundColor: '#EFF2F7',
              boxShadow: '3px 3px 6px #D1D8E4, -3px -3px 6px #FFFFFF',
            }}
          >
            <X className={`stroke-[2.5] ${isExt ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
          </button>
        </div>

        {/* Instruction */}
        <div className={isExt ? 'mt-3' : 'mt-5'}>
          <p
            className={`sf-bold font-bold uppercase tracking-wider text-slate-600 leading-relaxed m-0 ${isExt ? 'text-[9px]' : 'text-[11px]'}`}
          >
            Fill in the missing words {promptLabel} from your recovery phrase.
          </p>
        </div>

        {/* 12 Words Grid — 2 slots blanked out as inputs */}
        <div className={isExt ? 'my-3' : 'my-5'}>
          <div
            className={isExt ? 'p-3 rounded-2xl' : 'p-4 sm:p-5 rounded-[28px] sm:rounded-[32px]'}
            style={{
              backgroundColor: '#E7ECF3',
              boxShadow: 'inset 4px 4px 8px #D1D8E4, inset -4px -4px 8px #FFFFFF',
            }}
          >
            <div className={`grid gap-2 ${isExt ? 'grid-cols-2' : 'grid-cols-3 sm:gap-2.5'}`}>
              {words.map((word, index) => {
                const isHidden = hiddenIndices.includes(index);
                const isFirstHidden = hiddenIndices[0] === index;
                return (
                  <div
                    key={index}
                    className={`flex items-center justify-between ${isHidden ? '' : 'select-all'} ${isExt ? 'px-3 py-1.5 rounded-[10px]' : 'px-2.5 py-2 sm:px-3 sm:py-2.5 rounded-xl'}`}
                    style={{
                      backgroundColor: '#EFF2F7',
                      boxShadow: isHidden
                        ? 'inset 3px 3px 6px #D6DDE8, inset -3px -3px 6px #FFFFFF'
                        : '3px 3px 6px #D6DDE8, -3px -3px 6px #FFFFFF',
                      border: isHidden
                        ? '1px solid rgba(148, 163, 184, 0.45)'
                        : '1px solid rgba(255, 255, 255, 0.7)',
                    }}
                  >
                    <span className={`sf-mono-bold font-bold text-slate-400 ${isExt ? 'text-[9px]' : 'text-[10px]'}`}>
                      #{(index + 1).toString().padStart(2, '0')}
                    </span>
                    {isHidden ? (
                      <input
                        ref={isFirstHidden ? firstInputRef : undefined}
                        type="text"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        aria-label={`Recovery word number ${index + 1}`}
                        placeholder="type word"
                        value={answers[index] ?? ''}
                        disabled={busy}
                        onChange={e => {
                          const v = e.target.value;
                          setAnswers(prev => ({ ...prev, [index]: v }));
                          if (error) setError('');
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleConfirm();
                        }}
                        className={`sf-mono-bold font-bold text-slate-900 tracking-wider lowercase bg-transparent outline-none border-none text-right w-[62%] placeholder:text-slate-400 placeholder:font-normal ${isExt ? 'text-[11px]' : 'text-xs sm:text-[13px]'}`}
                      />
                    ) : (
                      <span
                        className={`sf-mono-bold font-bold text-slate-900 tracking-wider lowercase ${isExt ? 'text-[11px]' : 'text-xs sm:text-[13px]'}`}
                      >
                        {word}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Inline error */}
        {error && (
          <div
            className={`neu-pill-inset-red sf-bold font-bold flex items-center justify-center text-center leading-relaxed ${isExt ? 'p-2.5 rounded-full mb-3 text-[9px]' : 'py-3 px-6 rounded-full mb-5 text-[11px] sm:text-xs'}`}
            role="alert"
          >
            <p className="leading-relaxed uppercase tracking-wider m-0">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className={`flex ${isExt ? 'gap-2' : 'gap-3'}`}>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
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
            onClick={handleConfirm}
            disabled={busy || !allFilled}
            className={`sf-display-black font-black flex-[2] rounded-full uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer text-white bg-slate-900 hover:bg-slate-800 active:scale-[0.99] transition-all shadow-lg shadow-slate-900/20 disabled:opacity-60 disabled:cursor-not-allowed ${isExt ? 'py-2.5 px-4 text-[10px]' : 'py-3.5 px-6 text-xs'}`}
          >
            {busy ? (
              <>
                <Loader2 className={`animate-spin ${isExt ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
                <span>VERIFYING...</span>
              </>
            ) : (
              <>
                <ShieldCheck className={`stroke-[2.4] ${isExt ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
                <span>{confirmLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
