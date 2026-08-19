'use client';

import React from 'react';
import { formatUSD } from '@/lib/prices';
import type { Chain } from '@/lib/chains';
import type { TokenBalance } from '../../types';

export function TransactionPreview({
  amountStr,
  tokenSymbol,
  to,
  feeEth,
  feeUsd,
  selectedChain,
  simResult,
  activeAddress,
  onCancel,
  onConfirm,
  selectedToken,
  isNative,
}: {
  amountStr: string;
  tokenSymbol: string;
  to: string;
  feeEth: string | null;
  feeUsd: number | null;
  selectedChain: Chain;
  simResult: { changes: Array<{ changeType: string; from: string; to: string; amount?: string; symbol?: string }>; gas: number } | null;
  activeAddress: string | null;
  onCancel: () => void;
  onConfirm: (contractAddr?: string, decimals?: number) => void;
  selectedToken: TokenBalance | null;
  isNative: boolean;
}) {
  return (
    <div
      style={{
        background: 'rgba(43,45,51,0.04)',
        border: '1px solid rgba(43,45,51,0.2)',
        borderRadius: 14,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <p className="russo-one-regular" style={{ color: '#2b2d33', fontSize: 9, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>
        Transaction Preview
      </p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'rgba(166,177,198,0.04)', borderRadius: 10 }}>
        <span className="russo-one-regular" style={{ fontSize: 9, color: '#8a8f98', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Sending
        </span>
        <span style={{ fontSize: 13, color: '#23262b', fontWeight: 900, fontFamily: "var(--font-sf-mono), 'SF Mono', monospace" }}>
          {amountStr} {tokenSymbol}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'rgba(166,177,198,0.04)', borderRadius: 10 }}>
        <span className="russo-one-regular" style={{ fontSize: 9, color: '#8a8f98', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          To
        </span>
        <span style={{ fontSize: 10, color: '#23262b', fontWeight: 700, fontFamily: "var(--font-sf-mono), 'SF Mono', monospace" }}>
          {to.slice(0, 10)}…{to.slice(-6)}
        </span>
      </div>
      {feeEth && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'rgba(166,177,198,0.04)', borderRadius: 10 }}>
          <span className="russo-one-regular" style={{ fontSize: 9, color: '#8a8f98', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Network Fee
          </span>
          <span className="russo-one-regular" style={{ fontSize: 9, color: '#8a8f98', fontWeight: 400 }}>
            ~{feeEth} {selectedChain.symbol}
            {feeUsd !== null && feeUsd > 0 ? ` (${formatUSD(feeUsd)})` : ''}
          </span>
        </div>
      )}
      {simResult && simResult.changes.length > 0 && (
        <div>
          <p className="russo-one-regular" style={{ color: '#8a8f98', fontSize: 9, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '4px 0' }}>
            Simulated Balance Changes
          </p>
          {simResult.changes.slice(0, 4).map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ fontSize: 10, color: '#8a8f98', fontFamily: "var(--font-sf-mono), 'SF Mono', monospace" }}>
                {c.changeType === 'TRANSFER'
                  ? c.from?.toLowerCase() === activeAddress?.toLowerCase()
                    ? '↑ Out'
                    : '↓ In'
                  : c.changeType}
              </span>
              {c.amount && (
                <span
                  style={{
                    fontSize: 10,
                    color: c.from?.toLowerCase() === activeAddress?.toLowerCase() ? '#b91c1c' : '#2b2d33',
                    fontWeight: 900,
                  }}
                >
                  {parseFloat(c.amount).toFixed(4)} {c.symbol ?? ''}
                </span>
              )}
            </div>
          ))}
          {simResult.gas > 0 && <p style={{ color: '#8a8f98', fontSize: 9, margin: '4px 0 0' }}>Gas: {simResult.gas.toLocaleString()}</p>}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            padding: '12px',
            background: '#e4e6ee',
            boxShadow: 'inset 3px 3px 6px rgba(166,177,198,0.5), inset -3px -3px 6px rgba(255,255,255,0.9)',
            borderRadius: '1rem',
            fontSize: 12,
            fontWeight: 400,
            color: '#8a8f98',
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
          className="russo-one-regular"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            const contractAddr = !isNative && selectedToken ? (selectedToken.contractAddress as string) : undefined;
            onConfirm(contractAddr, selectedToken?.decimals ?? 18);
          }}
          style={{
            flex: 2,
            padding: '12px',
            background: '#2b2d33',
            border: 'none',
            borderRadius: '1rem',
            fontSize: 12,
            fontWeight: 400,
            color: '#f5f6fa',
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
          className="russo-one-regular"
        >
          Confirm & Send
        </button>
      </div>
    </div>
  );
}
