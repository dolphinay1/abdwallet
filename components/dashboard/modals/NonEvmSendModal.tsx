'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, ExternalLink } from 'lucide-react';
import { loadContacts } from '@/lib/address-book';
import { CoinIcon } from '../ui/CoinIcon';
import { ZeroFeeNote } from '../ui/ZeroFeeNote';
import { NON_EVM_META } from '../types';

export const NON_EVM_ADDR_RE: Record<string, RegExp> = {
  BTC:   /^(bc1[ac-hj-np-z02-9]{6,87}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/,
  LTC:   /^(ltc1[ac-hj-np-z02-9]{6,87}|[LM3][a-km-zA-HJ-NP-Z1-9]{25,34})$/,
  DOGE:  /^D[5-9A-HJ-NP-U][1-9A-HJ-NP-Za-km-z]{32}$/,
  BCH:   /^(bitcoincash:)?(q|p)[a-z0-9]{41}$|^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/,
  SOL:   /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
  XRP:   /^r[0-9a-zA-Z]{24,34}$/,
  XLM:   /^G[A-Z2-7]{55}$/,
  NANO:  /^nano_[13][13456789abcdefghijkmnopqrstuwxyz]{59}$|^xrb_[13][13456789abcdefghijkmnopqrstuwxyz]{59}$/,
  HBAR:  /^(0\.)?(0\.)?[0-9]+\.[0-9]+\.[0-9]+$|^[0-9a-fA-F]{64}$/,
  SUI:   /^0x[0-9a-fA-F]{64}$/,
  APTOS: /^0x[0-9a-fA-F]{64}$/,
  TRON:  /^T[a-km-zA-HJ-NP-Z1-9]{33}$/,
  USDT:  /^T[a-km-zA-HJ-NP-Z1-9]{33}$|^0x[a-fA-F0-9]{40}$/,
};

export function validateNonEvmAddress(coin: string, address: string): string | null {
  const re = NON_EVM_ADDR_RE[coin];
  if (!re) return null;
  return re.test(address.trim()) ? null : `Invalid ${coin} address format`;
}

export function NonEvmSendModal({
  coin,
  fromAddress,
  onSend,
  onClose,
}: {
  coin: string;
  fromAddress: string;
  onSend: (to: string, amount: number, feeSpeed: 'slow' | 'medium' | 'fast') => Promise<string>;
  onClose: () => void;
}) {
  const meta = NON_EVM_META[coin];
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [feeSpeed, setFeeSpeed] = useState<'slow' | 'medium' | 'fast'>('medium');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [txid, setTxid] = useState('');
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const hasFeeSelector = ['BTC', 'DOGE', 'BCH', 'LTC'].includes(coin);
  const [contactOpen, setContactOpen] = useState(false);
  const contacts = loadContacts();

  const handleSend = async () => {
    const amt = parseFloat(amount);
    if (!to.trim() || isNaN(amt) || amt <= 0) {
      setErrMsg('Enter a valid address and amount.');
      return;
    }
    const addrErr = validateNonEvmAddress(coin, to.trim());
    if (addrErr) {
      setErrMsg(addrErr);
      return;
    }
    setStatus('sending');
    setErrMsg('');
    try {
      const id = await onSend(to.trim(), amt, feeSpeed);
      setTxid(id);
      setStatus('done');
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : 'Send failed.');
      setStatus('error');
    }
  };

  const inp: React.CSSProperties = {
    background: '#e4e6ee',
    boxShadow: 'inset 3px 3px 6px rgba(166,177,198,0.5), inset -3px -3px 6px rgba(255,255,255,0.9)',
    borderRadius: 10,
    padding: '12px 14px',
    color: '#23262b',
    fontSize: 13,
    width: '100%',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(166,177,198,0.88)',
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
          width: 400,
          maxWidth: '92vw',
          border: '1px solid rgba(166,177,198,0.1)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px 14px',
            borderBottom: '1px solid rgba(166,177,198,0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {meta && <CoinIcon symbol={meta.symbol} color={meta.color} logoUrl={meta.logoUrl} size={30} />}
            <span
              className="russo-one-regular"
              style={{ color: '#23262b', fontSize: 18, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.02em' }}
            >
              Send {meta?.symbol ?? coin}
            </span>
          </div>
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
            <X size={16} />
          </button>
        </div>

        {status === 'done' ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'rgba(43,45,51,0.1)',
                border: '1.5px solid rgba(43,45,51,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Check size={22} style={{ color: '#2b2d33' }} />
            </div>
            <p
              className="russo-one-regular"
              style={{ color: '#23262b', fontWeight: 400, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.02em', margin: 0 }}
            >
              Sent!
            </p>
            <p style={{ color: '#8a8f98', fontSize: 10, fontFamily: "var(--font-sf-mono), 'SF Mono', monospace", margin: 0, wordBreak: 'break-all' }}>{txid}</p>
            {meta?.explorerBase && (
              <a
                href={`${meta.explorerBase}/${txid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="russo-one-regular"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  color: '#2b2d33',
                  fontSize: 11,
                  fontWeight: 400,
                  textDecoration: 'none',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <ExternalLink size={12} /> View on Explorer
              </a>
            )}
            <button
              onClick={onClose}
              className="russo-one-regular"
              style={{
                marginTop: 8,
                background: '#e4e6ee',
                boxShadow: 'inset 3px 3px 6px rgba(166,177,198,0.5), inset -3px -3px 6px rgba(255,255,255,0.9)',
                borderRadius: 10,
                padding: '10px 24px',
                color: '#8a8f98',
                cursor: 'pointer',
                fontWeight: 400,
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Close
            </button>
          </div>
        ) : (
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <p
                className="russo-one-regular"
                style={{ color: '#8a8f98', fontSize: 9, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}
              >
                From
              </p>
              <p style={{ color: '#8a8f98', fontSize: 10, fontFamily: "var(--font-sf-mono), 'SF Mono', monospace", wordBreak: 'break-all', margin: 0 }}>{fromAddress}</p>
            </div>
            <div>
              <p
                className="russo-one-regular"
                style={{ color: '#8a8f98', fontSize: 9, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}
              >
                Recipient Address
              </p>
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    style={{ ...inp, flex: 1 }}
                    placeholder={`${meta?.name ?? coin} address`}
                    value={to}
                    onChange={(e) => {
                      setTo(e.target.value);
                      setContactOpen(false);
                    }}
                  />
                  {contacts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setContactOpen((o) => !o)}
                      title="Address book"
                      style={{
                        flexShrink: 0,
                        background: contactOpen ? 'rgba(43,45,51,0.15)' : 'rgba(43,45,51,0.08)',
                        border: '1px solid rgba(43,45,51,0.2)',
                        borderRadius: 10,
                        padding: '0 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#2b2d33" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    </button>
                  )}
                </div>
                {contactOpen && contacts.length > 0 && (
                  <div
                    className="popup-enter"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      left: 0,
                      right: 0,
                      zIndex: 60,
                      background: '#e4e6ee',
                      border: '1px solid rgba(166,177,198,0.1)',
                      borderRadius: '1rem',
                      maxHeight: 180,
                      overflowY: 'auto',
                      boxShadow: '0 8px 32px rgba(166,177,198,0.6)',
                    }}
                  >
                    {contacts.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setTo(c.address);
                          setContactOpen(false);
                        }}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 2,
                          padding: '10px 14px',
                          width: '100%',
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          textAlign: 'left',
                          borderBottom: '1px solid rgba(166,177,198,0.05)',
                        }}
                      >
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#23262b' }}>{c.name}</span>
                        <span style={{ fontSize: 10, color: '#8a8f98', fontFamily: "var(--font-sf-mono), 'SF Mono', monospace" }}>
                          {c.address.slice(0, 10)}...{c.address.slice(-6)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {to.trim().length > 10 &&
                (() => {
                  const err = validateNonEvmAddress(coin, to.trim());
                  return err ? (
                    <p style={{ fontSize: 10, color: '#b91c1c', marginTop: 5, fontWeight: 600 }}>✕ {err}</p>
                  ) : (
                    <p style={{ fontSize: 10, color: '#23262b', marginTop: 5, fontWeight: 600 }}>✓ Address format valid</p>
                  );
                })()}
            </div>
            <div>
              <p
                className="russo-one-regular"
                style={{ color: '#8a8f98', fontSize: 9, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}
              >
                Amount ({meta?.symbol ?? coin})
              </p>
              <input style={inp} type="number" step="any" min="0" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            {hasFeeSelector && (
              <div>
                <p
                  className="russo-one-regular"
                  style={{ color: '#8a8f98', fontSize: 9, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}
                >
                  Fee Speed
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['slow', 'medium', 'fast'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setFeeSpeed(s)}
                      className="russo-one-regular"
                      style={{
                        flex: 1,
                        padding: '8px 0',
                        borderRadius: 8,
                        background: feeSpeed === s ? 'rgba(43,45,51,0.1)' : 'rgba(166,177,198,0.04)',
                        border: `1px solid ${feeSpeed === s ? 'rgba(43,45,51,0.4)' : 'rgba(166,177,198,0.08)'}`,
                        color: feeSpeed === s ? '#2b2d33' : '#8a8f98',
                        fontSize: 9,
                        fontWeight: 400,
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {errMsg && <p style={{ color: '#b91c1c', fontSize: 11, margin: 0 }}>{errMsg}</p>}
            <button
              onClick={handleSend}
              disabled={status === 'sending'}
              className="russo-one-regular"
              style={{
                marginTop: 4,
                padding: '14px',
                borderRadius: 12,
                background: status === 'sending' ? 'rgba(166,177,198,0.06)' : '#2b2d33',
                color: status === 'sending' ? '#8a8f98' : '#e4e6ee',
                fontWeight: 400,
                fontSize: 12,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                border: 'none',
                cursor: status === 'sending' ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {status === 'sending' ? 'Sending...' : `Send ${meta?.symbol ?? coin}`}
            </button>
            <ZeroFeeNote compact />
          </div>
        )}
      </div>
    </div>
  );
}
