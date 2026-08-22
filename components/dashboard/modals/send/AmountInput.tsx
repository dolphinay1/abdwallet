'use client';

import React from 'react';
import { formatUSD } from '@/lib/prices';
import type { Chain } from '@/lib/chains';
import { ZeroFeeNote } from '../../ui/ZeroFeeNote';

export function AmountInput({
  whole,
  setWhole,
  dec,
  setDec,
  selectedBal,
  tokenSymbol,
  selectedChain,
  feeLoading,
  feeEth,
  feeUsd,
  box,
  inp,
  digitsOnly,
}: {
  whole: string;
  setWhole: (v: string) => void;
  dec: string;
  setDec: (v: string) => void;
  selectedBal: number;
  tokenSymbol: string;
  selectedChain: Chain;
  feeLoading: boolean;
  feeEth: string | null;
  feeUsd: number | null;
  box: React.CSSProperties;
  inp: React.CSSProperties;
  digitsOnly: (e: React.KeyboardEvent) => void;
}) {
  return (
    <>
      {/* Amount input */}
      <div style={{ ...box, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px 16px' }}>
        <input
          type="text"
          inputMode="numeric"
          placeholder="0"
          autoComplete="off"
          value={whole}
          onKeyDown={digitsOnly}
          onChange={(e) => setWhole(e.target.value.replace(/\D/g, ''))}
          style={{ ...inp, width: '40%', textAlign: 'right', fontSize: 20, fontWeight: 900 }}
        />
        <span style={{ color: '#2b2d33', fontSize: 24, fontWeight: 900, padding: '0 4px', flexShrink: 0 }}>.</span>
        <input
          type="text"
          inputMode="numeric"
          placeholder="00"
          autoComplete="off"
          value={dec}
          onKeyDown={digitsOnly}
          onChange={(e) => setDec(e.target.value.replace(/\D/g, '').slice(0, 18))}
          style={{ ...inp, width: '40%', fontSize: 20, fontWeight: 900 }}
        />
        <button
          onClick={() => {
            const s = selectedBal.toFixed(18).replace(/\.?0+$/, '');
            const [w, d = ''] = s.split('.');
            setWhole(w);
            setDec(d);
          }}
          className="russo-one-regular"
          style={{
            fontSize: 9,
            fontWeight: 400,
            color: '#2b2d33',
            background: 'rgba(43,45,51,0.08)',
            border: '1px solid rgba(43,45,51,0.2)',
            borderRadius: 6,
            padding: '3px 7px',
            cursor: 'pointer',
            marginLeft: 6,
            flexShrink: 0,
            textTransform: 'uppercase',
          }}
        >
          Max
        </button>
        <span style={{ color: '#8a8f98', fontSize: 10, fontWeight: 900, marginLeft: 6, flexShrink: 0 }}>{tokenSymbol}</span>
      </div>

      {/* Network fee */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 4px' }}>
        <span className="russo-one-regular" style={{ fontSize: 10, color: '#8a8f98', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Network Fee
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {feeLoading && (
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                border: '1.5px solid rgba(43,45,51,0.2)',
                borderTopColor: '#2b2d33',
                animation: 'spin 0.7s linear infinite',
                display: 'inline-block',
              }}
            />
          )}
          {feeEth !== null ? (
            <span className="russo-one-regular" style={{ fontSize: 9, fontWeight: 400, color: '#8a8f98', letterSpacing: '0.02em' }}>
              ~{feeEth} {selectedChain.symbol}
              {feeUsd !== null && feeUsd > 0 && (
                <span className="russo-one-regular" style={{ color: '#8a8f98', marginLeft: 5, fontWeight: 400 }}>
                  ({formatUSD(feeUsd)})
                </span>
              )}
            </span>
          ) : (
            !feeLoading && <span className="russo-one-regular" style={{ fontSize: 9, color: '#8a8f98', fontWeight: 400 }}>—</span>
          )}
        </span>
      </div>
      <ZeroFeeNote compact />
    </>
  );
}
