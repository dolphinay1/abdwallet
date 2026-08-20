'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CountUp from '@/components/CountUp';
import { upperEn } from '@/lib/text';
import type { Chain } from '@/lib/chains';
import { CoinIcon } from './ui/CoinIcon';
import { ChainIcon } from './ui/ChainIcon';
import { NON_EVM_META, type NonEvmMeta } from './types';

export function DashboardHeader({
  frozenMode,
  selectedNonEvm,
  manualChain,
  mode,
  setMode,
  setShowNetworks,
  isLoadingTotal,
  tokens,
  prices,
  selectedChain,
  isRefreshing,
  displayAddress,
  shortAddr,
}: {
  frozenMode: string;
  selectedNonEvm: string | null;
  manualChain: Chain | null;
  mode: 'simple' | 'advanced';
  setMode: React.Dispatch<React.SetStateAction<'simple' | 'advanced'>>;
  setShowNetworks: (v: boolean) => void;
  isLoadingTotal: boolean;
  tokens: Array<{ balance?: string; coingeckoId?: string }>;
  prices: Record<string, number>;
  selectedChain: Chain;
  isRefreshing: boolean;
  displayAddress: string | null;
  shortAddr: string;
}) {
  const [copied, setCopied] = useState(false);
  const [showFullBalance, setShowFullBalance] = useState(false);
  const countUpFiredRef = useRef(false);
  const [countFrom, setCountFrom] = useState(0);
  const [countTo, setCountTo] = useState(0);
  const [countKey, setCountKey] = useState(0);

  const chainTotalUSD = tokens.reduce((sum, t) => {
    const price = prices[t.coingeckoId ?? ''] ?? prices[selectedChain.coingeckoId] ?? 0;
    return sum + parseFloat(t.balance || '0') * price;
  }, 0);

  useEffect(() => {
    if (isLoadingTotal) return;
    if (!countUpFiredRef.current) {
      countUpFiredRef.current = true;
      setCountFrom(0);
      setCountTo(chainTotalUSD);
      setCountKey(1);
    } else {
      setCountFrom(chainTotalUSD);
      setCountTo(chainTotalUSD);
    }
  }, [chainTotalUSD, isLoadingTotal]);

  const handleCopy = async () => {
    if (!displayAddress) return;
    try {
      await navigator.clipboard.writeText(displayAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const meta: NonEvmMeta | undefined = selectedNonEvm ? NON_EVM_META[selectedNonEvm] : undefined;

  return (
    <>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <h2
            className="text-2xl md:text-5xl sf-display-black font-black tracking-tight text-[#1e293b] leading-tight whitespace-nowrap"
            style={{
              fontWeight: 900,
              letterSpacing: '-0.03em',
              WebkitTextStroke: '0.5px #1e293b',
            }}
          >
            {upperEn(frozenMode === 'PERSISTENT' ? 'Persistent Session' : 'New Session')}
          </h2>
          <p className="text-[#8a8f98] sf-bold font-bold tracking-wider uppercase text-[0.65rem] opacity-90">
            {frozenMode === 'PERSISTENT' ? 'Encrypted · Saved in this browser' : 'Ephemeral — nothing stored unless you save it'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 mt-1">
          <button
            onClick={() => setShowNetworks(true)}
            className="neu-inset px-3.5 py-1.5 rounded-full flex items-center gap-2 border border-transparent hover:border-transparent transition-colors cursor-pointer"
          >
            <span className="text-[0.65rem] md:text-xs sf-display-black font-extrabold tracking-wider uppercase text-[#23262b] truncate max-w-[80px] md:max-w-none">
              {meta?.name ?? (manualChain ? manualChain.name : 'Network')}
            </span>
            <span className="material-symbols-outlined text-[#8a8f98]" style={{ fontSize: 14 }}>
              expand_more
            </span>
          </button>
          <motion.button
            onClick={() => setMode((m) => (m === 'simple' ? 'advanced' : 'simple'))}
            whileTap={{ scale: 0.95 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 12px',
              borderRadius: 9999,
              border: `1px solid ${mode === 'advanced' ? 'rgba(43,45,51,0.3)' : 'rgba(166,177,198,0.1)'}`,
              background: mode === 'advanced' ? 'rgba(43,45,51,0.08)' : 'rgba(166,177,198,0.04)',
              cursor: 'pointer',
              transition: 'border-color 0.25s, background 0.25s',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#2b2d33' }}>
              {mode === 'advanced' ? 'arrow_back' : 'settings'}
            </span>
            <AnimatePresence mode="wait">
              <motion.span
                key={mode}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="sf-display-black"
                style={{ fontSize: 10, fontWeight: 800, color: '#2b2d33', textTransform: 'uppercase', letterSpacing: '0.08em' }}
              >
                {mode === 'simple' ? 'Advanced' : 'Simple'}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </div>
      </div>

      {/* Balance card */}
      <div className="space-y-3 md:space-y-6">
        <p className="text-[#8a8f98] sf-display-black tracking-[0.15em] uppercase text-xs font-bold opacity-75">Selected Chain Balance</p>
        <div className="flex items-end gap-4">
          <h1 className="text-[2.6rem] md:text-[9rem] font-black tracking-tighter leading-none text-[#23262b]">
            {isLoadingTotal ? (
              <span className="text-[#8a8f98] opacity-30">...</span>
            ) : (
              <span className="flex items-baseline gap-0">
                <span className="text-[#8a8f98] opacity-60">$</span>
                {showFullBalance ? (
                  <span>{countTo.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</span>
                ) : (
                  <span className="flex items-baseline gap-0">
                    <CountUp key={countKey + '_vis'} from={Math.floor(countFrom)} to={Math.floor(countTo)} separator="," duration={2.5} />
                    <span style={{ color: 'rgba(166,177,198,0.5)' }}>.</span>
                    <span style={{ color: 'rgba(166,177,198,0.5)' }}>{String(Math.round((countTo % 1) * 100)).padStart(2, '0')}</span>
                    <button
                      onClick={() => setShowFullBalance(true)}
                      className="hover:opacity-80 transition-opacity font-black"
                      style={{
                        fontSize: '0.55em',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0 0 0 2px',
                        lineHeight: 1,
                        color: 'rgba(166,177,198,0.3)',
                        letterSpacing: '-0.02em',
                        alignSelf: 'flex-end',
                        marginBottom: '0.15em',
                      }}
                    >
                      ...
                    </button>
                  </span>
                )}
              </span>
            )}
          </h1>
          {isRefreshing && (
            <div
              className="mb-4"
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                border: '2px solid rgba(43,45,51,0.2)',
                borderTopColor: '#2b2d33',
                animation: 'spin 1s linear infinite',
              }}
            />
          )}
        </div>

        {/* Address pill */}
        <div
          className="neu-pill-inset text-[#23262b] p-5 md:p-7 rounded-full flex justify-between items-center group cursor-pointer hover:opacity-80 transition-all"
          style={{ background: '#e4e6ee' }}
          onClick={handleCopy}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {meta ? (
              <CoinIcon symbol={meta.symbol} color={meta.color} logoUrl={meta.logoUrl} size={40} />
            ) : (
              <ChainIcon chain={selectedChain} size={40} />
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-[0.65rem] sf-display-black font-extrabold uppercase tracking-widest opacity-70 mb-1">
                {meta ? `${meta.name} Address` : 'Active Monolith Address'}
              </span>
              <span className="text-base md:text-3xl font-black tracking-tighter font-mono truncate">{shortAddr}</span>
            </div>
          </div>
          <span className="material-symbols-outlined text-3xl md:text-4xl ml-3 flex-shrink-0">{copied ? 'check' : 'content_copy'}</span>
        </div>
      </div>
    </>
  );
}
