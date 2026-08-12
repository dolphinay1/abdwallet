'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Link, Wifi, WifiOff, Check, AlertTriangle, Zap } from 'lucide-react';
import { Button, Input } from '@heroui/react';
import { upperEn } from '@/lib/text';
import { useWallet } from '@/context/WalletContext';
import { CHAINS } from '@/lib/chains';
import {
  getWalletKit,
  wcPair,
  wcApproveSession,
  wcRejectSession,
  handleWcRequest,
  wcRespondSuccess,
  wcRespondError,
  wcDisconnect,
  wcGetActiveSessions,
  wcSetListeners,
  wcClearListeners,
} from '@/lib/walletconnect';
import type { WalletKitTypes } from '@reown/walletkit';
import { scanDApp, type DAppRisk, riskColor, riskBg } from '@/lib/security-scan';

interface ActiveSession {
  topic: string;
  name: string;
  icon: string | null;
  url: string;
}

interface PendingRequest {
  event: WalletKitTypes.SessionRequest;
  method: string;
  chainId: string;
  params: unknown;
  dAppName: string;
}

const METHOD_LABELS: Record<string, string> = {
  eth_sendTransaction:  'Send Transaction',
  eth_signTransaction:  'Sign Transaction',
  personal_sign:        'Sign Message',
  eth_sign:             'Sign Message (Legacy)',
  eth_signTypedData:    'Sign Typed Data',
  eth_signTypedData_v4: 'Sign Typed Data v4',
};

// Official logos — cryptocurrency-icons repo for token logos, site favicons (128px) otherwise
const CI = (sym: string) => `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/${sym}.png`;
const FAV = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

