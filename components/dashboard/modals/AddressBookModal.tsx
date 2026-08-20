'use client';

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { X, Trash2 } from 'lucide-react';
import type { Contact } from '@/lib/address-book';

export function AddressBookModal({
  contacts,
  onAdd,
  onDelete,
  onClose,
}: {
  contacts: Contact[];
  onAdd: (c: Omit<Contact, 'id' | 'addedAt'>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleAdd = () => {
    if (!name.trim()) {
      setErr('Name required');
      return;
    }
    if (!ethers.isAddress(address.trim())) {
      setErr('Invalid Ethereum address');
      return;
    }
    onAdd({ name: name.trim(), address: address.trim(), note: note.trim() || undefined });
    setName('');
    setAddress('');
    setNote('');
    setAdding(false);
    setErr('');
  };

  const inp: React.CSSProperties = {
    background: '#e4e6ee',
    boxShadow: 'inset 3px 3px 6px rgba(166,177,198,0.5), inset -3px -3px 6px rgba(255,255,255,0.9)',
    borderRadius: 10,
    padding: '10px 12px',
    color: '#23262b',
    fontSize: 13,
    width: '100%',
    outline: 'none',
    fontFamily: 'inherit',
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
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
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
            Address Book
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
        <div style={{ overflowY: 'auto', padding: '16px 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Add contact form */}
          {!adding ? (
            <button
              onClick={() => setAdding(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(43,45,51,0.07)',
                border: '1px solid rgba(43,45,51,0.18)',
                borderRadius: 10,
                padding: '10px 14px',
                cursor: 'pointer',
                color: '#2b2d33',
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              + Add Contact
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input style={inp} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
              <input style={{ ...inp, fontFamily: "var(--font-sf-mono), 'SF Mono', monospace" }} placeholder="0x… address" value={address} onChange={(e) => setAddress(e.target.value)} />
              <input style={inp} placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
              {err && <p style={{ color: '#b91c1c', fontSize: 11, margin: 0 }}>{err}</p>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleAdd}
                  style={{ flex: 1, background: '#2b2d33', border: 'none', borderRadius: 10, color: '#e4e6ee', fontWeight: 900, fontSize: 12, padding: '10px', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setAdding(false);
                    setErr('');
                  }}
                  style={{
                    flex: 1,
                    background: '#e4e6ee',
                    boxShadow: 'inset 3px 3px 6px rgba(166,177,198,0.5), inset -3px -3px 6px rgba(255,255,255,0.9)',
                    borderRadius: 10,
                    color: '#8a8f98',
                    fontWeight: 700,
                    fontSize: 12,
                    padding: '10px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Contact list */}
          {contacts.length === 0 ? (
            <p style={{ color: '#8a8f98', fontSize: 12, textAlign: 'center', margin: '12px 0' }}>No contacts yet.</p>
          ) : (
            contacts.map((c) => (
              <div
                key={c.id}
                style={{
                  background: 'rgba(166,177,198,0.03)',
                  border: '1px solid rgba(166,177,198,0.07)',
                  borderRadius: 20,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'rgba(43,45,51,0.08)',
                    border: '1px solid rgba(43,45,51,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ color: '#2b2d33', fontSize: 14, fontWeight: 900 }}>{c.name.slice(0, 1).toUpperCase()}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: '#23262b', fontSize: 13, fontWeight: 700, margin: 0 }}>{c.name}</p>
                  <p
                    style={{
                      color: '#8a8f98',
                      fontSize: 10,
                      fontFamily: "var(--font-sf-mono), 'SF Mono', monospace",
                      margin: '2px 0 0',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.address}
                  </p>
                  {c.note && <p style={{ color: '#8a8f98', fontSize: 10, margin: '2px 0 0' }}>{c.note}</p>}
                </div>
                <button
                  onClick={() => onDelete(c.id)}
                  style={{
                    background: 'rgba(255,100,100,0.07)',
                    border: '1px solid rgba(255,100,100,0.15)',
                    borderRadius: 999,
                    padding: '5px 7px',
                    cursor: 'pointer',
                    color: '#b91c1c',
                    display: 'flex',
                    flexShrink: 0,
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
