'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@/context/WalletContext';
import { getPrices } from '@/lib/prices';
import { NON_EVM_META, type ChainTx } from '@/components/dashboard/types';

import { deriveBTCWallet, getBTCBalance, getBTCTransactions, buildBTCTransaction, broadcastBTC, estimateBTCFee } from '@/lib/btc';
import { deriveDOGEWallet, getDOGEBalance, getDOGETransactions, buildDOGETransaction, broadcastDOGE, estimateDOGEFee } from '@/lib/doge';
import { deriveBCHWallet, getBCHBalance, getBCHTransactions, buildBCHTransaction, broadcastBCH, estimateBCHFee } from '@/lib/bch';
import { deriveSOLWallet, getSOLBalance, getSOLTransactions, sendSOL, estimateSOLFee } from '@/lib/sol';
import { deriveXRPWallet, getXRPBalance, getXRPTransactions, sendXRP } from '@/lib/xrp';
import { deriveXLMWallet, getXLMBalance, getXLMTransactions, sendXLM } from '@/lib/xlm';
import { deriveNANOWallet, getNANOBalance, getNANOTransactions, sendNANO } from '@/lib/nano';
import { deriveHBARWallet, getHBARBalance, getHBARTransactions, sendHBAR } from '@/lib/hedera';
import { deriveSUIWallet, getSUIBalance, getSUITransactions, sendSUI } from '@/lib/sui';
import { deriveAPTOSWallet, getAPTOSBalance, getAPTOSTransactions, sendAPTOS } from '@/lib/aptos';
import { deriveLTCWallet, getLTCBalance, getLTCTransactions, buildLTCTransaction, broadcastLTC, estimateLTCFee } from '@/lib/ltc';
import { deriveTronWallet, getTronBalance, getTetherBalanceOnTron, sendTRX, sendTetherOnTron } from '@/lib/tron';

