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
            className="sf-display-black"
            style={{
              color: '#1e293b',
              fontSize: 20,
              fontWeight: 900,
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
        <p className="sf-mono-bold" style={{ color: '#1e293b', fontSize: 10, fontWeight: 700, wordBreak: 'break-all', textAlign: 'center', margin: 0 }}>
          {address}
        </p>
        <button
          onClick={copy}
          className="sf-display-black"
          style={{
            background: copied ? 'rgba(43,45,51,0.1)' : 'rgba(166,177,198,0.06)',
            border: `1px solid ${copied ? 'rgba(43,45,51,0.3)' : 'rgba(166,177,198,0.1)'}`,
            borderRadius: '1rem',
            padding: '10px 20px',
            fontSize: 11,
            color: copied ? '#059669' : '#1e293b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {copied ? (
            <>
              <Check size={14} /> Copied!
            </>
          ) : (
            <>
              <Copy size={14} /> Copy Address
            </>
          )}
        </button>
        <p
          className="sf-bold"
          style={{ color: '#64748b', fontSize: 10, textAlign: 'center', margin: 0, fontWeight: 600 }}
        >
          Send only EVM-compatible assets to this address
        </p>
      </div>
    </div>
  );
}
