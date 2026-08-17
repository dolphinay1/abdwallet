'use client';

import React, { useState } from 'react';
import { AlertCircle, Zap, Link, WifiOff, Wifi, Check, Copy } from 'lucide-react';
import { ABDCapsule } from '@/components/ABDCapsule';

type LnStatus = 'idle' | 'connecting' | 'connected' | 'error';
type LnSubTab = 'receive' | 'send';
interface WebLNNode {
  alias?: string;
  pubkey?: string;
}

export function LightningTab() {
  const [status, setStatus] = useState<LnStatus>('idle');
  const [nodeInfo, setNodeInfo] = useState<WebLNNode | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [subTab, setSubTab] = useState<LnSubTab>('receive');
  const [recvAmount, setRecvAmount] = useState('');
  const [recvMemo, setRecvMemo] = useState('');
  const [invoice, setInvoice] = useState('');
  const [invoiceCopied, setInvoiceCopied] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState('');
  const [payReq, setPayReq] = useState('');
  const [payStatus, setPayStatus] = useState<'idle' | 'paying' | 'done' | 'error'>('idle');
  const [payError, setPayError] = useState('');
  const [payPreimage, setPayPreimage] = useState('');

  // @ts-expect-error webln is an injected browser window property
  const webln = typeof window !== 'undefined' ? window.webln : null;
  const hasWebLN = !!webln;

  const connect = async () => {
    if (!webln) return;
    setStatus('connecting');
    try {
      await webln.enable();
      const info = await webln.getInfo();
      setNodeInfo(info?.node ?? {});
      try {
        const bal = await webln.getBalance?.();
        if (bal?.balance != null) setBalance(bal.balance);
      } catch {}
      setStatus('connected');
    } catch {
      setStatus('error');
    }
  };

  const makeInvoice = async () => {
    if (!webln || status !== 'connected') return;
    const sats = parseInt(recvAmount, 10);
    if (!sats || sats < 1) {
      setGenError('Enter a valid amount in sats');
      return;
    }
    setGenLoading(true);
    setGenError('');
    setInvoice('');
    try {
      const result = await webln.makeInvoice({ amount: sats, defaultMemo: recvMemo || 'ABD Wallet' });
      setInvoice(result.paymentRequest);
    } catch (e: unknown) {
      setGenError(e instanceof Error ? e.message : 'Invoice generation failed');
    } finally {
      setGenLoading(false);
    }
  };

  const copyInvoice = async () => {
    if (!invoice) return;
    await navigator.clipboard.writeText(invoice).catch(() => {});
    setInvoiceCopied(true);
    setTimeout(() => setInvoiceCopied(false), 2000);
  };

  const payInvoice = async () => {
    if (!webln || status !== 'connected' || !payReq.trim()) return;
    setPayStatus('paying');
    setPayError('');
    setPayPreimage('');
    try {
      const result = await webln.sendPayment(payReq.trim());
      setPayPreimage(result?.preimage ?? '');
      setPayStatus('done');
    } catch (e: unknown) {
      setPayError(e instanceof Error ? e.message : 'Payment failed');
      setPayStatus('error');
    }
  };

  if (!hasWebLN) {
    return (
      <div className="space-y-3 p-6 neu-card-sm rounded-xl border border-transparent">
        <div className="flex items-start gap-4 p-4 neu-card-sm rounded-xl border border-transparent">
          <AlertCircle size={16} className="text-[#8a8f98] mt-0.5 shrink-0" />
          <div>
            <p className="font-black text-[#23262b] text-xs uppercase tracking-widest mb-1">No Lightning Provider</p>
            <p className="text-[#8a8f98] text-xs leading-relaxed">
              Install a WebLN-compatible browser extension to enable Lightning payments.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 mt-4">
          {[
            { name: 'Alby', desc: 'Most popular — custodial & self-hosted nodes', badge: 'Recommended', logo: 'https://github.com/getAlby.png' },
            { name: 'Zeus', desc: 'Connect your own LND / Core Lightning node', badge: 'Self-custody', logo: 'https://github.com/ZeusLN.png' },
            { name: 'Mutiny Wallet', desc: 'Browser-native Lightning + on-chain wallet', badge: 'PWA', logo: 'https://github.com/MutinyWallet.png' },
          ].map((p) => (
            <div key={p.name} className="flex items-center gap-4 p-4 neu-card-sm rounded-xl border border-transparent">
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: '#e4e6ee',
                  boxShadow: 'inset 3px 3px 6px rgba(166,177,198,0.5), inset -3px -3px 6px rgba(255,255,255,0.9)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  overflow: 'hidden',
                }}
              >
                <img src={p.logo} alt={p.name} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-black text-[#23262b] text-sm">{p.name}</span>
                  <span className="bg-[rgba(166,177,198,0.2)] text-[#8a8f98] text-[10px] px-2 py-0.5 rounded-full font-black">
                    {p.badge}
                  </span>
                </div>
                <p className="text-[#8a8f98] text-xs mt-0.5">{p.desc}</p>
              </div>
              <Link size={14} className="text-surface-variant shrink-0" />
            </div>
          ))}
        </div>
        <p className="text-surface-variant text-xs text-center">After installing, reload this page to activate Lightning.</p>
      </div>
    );
  }

  if (status === 'idle' || status === 'error') {
    return (
      <div className="flex flex-col items-center gap-6 p-8 neu-card-sm rounded-xl border border-transparent">
        <div className="w-16 h-16 rounded-full bg-[rgba(166,177,198,0.2)] border border-[rgba(166,177,198,0.4)] flex items-center justify-center">
          {status === 'error' ? <WifiOff size={24} className="text-[#8a8f98]" /> : <Zap size={24} className="text-[#8a8f98]" />}
        </div>
        <div className="text-center">
          <p className="font-black text-[#23262b] text-lg uppercase tracking-tighter">Lightning Network</p>
          <p className="text-[#8a8f98] text-xs mt-1 leading-relaxed max-w-xs">
            {status === 'error'
              ? 'Connection failed. Make sure your node is online and try again.'
              : 'Connect your WebLN node to send and receive Lightning payments instantly.'}
          </p>
        </div>
        <button
          onClick={connect}
          className="bg-[#2b2d33] text-[#f5f6fa] font-black uppercase tracking-widest text-xs px-6 py-3 rounded-xl flex items-center gap-2 active:scale-95 transition-transform"
        >
          <Wifi size={14} /> Connect Node
        </button>
      </div>
    );
  }

  if (status === 'connecting') {
    return (
      <div className="flex flex-col items-center gap-4 p-8">
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '2px solid rgba(43,45,51,0.2)',
            borderTopColor: '#2b2d33',
            animation: 'spin 1s linear infinite',
          }}
        />
        <p className="text-[#8a8f98] text-xs">Requesting permission...</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3 p-4 neu-card-sm rounded-xl border border-[rgba(166,177,198,0.4)]">
        <div className="w-2 h-2 rounded-full bg-[#2b2d33] shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-black text-[#23262b] text-sm">{nodeInfo?.alias || 'Lightning Node'}</p>
          {nodeInfo?.pubkey && (
            <p className="text-[#8a8f98] text-[10px] font-mono truncate">
              {nodeInfo.pubkey.slice(0, 20)}...{nodeInfo.pubkey.slice(-8)}
            </p>
          )}
        </div>
        {balance != null && (
          <div className="text-right shrink-0">
            <p className="font-black text-[#8a8f98] text-sm">{balance.toLocaleString()}</p>
            <p className="text-[#8a8f98] text-[10px]">sats</p>
          </div>
        )}
      </div>

      <div className="flex gap-1 p-1 neu-card-sm rounded-xl border border-transparent">
        {(['receive', 'send'] as LnSubTab[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setSubTab(t);
              setPayStatus('idle');
              setInvoice('');
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-colors ${
              subTab === t ? 'neu-inset text-[#23262b] border border-transparent' : 'text-[#8a8f98] hover:text-[#23262b]'
            }`}
          >
            {t === 'receive' ? '↓ Receive' : '↑ Send'}
          </button>
        ))}
      </div>

      {subTab === 'receive' && (
        <div className="space-y-3">
          <div className="bg-[rgba(166,177,198,0.15)] rounded-xl p-3 border border-transparent">
            <ABDCapsule type="text" placeholder="Amount (sats)" onValue={setRecvAmount} className="w-full" />
          </div>
          <div className="bg-[rgba(166,177,198,0.15)] rounded-xl p-3 border border-transparent">
            <ABDCapsule type="text" placeholder="Memo (optional)" onValue={setRecvMemo} className="w-full" />
          </div>
          {genError && <p className="text-on-error-container text-xs">{genError}</p>}
          <button
            onClick={makeInvoice}
            disabled={genLoading}
            className={`w-full py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all active:scale-[0.98] ${
              genLoading ? 'neu-inset text-[#8a8f98] cursor-not-allowed' : 'bg-[#2b2d33] text-[#f5f6fa]'
            }`}
          >
            {genLoading ? 'Generating...' : 'Generate Invoice'}
          </button>
          {invoice && (
            <div className="neu-card-sm rounded-xl p-3 border border-[rgba(166,177,198,0.4)] space-y-2">
              <p className="text-[#8a8f98] text-[10px] font-mono break-all leading-relaxed">{invoice.slice(0, 60)}...</p>
              <button
                onClick={copyInvoice}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black ${
                  invoiceCopied
                    ? 'bg-[rgba(166,177,198,0.2)] text-[#8a8f98] border border-transparent'
                    : 'bg-[rgba(166,177,198,0.15)] text-[#8a8f98] border border-transparent'
                }`}
              >
                {invoiceCopied ? (
                  <>
                    <Check size={10} /> Copied!
                  </>
                ) : (
                  <>
                    <Copy size={10} /> Copy Full Invoice
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {subTab === 'send' && (
        <div className="space-y-3">
          {payStatus === 'done' ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-12 h-12 rounded-full bg-[rgba(166,177,198,0.2)] border border-transparent flex items-center justify-center">
                <Check size={20} className="text-[#8a8f98]" />
              </div>
              <p className="font-black text-[#23262b] uppercase text-base tracking-tighter">Payment Sent!</p>
              {payPreimage && <p className="text-[#8a8f98] text-[10px] font-mono break-all text-center">Preimage: {payPreimage.slice(0, 20)}...</p>}
              <button
                onClick={() => {
                  setPayStatus('idle');
                  setPayReq('');
                  setPayPreimage('');
                }}
                className="bg-[rgba(166,177,198,0.15)] border border-transparent rounded-xl px-4 py-2 text-xs text-[#8a8f98] font-black"
              >
                Send Another
              </button>
            </div>
          ) : (
            <>
              <div className="bg-[rgba(166,177,198,0.15)] rounded-xl p-3 border border-transparent">
                <ABDCapsule type="text" placeholder="Paste BOLT11 invoice (lnbc...)" onValue={setPayReq} className="w-full" />
              </div>
              {payError && <p className="text-on-error-container text-xs">{payError}</p>}
              <button
                onClick={payInvoice}
                disabled={payStatus === 'paying' || !payReq.trim()}
                className={`w-full py-3 rounded-xl russo-one-regular uppercase tracking-widest text-xs transition-all active:scale-[0.98] ${
                  payStatus === 'paying' || !payReq.trim() ? 'neu-inset text-[#8a8f98] cursor-not-allowed' : 'bg-[#2b2d33] text-[#f5f6fa]'
                }`}
              >
                {payStatus === 'paying' ? (
                  'Sending...'
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Zap size={13} /> Pay Invoice
                  </span>
                )}
              </button>
              <p className="text-surface-variant text-[10px] text-center">Supports BOLT11 invoices · Powered by WebLN</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
