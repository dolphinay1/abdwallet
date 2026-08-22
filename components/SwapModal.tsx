'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Check, ArrowDownUp, Zap, AlertTriangle } from 'lucide-react';
import { Button, Input } from '@heroui/react';
import { upperEn } from '@/lib/text';
import { useWallet } from '@/context/WalletContext';
import { CHAINS, Chain } from '@/lib/chains';
import { ephemeralSign } from '@/lib/signer';
import { ledgerSign, LedgerEntry } from '@/lib/ledger';
import { getProvider } from '@/lib/provider';
import { ethers } from 'ethers';
import { scanToken, type TokenRisk, riskColor, riskBg } from '@/lib/security-scan';
import { ZeroFeeNote } from '@/components/dashboard/ui/ZeroFeeNote';

// LiFi-supported chain IDs that we also have in CHAINS
const SWAP_CHAIN_IDS = new Set([1, 10, 56, 137, 324, 8453, 42161, 43114, 59144, 81457, 534352]);
const SWAP_CHAINS = CHAINS.filter(c => SWAP_CHAIN_IDS.has(c.id) && !c.isTestnet);

// ERC-20 approve ABI (minimal)
const ERC20_APPROVE_ABI = [
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
];

interface LifiToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  chainId: number;
}

interface LifiQuote {
  action: {
    fromToken: LifiToken;
    toToken: LifiToken;
    fromAmount: string;
    slippage: number;
  };
  estimate: {
    toAmount: string;
    approvalAddress?: string;
    executionDuration: number;
    gasCosts: Array<{ amountUSD: string }>;
  };
  transactionRequest?: {
    to: string;
    data: string;
    value: string;
    gasLimit?: string;
    gasPrice?: string;
    chainId: number;
  };
}

type SwapStatus = 'idle' | 'quoting' | 'approving' | 'confirm' | 'signing' | 'sending' | 'done' | 'error';

