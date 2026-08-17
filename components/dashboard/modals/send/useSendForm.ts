'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '@/context/WalletContext';
import { type Chain } from '@/lib/chains';
import { fetchTokenBalances } from '@/lib/tokens';
import { getPrices } from '@/lib/prices';
import { estimateFee, buildMaskedTransaction, stealthDelay, fireDummyEchoes } from '@/lib/transaction';
import { scanAddress, scanToken, type AddressRisk, type TokenRisk } from '@/lib/security-scan';
import { ephemeralSign } from '@/lib/signer';
import { ledgerSign, type LedgerEntry } from '@/lib/ledger';
import { getProvider } from '@/lib/provider';
import { loadContacts, type Contact } from '@/lib/address-book';
import type { TokenBalance } from '../../types';

export function useSendForm({
  tokens,
  defaultChain,
  activeLedger,
}: {
  tokens: TokenBalance[];
  defaultChain: Chain;
  activeLedger?: LedgerEntry | null;
}) {
  const wallet = useWallet();
  const [to, setTo] = useState('');
  const [whole, setWhole] = useState('');
  const [dec, setDec] = useState('');
  const [selectedChain, setSelectedChain] = useState<Chain>(defaultChain);
  const [networkOpen, setNetworkOpen] = useState(false);
  const [tokenOpen, setTokenOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [contacts] = useState<Contact[]>(() => loadContacts());
  const [chainTokens, setChainTokens] = useState<TokenBalance[]>(tokens);
  const [selectedToken, setSelectedToken] = useState<TokenBalance | null>(null);
  const [status, setStatus] = useState<'idle' | 'simulating' | 'confirm' | 'signing' | 'sending' | 'done' | 'error'>('idle');
  const [txHash, setTxHash] = useState('');
  const [errMsg, setErrMsg] = useState('');
  const [simResult, setSimResult] = useState<{ changes: Array<{ changeType: string; from: string; to: string; amount?: string; symbol?: string }>; gas: number } | null>(null);
  const [addrRisk, setAddrRisk] = useState<AddressRisk | null>(null);
  const [tokenRisk, setTokenRisk] = useState<TokenRisk | null>(null);
  const [riskDismissed, setRiskDismissed] = useState(false);

  const [feeEth, setFeeEth] = useState<string | null>(null);
  const [feeUsd, setFeeUsd] = useState<number | null>(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const feeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nativePriceRef = useRef<number>(0);
  const qrInputRef = useRef<HTMLInputElement>(null);

  const handleQRScan = async (file: File) => {
    const parseQRAddress = (raw: string): string =>
      raw.startsWith('ethereum:') ? raw.replace(/^ethereum:/i, '').split('?')[0].split('@')[0] : raw;

    try {
      const bitmap = await createImageBitmap(file);
      // @ts-expect-error BarcodeDetector not in all TS libs yet
      if (typeof BarcodeDetector !== 'undefined') {
        // @ts-expect-error BarcodeDetector
        const codes = await new BarcodeDetector({ formats: ['qr_code'] }).detect(bitmap);
        if (codes.length > 0) {
          const addr = parseQRAddress(codes[0].rawValue);
          if (ethers.isAddress(addr)) {
            setTo(addr);
            return;
          }
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(bitmap, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { default: jsQR } = await import('jsqr');
      const code = jsQR(imgData.data, imgData.width, imgData.height);
      if (code) {
        const addr = parseQRAddress(code.data);
        if (ethers.isAddress(addr)) setTo(addr);
      }
    } catch {}
  };

  useEffect(() => {
    if (!wallet.activeAddress) return;
    fetchTokenBalances(wallet.activeAddress, selectedChain.id)
      .then((toks) => {
        setChainTokens(toks);
        const withBal = toks.filter((t) => parseFloat(t.balance || '0') > 0);
        setSelectedToken(withBal[0] ?? toks.find((t) => t.contractAddress === 'native') ?? toks[0] ?? null);
      })
      .catch(() => {
        setChainTokens([]);
        setSelectedToken(null);
      });
  }, [selectedChain.id, wallet.activeAddress]);

  useEffect(() => {
    getPrices([selectedChain.coingeckoId])
      .then((p) => {
        nativePriceRef.current = p[selectedChain.coingeckoId] ?? 0;
      })
      .catch(() => {});
  }, [selectedChain.id, selectedChain.coingeckoId]);

  const refreshFee = useCallback(
    (toAddr: string, amtStr: string, token: TokenBalance | null, chain: Chain, fromAddr: string) => {
      if (feeTimerRef.current) clearTimeout(feeTimerRef.current);
      const isErc20 = !!(token && token.contractAddress !== 'native');

      let txParams: Parameters<typeof estimateFee>[2];
      const validTo = ethers.isAddress(toAddr);
      const amt = parseFloat(amtStr);
      if (validTo && amt > 0 && fromAddr) {
        try {
          if (isErc20 && token && token.contractAddress !== 'native') {
            const amountRaw = ethers.parseUnits(amtStr, token.decimals ?? 18);
            const addr = toAddr.toLowerCase().replace('0x', '').padStart(64, '0');
            const amtHex = amountRaw.toString(16).padStart(64, '0');
            txParams = {
              from: fromAddr,
              to: token.contractAddress as string,
              value: 0n,
              data: '0xa9059cbb' + addr + amtHex,
            };
          } else {
            txParams = {
              from: fromAddr,
              to: toAddr,
              value: ethers.parseEther(amtStr),
            };
          }
        } catch {
          txParams = undefined;
        }
      }

      setFeeLoading(true);
      feeTimerRef.current = setTimeout(async () => {
        try {
          const { eth } = await estimateFee(chain.id, isErc20, txParams);
          const ethNum = parseFloat(eth);
          const formatted = ethNum < 0.000001 ? ethNum.toExponential(2) : ethNum.toFixed(8).replace(/\.?0+$/, '');
          setFeeEth(formatted);
          setFeeUsd(ethNum * nativePriceRef.current);
        } catch {
          setFeeEth(null);
          setFeeUsd(null);
        } finally {
          setFeeLoading(false);
        }
      }, 500);
    },
    []
  );

  useEffect(() => {
    if (!wallet.activeAddress) return;
    const amtStr = `${whole || '0'}.${dec || '0'}`;
    refreshFee(to, amtStr, selectedToken, selectedChain, wallet.activeAddress);
    return () => {
      if (feeTimerRef.current) clearTimeout(feeTimerRef.current);
    };
  }, [to, whole, dec, selectedToken, selectedChain, wallet.activeAddress, refreshFee]);

  useEffect(() => {
    setAddrRisk(null);
    setRiskDismissed(false);
    if (!ethers.isAddress(to)) return;
    const timer = setTimeout(() => {
      scanAddress(to).then(setAddrRisk).catch(() => {});
    }, 700);
    return () => clearTimeout(timer);
  }, [to]);

  useEffect(() => {
    setTokenRisk(null);
    const addr = selectedToken?.contractAddress;
    if (!addr || addr === 'native') return;
    const timer = setTimeout(() => {
      scanToken(selectedChain.id, addr).then(setTokenRisk).catch(() => {});
    }, 700);
    return () => clearTimeout(timer);
  }, [selectedToken?.contractAddress, selectedChain.id]);

  const isNative = !selectedToken || selectedToken.contractAddress === 'native';
  const amountStr = `${whole || '0'}.${dec || '0'}`;
  const amountNum = parseFloat(amountStr);
  const selectedBal = parseFloat(selectedToken?.balance ?? '0');
  const tokenSymbol = selectedToken?.symbol ?? selectedChain.symbol;

  const handleSend = async () => {
    if (!wallet.activeAddress || !wallet.scatteredKeyStore) {
      setErrMsg('Wallet not ready');
      return;
    }
    if (!ethers.isAddress(to)) {
      setErrMsg('Invalid address');
      return;
    }
    if (!amountNum || amountNum <= 0 || isNaN(amountNum)) {
      setErrMsg('Invalid amount');
      return;
    }
    if (amountNum > selectedBal) {
      setErrMsg('Secili Networkta Bakiye Yetersiz');
      return;
    }

    const contractAddr = !isNative && selectedToken ? (selectedToken.contractAddress as string) : undefined;
    const decimals = selectedToken?.decimals ?? 18;

    if (selectedChain.isAlchemy) {
      setStatus('simulating');
      setErrMsg('');
      setSimResult(null);
      try {
        const txForSim = await buildMaskedTransaction(
          to,
          amountStr,
          wallet.activeAddress,
          selectedChain.id,
          contractAddr,
          decimals
        );
        const simRes = await fetch('/api/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tx: {
              from: wallet.activeAddress,
              to: txForSim.to,
              value: txForSim.value ? '0x' + (txForSim.value as bigint).toString(16) : '0x0',
              data: txForSim.data ?? '0x',
            },
            chainId: selectedChain.id,
          }),
        });
        if (simRes.ok) {
          const simData = await simRes.json();
          if (!simData.error) {
            setSimResult({ changes: simData.changes ?? [], gas: parseInt(simData.gasUsed ?? '0x0', 16) });
          }
        }
      } catch {}
      setStatus('confirm');
      return;
    }

    await executeSend(contractAddr, decimals);
  };

  const executeSend = async (contractAddr?: string, decimals = 18) => {
    if (!wallet.activeAddress || (!wallet.scatteredKeyStore && !activeLedger)) return;
    setStatus('signing');
    setErrMsg('');
    try {
      const tx = await buildMaskedTransaction(to, amountStr, wallet.activeAddress, selectedChain.id, contractAddr, decimals);
      setStatus('sending');
      await stealthDelay();
      void fireDummyEchoes();
      const signed = activeLedger
        ? await ledgerSign(activeLedger.derivationPath, { ...tx, from: wallet.activeAddress })
        : await ephemeralSign(wallet.scatteredKeyStore!, tx);
      const provider = getProvider(selectedChain.id);
      const result = await provider.send('eth_sendRawTransaction', [signed]);
      if (result && typeof result === 'object') {
        const err = (result as Record<string, unknown>).error ?? result;
        const errMsg_ = (err as Record<string, unknown>).message;
        throw new Error(typeof errMsg_ === 'string' ? errMsg_ : JSON.stringify(err));
      }
      setTxHash(typeof result === 'string' ? result : '');
      setStatus('done');
    } catch (e: unknown) {
      let msg = 'Transaction failed';
      try {
        const raw: string = (() => {
          if (e instanceof Error) return e.message;
          if (typeof e === 'string') return e;
          try {
            return JSON.stringify(e);
          } catch {
            return 'Unknown error';
          }
        })();
        const jsonMatch = raw.match(/\{[\s\S]{0,500}\}/);
        if (jsonMatch) {
          try {
            const p = JSON.parse(jsonMatch[0]);
            const inner = p?.error?.message ?? p?.message ?? p?.reason;
            msg = typeof inner === 'string' ? inner.slice(0, 140) : 'Transaction rejected by network';
          } catch {
            msg = raw.slice(0, 120) + (raw.length > 120 ? '…' : '');
          }
        } else {
          const m = raw.match(/reason["\s:]+([^"}{,\n]{3,80})/i) ?? raw.match(/message["\s:]+([^"}{,\n]{3,80})/i);
          msg = m ? m[1].trim() : raw.length <= 120 ? raw : raw.slice(0, 120) + '…';
        }
      } catch {}
      setErrMsg(String(msg));
      setStatus('error');
    }
  };

  return {
    wallet,
    to, setTo,
    whole, setWhole,
    dec, setDec,
    selectedChain, setSelectedChain,
    networkOpen, setNetworkOpen,
    tokenOpen, setTokenOpen,
    contactOpen, setContactOpen,
    contacts,
    chainTokens,
    selectedToken, setSelectedToken,
    status, setStatus,
    txHash,
    errMsg,
    simResult, setSimResult,
    addrRisk,
    tokenRisk,
    riskDismissed, setRiskDismissed,
    feeEth, feeUsd, feeLoading,
    qrInputRef, handleQRScan,
    amountStr, selectedBal, tokenSymbol, isNative,
    handleSend, executeSend,
  };
}