const DAPPS: { name: string; url: string; icon: string; tag: string; color: string }[] = [
  { name: 'Uniswap',       url: 'https://app.uniswap.org',          icon: CI('uni'),       tag: 'DEX',      color: '#FF007A' },
  { name: 'Aave',          url: 'https://app.aave.com',             icon: CI('aave'),      tag: 'Lending',  color: '#B6509E' },
  { name: 'Curve',         url: 'https://curve.fi',                 icon: CI('crv'),       tag: 'DEX',      color: '#3466CE' },
  { name: '1inch',         url: 'https://app.1inch.io',             icon: CI('1inch'),     tag: 'Aggreg.',  color: '#1B314F' },
  { name: 'Compound',      url: 'https://app.compound.finance',     icon: CI('comp'),      tag: 'Lending',  color: '#00D395' },
  { name: 'Lido',          url: 'https://stake.lido.fi',            icon: FAV('stake.lido.fi'),            tag: 'Staking',  color: '#00A3FF' },
  { name: 'Balancer',      url: 'https://app.balancer.fi',          icon: CI('bal'),       tag: 'DEX',      color: '#1E1E1E' },
  { name: 'SushiSwap',     url: 'https://www.sushi.com/swap',       icon: CI('sushi'),     tag: 'DEX',      color: '#0E0F23' },
  { name: 'dYdX',          url: 'https://dydx.exchange',            icon: FAV('dydx.exchange'),            tag: 'Perps',    color: '#6966FF' },
  { name: 'GMX',           url: 'https://app.gmx.io',               icon: FAV('app.gmx.io'),               tag: 'Perps',    color: '#03D1CF' },
  { name: 'Gains Network', url: 'https://gains.trade',              icon: FAV('gains.trade'),              tag: 'Perps',    color: '#00B9AE' },
  { name: 'Morpho',        url: 'https://app.morpho.org',           icon: FAV('app.morpho.org'),           tag: 'Lending',  color: '#2470FF' },
  { name: 'Spark',         url: 'https://app.spark.fi',             icon: FAV('app.spark.fi'),             tag: 'Lending',  color: '#FF8151' },
  { name: 'Pendle',        url: 'https://app.pendle.finance',       icon: FAV('app.pendle.finance'),       tag: 'Yield',    color: '#5BCEAE' },
  { name: 'Yearn',         url: 'https://yearn.fi',                 icon: CI('yfi'),       tag: 'Yield',    color: '#006AE3' },
  { name: 'Convex',        url: 'https://www.convexfinance.com',    icon: FAV('www.convexfinance.com'),    tag: 'Yield',    color: '#FF5A5A' },
  { name: 'Velodrome',     url: 'https://velodrome.finance',        icon: FAV('velodrome.finance'),        tag: 'DEX',      color: '#FF0420' },
  { name: 'Aerodrome',     url: 'https://aerodrome.finance',        icon: FAV('aerodrome.finance'),        tag: 'DEX',      color: '#0052FF' },
  { name: 'Odos',          url: 'https://app.odos.xyz',             icon: FAV('app.odos.xyz'),             tag: 'Aggreg.',  color: '#A040FF' },
  { name: 'CoW Swap',      url: 'https://swap.cow.fi',              icon: FAV('swap.cow.fi'),              tag: 'DEX',      color: '#FF784A' },
  { name: 'Stargate',      url: 'https://stargate.finance',         icon: FAV('stargate.finance'),         tag: 'Bridge',   color: '#808080' },
  { name: 'Across',        url: 'https://app.across.to',            icon: FAV('app.across.to'),            tag: 'Bridge',   color: '#6CF9D8' },
  { name: 'Hop',           url: 'https://app.hop.exchange',         icon: FAV('app.hop.exchange'),         tag: 'Bridge',   color: '#E96DFF' },
  { name: 'Orbiter',       url: 'https://www.orbiter.finance',      icon: FAV('www.orbiter.finance'),      tag: 'Bridge',   color: '#333' },
  { name: 'Socket',        url: 'https://www.bungee.exchange',      icon: FAV('www.bungee.exchange'),      tag: 'Bridge',   color: '#F55000' },
  { name: 'Synapse',       url: 'https://synapseprotocol.com',      icon: FAV('synapseprotocol.com'),      tag: 'Bridge',   color: '#BF00FF' },
  { name: 'OpenSea',       url: 'https://opensea.io',               icon: FAV('opensea.io'),               tag: 'NFT',      color: '#2081E2' },
  { name: 'Blur',          url: 'https://blur.io',                  icon: FAV('blur.io'),                  tag: 'NFT',      color: '#FF8700' },
  { name: 'Rarible',       url: 'https://rarible.com',              icon: FAV('rarible.com'),              tag: 'NFT',      color: '#FEDA03' },
  { name: 'Foundation',    url: 'https://foundation.app',           icon: FAV('foundation.app'),           tag: 'NFT',      color: '#444' },
  { name: 'Zora',          url: 'https://zora.co',                  icon: FAV('zora.co'),                  tag: 'NFT',      color: '#A040FF' },
  { name: 'Manifold',      url: 'https://app.manifold.xyz',         icon: FAV('app.manifold.xyz'),         tag: 'NFT',      color: '#0038FF' },
  { name: 'Snapshot',      url: 'https://snapshot.org',             icon: FAV('snapshot.org'),             tag: 'Govern.',  color: '#F3B04E' },
  { name: 'Safe',          url: 'https://app.safe.global',          icon: FAV('app.safe.global'),          tag: 'Multisig', color: '#12FF80' },
  { name: 'Etherscan',     url: 'https://etherscan.io',             icon: FAV('etherscan.io'),             tag: 'Explorer', color: '#21325B' },
  { name: 'Arbiscan',      url: 'https://arbiscan.io',              icon: FAV('arbiscan.io'),              tag: 'Explorer', color: '#28A0F0' },
  { name: 'Basescan',      url: 'https://basescan.org',             icon: FAV('basescan.org'),             tag: 'Explorer', color: '#0052FF' },
  { name: 'Optimism Scan', url: 'https://optimistic.etherscan.io',  icon: FAV('optimistic.etherscan.io'),  tag: 'Explorer', color: '#FF0420' },
  { name: 'DeBank',        url: 'https://debank.com',               icon: FAV('debank.com'),               tag: 'Portfolio',color: '#FF7D00' },
  { name: 'Zapper',        url: 'https://zapper.xyz',               icon: FAV('zapper.xyz'),               tag: 'Portfolio',color: '#784FFE' },
];

const TAG_COLORS: Record<string, string> = {
  DEX: '#52ffac', Lending: '#60a5fa', Staking: '#38bdf8', 'Aggreg.': '#a78bfa',
  Perps: '#f87171', Yield: '#fbbf24', Bridge: '#fb923c', NFT: '#e879f9',
  'Govern.': '#f3b04e', Multisig: '#12FF80', Explorer: '#94a3b8', Portfolio: '#ff9f43',
};