function TokenPicker({ chainId, value, onChange, label }: {
  chainId: number;
  value: LifiToken | null;
  onChange: (t: LifiToken) => void;
  label: string;
}) {
  const [tokens, setTokens] = useState<LifiToken[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!chainId) return;
    setLoading(true);
    fetch(`/api/swap?action=tokens&chainId=${chainId}`)
      .then(r => r.json())
      .then(d => {
        const list: LifiToken[] = d.tokens?.[chainId] ?? [];
        setTokens(list.slice(0, 200)); // cap at 200 to avoid enormous lists
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [chainId]);

  const filtered = search
    ? tokens.filter(t =>
        t.symbol.toLowerCase().includes(search.toLowerCase()) ||
        t.name.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 40)
    : tokens.slice(0, 40);

  const box: React.CSSProperties = {
    background: '#e4e6ee', borderRadius: '1rem',
    padding: '10px 14px', boxShadow: 'inset 3px 3px 6px rgba(166,177,198,0.5), inset -3px -3px 6px rgba(255,255,255,0.9)',
    display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
    width: '100%',
  };

  return (
    <div style={{ position: 'relative' }}>
      <p className="russo-one-regular" style={{ color: '#8a8f98', fontSize: 9, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>{label}</p>
      <button onClick={() => setOpen(o => !o)} style={box}>
        {value ? (
          <>
            {value.logoURI && (
              <img src={value.logoURI} alt={value.symbol} width={24} height={24} style={{ borderRadius: '50%', flexShrink: 0 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            )}
            <span style={{ color: '#23262b', fontSize: 14, fontWeight: 700 }}>{value.symbol}</span>
            <span style={{ color: '#8a8f98', fontSize: 11, flex: 1, textAlign: 'left' }}>{value.name}</span>
          </>
        ) : (
          <span style={{ color: '#8a8f98', fontSize: 13 }}>{loading ? 'Loading tokens…' : 'Select token'}</span>
        )}
        <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#8a8f98', marginLeft: 'auto' }}>expand_more</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 300,
          background: '#e4e6ee', boxShadow: '9px 9px 18px rgba(166,177,198,0.55), -9px -9px 18px rgba(255,255,255,0.9)',
          borderRadius: '1rem', marginTop: 8, maxHeight: 280, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(166,177,198,0.06)' }}>
            <div className="neu-pill-inset" style={{ display: 'flex', alignItems: 'center', padding: '6px 14px', borderRadius: 9999 }}>
              <input
                autoFocus
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search symbol or name…"
                className="sf-bold"
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#1e293b',
                }}
              />
            </div>
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 && (
              <p style={{ color: '#8a8f98', fontSize: 12, textAlign: 'center', padding: '16px 0' }}>{loading ? 'Loading…' : 'No results'}</p>
            )}
            {filtered.map(t => (
              <button
                key={`${t.chainId}-${t.address}`}
                onClick={() => { onChange(t); setOpen(false); setSearch(''); }}
                style={{ width: '100%', background: 'none', border: 'none', padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(166,177,198,0.04)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
              >
                {t.logoURI && (
                  <img src={t.logoURI} alt={t.symbol} width={22} height={22} style={{ borderRadius: '50%', flexShrink: 0 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
                <span style={{ color: '#23262b', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{t.symbol}</span>
                <span style={{ color: '#8a8f98', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function SwapModal({ onClose, activeLedger }: { onClose: () => void; activeLedger?: LedgerEntry | null }) {
  const wallet = useWallet();

  const [fromChain, setFromChain] = useState<Chain>(SWAP_CHAINS[0]);
  const [toChain, setToChain] = useState<Chain>(SWAP_CHAINS[1] ?? SWAP_CHAINS[0]);
  const [fromToken, setFromToken] = useState<LifiToken | null>(null);
  const [toToken, setToToken] = useState<LifiToken | null>(null);
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<LifiQuote | null>(null);
  const [status, setStatus] = useState<SwapStatus>('idle');
  const [errMsg, setErrMsg] = useState('');
  const [txHash, setTxHash] = useState('');
  const [approveTxHash, setApproveTxHash] = useState('');
  const [fromTokenRisk, setFromTokenRisk] = useState<TokenRisk | null>(null);
  const [toTokenRisk, setToTokenRisk] = useState<TokenRisk | null>(null);
  const [riskDismissed, setRiskDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && status !== 'signing' && status !== 'sending' && status !== 'approving') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, status]);

  // Reset tokens when chains change
  useEffect(() => { setFromToken(null); }, [fromChain.id]);
  useEffect(() => { setToToken(null); }, [toChain.id]);

  // Scan tokens for security risks when selected
  useEffect(() => {
    setFromTokenRisk(null); setRiskDismissed(false);
    if (!fromToken || fromToken.address === '0x0000000000000000000000000000000000000000') return;
    scanToken(fromChain.id, fromToken.address).then(setFromTokenRisk).catch(() => {});
  }, [fromToken?.address, fromChain.id]);

  useEffect(() => {
    setToTokenRisk(null); setRiskDismissed(false);
    if (!toToken || toToken.address === '0x0000000000000000000000000000000000000000') return;
    scanToken(toChain.id, toToken.address).then(setToTokenRisk).catch(() => {});
  }, [toToken?.address, toChain.id]);

  const getQuote = useCallback(async () => {
    if (!fromToken || !toToken || !amount || !wallet.activeAddress) return;
    const amountNum = parseFloat(amount);
    if (!amountNum || isNaN(amountNum) || amountNum <= 0) { setErrMsg('Invalid amount'); return; }

    setStatus('quoting'); setErrMsg(''); setQuote(null);

    try {
      const fromAmountWei = BigInt(Math.floor(amountNum * 10 ** fromToken.decimals)).toString();
      const params = new URLSearchParams({
        action: 'quote',
        fromChain: fromChain.id.toString(),
        toChain: toChain.id.toString(),
        fromToken: fromToken.address,
        toToken: toToken.address,
        fromAmount: fromAmountWei,
        fromAddress: wallet.activeAddress,
      });
      const res = await fetch(`/api/swap?${params}`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? 'Quote failed');
      setQuote(data);
      setStatus('confirm');
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : 'Quote failed');
      setStatus('error');
    }
  }, [fromToken, toToken, amount, wallet.activeAddress, fromChain.id, toChain.id]);

  const executeSwap = async () => {
    if (!quote?.transactionRequest || !wallet.activeAddress || (!wallet.scatteredKeyStore && !activeLedger)) return;
    const tx = quote.transactionRequest;

    // Check if ERC-20 approval needed
    const isNativeFrom = fromToken?.address === '0x0000000000000000000000000000000000000000';
    if (!isNativeFrom && quote.estimate.approvalAddress && fromToken) {
      setStatus('approving');
      try {
        const provider = getProvider(fromChain.id);
        const erc20 = new ethers.Contract(fromToken.address, ERC20_APPROVE_ABI, provider);
        const allowance: bigint = await erc20.allowance(wallet.activeAddress, quote.estimate.approvalAddress);
        const needed = BigInt(quote.action.fromAmount);
        if (allowance < needed) {
          const approveTx = await erc20.approve.populateTransaction(quote.estimate.approvalAddress, ethers.MaxUint256);
          const approveTxRequest: ethers.TransactionRequest = {
            to: fromToken.address,
            data: approveTx.data,
            chainId: fromChain.id,
          };
          const signedApprove = activeLedger
            ? await ledgerSign(activeLedger.derivationPath, { ...approveTxRequest, from: wallet.activeAddress })
            : await ephemeralSign(wallet.scatteredKeyStore!, approveTxRequest);
          const approveSent = await provider.send('eth_sendRawTransaction', [signedApprove]);
          if (approveSent && typeof approveSent === 'object') {
            const msg = (approveSent as Record<string, unknown>).message;
            throw new Error(typeof msg === 'string' ? msg : 'Approve failed');
          }
          setApproveTxHash(typeof approveSent === 'string' ? approveSent : '');
          // Wait ~12s for approval to mine
          await new Promise(r => setTimeout(r, 12000));
        }
      } catch (e: unknown) {
        setErrMsg(e instanceof Error ? e.message : 'Approval failed');
        setStatus('error');
        return;
      }
    }

    setStatus('signing');
    try {
      const swapTxRequest: ethers.TransactionRequest = {
        to: tx.to,
        data: tx.data,
        value: tx.value ? BigInt(tx.value) : 0n,
        chainId: tx.chainId,
        ...(tx.gasLimit ? { gasLimit: BigInt(tx.gasLimit) } : {}),
        ...(tx.gasPrice ? { gasPrice: BigInt(tx.gasPrice) } : {}),
      };
      const signed = activeLedger
        ? await ledgerSign(activeLedger.derivationPath, { ...swapTxRequest, from: wallet.activeAddress })
        : await ephemeralSign(wallet.scatteredKeyStore!, swapTxRequest);
      setStatus('sending');
      const provider = getProvider(fromChain.id);
      const result = await provider.send('eth_sendRawTransaction', [signed]);
      if (result && typeof result === 'object') {
        const msg = (result as Record<string, unknown>).message;
        throw new Error(typeof msg === 'string' ? msg : JSON.stringify(result));
      }
      setTxHash(typeof result === 'string' ? result : '');
      setStatus('done');
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message.slice(0, 140) : 'Swap failed');
      setStatus('error');
    }
  };

  const toAmountDisplay = quote
    ? (parseInt(quote.estimate.toAmount) / 10 ** (toToken?.decimals ?? 18)).toFixed(6)
    : '';
  const gasCostUSD = quote?.estimate.gasCosts?.[0]?.amountUSD;
  const durationSec = quote?.estimate.executionDuration ?? 0;

  const isBusy = status === 'quoting' || status === 'approving' || status === 'signing' || status === 'sending';

  const box: React.CSSProperties = { background: '#e4e6ee', borderRadius: '1rem', padding: '14px 16px', boxShadow: 'inset 4px 4px 8px rgba(166,177,198,0.5), inset -4px -4px 8px rgba(255,255,255,0.9)' };

  return (
    <div onClick={e => { if (e.target === e.currentTarget && !isBusy) onClose(); }}
      className="popup-backdrop"
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(228,230,238,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="popup-enter" style={{ background: '#e4e6ee', boxShadow: '9px 9px 18px rgba(166,177,198,0.55), -9px -9px 18px rgba(255,255,255,0.9)', borderRadius: '2rem', width: 440, maxWidth: '94vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 24px 16px', borderBottom: '1px solid rgba(166,177,198,0.07)', flexShrink: 0 }}>
          <div>
            <span className="sf-display-black" style={{ color: '#1e293b', fontSize: 22, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Swap</span>
            <span className="sf-bold" style={{ color: '#64748b', fontSize: 11, fontWeight: 700, marginLeft: 10, letterSpacing: '0.06em' }}>via LiFi</span>
          </div>
          <Button isIconOnly size="sm" variant="flat" radius="lg" isDisabled={isBusy} onPress={onClose} className="text-[#23262b]">
            <X size={18} />
          </Button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px' }}>

          {/* ── Done ── */}
          {status === 'done' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 0' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(43,45,51,0.1)', border: '2px solid rgba(43,45,51,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Check size={28} style={{ color: '#2b2d33' }} />
              </div>
              <span className="russo-one-regular" style={{ color: '#23262b', fontSize: 20, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Swap Sent!</span>
              <span style={{ color: '#23262b', fontSize: 9, fontFamily: "var(--font-sf-mono), 'SF Mono', monospace", wordBreak: 'break-all', textAlign: 'center' }}>{txHash}</span>
              <a href={`${fromChain.explorerUrl}/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                style={{ color: '#2b2d33', fontSize: 12, fontWeight: 700 }}>
                View on Explorer ↗
              </a>
              {approveTxHash && (
                <p style={{ color: '#8a8f98', fontSize: 10, textAlign: 'center' }}>Approve TX: {approveTxHash.slice(0, 20)}…</p>
              )}
              <Button variant="bordered" radius="lg" onPress={onClose} className="mt-2 px-7 russo-one-regular text-[#8a8f98]">
                {upperEn('Close')}
              </Button>
            </div>
          )}

          {/* ── Busy spinner ── */}
          {(status === 'quoting' || status === 'approving' || status === 'signing' || status === 'sending') && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '32px 0' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(43,45,51,0.15)', borderTopColor: '#2b2d33', animation: 'spin 0.9s linear infinite' }} />
              <span style={{ color: '#23262b', fontSize: 13, fontWeight: 700 }}>
                {status === 'quoting' ? 'Getting best route…'
                  : status === 'approving' ? 'Approving token spend…'
                  : status === 'signing' ? (activeLedger ? 'Check your Ledger and confirm…' : 'Signing transaction…')
                  : 'Broadcasting swap…'}
              </span>
            </div>
          )}

          {/* ── Idle / form ── */}
          {status === 'idle' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* From chain */}
              <div style={box}>
                <p className="russo-one-regular" style={{ color: '#8a8f98', fontSize: 9, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>From chain</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {SWAP_CHAINS.map(c => (
                    <button key={c.id} onClick={() => setFromChain(c)}
                      style={{ padding: '5px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: c.id === fromChain.id ? '1.5px solid #2b2d33' : '1px solid rgba(166,177,198,0.08)', background: c.id === fromChain.id ? '#2b2d33' : 'transparent', color: c.id === fromChain.id ? '#f5f6fa' : '#8a8f98', transition: 'all 0.15s' }}>
                      {c.shortName}
                    </button>
                  ))}
                </div>
              </div>

              {/* From token */}
              <TokenPicker chainId={fromChain.id} value={fromToken} onChange={setFromToken} label="You Pay" />

              {/* Amount */}
              <div style={box}>
                <p className="russo-one-regular" style={{ color: '#8a8f98', fontSize: 9, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>Amount</p>
                <Input
                  type="number"
                  variant="flat"
                  value={amount}
                  onValueChange={setAmount}
                  placeholder="0.0"
                  classNames={{
                    base: 'bg-transparent',
                    inputWrapper: 'bg-transparent shadow-none border-0 px-0 h-auto min-w-0',
                    input: 'text-[20px] font-black text-[#23262b]',
                  }}
                />
              </div>

              {/* Swap icon */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Button
                  isIconOnly
                  radius="full"
                  variant="bordered"
                  onPress={() => {
                    const tmpChain = fromChain; setFromChain(toChain); setToChain(tmpChain);
                    const tmpToken = fromToken; setFromToken(toToken); setToToken(tmpToken);
                  }}
                  className="h-9 w-9 min-w-0 border-[rgba(43,45,51,0.18)] bg-[rgba(43,45,51,0.07)] text-[#2b2d33]"
                >
                  <ArrowDownUp size={16} />
                </Button>
              </div>

              {/* To chain */}
              <div style={box}>
                <p className="russo-one-regular" style={{ color: '#8a8f98', fontSize: 9, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>To chain</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {SWAP_CHAINS.map(c => (
                    <button key={c.id} onClick={() => setToChain(c)}
                      style={{ padding: '5px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: c.id === toChain.id ? '1.5px solid #2b2d33' : '1px solid rgba(166,177,198,0.08)', background: c.id === toChain.id ? '#2b2d33' : 'transparent', color: c.id === toChain.id ? '#f5f6fa' : '#8a8f98', transition: 'all 0.15s' }}>
                      {c.shortName}
                    </button>
                  ))}
                </div>
              </div>

              {/* To token */}
              <TokenPicker chainId={toChain.id} value={toToken} onChange={setToToken} label="You Receive" />

              {errMsg && <p style={{ color: '#b91c1c', fontSize: 12, margin: 0 }}>{errMsg}</p>}

              {/* Token security risk warnings */}
              {!riskDismissed && (() => {
                const risks: { label: string; flags: string[]; level: 'danger' | 'warning' }[] = [];
                if (fromTokenRisk && fromTokenRisk.level !== 'safe' && fromTokenRisk.level !== 'unknown' && fromTokenRisk.flags.length > 0) {
                  risks.push({ label: `From token (${fromToken?.symbol})`, flags: fromTokenRisk.flags, level: fromTokenRisk.level as 'danger' | 'warning' });
                }
                if (toTokenRisk && toTokenRisk.level !== 'safe' && toTokenRisk.level !== 'unknown' && toTokenRisk.flags.length > 0) {
                  risks.push({ label: `To token (${toToken?.symbol})`, flags: toTokenRisk.flags, level: toTokenRisk.level as 'danger' | 'warning' });
                }
                if (risks.length === 0) return null;
                const topLevel = risks.some(r => r.level === 'danger') ? 'danger' : 'warning';
                return (
                  <div style={{ background: riskBg(topLevel), border: `1px solid ${riskColor(topLevel)}44`, borderRadius: '1rem', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="russo-one-regular" style={{ fontSize: 10, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.1em', color: riskColor(topLevel), display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        {topLevel === 'danger' ? <AlertTriangle size={12} /> : <Zap size={12} />}
                        {topLevel === 'danger' ? 'Token Risk Detected' : 'Caution'}
                      </span>
                      <button onClick={() => setRiskDismissed(true)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a8f98', fontSize: 12, padding: '0 2px', lineHeight: 1 }}>✕</button>
                    </div>
                    {risks.map((r, ri) => (
                      <div key={ri}>
                        <p className="russo-one-regular" style={{ fontSize: 9, color: '#8a8f98', fontWeight: 400, textTransform: 'uppercase', margin: '0 0 2px' }}>{r.label}</p>
                        {r.flags.map((f, fi) => (
                          <p key={fi} style={{ fontSize: 11, color: riskColor(r.level), margin: '1px 0', fontWeight: 600 }}>• {f}</p>
                        ))}
                      </div>
                    ))}
                    <p style={{ fontSize: 9, color: '#8a8f98', margin: '4px 0 0', fontStyle: 'italic' }}>
                      Powered by GoPlus Security · dismiss to proceed anyway
                    </p>
                  </div>
                );
              })()}

              {(() => {
                const hasBlockingRisk = !riskDismissed && (
                  (fromTokenRisk?.level === 'danger' && (fromTokenRisk.flags.length > 0)) ||
                  (toTokenRisk?.level === 'danger' && (toTokenRisk.flags.length > 0))
                );
                return (
                  <Button
                    fullWidth
                    radius="lg"
                    color={hasBlockingRisk ? 'danger' : 'primary'}
                    variant={hasBlockingRisk ? 'flat' : 'solid'}
                    isDisabled={!fromToken || !toToken || !amount || hasBlockingRisk}
                    onPress={getQuote}
                    className={`h-14 russo-one-regular tracking-wider ${hasBlockingRisk ? 'text-[11px]' : 'text-[14px]'}`}
                  >
                    {upperEn(hasBlockingRisk ? 'Dismiss Risk Warning First' : 'Get Quote')}
                  </Button>
                );
              })()}
            </div>
          )}

          {/* ── Confirm screen ── */}
          {status === 'confirm' && quote && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ ...box, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p className="russo-one-regular" style={{ color: '#8a8f98', fontSize: 11, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.02em', margin: 0 }}>Swap Preview</p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <p className="russo-one-regular" style={{ color: '#8a8f98', fontSize: 9, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 3px' }}>You pay</p>
                    <p style={{ color: '#23262b', fontWeight: 900, fontSize: 18, margin: 0 }}>{amount} {fromToken?.symbol}</p>
                    <p className="russo-one-regular" style={{ color: '#8a8f98', fontSize: 9, fontWeight: 400, margin: '2px 0 0' }}>{fromChain.name}</p>
                  </div>
                  <ArrowDownUp size={18} style={{ color: '#2b2d33', flexShrink: 0 }} />
                  <div style={{ flex: 1, textAlign: 'right' }}>
                    <p className="russo-one-regular" style={{ color: '#8a8f98', fontSize: 9, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 3px' }}>You receive ~</p>
                    <p style={{ color: '#2b2d33', fontWeight: 900, fontSize: 18, margin: 0 }}>{toAmountDisplay} {toToken?.symbol}</p>
                    <p className="russo-one-regular" style={{ color: '#8a8f98', fontSize: 9, fontWeight: 400, margin: '2px 0 0' }}>{toChain.name}</p>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid rgba(166,177,198,0.06)', paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                  {gasCostUSD && <span className="russo-one-regular" style={{ color: '#8a8f98', fontSize: 9, fontWeight: 400 }}>Gas ~${gasCostUSD}</span>}
                  <span className="russo-one-regular" style={{ color: '#8a8f98', fontSize: 9, fontWeight: 400 }}>~{Math.ceil(durationSec / 60)} min</span>
                  <span className="russo-one-regular" style={{ color: '#8a8f98', fontSize: 9, fontWeight: 400 }}>0.5% slippage</span>
                </div>
              </div>

              {!fromToken || fromToken.address !== '0x0000000000000000000000000000000000000000' && quote.estimate.approvalAddress && (
                <p className="russo-one-regular" style={{ color: '#8a8f98', fontSize: 9, fontWeight: 400, background: 'rgba(43,45,51,0.06)', border: '1px solid rgba(43,45,51,0.15)', borderRadius: 10, padding: '8px 12px', margin: 0 }}>
                  Token approval will be sent first (~12s wait), then the swap.
                </p>
              )}
              {activeLedger && (
                <p style={{ color: '#8a8f98', fontSize: 11, background: 'rgba(138,143,152,0.08)', border: '1px solid rgba(138,143,152,0.2)', borderRadius: 10, padding: '8px 12px', margin: 0 }}>
                  <strong>Ledger:</strong> Your device will show contract call data. Enable &ldquo;Blind signing&rdquo; in the Ethereum app settings if prompted.
                </p>
              )}

              {errMsg && <p style={{ color: '#b91c1c', fontSize: 12, margin: 0 }}>{errMsg}</p>}

              <div style={{ display: 'flex', gap: 10 }}>
                <Button variant="bordered" radius="lg" onPress={() => { setStatus('idle'); setQuote(null); setErrMsg(''); }}
                  className="h-12 flex-1 russo-one-regular text-[#8a8f98]">
                  {upperEn('Back')}
                </Button>
                <Button color="primary" radius="lg" onPress={executeSwap}
                  className="h-12 flex-[2] russo-one-regular tracking-wider text-[13px]">
                  {upperEn('Confirm Swap')}
                </Button>
              </div>
            </div>
          )}

          {/* Error with retry */}
          {status === 'error' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '16px 0' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(185,28,28,0.1)', border: '2px solid rgba(185,28,28,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={22} style={{ color: '#b91c1c' }} />
              </div>
              <span style={{ color: '#b91c1c', fontSize: 13, fontWeight: 700, textAlign: 'center' }}>{errMsg}</span>
              <Button variant="bordered" radius="lg" onPress={() => { setStatus('idle'); setErrMsg(''); setQuote(null); }}
                className="px-7 russo-one-regular text-[#8a8f98]">
                {upperEn('Try Again')}
              </Button>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid rgba(166,177,198,0.05)', flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <ZeroFeeNote />
            <span className="russo-one-regular" style={{ color: '#8a8f98', fontSize: 9, fontWeight: 400, letterSpacing: '0.04em' }}>Powered by LiFi · Best-route aggregation across 30+ chains</span>
          </div>
        </div>
      </div>
    </div>
  );
}
