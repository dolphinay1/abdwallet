'use client';

import React, { useEffect } from 'react';
import { X, Check, ExternalLink, AlertTriangle, Zap } from 'lucide-react';
import { type Chain } from '@/lib/chains';
import { riskColor, riskBg } from '@/lib/security-scan';
import { type LedgerEntry } from '@/lib/ledger';
import type { TokenBalance } from '../types';
import { useSendForm } from './send/useSendForm';
import { NetworkTokenPicker } from './send/NetworkTokenPicker';
import { RecipientInput } from './send/RecipientInput';
import { AmountInput } from './send/AmountInput';
import { TransactionPreview } from './send/TransactionPreview';

export function SendModal({
  tokens,
  defaultChain,
  onClose,
  activeLedger,
}: {
  tokens: TokenBalance[];
  prices: Record<string, number>;
  defaultChain: Chain;
  onClose: () => void;
  activeLedger?: LedgerEntry | null;
}) {
  const f = useSendForm({ tokens, defaultChain, activeLedger });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const digitsOnly = (e: React.KeyboardEvent) => {
    if (!/^\d$/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
      e.preventDefault();
    }
  };

  const box: React.CSSProperties = {
    background: '#e4e6ee',
    boxShadow: 'inset 3px 3px 6px rgba(166,177,198,0.5), inset -3px -3px 6px rgba(255,255,255,0.9)',
    borderRadius: '1rem',
    padding: '10px 16px',
    border: '1px solid rgba(166,177,198,0.07)',
  };
  const inp: React.CSSProperties = {
    width: '100%',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#23262b',
    fontSize: 13,
    fontFamily: 'inherit',
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="popup-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(228,230,238,0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        className="popup-enter"
        style={{
          background: '#e4e6ee',
          boxShadow: '9px 9px 18px rgba(166,177,198,0.55), -9px -9px 18px rgba(255,255,255,0.9)',
          borderRadius: '2rem',
          width: 420,
          maxWidth: '94vw',
          padding: '28px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span
            className="sf-display-black"
            style={{ color: '#1e293b', fontSize: 22, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.02em' }}
          >
            Send
          </span>
          <button
            onClick={onClose}
            style={{
              color: '#23262b',
              background: '#e4e6ee',
              boxShadow: '3px 3px 6px rgba(166,177,198,0.55), -3px -3px 6px rgba(255,255,255,0.9)',
              border: 'none',
              borderRadius: '0.75rem',
              padding: 8,
              cursor: 'pointer',
              display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {f.status === 'done' ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 0' }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: 'rgba(43,45,51,0.1)',
                border: '2px solid rgba(43,45,51,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Check size={26} style={{ color: '#2b2d33' }} />
            </div>
            <span
              className="russo-one-regular"
              style={{ color: '#23262b', fontSize: 20, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.02em' }}
            >
              Broadcast!
            </span>
            <span style={{ color: '#23262b', fontSize: 9, fontFamily: "var(--font-sf-mono), 'SF Mono', monospace", wordBreak: 'break-all', textAlign: 'center' }}>
              {f.txHash}
            </span>
            <a
              href={`${f.selectedChain.explorerUrl}/tx/${f.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#2b2d33', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}
            >
              View on Explorer <ExternalLink size={12} />
            </a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <NetworkTokenPicker
              selectedChain={f.selectedChain}
              setSelectedChain={f.setSelectedChain}
              networkOpen={f.networkOpen}
              setNetworkOpen={f.setNetworkOpen}
              selectedToken={f.selectedToken}
              setSelectedToken={f.setSelectedToken}
              tokenOpen={f.tokenOpen}
              setTokenOpen={f.setTokenOpen}
              chainTokens={f.chainTokens}
              box={box}
            />

            {f.selectedToken && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 4px' }}>
                <span className="russo-one-regular" style={{ fontSize: 9, color: '#8a8f98', fontWeight: 400, letterSpacing: '0.04em' }}>
                  Balance: {f.selectedBal < 0.000001 && f.selectedBal > 0 ? '< 0.000001' : f.selectedBal.toFixed(6)} {f.tokenSymbol}
                </span>
              </div>
            )}

            <RecipientInput
              to={f.to}
              setTo={f.setTo}
              contactOpen={f.contactOpen}
              setContactOpen={f.setContactOpen}
              contacts={f.contacts}
              qrInputRef={f.qrInputRef}
              handleQRScan={f.handleQRScan}
              box={box}
              inp={inp}
            />

            <AmountInput
              whole={f.whole}
              setWhole={f.setWhole}
              dec={f.dec}
              setDec={f.setDec}
              selectedBal={f.selectedBal}
              tokenSymbol={f.tokenSymbol}
              selectedChain={f.selectedChain}
              feeLoading={f.feeLoading}
              feeEth={f.feeEth}
              feeUsd={f.feeUsd}
              box={box}
              inp={inp}
              digitsOnly={digitsOnly}
            />

            {f.status === 'confirm' && (
              <TransactionPreview
                amountStr={f.amountStr}
                tokenSymbol={f.tokenSymbol}
                to={f.to}
                feeEth={f.feeEth}
                feeUsd={f.feeUsd}
                selectedChain={f.selectedChain}
                simResult={f.simResult}
                activeAddress={f.wallet.activeAddress}
                onCancel={() => {
                  f.setStatus('idle');
                  f.setSimResult(null);
                }}
                onConfirm={(contractAddr, decimals) => f.executeSend(contractAddr, decimals)}
                selectedToken={f.selectedToken}
                isNative={f.isNative}
              />
            )}

            {f.errMsg && <span style={{ color: '#b91c1c', fontSize: 11 }}>{f.errMsg}</span>}

            {!f.riskDismissed &&
              (() => {
                const risks: { label: string; flags: string[]; level: 'danger' | 'warning' }[] = [];
                if (f.addrRisk && f.addrRisk.level !== 'safe' && f.addrRisk.level !== 'unknown' && f.addrRisk.flags.length > 0) {
                  risks.push({ label: 'Recipient address risk', flags: f.addrRisk.flags, level: f.addrRisk.level as 'danger' | 'warning' });
                }
                if (f.tokenRisk && f.tokenRisk.level !== 'safe' && f.tokenRisk.level !== 'unknown' && f.tokenRisk.flags.length > 0) {
                  risks.push({ label: 'Token risk', flags: f.tokenRisk.flags, level: f.tokenRisk.level as 'danger' | 'warning' });
                }
                if (risks.length === 0) return null;
                const topLevel = risks.some((r) => r.level === 'danger') ? 'danger' : 'warning';
                return (
                  <div
                    style={{
                      background: riskBg(topLevel),
                      border: `1px solid ${riskColor(topLevel)}44`,
                      borderRadius: '1rem',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span
                        className="russo-one-regular"
                        style={{
                          fontSize: 10,
                          fontWeight: 400,
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          color: riskColor(topLevel),
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        {topLevel === 'danger' ? <AlertTriangle size={12} /> : <Zap size={12} />}
                        {topLevel === 'danger' ? 'Security Risk Detected' : 'Caution'}
                      </span>
                      <button
                        onClick={() => f.setRiskDismissed(true)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a8f98', fontSize: 12, padding: '0 2px', lineHeight: 1 }}
                      >
                        ✕
                      </button>
                    </div>
                    {risks.map((r, ri) => (
                      <div key={ri}>
                        <p className="russo-one-regular" style={{ fontSize: 9, color: '#8a8f98', fontWeight: 400, textTransform: 'uppercase', margin: '0 0 2px' }}>
                          {r.label}
                        </p>
                        {r.flags.map((flag, fi) => (
                          <p key={fi} style={{ fontSize: 11, color: riskColor(r.level), margin: '1px 0', fontWeight: 600 }}>
                            • {flag}
                          </p>
                        ))}
                      </div>
                    ))}
                    <p style={{ fontSize: 9, color: '#8a8f98', margin: '4px 0 0', fontStyle: 'italic' }}>
                      Powered by GoPlus Security · dismiss to proceed anyway
                    </p>
                  </div>
                );
              })()}

            {f.status !== 'confirm' &&
              (() => {
                const isProcessing = f.status === 'signing' || f.status === 'sending' || f.status === 'simulating';
                const hasBlockingRisk =
                  !f.riskDismissed &&
                  ((f.addrRisk?.level === 'danger' && f.addrRisk.flags.length > 0) ||
                    (f.tokenRisk?.level === 'danger' && f.tokenRisk.flags.length > 0));
                return (
                  <button
                    className="sf-display-black"
                    onClick={f.handleSend}
                    disabled={isProcessing || hasBlockingRisk}
                    style={{
                      background: isProcessing ? '#e4e6ee' : hasBlockingRisk ? '#e4e6ee' : '#2b2d33',
                      color: isProcessing ? '#23262b' : hasBlockingRisk ? '#b91c1c' : '#f5f6fa',
                      border: hasBlockingRisk ? '1px solid rgba(248,113,113,0.3)' : 'none',
                      borderRadius: '1rem',
                      padding: '16px',
                      fontSize: 14,
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      cursor: isProcessing || hasBlockingRisk ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s',
                      marginTop: 4,
                    }}
                  >
                    {isProcessing
                      ? f.status === 'simulating'
                        ? 'Simulating...'
                        : f.status === 'signing'
                        ? 'Signing...'
                        : 'Broadcasting...'
                      : hasBlockingRisk
                      ? 'Dismiss Risk Warning First'
                      : `Send ${f.tokenSymbol}`}
                  </button>
                );
              })()}
          </div>
        )}
      </div>
    </div>
  );
}