function DappIcon({ icon, name, color }: { icon: string; name: string; color: string }) {
  const [failed, setFailed] = React.useState(false);
  // Logo-only — no chrome box around the icon
  return failed ? (
    <span style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: color || '#fff', fontWeight: 700, fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{name.slice(0, 1)}</span>
  ) : (
    <img src={icon} alt={name} width={40} height={40} loading="lazy" style={{ borderRadius: '0.75rem', objectFit: 'cover', flexShrink: 0 }} onError={() => setFailed(true)} />
  );
}

export function WalletConnectModal({ onClose }: { onClose: () => void }) {
  const wallet = useWallet();
  const [uri, setUri] = useState('');
  const [pairLoading, setPairLoading] = useState(false);
  const [pairError, setPairError] = useState('');
  const [sessions, setSessions] = useState<ActiveSession[]>([]);

  // Pending proposal (waiting for user approve/reject)
  const [pendingProposal, setPendingProposal] = useState<WalletKitTypes.SessionProposal | null>(null);
  // Pending signing request
  const [pendingRequest, setPendingRequest] = useState<PendingRequest | null>(null);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [requestDone, setRequestDone] = useState(false);
  const [dappFilter, setDappFilter] = useState('');
  const [dappRisk, setDappRisk] = useState<DAppRisk | null>(null);
  const [dappRiskDismissed, setDappRiskDismissed] = useState(false);

  const refreshSessions = useCallback(async () => {
    try {
      const raw = await wcGetActiveSessions();
      const list: ActiveSession[] = Object.entries(raw).map(([topic, s]) => {
        const sess = s as unknown as Record<string, unknown>;
        const peer = sess.peer as Record<string, unknown> | undefined;
        const meta = peer?.metadata as Record<string, unknown> | undefined;
        return {
          topic,
          name: (meta?.name as string) || 'Unknown dApp',
          icon: (meta?.icons as string[])?.[0] ?? null,
          url: (meta?.url as string) || '',
        };
      });
      setSessions(list);
    } catch {}
  }, []);

  useEffect(() => {
    // Register listeners on the singleton — works even if kit was already inited
    wcSetListeners({
      onProposal: (proposal) => {
        setPendingProposal(proposal);
      },
      onRequest: async (event) => {
        // Get dApp name + URL, then trigger a fresh security scan for this request
        try {
          const raw = await wcGetActiveSessions();
          const sess = raw[event.topic] as unknown as Record<string, unknown> | undefined;
          const peer = sess?.peer as Record<string, unknown> | undefined;
          const meta = peer?.metadata as Record<string, unknown> | undefined;
          const dAppName = (meta?.name as string) || 'Unknown dApp';
          const dAppUrl = (meta?.url as string) || '';
          setPendingRequest({
            event,
            method: event.params.request.method,
            chainId: event.params.chainId,
            params: event.params.request.params,
            dAppName,
          });
          // Re-scan on every signing request — user may have connected to a new dApp
          if (dAppUrl) {
            setDappRisk(null); setDappRiskDismissed(false);
            scanDApp(dAppUrl).then(setDappRisk).catch(() => {});
          }
        } catch {
          setPendingRequest({
            event,
            method: event.params.request.method,
            chainId: event.params.chainId,
            params: event.params.request.params,
            dAppName: 'dApp',
          });
        }
        setRequestError('');
        setRequestDone(false);
      },
      onDelete: () => { refreshSessions(); },
    });

    // Ensure kit is initialized (noop if already done) and load sessions
    getWalletKit().then(() => refreshSessions()).catch(console.error);

    return () => { wcClearListeners(); };
  }, [refreshSessions]);

  // Scan dApp URL when a new session proposal arrives
  useEffect(() => {
    setDappRisk(null); setDappRiskDismissed(false);
    if (!pendingProposal) return;
    const url = pendingProposal.params.proposer.metadata.url;
    if (!url) return;
    scanDApp(url).then(setDappRisk).catch(() => {});
  }, [pendingProposal]);

  const handlePair = async () => {
    if (!uri.trim()) { setPairError('Paste a wc: URI first'); return; }
    if (!uri.trim().startsWith('wc:')) { setPairError('Must start with wc:'); return; }
    setPairLoading(true); setPairError('');
    try {
      await wcPair(uri.trim());
      setUri('');
    } catch (e) {
      setPairError(e instanceof Error ? e.message : 'Pairing failed');
    } finally {
      setPairLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!pendingProposal || !wallet.activeAddress) return;
    try {
      await wcApproveSession(pendingProposal, wallet.activeAddress);
      setPendingProposal(null);
      await refreshSessions();
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = async () => {
    if (!pendingProposal) return;
    try { await wcRejectSession(pendingProposal); } catch {}
    setPendingProposal(null);
  };

  const handleApproveRequest = async () => {
    if (!pendingRequest || !wallet.scatteredKeyStore || !wallet.activeAddress) return;
    setRequestLoading(true); setRequestError('');
    try {
      const res = await handleWcRequest(pendingRequest.event, wallet.scatteredKeyStore, wallet.activeAddress);
      if (res.success) {
        await wcRespondSuccess(pendingRequest.event, res.result);
        setRequestDone(true);
        setTimeout(() => { setPendingRequest(null); setRequestDone(false); }, 1800);
      } else {
        setRequestError(res.error);
        await wcRespondError(pendingRequest.event, res.error);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Request failed';
      // "Record was recently deleted" = relay expired the request — dismiss silently
      if (msg.toLowerCase().includes('recently deleted') || msg.toLowerCase().includes('expired')) {
        setPendingRequest(null);
        return;
      }
      setRequestError(msg);
      try { await wcRespondError(pendingRequest.event, msg); } catch {}
    } finally {
      setRequestLoading(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!pendingRequest) return;
    try { await wcRespondError(pendingRequest.event, 'User rejected'); } catch {}
    setPendingRequest(null);
  };

  const handleDisconnect = async (topic: string) => {
    try { await wcDisconnect(topic); } catch {}
    await refreshSessions();
  };

  // ── Pending Session Proposal ───────────────────────────────────────────────
  if (pendingProposal) {
    const meta = pendingProposal.params.proposer.metadata;
    const reqChains = [
      ...Object.values(pendingProposal.params.requiredNamespaces ?? {}).flatMap(n => n.chains ?? []),
      ...Object.values(pendingProposal.params.optionalNamespaces ?? {}).flatMap(n => n.chains ?? []),
    ];
    const uniqueChains = [...new Set(reqChains)];

    return (
      <div onClick={e => { if (e.target === e.currentTarget) handleReject(); }}
        className="popup-backdrop"
        style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="popup-enter" style={{ background: '#111', borderRadius: '2rem', width: 400, maxWidth: '94vw', padding: '28px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <span style={{ color: '#fff', fontSize: 18, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>Connect Request</span>
            <Button isIconOnly size="sm" variant="flat" radius="lg" onPress={handleReject} className="text-[#c6c6c6]">
              <X size={16} />
            </Button>
          </div>

          {/* dApp info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px', background: 'rgba(255,255,255,0.04)', borderRadius: '1rem', marginBottom: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
            {meta.icons?.[0] ? (
              <img src={meta.icons[0]} alt={meta.name} style={{ width: 48, height: 48, borderRadius: '0.75rem', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 48, height: 48, borderRadius: '0.75rem', background: 'rgba(82,255,172,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Link size={20} style={{ color: '#52ffac' }} />
              </div>
            )}
            <div>
              <p style={{ color: '#fff', fontWeight: 900, fontSize: 15 }}>{meta.name}</p>
              <p style={{ color: '#555', fontSize: 10, marginTop: 2 }}>{meta.url}</p>
            </div>
          </div>

          {/* dApp security risk warning */}
          {dappRisk && !dappRiskDismissed && dappRisk.level !== 'safe' && dappRisk.level !== 'unknown' && dappRisk.flags.length > 0 && (
            <div style={{ background: riskBg(dappRisk.level), border: `1px solid ${riskColor(dappRisk.level)}44`, borderRadius: '1rem', padding: '12px 14px', marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: riskColor(dappRisk.level) }}>
                  {dappRisk.level === 'danger' ? '⚠ Suspicious dApp' : '⚡ Caution'}
                </span>
                <button onClick={() => setDappRiskDismissed(true)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: 12, padding: '0 2px', lineHeight: 1 }}>✕</button>
              </div>
              {dappRisk.flags.map((f, i) => (
                <p key={i} style={{ fontSize: 11, color: riskColor(dappRisk.level), margin: '1px 0', fontWeight: 600 }}>• {f}</p>
              ))}
              <p style={{ fontSize: 9, color: '#666', margin: '4px 0 0', fontStyle: 'italic' }}>
                Powered by GoPlus Security · dismiss to approve anyway
              </p>
            </div>
          )}

          {/* Requested chains */}
          {uniqueChains.length > 0 && (() => {
            const chainNameMap: Record<number, string> = Object.fromEntries(
              CHAINS.map(c => [c.id, c.name])
            );
            const resolve = (raw: string) => {
              const num = parseInt(raw.replace('eip155:', ''), 10);
              return chainNameMap[num] ?? null;
            };
            const known = uniqueChains.map(c => resolve(c)).filter(Boolean) as string[];
            const unknownCount = uniqueChains.length - known.length;
            const display = [...new Set(known)];
            return (
              <div style={{ marginBottom: 16 }}>
                <p style={{ color: '#555', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>Requested Chains</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {display.map(name => (
                    <span key={name} style={{ background: 'rgba(82,255,172,0.08)', border: '1px solid rgba(82,255,172,0.2)', borderRadius: 6, padding: '3px 8px', fontSize: 10, color: '#52ffac', fontWeight: 700 }}>
                      {name}
                    </span>
                  ))}
                  {unknownCount > 0 && (
                    <span style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '3px 8px', fontSize: 10, color: '#555', fontWeight: 700 }}>
                      +{unknownCount} more
                    </span>
                  )}
                  {display.length === 0 && (
                    <span style={{ fontSize: 10, color: '#555', fontWeight: 700 }}>Any EVM chain</span>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Your address */}
          <div style={{ padding: '10px 14px', background: 'rgba(82,255,172,0.05)', border: '1px solid rgba(82,255,172,0.15)', borderRadius: '0.75rem', marginBottom: 20 }}>
            <p style={{ color: '#555', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>Your Address</p>
            <p style={{ color: '#52ffac', fontSize: 11, fontFamily: 'monospace', wordBreak: 'break-all' }}>{wallet.activeAddress}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Button variant="bordered" radius="lg" onPress={handleReject}
              className="h-12 font-black tracking-wide text-[#c6c6c6]">
              {upperEn('Reject')}
            </Button>
            {(() => {
              const blocked = !dappRiskDismissed && dappRisk?.level === 'danger' && (dappRisk.flags.length > 0);
              return (
                <Button color={blocked ? 'danger' : 'primary'} variant={blocked ? 'flat' : 'solid'} radius="lg"
                  isDisabled={!!blocked} onPress={handleApprove}
                  className={`h-12 font-black tracking-wide ${blocked ? 'text-[10px]' : 'text-[13px]'}`}>
                  {upperEn(blocked ? 'Dismiss Warning First' : 'Approve')}
                </Button>
              );
            })()}
          </div>
        </div>
      </div>
    );
  }

  // ── Pending Signing Request ────────────────────────────────────────────────
  if (pendingRequest) {
    const methodLabel = METHOD_LABELS[pendingRequest.method] ?? pendingRequest.method;
    const isSign = !pendingRequest.method.includes('send');
    const paramsStr = JSON.stringify(pendingRequest.params, null, 2);

    return (
      <div onClick={e => { if (e.target === e.currentTarget) handleRejectRequest(); }}
        className="popup-backdrop"
        style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="popup-enter" style={{ background: '#111', borderRadius: '2rem', width: 420, maxWidth: '94vw', padding: '28px', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <span style={{ color: '#fff', fontSize: 18, fontWeight: 900, letterSpacing: '-0.02em' }}>
              {upperEn(isSign ? 'Signature Request' : 'Transaction Request')}
            </span>
            <Button isIconOnly size="sm" variant="flat" radius="lg" onPress={handleRejectRequest} className="text-[#c6c6c6]">
              <X size={16} />
            </Button>
          </div>

          {requestDone ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '24px 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(82,255,172,0.1)', border: '2px solid rgba(82,255,172,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Check size={24} style={{ color: '#52ffac' }} />
              </div>
              <p style={{ color: '#fff', fontWeight: 900, fontSize: 15, textTransform: 'uppercase' }}>Confirmed!</p>
            </div>
          ) : (
            <>
              {/* From dApp */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
                <p style={{ color: '#c6c6c6', fontSize: 12, fontWeight: 700 }}>
                  <span style={{ color: '#f59e0b' }}>{pendingRequest.dAppName}</span> is requesting
                </p>
              </div>

              {/* Method */}
              <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.75rem', marginBottom: 14 }}>
                <p style={{ color: '#555', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>Method</p>
                <p style={{ color: '#52ffac', fontSize: 12, fontWeight: 900 }}>{methodLabel}</p>
                <p style={{ color: '#333', fontSize: 9, marginTop: 2 }}>Chain: {pendingRequest.chainId}</p>
              </div>

              {/* Params preview */}
              <div style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.75rem', marginBottom: 16, maxHeight: 160, overflowY: 'auto' }}>
                <p style={{ color: '#555', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6 }}>Details</p>
                <pre style={{ color: '#888', fontSize: 9, fontFamily: 'monospace', wordBreak: 'break-all', whiteSpace: 'pre-wrap', margin: 0 }}>
                  {paramsStr.length > 600 ? paramsStr.slice(0, 600) + '\n...' : paramsStr}
                </pre>
              </div>

              {/* GoPlus security risk warning for this dApp */}
              {dappRisk && !dappRiskDismissed && dappRisk.level !== 'safe' && dappRisk.level !== 'unknown' && dappRisk.flags.length > 0 && (
                <div style={{ background: riskBg(dappRisk.level), border: `1px solid ${riskColor(dappRisk.level)}44`, borderRadius: '1rem', padding: '12px 14px', marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: riskColor(dappRisk.level) }}>
                      {dappRisk.level === 'danger' ? '⚠ Suspicious dApp' : '⚡ Caution'}
                    </span>
                    <button onClick={() => setDappRiskDismissed(true)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: 12, padding: '0 2px', lineHeight: 1 }}>✕</button>
                  </div>
                  {dappRisk.flags.map((f, i) => (
                    <p key={i} style={{ fontSize: 11, color: riskColor(dappRisk.level), margin: '1px 0', fontWeight: 600 }}>• {f}</p>
                  ))}
                  <p style={{ fontSize: 9, color: '#666', margin: '4px 0 0', fontStyle: 'italic' }}>Powered by GoPlus Security</p>
                </div>
              )}

              {/* Warning */}
              <div style={{ display: 'flex', gap: 10, padding: '10px 14px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '0.75rem', marginBottom: 20 }}>
                <AlertTriangle size={14} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 1 }} />
                <p style={{ color: '#d97706', fontSize: 10, lineHeight: 1.5 }}>
                  {pendingRequest.method.includes('send')
                    ? 'This will broadcast a transaction. Verify the details carefully.'
                    : 'Only sign messages from sites you trust.'}
                </p>
              </div>

              {requestError && (
                <p style={{ color: '#ffdad6', fontSize: 11, marginBottom: 14 }}>{requestError}</p>
              )}

              {(() => {
                const blocked = !dappRiskDismissed && dappRisk?.level === 'danger' && (dappRisk.flags.length > 0);
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <Button variant="bordered" radius="lg" isDisabled={requestLoading} onPress={handleRejectRequest}
                      className="h-12 font-black tracking-wide text-[#c6c6c6]">
                      {upperEn('Reject')}
                    </Button>
                    <Button color={blocked ? 'danger' : 'primary'} variant={blocked ? 'flat' : 'solid'} radius="lg"
                      isDisabled={requestLoading || !!blocked} isLoading={requestLoading} onPress={handleApproveRequest}
                      className={`h-12 font-black tracking-wide ${blocked ? 'text-[10px]' : 'text-[13px]'}`}>
                      {upperEn(blocked ? 'Dismiss Warning First' : 'Confirm')}
                    </Button>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Main Connect Modal ─────────────────────────────────────────────────────
  const filteredDapps = dappFilter
    ? DAPPS.filter(d => d.name.toLowerCase().includes(dappFilter.toLowerCase()) || d.tag.toLowerCase().includes(dappFilter.toLowerCase()))
    : DAPPS;

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      className="popup-backdrop"
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="popup-enter" style={{ background: '#111', borderRadius: '2rem', width: 520, maxWidth: '96vw', padding: '28px', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '0.75rem', background: 'rgba(82,255,172,0.1)', border: '1px solid rgba(82,255,172,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={16} style={{ color: '#52ffac' }} />
            </div>
            <span style={{ color: '#fff', fontSize: 20, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>WalletConnect</span>
          </div>
          <button onClick={onClose} style={{ color: '#c6c6c6', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '0.75rem', padding: 8, cursor: 'pointer', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        {/* URI Input */}
        <div>
          <p style={{ color: '#555', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>
            Paste WalletConnect URI
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Input
              size="sm"
              variant="bordered"
              radius="full"
              placeholder="wc:abc123...@2?relay-protocol=irn&symKey=..."
              value={uri}
              onValueChange={setUri}
              onKeyDown={e => { if (e.key === 'Enter') handlePair(); }}
              classNames={{ base: 'flex-1', input: 'font-mono text-[11px]' }}
            />
            <Button
              size="sm"
              radius="full"
              color="primary"
              isLoading={pairLoading}
              onPress={handlePair}
              className="shrink-0 font-bold tracking-wider text-[11px] h-9"
            >
              {upperEn('Pair')}
            </Button>
          </div>
          {pairError && <p style={{ color: '#ffdad6', fontSize: 10, marginTop: 6 }}>{pairError}</p>}
          <p style={{ color: '#333', fontSize: 9, marginTop: 6 }}>
            Go to a dApp → click &quot;Connect Wallet&quot; → choose WalletConnect → copy the URI
          </p>
        </div>

        {/* dApp Browser */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ color: '#555', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>dApp Browser</p>
            <Input
              size="sm"
              variant="bordered"
              radius="full"
              placeholder="Search..."
              value={dappFilter}
              onValueChange={setDappFilter}
              classNames={{ base: 'w-[130px]', input: 'text-[10px]' }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {filteredDapps.map(d => (
              <a key={d.url} href={d.url} target="_blank" rel="noopener noreferrer" className="dapp-tile">
                <DappIcon icon={d.icon} name={d.name} color={d.color} />
                <span style={{ color: '#e5e7eb', fontSize: 9, fontWeight: 700, textAlign: 'center', lineHeight: 1.2, wordBreak: 'break-word', letterSpacing: '0.01em' }}>{d.name}</span>
                <span style={{ fontSize: 7, fontWeight: 800, padding: '2px 7px', borderRadius: 99, background: (TAG_COLORS[d.tag] ?? '#888') + '14', color: TAG_COLORS[d.tag] ?? '#888', letterSpacing: '0.06em' }}>{d.tag}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Active sessions */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ color: '#555', fontSize: 9, fontWeight: 900, letterSpacing: '0.15em', margin: 0 }}>
              {upperEn('Active Sessions')}
            </p>
            <button onClick={refreshSessions} style={{ background: 'none', border: 'none', color: '#333', fontSize: 9, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
              Refresh
            </button>
          </div>

          {sessions.length === 0 ? (
            <div style={{ padding: '24px', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <WifiOff size={20} style={{ color: '#333' }} />
              <p style={{ color: '#333', fontSize: 11, fontWeight: 700 }}>No active connections</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sessions.map(s => (
                <div key={s.topic} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1rem' }}>
                  {s.icon ? (
                    <img src={s.icon} alt={s.name} style={{ width: 36, height: 36, borderRadius: '0.6rem', objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: '0.6rem', background: 'rgba(82,255,172,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Wifi size={16} style={{ color: '#52ffac' }} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: '#fff', fontSize: 13, fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</p>
                    <p style={{ color: '#333', fontSize: 9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.url}</p>
                  </div>
                  <Button size="sm" variant="bordered" radius="md" onPress={() => handleDisconnect(s.topic)}
                    className="shrink-0 h-7 min-w-0 px-3 text-[9px] font-black tracking-wider text-[#c6c6c6]">
                    {upperEn('Disconnect')}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
