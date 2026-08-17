'use client';

import React from 'react';
import type { Contact } from '@/lib/address-book';

export function RecipientInput({
  to,
  setTo,
  contactOpen,
  setContactOpen,
  contacts,
  qrInputRef,
  handleQRScan,
  box,
  inp,
}: {
  to: string;
  setTo: (v: string) => void;
  contactOpen: boolean;
  setContactOpen: React.Dispatch<React.SetStateAction<boolean>>;
  contacts: Contact[];
  qrInputRef: React.RefObject<HTMLInputElement>;
  handleQRScan: (file: File) => void;
  box: React.CSSProperties;
  inp: React.CSSProperties;
}) {
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ ...box, display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="text"
          placeholder="Recipient address (0x...)"
          autoComplete="off"
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            setContactOpen(false);
          }}
          style={{ ...inp, flex: 1 }}
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
              borderRadius: 8,
              padding: '5px 7px',
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
            </svg>
          </button>
        )}
        <input
          ref={qrInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleQRScan(file);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => qrInputRef.current?.click()}
          title="Scan QR image"
          style={{
            flexShrink: 0,
            background: 'rgba(43,45,51,0.08)',
            border: '1px solid rgba(43,45,51,0.2)',
            borderRadius: 8,
            padding: '5px 7px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 17, color: '#2b2d33' }}>
            qr_code_scanner
          </span>
        </button>
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
                padding: '8px 12px',
                width: '100%',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: '#23262b' }}>{c.name}</span>
              <span style={{ fontSize: 10, color: '#8a8f98', fontFamily: 'monospace' }}>
                {c.address.slice(0, 10)}…{c.address.slice(-6)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
