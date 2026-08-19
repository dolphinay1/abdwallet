'use client';

import React, { useState } from 'react';
import { X, Usb, CheckCircle, AlertCircle } from 'lucide-react';
import {
  connectLedger,
  saveLedgerDevice,
  isWebHIDSupported,
  LEDGER_DERIVATION_PATH,
  LedgerEntry,
} from '@/lib/ledger';

interface Props {
  onConnect: (entry: LedgerEntry) => void;
  onClose: () => void;
}

type ConnectStatus = 'idle' | 'connecting' | 'done' | 'error';

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(228,230,238,0.65)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16,
};
const card: React.CSSProperties = {
  background: '#e4e6ee', boxShadow: '9px 9px 18px rgba(166,177,198,0.55), -9px -9px 18px rgba(255,255,255,0.9)', borderRadius: 16, padding: 28, width: '100%',
  maxWidth: 400,
};
const btn = (color = '#2b2d33'): React.CSSProperties => ({
  background: color, color: '#f5f6fa', border: 'none', borderRadius: 10, padding: '12px 20px',
  width: '100%', cursor: 'pointer', fontSize: 15, fontWeight: 600, marginTop: 8,
});
const stepBox: React.CSSProperties = {
  background: '#e4e6ee', boxShadow: 'inset 3px 3px 6px rgba(166,177,198,0.5), inset -3px -3px 6px rgba(255,255,255,0.9)', borderRadius: 10, padding: '10px 14px',
  marginBottom: 8, fontSize: 13, color: '#8a8f98',
};

export function LedgerConnectModal({ onConnect, onClose }: Props) {
  const [status, setStatus] = useState<ConnectStatus>('idle');
  const [error, setError] = useState('');
  const [connectedEntry, setConnectedEntry] = useState<LedgerEntry | null>(null);
  const [derivationPath, setDerivationPath] = useState(LEDGER_DERIVATION_PATH);

  const supported = isWebHIDSupported();

  const handleConnect = async () => {
    setStatus('connecting');
    setError('');
    try {
      const device = await connectLedger(derivationPath);
      const entry: LedgerEntry = {
        id: crypto.randomUUID(),
        address: device.address,
        derivationPath: device.derivationPath,
        addedAt: Date.now(),
        label: 'Ledger',
      };
      saveLedgerDevice(entry);
      setConnectedEntry(entry);
      setStatus('done');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Connection failed');
      setStatus('error');
    }
  };

  const handleConfirm = () => {
    if (connectedEntry) onConnect(connectedEntry);
  };

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={card}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Usb size={20} color="#8a8f98" />
            <span style={{ fontWeight: 700, fontSize: 17, color: '#23262b' }}>Connect Ledger</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a8f98', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {!supported && (
          <div style={{ background: 'rgba(185,28,28,.15)', borderRadius: 10, padding: 14, marginBottom: 16, color: '#b91c1c', fontSize: 13 }}>
            WebHID is not supported in this browser. Please use Chrome, Edge, or Brave.
          </div>
        )}

        {status === 'idle' && (
          <>
            <div style={{ marginBottom: 16 }}>
              <div style={stepBox}>1. Connect your Ledger via USB</div>
              <div style={stepBox}>2. Unlock the device (enter PIN)</div>
              <div style={stepBox}>3. Open the Ethereum app on Ledger</div>
              <div style={stepBox}>4. Click Connect below and approve in the browser popup</div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: '#8a8f98', marginBottom: 4 }}>Derivation path</div>
              <input
                value={derivationPath}
                onChange={e => setDerivationPath(e.target.value)}
                style={{
                  background: '#e4e6ee', boxShadow: 'inset 3px 3px 6px rgba(166,177,198,0.5), inset -3px -3px 6px rgba(255,255,255,0.9)', border: 'none',
                  borderRadius: 8, padding: '8px 12px', color: '#23262b', width: '100%',
                  fontSize: 13, fontFamily: "var(--font-sf-mono), 'SF Mono', monospace", boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              style={btn(supported ? '#2b2d33' : '#c9ced9')}
              onClick={handleConnect}
              disabled={!supported}
            >
              Connect Ledger
            </button>
          </>
        )}

        {status === 'connecting' && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#8a8f98' }}>
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}><Usb size={32} color="#8a8f98" /></div>
            <div style={{ fontSize: 14 }}>Waiting for Ledger approval...</div>
            <div style={{ fontSize: 12, marginTop: 8, color: '#8a8f98' }}>
              Check your device screen and approve the connection
            </div>
          </div>
        )}

        {status === 'done' && connectedEntry && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <CheckCircle size={40} color="#23262b" style={{ marginBottom: 12 }} />
            <div style={{ fontWeight: 600, color: '#23262b', marginBottom: 6 }}>Ledger Connected</div>
            <div style={{ fontSize: 12, color: '#8a8f98', fontFamily: "var(--font-sf-mono), 'SF Mono', monospace", marginBottom: 20 }}>
              {connectedEntry.address.slice(0, 10)}...{connectedEntry.address.slice(-8)}
            </div>
            <button style={btn('#23262b')} onClick={handleConfirm}>
              Use This Address
            </button>
          </div>
        )}

        {status === 'error' && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <AlertCircle size={36} color="#b91c1c" style={{ marginBottom: 12 }} />
            <div style={{ color: '#b91c1c', fontSize: 14, marginBottom: 16 }}>{error}</div>
            <button style={btn('#2b2d33')} onClick={() => setStatus('idle')}>
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
