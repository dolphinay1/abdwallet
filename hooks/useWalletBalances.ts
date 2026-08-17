'use client';

import { useState, useCallback, useRef } from 'react';
import { CHAINS, type Chain } from '@/lib/chains';
import { fetchTokenBalances } from '@/lib/tokens';
import { getPrices, getPriceData } from '@/lib/prices';
import { NON_EVM_META, type TokenBalance } from '@/components/dashboard/types';

import { deriveBTCWallet, getBTCBalance } from '@/lib/btc';
import { deriveDOGEWallet, getDOGEBalance } from '@/lib/doge';
import { deriveBCHWallet, getBCHBalance } from '@/lib/bch';
import { deriveSOLWallet, getSOLBalance } from '@/lib/sol';
import { deriveXRPWallet, getXRPBalance } from '@/lib/xrp';
import { deriveXLMWallet, getXLMBalance } from '@/lib/xlm';
import { deriveNANOWallet, getNANOBalance } from '@/lib/nano';
import { deriveHBARWallet, getHBARBalance } from '@/lib/hedera';
import { deriveSUIWallet, getSUIBalance } from '@/lib/sui';
import { deriveAPTOSWallet, getAPTOSBalance } from '@/lib/aptos';
import { deriveLTCWallet, getLTCBalance } from '@/lib/ltc';
import { deriveTronWallet, getTronBalance, getTetherBalanceOnTron } from '@/lib/tron';

export function useWalletBalances() {
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [changes24h, setChanges24h] = useState<Record<string, number | null>>({});
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [isLoadingTotal, setIsLoadingTotal] = useState(false);
  const [allChainsTotal, setAllChainsTotal] = useState<number | null>(null);
  const [allChainTokens, setAllChainTokens] = useState<
    Array<{ chain: Chain; toks: TokenBalance[]; p: Record<string, number> }>
  >([]);

  const loadTokens = useCallback(async (address: string, chain: Chain) => {
    if (!address) return;
    setIsLoadingTokens(true);
    try {
      const toks = await fetchTokenBalances(address, chain.id);
      setTokens(toks);
      const cgIds = [...new Set([chain.coingeckoId, ...toks.map((t) => t.coingeckoId).filter(Boolean) as string[]])];
      if (cgIds.length > 0) {
        const pd = await getPriceData(cgIds);
        setPrices(Object.fromEntries(Object.entries(pd).map(([k, v]) => [k, v.price])));
        setChanges24h(Object.fromEntries(Object.entries(pd).map(([k, v]) => [k, v.change24h])));
      }
    } finally {
      setIsLoadingTokens(false);
    }
  }, []);

  const refreshAllBalances = useCallback(
    async (
      address: string,
      getMnemonic: () => Promise<string | null>,
      onAutoSelectBestChain?: (chain: Chain, toks: TokenBalance[], p: Record<string, number>) => void
    ) => {
      if (!address) return;
      setIsLoadingTotal(true);
      const alchemyChains = CHAINS.filter((c) => c.isAlchemy);
      const nonEvmCoins = Object.values(NON_EVM_META);

      const nonEvmFetch = getMnemonic()
        .then(async (mnemonic) => {
          if (!mnemonic) return 0;
          const cgIds = nonEvmCoins.map((m) => m.coingeckoId);
          const p = await getPrices(cgIds).catch(() => ({} as Record<string, number>));
          const results = await Promise.allSettled(
            nonEvmCoins.map(async (m) => {
              let bal = 0;
              try {
                if (m.coin === 'BTC') bal = (await getBTCBalance(deriveBTCWallet(mnemonic).address)).total;
                else if (m.coin === 'DOGE') bal = (await getDOGEBalance(deriveDOGEWallet(mnemonic).address)).total;
                else if (m.coin === 'BCH') bal = (await getBCHBalance(deriveBCHWallet(mnemonic).address)).total;
                else if (m.coin === 'SOL') bal = (await getSOLBalance(deriveSOLWallet(mnemonic).address)).sol;
                else if (m.coin === 'XRP') bal = (await getXRPBalance(deriveXRPWallet(mnemonic).address)).xrp;
                else if (m.coin === 'XLM') bal = (await getXLMBalance(deriveXLMWallet(mnemonic).address)).xlm;
                else if (m.coin === 'NANO') bal = (await getNANOBalance(deriveNANOWallet(mnemonic).address)).nano;
                else if (m.coin === 'HBAR') bal = (await getHBARBalance(deriveHBARWallet(mnemonic).evmAddress)).hbar;
                else if (m.coin === 'SUI') bal = (await getSUIBalance(deriveSUIWallet(mnemonic).address)).sui;
                else if (m.coin === 'APTOS') bal = (await getAPTOSBalance(deriveAPTOSWallet(mnemonic).address)).apt;
                else if (m.coin === 'LTC') bal = (await getLTCBalance(deriveLTCWallet(mnemonic).address)).total;
                else if (m.coin === 'TRON') bal = (await getTronBalance(deriveTronWallet(mnemonic).address)).trx;
                else if (m.coin === 'USDT') bal = (await getTetherBalanceOnTron(deriveTronWallet(mnemonic).address)).usdt;
              } catch {
                bal = 0;
              }
              return bal * (p[m.coingeckoId] ?? 0);
            })
          );
          return results.reduce((s, r) => s + (r.status === 'fulfilled' ? r.value : 0), 0);
        })
        .catch(() => 0);

      try {
        const [results, nonEvmTotal] = await Promise.all([
          Promise.all(
            alchemyChains.map(async (c) => {
              try {
                const toks = await fetchTokenBalances(address, c.id);
                const cgIds = [...new Set([c.coingeckoId, ...toks.map((t) => t.coingeckoId).filter(Boolean) as string[]])];
                const p = await getPrices(cgIds);
                const usd = toks.reduce((s, t) => {
                  const cg = t.coingeckoId ?? c.coingeckoId;
                  return s + parseFloat(t.balance || '0') * (p[cg] ?? 0);
                }, 0);
                return { chain: c, usd, toks, p };
              } catch {
                return { chain: c, usd: 0, toks: [], p: {} };
              }
            })
          ),
          nonEvmFetch,
        ]);

        const evmTotal = results.reduce((s, r) => s + r.usd, 0);
        setAllChainsTotal(evmTotal + nonEvmTotal);
        setAllChainTokens(results.map((r) => ({ chain: r.chain, toks: r.toks, p: r.p })));

        if (onAutoSelectBestChain) {
          const best = results.reduce((a, b) => (b.usd > a.usd ? b : a), results[0]);
          if (best && best.usd > 0) {
            onAutoSelectBestChain(best.chain, best.toks, best.p);
          }
        }
      } catch {
        setAllChainsTotal(0);
      } finally {
        setIsLoadingTotal(false);
      }
    },
    []
  );

  return {
    tokens,
    setTokens,
    prices,
    setPrices,
    changes24h,
    setChanges24h,
    isLoadingTokens,
    isLoadingTotal,
    allChainsTotal,
    allChainTokens,
    loadTokens,
    refreshAllBalances,
  };
}
