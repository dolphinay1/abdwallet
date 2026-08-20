'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { springs, variants } from '@/lib/animations';
import { formatUSD } from '@/lib/prices';
import type { Chain } from '@/lib/chains';
import { ChainIcon } from '../ui/ChainIcon';
import { CoinIcon } from '../ui/CoinIcon';
import { NON_EVM_META, type TokenBalance } from '../types';

export function BalanceTab({
  selectedNonEvm,
  nonEvmBal,
  nonEvmUsdPrice,
  nonEvmLoading,
  manualChain,
  allChainTokens,
  tokens,
  prices,
  changes24h,
  isLoadingTotal,
  selectedChain,
}: {
  selectedNonEvm: string | null;
  nonEvmBal: number | null;
  nonEvmUsdPrice: number;
  nonEvmLoading: boolean;
  manualChain: Chain | null;
  allChainTokens: Array<{ chain: Chain; toks: TokenBalance[]; p: Record<string, number> }>;
  tokens: TokenBalance[];
  prices: Record<string, number>;
  changes24h: Record<string, number | null>;
  isLoadingTotal: boolean;
  selectedChain: Chain;
}) {
  // Non-EVM balance card — shown when non-EVM chain selected
  if (selectedNonEvm) {
    const meta = NON_EVM_META[selectedNonEvm];
    const bal = nonEvmBal;
    const usdVal = bal !== null ? bal * nonEvmUsdPrice : null;
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1 mb-2">
          <span className="sf-display-black" style={{ fontSize: 9.5, fontWeight: 900, color: meta?.color ?? '#64748b', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Current Network — {meta?.name ?? selectedNonEvm}
          </span>
        </div>
        <div className="flex items-center justify-between p-6 neu-card-sm text-[#23262b] rounded-xl">
          <div className="flex items-center gap-4">
            {meta && <CoinIcon symbol={meta.symbol} color={meta.color} logoUrl={meta.logoUrl} size={48} />}
            <div>
              <p className="font-black text-[#f5f6fa] text-base">{meta?.symbol ?? selectedNonEvm}</p>
              <p style={{ fontSize: '0.65rem', color: '#5b6270', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                {meta?.name ?? selectedNonEvm}
              </p>
            </div>
          </div>
          <div className="text-right">
            {nonEvmLoading ? (
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  border: '2px solid #5b6270',
                  borderTopColor: '#c9ced9',
                  animation: 'spin 1s linear infinite',
                }}
              />
            ) : (
              <>
                <p className="font-black text-[#f5f6fa] text-base">
                  {bal === null
                    ? '—'
                    : bal < 0.000001 && bal > 0
                    ? '< 0.000001'
                    : new Intl.NumberFormat('en-US', { maximumFractionDigits: 8 }).format(bal ?? 0)}
                </p>
                <p style={{ fontSize: '0.65rem', color: '#5b6270', fontWeight: 700 }}>
                  {usdVal !== null && usdVal > 0 ? formatUSD(usdVal) : '—'}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // EVM balance tab
  const ct = manualChain ? allChainTokens.find((x) => x.chain.id === manualChain.id) : null;
  const ctToks = ct?.toks ?? tokens;
  const ctP = ct?.p ?? prices;
  const currentToks = ctToks.filter((t) => parseFloat(t.balance || '0') > 0);

  return (
    <div className="space-y-3">
      {/* Current network card */}
      {manualChain && (
        <div className="slide-up mb-1">
          <div className="flex items-center gap-2 px-1 mb-2">
            <span className="sf-display-black" style={{ fontSize: 9.5, fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              Current Network — {manualChain.name}
            </span>
          </div>
          {currentToks.length === 0 ? (
            <div className="flex items-center justify-between p-6 neu-card-sm text-[#23262b] rounded-xl">
              <div className="flex items-center gap-4">
                <ChainIcon chain={manualChain} size={48} />
                <div>
                  <p className="font-black text-[#f5f6fa] text-base">{manualChain.symbol}</p>
                  <p style={{ fontSize: '0.65rem', color: '#5b6270', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                    {manualChain.name}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-black text-[#f5f6fa] text-base">0</p>
                <p style={{ fontSize: '0.65rem', color: '#5b6270', fontWeight: 700 }}>—</p>
              </div>
            </div>
          ) : (
            currentToks.map((token, i) => {
              const cgId = token.coingeckoId ?? manualChain.coingeckoId;
              const price = cgId ? ctP[cgId] ?? 0 : 0;
              const usdVal = parseFloat(token.balance || '0') * price;
              const bal = parseFloat(token.balance || '0');
              return (
                <div
                  key={`cur-${token.contractAddress}-${i}`}
                  className="flex items-center justify-between p-6 neu-card-sm text-[#23262b] rounded-xl"
                  style={{ marginBottom: i < currentToks.length - 1 ? 4 : 0 }}
                >
                  <div className="flex items-center gap-4">
                    {token.logo ? (
                      <img
                        src={token.logo}
                        alt={token.symbol}
                        style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          background: '#23262b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 900,
                          fontSize: 18,
                          color: '#5b6270',
                          flexShrink: 0,
                        }}
                      >
                        {token.symbol.slice(0, 1)}
                      </div>
                    )}
                    <div>
                      <p style={{ fontWeight: 900, color: '#e4e6ee', fontSize: '1.05rem' }}>{token.symbol}</p>
                      <p style={{ fontSize: '0.65rem', color: '#5b6270', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                        {manualChain.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p style={{ fontWeight: 900, color: '#e4e6ee', fontSize: '1.05rem' }}>
                      {bal < 0.000001 ? '< 0.000001' : new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(bal)}
                    </p>
                    <p style={{ fontSize: '0.65rem', color: '#5b6270', fontWeight: 700 }}>{usdVal > 0 ? formatUSD(usdVal) : '—'}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* All chains with non-zero balance */}
      {isLoadingTotal ? (
        <div className="flex justify-center py-12">
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: '2px solid rgba(43,45,51,0.2)',
              borderTopColor: '#2b2d33',
              animation: 'spin 1s linear infinite',
            }}
          />
        </div>
      ) : allChainTokens.length > 0 ? (
        (() => {
          const items = allChainTokens.flatMap(({ chain: c, toks, p }, ci) =>
            toks.filter((t) => parseFloat(t.balance || '0') > 0 && c.id !== manualChain?.id).map((token, i) => ({ c, token, p, ci, i }))
          );
          return (
            <motion.div variants={variants.staggerContainer} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map(({ c, token, p, i }) => {
                const cgId = token.coingeckoId ?? c.coingeckoId;
                const price = cgId ? p[cgId] ?? 0 : 0;
                const usdVal = parseFloat(token.balance || '0') * price;
                const chg = cgId ? changes24h[cgId] ?? null : null;
                return (
                  <motion.div
                    key={`${c.id}-${token.contractAddress}-${i}`}
                    variants={variants.staggerItem}
                    transition={springs.smooth}
                    whileHover={{ x: 4, transition: springs.snappy }}
                    className="flex items-center justify-between p-6 neu-card-sm rounded-xl border border-transparent hover:opacity-80 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-5">
                      {token.logo ? (
                        <img
                          src={token.logo}
                          alt={token.symbol}
                          className="w-14 h-14 rounded-full object-cover shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-14 h-14 neu-card-sm rounded-full flex items-center justify-center font-black text-xl shrink-0">
                          {token.symbol.slice(0, 1)}
                        </div>
                      )}
                      <div>
                        <p className="sf-display-black font-black text-[#1e293b] text-lg tracking-tight">{token.symbol}</p>
                        <p className="sf-bold text-[0.7rem] text-[#64748b] uppercase tracking-wider font-bold">{c.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="sf-mono-bold font-bold text-[#1e293b] text-lg">
                        {parseFloat(token.balance) < 0.000001
                          ? '< 0.000001'
                          : new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(parseFloat(token.balance))}
                      </p>
                      <p className="sf-bold text-[0.7rem] text-[#64748b] tracking-wider font-bold">{price > 0 ? formatUSD(usdVal) : '—'}</p>
                      {chg !== null && (
                        <p className="sf-mono-bold font-bold text-[10px]" style={{ color: chg >= 0 ? '#059669' : '#b91c1c' }}>
                          {chg >= 0 ? '▲' : '▼'} {Math.abs(chg).toFixed(2)}%
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          );
        })()
      ) : (
        tokens
          .filter((t) => parseFloat(t.balance || '0') > 0)
          .map((token, i) => {
            const cgId = token.coingeckoId ?? selectedChain.coingeckoId;
            const price = cgId ? prices[cgId] ?? 0 : 0;
            const usdVal = parseFloat(token.balance || '0') * price;
            const chg = cgId ? changes24h[cgId] ?? null : null;
            return (
              <div
                key={`${token.contractAddress}-${i}`}
                className="slide-up flex items-center justify-between p-6 neu-card-sm rounded-xl border border-transparent hover:opacity-80 transition-all cursor-pointer"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-center gap-5">
                  {token.logo ? (
                    <img
                      src={token.logo}
                      alt={token.symbol}
                      className="w-14 h-14 rounded-full object-cover shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-14 h-14 neu-card-sm rounded-full flex items-center justify-center font-black text-xl shrink-0">
                      {token.symbol.slice(0, 1)}
                    </div>
                  )}
                  <div>
                    <p className="sf-display-black font-black text-[#1e293b] text-lg tracking-tight">{token.symbol}</p>
                    <p className="sf-bold text-[0.7rem] text-[#64748b] uppercase tracking-wider font-bold">{token.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="sf-mono-bold font-bold text-[#1e293b] text-lg">
                    {parseFloat(token.balance) < 0.000001
                      ? '< 0.000001'
                      : new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(parseFloat(token.balance))}
                  </p>
                  <p className="sf-bold text-[0.7rem] text-[#64748b] tracking-wider font-bold">{price > 0 ? formatUSD(usdVal) : '—'}</p>
                  {chg !== null && (
                    <p className="sf-mono-bold font-bold text-[10px]" style={{ color: chg >= 0 ? '#059669' : '#b91c1c' }}>
                      {chg >= 0 ? '▲' : '▼'} {Math.abs(chg).toFixed(2)}%
                    </p>
                  )}
                </div>
              </div>
            );
          })
      )}
    </div>
  );
}
