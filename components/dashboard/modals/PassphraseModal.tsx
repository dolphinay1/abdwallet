'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Lock, Eye, EyeOff } from 'lucide-react';

export function PassphraseModal({
  isOpen,
  title = 'Set Vault Password',
  description = 'Enter a password to encrypt and secure this wallet for persistent storage.',
  confirmText = 'Encrypt & Save',
  onConfirm,
  onClose,
}: {
  isOpen: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  onConfirm: (password: string) => void;
  onClose: () => void;
}) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setConfirmPassword('');
      setError('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    onConfirm(password);
  };

  const boxStyle: React.CSSProperties = {
    background: '#e4e6ee',
    boxShadow: 'inset 3px 3px 6px rgba(166,177,198,0.5), inset -3px -3px 6px rgba(255,255,255,0.9)',
    borderRadius: 12,
    padding: '12px 14px',
    border: '1px solid rgba(166,177,198,0.08)',
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
        zIndex: 250,
        background: 'rgba(166,177,198,0.85)',
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
          width: 380,
          maxWidth: '92vw',
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'rgba(43,45,51,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Lock size={16} style={{ color: '#2b2d33' }} />
            </div>
            <span
              className="russo-one-regular"
              style={{ color: '#23262b', fontSize: 18, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.02em' }}
            >
              {title}
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

        <p style={{ color: '#5b6270', fontSize: 11, margin: 0, lineHeight: 1.4 }}>{description}</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ ...boxStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              ref={inputRef}
              type={showPassword ? 'text' : 'password'}
              placeholder="Vault Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#23262b',
                fontSize: 13,
                fontFamily: 'inherit',
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              style={{ background: 'none', border: 'none', color: '#5b6270', cursor: 'pointer', display: 'flex' }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <div style={{ ...boxStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirm Vault Password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError('');
              }}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#23262b',
                fontSize: 13,
                fontFamily: 'inherit',
              }}
            />
          </div>

          {error && <p style={{ color: '#b91c1c', fontSize: 11, margin: 0, fontWeight: 600 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              className="russo-one-regular"
              style={{
                flex: 1,
                padding: '12px',
                background: '#e4e6ee',
                boxShadow: 'inset 3px 3px 6px rgba(166,177,198,0.5), inset -3px -3px 6px rgba(255,255,255,0.9)',
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 400,
                color: '#5b6270',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="russo-one-regular"
              style={{
                flex: 2,
                padding: '12px',
                background: '#2b2d33',
                border: 'none',
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 400,
                color: '#f5f6fa',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {confirmText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