export function useNonEvmWallet() {
  const wallet = useWallet();
  const [selectedNonEvm, setSelectedNonEvm] = useState<string | null>(null);
  const [nonEvmAddr, setNonEvmAddr] = useState<string | null>(null);
  const [nonEvmBal, setNonEvmBal] = useState<number | null>(null);
  const [nonEvmUsdPrice, setNonEvmUsdPrice] = useState(0);
  const [nonEvmLoading, setNonEvmLoading] = useState(false);

  const loadNonEvmData = useCallback(
    async (coin: string) => {
      if (!wallet.isUnlocked) return;
      setNonEvmLoading(true);
      setNonEvmAddr(null);
      setNonEvmBal(null);
      try {
        const mnemonic = await wallet.getMnemonicForExport();
        if (!mnemonic) return;
        let addr = '';
        if (coin === 'BTC') {
          addr = deriveBTCWallet(mnemonic).address;
        } else if (coin === 'DOGE') {
          addr = deriveDOGEWallet(mnemonic).address;
        } else if (coin === 'BCH') {
          addr = deriveBCHWallet(mnemonic).address;
        } else if (coin === 'SOL') {
          addr = deriveSOLWallet(mnemonic).address;
        } else if (coin === 'XRP') {
          addr = deriveXRPWallet(mnemonic).address;
        } else if (coin === 'XLM') {
          addr = deriveXLMWallet(mnemonic).address;
        } else if (coin === 'NANO') {
          addr = deriveNANOWallet(mnemonic).address;
        } else if (coin === 'HBAR') {
          addr = deriveHBARWallet(mnemonic).evmAddress;
        } else if (coin === 'SUI') {
          addr = deriveSUIWallet(mnemonic).address;
        } else if (coin === 'APTOS') {
          addr = deriveAPTOSWallet(mnemonic).address;
        } else if (coin === 'LTC') {
          addr = deriveLTCWallet(mnemonic).address;
        } else if (coin === 'TRON' || coin === 'USDT') {
          addr = deriveTronWallet(mnemonic).address;
        }

        setNonEvmAddr(addr);
        let bal = 0;
        try {
          if (coin === 'BTC') {
            bal = (await getBTCBalance(addr)).total;
          } else if (coin === 'DOGE') {
            bal = (await getDOGEBalance(addr)).total;
          } else if (coin === 'BCH') {
            bal = (await getBCHBalance(addr)).total;
          } else if (coin === 'SOL') {
            bal = (await getSOLBalance(addr)).sol;
          } else if (coin === 'XRP') {
            bal = (await getXRPBalance(addr)).xrp;
          } else if (coin === 'XLM') {
            bal = (await getXLMBalance(addr)).xlm;
          } else if (coin === 'NANO') {
            bal = (await getNANOBalance(addr)).nano;
          } else if (coin === 'HBAR') {
            bal = (await getHBARBalance(addr)).hbar;
          } else if (coin === 'SUI') {
            bal = (await getSUIBalance(addr)).sui;
          } else if (coin === 'APTOS') {
            bal = (await getAPTOSBalance(addr)).apt;
          } else if (coin === 'LTC') {
            bal = (await getLTCBalance(addr)).total;
          } else if (coin === 'TRON') {
            bal = (await getTronBalance(addr)).trx;
          } else if (coin === 'USDT') {
            bal = (await getTetherBalanceOnTron(addr)).usdt;
          }
        } catch {
          bal = 0;
        }
        setNonEvmBal(bal);

        const meta = NON_EVM_META[coin];
        if (meta?.coingeckoId) {
          const p = await getPrices([meta.coingeckoId]);
          setNonEvmUsdPrice(p[meta.coingeckoId] ?? 0);
        }
      } catch {
        setNonEvmBal(0);
      } finally {
        setNonEvmLoading(false);
      }
    },
    [wallet]
  );

  useEffect(() => {
    if (selectedNonEvm) loadNonEvmData(selectedNonEvm);
  }, [selectedNonEvm, loadNonEvmData]);

  const handleNonEvmSend = useCallback(
    async (to: string, amount: number, feeSpeed: 'slow' | 'medium' | 'fast'): Promise<string> => {
      const mnemonic = await wallet.getMnemonicForExport();
      if (!mnemonic) throw new Error('Wallet locked');
      const coin = selectedNonEvm!;
      if (coin === 'BTC') {
        const w = deriveBTCWallet(mnemonic);
        const fees = await estimateBTCFee();
        const { hex } = await buildBTCTransaction({ from: w, to, amountBTC: amount, feeRate: fees[feeSpeed] });
        return broadcastBTC(hex);
      }
      if (coin === 'DOGE') {
        const w = deriveDOGEWallet(mnemonic);
        const fees = await estimateDOGEFee();
        const { hex } = await buildDOGETransaction({ from: w, to, amountDOGE: amount, feeRate: fees[feeSpeed] });
        return broadcastDOGE(hex);
      }
      if (coin === 'BCH') {
        const w = deriveBCHWallet(mnemonic);
        const fees = await estimateBCHFee();
        const { hex } = await buildBCHTransaction({ from: w, to, amountBCH: amount, feeRate: fees[feeSpeed] });
        return broadcastBCH(hex);
      }
      if (coin === 'SOL') {
        const w = deriveSOLWallet(mnemonic);
        return sendSOL(w, to, amount);
      }
      if (coin === 'XRP') {
        const w = deriveXRPWallet(mnemonic);
        return sendXRP(w, to, amount);
      }
      if (coin === 'XLM') {
        const w = deriveXLMWallet(mnemonic);
        return sendXLM(w, to, amount);
      }
      if (coin === 'NANO') {
        const w = deriveNANOWallet(mnemonic);
        return sendNANO(w, to, amount);
      }
      if (coin === 'HBAR') {
        const w = deriveHBARWallet(mnemonic);
        return sendHBAR(w, to, amount);
      }
      if (coin === 'SUI') {
        const w = deriveSUIWallet(mnemonic);
        return sendSUI(w, to, amount);
      }
      if (coin === 'APTOS') {
        const w = deriveAPTOSWallet(mnemonic);
        return sendAPTOS(w, to, amount);
      }
      if (coin === 'LTC') {
        const w = deriveLTCWallet(mnemonic);
        const fees = await estimateLTCFee();
        const { hex } = await buildLTCTransaction({ from: w, to, amountLTC: amount, feeRate: fees[feeSpeed] });
        return broadcastLTC(hex);
      }
      if (coin === 'TRON') {
        const w = deriveTronWallet(mnemonic);
        return sendTRX(w.privateKey, to, amount);
      }
      if (coin === 'USDT') {
        const w = deriveTronWallet(mnemonic);
        return sendTetherOnTron(w.privateKey, to, amount);
      }
      throw new Error('Unknown coin');
    },
    [wallet, selectedNonEvm]
  );

  const handleNonEvmGetHistory = useCallback(async (): Promise<ChainTx[]> => {
    if (!nonEvmAddr) return [];
    const coin = selectedNonEvm!;
    const toTx = (t: { txid: string; amount: number; timestamp: number }) => t;
    if (coin === 'BTC') return (await getBTCTransactions(nonEvmAddr)).map(toTx);
    if (coin === 'DOGE') return (await getDOGETransactions(nonEvmAddr)).map(toTx);
    if (coin === 'BCH') return (await getBCHTransactions(nonEvmAddr)).map(toTx);
    if (coin === 'SOL') return (await getSOLTransactions(nonEvmAddr)).map(toTx);
    if (coin === 'XRP') return (await getXRPTransactions(nonEvmAddr)).map(toTx);
    if (coin === 'XLM') return (await getXLMTransactions(nonEvmAddr)).map(toTx);
    if (coin === 'NANO') return (await getNANOTransactions(nonEvmAddr)).map(toTx);
    if (coin === 'HBAR') return (await getHBARTransactions(nonEvmAddr)).map(toTx);
    if (coin === 'SUI') return (await getSUITransactions(nonEvmAddr)).map(toTx);
    if (coin === 'APTOS') return (await getAPTOSTransactions(nonEvmAddr)).map(toTx);
    if (coin === 'LTC') return (await getLTCTransactions(nonEvmAddr)).map(toTx);
    return [];
  }, [nonEvmAddr, selectedNonEvm]);

  const handleNonEvmGetFees = useCallback(async () => {
    const coin = selectedNonEvm!;
    if (coin === 'BTC') return estimateBTCFee();
    if (coin === 'DOGE') return estimateDOGEFee();
    if (coin === 'BCH') return estimateBCHFee();
    if (coin === 'SOL') {
      const f = await estimateSOLFee();
      return { slow: f, medium: f, fast: f };
    }
    return { slow: 0, medium: 0, fast: 0 };
  }, [selectedNonEvm]);

  return {
    selectedNonEvm,
    setSelectedNonEvm,
    nonEvmAddr,
    nonEvmBal,
    nonEvmUsdPrice,
    nonEvmLoading,
    loadNonEvmData,
    handleNonEvmSend,
    handleNonEvmGetHistory,
    handleNonEvmGetFees,
  };
}
