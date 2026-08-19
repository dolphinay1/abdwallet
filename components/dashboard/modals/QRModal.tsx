'use client';

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Check, Copy } from 'lucide-react';

export function QRModal({ address, onClose }: { address: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const copy = async () => {
    await navigator.clipboard.writeText(address).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          width: 320,
          maxWidth: '92vw',
          padding: '28px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <span
            className="russo-one-regular"
            style={{
              color: '#23262b',
              fontSize: 20,
              fontWeight: 400,
              fontStyle: 'normal',
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
            }}
          >
            Receive
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
            <X size={16} />
          </button>
        </div>
        <div style={{ background: '#23262b', borderRadius: '1rem', padding: 16 }}>
          <QRCodeSVG value={address} size={200} level="M" />
        </div>
        <p style={{ color: '#23262b', fontSize: 9, fontFamily: "var(--font-sf-mono), 'SF Mono', monospace", wordBreak: 'break-all', textAlign: 'center', margin: 0 }}>
          {address}
        </p>
        <button
          onClick={copy}
          className="russo-one-regular"
          style={{
            background: copied ? 'rgba(43,45,51,0.1)' : 'rgba(166,177,198,0.06)',
            border: `1px solid ${copied ? 'rgba(43,45,51,0.3)' : 'rgba(166,177,198,0.1)'}`,
            borderRadius: '1rem',
            padding: '10px 20px',
            fontSize: 10,
            color: copied ? '#2b2d33' : '#23262b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontWeight: 400,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {copied ? (
            <>
              <Check size={12} /> Copied!
            </>
          ) : (
            <>
              <Copy size={12} /> Copy Address
            </>
          )}
        </button>
        <p
          className="russo-one-regular"
          style={{ color: '#8a8f98', fontSize: 9, textAlign: 'center', margin: 0, fontWeight: 400, letterSpacing: '0.02em' }}
        >
          Send only EVM-compatible assets to this address
        </p>
      </div>
    </div>
  );
}
