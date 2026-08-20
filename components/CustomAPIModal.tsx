'use client';

import React, { useState } from 'react';
import { X, Check, AlertCircle } from 'lucide-react';
import { CustomAPI, saveCustomAPI, queryBalance } from '@/lib/custom-apis';

interface Props {
  activeAddress: string | null;
  onClose: () => void;
  onSaved: (api: CustomAPI) => void;
}

export function CustomAPIModal({ activeAddress, onClose, onSaved }: Props) {
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [decimals, setDecimals] = useState('8');
  const [balanceEndpoint, setBalanceEndpoint] = useState('');
  const [balanceJsonPath, setBalanceJsonPath] = useState('data.balance');
  const [sendEndpoint, setSendEndpoint] = useState('');
  const [sendBodyTemplate, setSendBodyTemplate] = useState('{"from":"{from}","to":"{to}","amount":"{amount}"}');
  const [apiKey, setApiKey] = useState('');
  const [apiKeyHeader, setApiKeyHeader] = useState('X-API-Key');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [testResult, setTestResult] = useState('');
  const [errMsg, setErrMsg] = useState('');

  const box: React.CSSProperties = {
    background: '#e4e6ee', boxShadow: 'inset 3px 3px 6px rgba(166,177,198,0.5), inset -3px -3px 6px rgba(255,255,255,0.9)', borderRadius: '0.75rem',
    padding: '10px 14px', border: '1px solid rgba(166,177,198,0.08)',
  };
  const inp: React.CSSProperties = {
    width: '100%', background: 'transparent', border: 'none', outline: 'none',
    color: '#23262b', fontSize: 13, fontFamily: 'inherit',
  };
  const lbl: React.CSSProperties = {
    color: '#5b6270', fontSize: 10, fontWeight: 400, textTransform: 'uppercase',
    letterSpacing: '0.1em', marginBottom: 4, display: 'block',
  };

  const buildAPI = (): CustomAPI => ({
    id: crypto.randomUUID(),
    name, symbol, decimals: parseInt(decimals) || 8,
    balanceEndpoint, balanceJsonPath,
    sendEndpoint: sendEndpoint || undefined,
    sendBodyTemplate: sendEndpoint ? sendBodyTemplate : undefined,
    apiKey: apiKey || undefined,
    apiKeyHeader: apiKey ? apiKeyHeader : undefined,
  });

  const handleTest = async () => {
    if (!balanceEndpoint) { setErrMsg('Enter balance endpoint first'); return; }
    const addr = activeAddress ?? '0x0000000000000000000000000000000000000000';
    setTestStatus('testing'); setTestResult(''); setErrMsg('');
    try {
      const api = buildAPI();
      const balance = await queryBalance(api, addr);
      setTestResult(`Balance: ${balance} ${symbol || '?'}`);
      setTestStatus('ok');
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message.slice(0, 120) : 'Test failed');
      setTestStatus('error');
    }
  };

  const handleSave = () => {
    if (!name || !symbol || !balanceEndpoint || !balanceJsonPath) { setErrMsg('Fill all required fields'); return; }
    const api = buildAPI();
    saveCustomAPI(api);
    onSaved(api);
    onClose();
  };

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(228,230,238,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#e4e6ee', boxShadow: '9px 9px 18px rgba(166,177,198,0.55), -9px -9px 18px rgba(255,255,255,0.9)', borderRadius: '1.5rem', width: 460, maxWidth: '95vw', maxHeight: '92vh', overflowY: 'auto', padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span className="sf-display-black" style={{ color: '#1e293b', fontSize: 18, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Add Custom Coin / API</span>
          <button
            aria-label="Close custom API modal"
            onClick={onClose}
            style={{ background: '#e4e6ee', boxShadow: '3px 3px 6px rgba(166,177,198,0.55), -3px -3px 6px rgba(255,255,255,0.9)', border: 'none', borderRadius: '0.6rem', padding: 7, cursor: 'pointer', color: '#5b6270', display: 'flex' }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Basic Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: 10 }}>
            <div>
              <span className="russo-one-regular" style={lbl}>Name *</span>
              <div style={box}><input style={inp} placeholder="e.g. Solana" value={name} onChange={e => setName(e.target.value)} /></div>
            </div>
            <div>
              <span className="russo-one-regular" style={lbl}>Symbol *</span>
              <div style={box}><input style={inp} placeholder="SOL" value={symbol} onChange={e => setSymbol(e.target.value)} /></div>
            </div>
            <div>
              <span className="russo-one-regular" style={lbl}>Decimals</span>
              <div style={box}><input style={inp} type="number" value={decimals} onChange={e => setDecimals(e.target.value)} /></div>
            </div>
          </div>

          {/* Balance endpoint */}
          <div>
            <span className="russo-one-regular" style={lbl}>Balance Endpoint * <span style={{ color: '#5b6270', fontWeight: 400 }}>(use {'{address}'} placeholder)</span></span>
            <div style={box}><input style={inp} placeholder="https://api.example.com/balance/{address}" value={balanceEndpoint} onChange={e => setBalanceEndpoint(e.target.value)} /></div>
          </div>

          <div>
            <span className="russo-one-regular" style={lbl}>JSON Path * <span style={{ color: '#5b6270', fontWeight: 400 }}>dot-notation</span></span>
            <div style={box}><input style={inp} placeholder="data.balance" value={balanceJsonPath} onChange={e => setBalanceJsonPath(e.target.value)} /></div>
          </div>

          {/* Send endpoint (optional) */}
          <div>
            <span className="russo-one-regular" style={lbl}>Send Endpoint <span style={{ color: '#5b6270', fontWeight: 400 }}>(optional — POST)</span></span>
            <div style={box}><input style={inp} placeholder="https://api.example.com/send" value={sendEndpoint} onChange={e => setSendEndpoint(e.target.value)} /></div>
          </div>

            <div>
              <span className="russo-one-regular" style={lbl}>Body Template <span style={{ color: '#5b6270', fontWeight: 400 }}>{'{from} {to} {amount} {signedTx}'}</span></span>
              <div style={{ ...box }}>
                <textarea value={sendBodyTemplate} onChange={e => setSendBodyTemplate(e.target.value)}
                  rows={3}
                  placeholder='{"from":"{from}","to":"{to}","amount":"{amount}"}'
                  style={{ ...inp, resize: 'vertical', fontFamily: "var(--font-sf-mono), 'SF Mono', monospace", fontSize: 11 }} />
              </div>
              <p className="sf-bold" style={{ color: '#5b6270', fontSize: 10, marginTop: 4, fontWeight: 600 }}>Private keys are never transmitted over the network.</p>
            </div>

          {/* API Key (optional) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <span className="russo-one-regular" style={lbl}>API Key <span style={{ color: '#5b6270', fontWeight: 400 }}>(optional)</span></span>
              <div style={box}><input style={inp} placeholder="your-api-key" value={apiKey} onChange={e => setApiKey(e.target.value)} /></div>
            </div>
            <div>
              <span className="russo-one-regular" style={lbl}>Key Header</span>
              <div style={box}><input style={inp} placeholder="X-API-Key" value={apiKeyHeader} onChange={e => setApiKeyHeader(e.target.value)} /></div>
            </div>
          </div>

          {/* Test */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="russo-one-regular" onClick={handleTest}
              style={{ background: 'rgba(43,45,51,0.1)', border: '1px solid rgba(43,45,51,0.25)', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', color: '#2b2d33', fontSize: 11, fontWeight: 400, textTransform: 'uppercase' }}>
              {testStatus === 'testing' ? 'Testing...' : 'Test Balance'}
            </button>
            {testStatus === 'ok' && <><Check size={13} style={{ color: '#2b2d33' }} /><span style={{ color: '#2b2d33', fontSize: 11 }}>{testResult}</span></>}
            {testStatus === 'error' && <AlertCircle size={13} style={{ color: '#b91c1c' }} />}
          </div>

          {errMsg && (
            <div style={{ background: 'rgba(255,100,100,0.1)', border: '1px solid rgba(255,100,100,0.2)', borderRadius: 8, padding: '8px 12px', color: '#b91c1c', fontSize: 11 }}>
              {errMsg}
            </div>
          )}

          <button className="russo-one-regular" onClick={handleSave}
            style={{ background: '#2b2d33', color: '#f5f6fa', border: 'none', borderRadius: '0.75rem', padding: '14px', fontSize: 13, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', marginTop: 4 }}>
            Save API
          </button>
        </div>
      </div>
    </div>
  );
}
