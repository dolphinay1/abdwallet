'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, Link, Wifi, WifiOff, Check, AlertTriangle, Zap } from 'lucide-react';
import { Button } from '@heroui/react';
import { upperEn } from '@/lib/text';
import { useWallet } from '@/context/WalletContext';
import { CHAINS } from '@/lib/chains';
import {
  getWalletKit,
  wcIsConfigured,
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

import { DAPPS, METHOD_LABELS, TAG_COLORS, TAG_STYLES } from './walletconnect/dapps';

const TAG_ORDER = [
  'Perps',
  'Aggreg.',
  'DEX',
  'NFT',
  'Lending',
  'Yield',
  'Staking',
  'Bridge',
  'Portfolio',
  'Explorer',
  'Govern.',
  'Multisig',
  'DAO',
];

function DappIcon({ icon, name, color }: { icon: string; name: string; color: string }) {
  const [failed, setFailed] = React.useState(false);
  // Original logo inside a neu-inset circular badge
  return (
    <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#e4e6ee', boxShadow: 'inset 3px 3px 6px rgba(166,177,198,0.5), inset -3px -3px 6px rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {failed ? (
        <span style={{ color: color || '#23262b', fontWeight: 700, fontSize: 16, lineHeight: 1 }}>{name.slice(0, 1)}</span>
      ) : (
        <img src={icon} alt={name} width={32} height={32} loading="lazy" style={{ borderRadius: '50%', objectFit: 'cover' }} onError={() => setFailed(true)} />
      )}
    </div>
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

  const filteredDapps = useMemo(() => {
    const list = dappFilter
      ? DAPPS.filter(d => d.name.toLowerCase().includes(dappFilter.toLowerCase()) || d.tag.toLowerCase().includes(dappFilter.toLowerCase()))
      : [...DAPPS];
    return list.sort((a, b) => {
      const orderA = TAG_ORDER.indexOf(a.tag);
      const orderB = TAG_ORDER.indexOf(b.tag);
      const idxA = orderA === -1 ? 999 : orderA;
      const idxB = orderB === -1 ? 999 : orderB;
      if (idxA !== idxB) return idxA - idxB;
      return a.name.localeCompare(b.name);
    });
  }, [dappFilter]);

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
        style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(228,230,238,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="popup-enter" style={{ background: '#e4e6ee', boxShadow: '9px 9px 18px rgba(166,177,198,0.55), -9px -9px 18px rgba(255,255,255,0.9)', borderRadius: '2rem', width: 400, maxWidth: '94vw', padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <span className="russo-one-regular" style={{ color: '#23262b', fontSize: 18, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Connect Request</span>
            <Button isIconOnly size="sm" variant="flat" radius="lg" onPress={handleReject} className="text-[#23262b]">
              <X size={16} />
            </Button>
          </div>

          {/* dApp info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px', background: '#e4e6ee', boxShadow: 'inset 3px 3px 6px rgba(166,177,198,0.5), inset -3px -3px 6px rgba(255,255,255,0.9)', borderRadius: '1rem', marginBottom: 16 }}>
            {meta.icons?.[0] ? (
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#e4e6ee', boxShadow: '3px 3px 6px rgba(166,177,198,0.55), -3px -3px 6px rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <img src={meta.icons[0]} alt={meta.name} style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} />
              </div>
            ) : (
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#e4e6ee', boxShadow: '3px 3px 6px rgba(166,177,198,0.55), -3px -3px 6px rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Link size={20} style={{ color: '#2b2d33' }} />
              </div>
            )}
            <div>
              <p style={{ color: '#23262b', fontWeight: 900, fontSize: 15 }}>{meta.name}</p>
              <p style={{ color: '#8a8f98', fontSize: 10, marginTop: 2 }}>{meta.url}</p>
            </div>
          </div>

          {/* dApp security risk warning */}
          {dappRisk && !dappRiskDismissed && dappRisk.level !== 'safe' && dappRisk.level !== 'unknown' && dappRisk.flags.length > 0 && (
            <div style={{ background: riskBg(dappRisk.level), border: `1px solid ${riskColor(dappRisk.level)}44`, borderRadius: '1rem', padding: '12px 14px', marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="russo-one-regular" style={{ fontSize: 10, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.1em', color: riskColor(dappRisk.level), display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  {dappRisk.level === 'danger' ? <AlertTriangle size={12} /> : <Zap size={12} />}
                  {dappRisk.level === 'danger' ? 'Suspicious dApp' : 'Caution'}
                </span>
                <button onClick={() => setDappRiskDismissed(true)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a8f98', fontSize: 12, padding: '0 2px', lineHeight: 1 }}>✕</button>
              </div>
              {dappRisk.flags.map((f, i) => (
                <p key={i} style={{ fontSize: 11, color: riskColor(dappRisk.level), margin: '1px 0', fontWeight: 600 }}>• {f}</p>
              ))}
              <p style={{ fontSize: 9, color: '#8a8f98', margin: '4px 0 0', fontStyle: 'italic' }}>
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
                <p className="sf-display-black" style={{ color: '#64748b', fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Requested Chains</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {display.map(name => (
                    <span key={name} className="neu-pill-chain" style={{ padding: '3px 9px', fontSize: 9.5 }}>
                      {name}
                    </span>
                  ))}
                  {unknownCount > 0 && (
                    <span className="neu-pill-chain" style={{ padding: '3px 9px', fontSize: 9.5 }}>
                      +{unknownCount} more
                    </span>
                  )}
                  {display.length === 0 && (
                    <span className="neu-pill-chain" style={{ padding: '3px 9px', fontSize: 9.5 }}>Any EVM chain</span>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Your address */}
          <div className="neu-pill-inset" style={{ padding: '12px 16px', borderRadius: '1.25rem', marginBottom: 20 }}>
            <p className="sf-display-black" style={{ color: '#64748b', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>Your Address</p>
            <p className="sf-mono-bold" style={{ color: '#1e293b', fontSize: 11, fontWeight: 700, wordBreak: 'break-all', margin: 0 }}>{wallet.activeAddress}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Button variant="bordered" radius="lg" onPress={handleReject}
              className="h-12 russo-one-regular tracking-wide text-[#23262b]">
              {upperEn('Reject')}
            </Button>
            {(() => {
              const blocked = !dappRiskDismissed && dappRisk?.level === 'danger' && (dappRisk.flags.length > 0);
              return (
                <Button color={blocked ? 'danger' : 'primary'} variant={blocked ? 'flat' : 'solid'} radius="lg"
                  isDisabled={!!blocked} onPress={handleApprove}
                  className={`h-12 russo-one-regular tracking-wide ${blocked ? 'text-[10px]' : 'text-[13px]'}`}>
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
        style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(228,230,238,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="popup-enter" style={{ background: '#e4e6ee', boxShadow: '9px 9px 18px rgba(166,177,198,0.55), -9px -9px 18px rgba(255,255,255,0.9)', borderRadius: '2rem', width: 420, maxWidth: '94vw', padding: '28px', border: '1px solid rgba(166,177,198,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <span className="russo-one-regular" style={{ color: '#23262b', fontSize: 18, fontWeight: 400, letterSpacing: '0.02em' }}>
              {upperEn(isSign ? 'Signature Request' : 'Transaction Request')}
            </span>
            <Button isIconOnly size="sm" variant="flat" radius="lg" onPress={handleRejectRequest} className="text-[#23262b]">
              <X size={16} />
            </Button>
          </div>

          {requestDone ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '24px 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(43,45,51,0.1)', border: '2px solid rgba(43,45,51,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Check size={24} style={{ color: '#2b2d33' }} />
              </div>
              <p className="russo-one-regular" style={{ color: '#23262b', fontWeight: 400, fontSize: 15, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Confirmed!</p>
            </div>
          ) : (
            <>
              {/* From dApp */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <p style={{ color: '#23262b', fontSize: 12, fontWeight: 700 }}>
                  <span style={{ color: '#23262b' }}>{pendingRequest.dAppName}</span> is requesting
                </p>
              </div>

              {/* Method */}
              <div style={{ padding: '10px 14px', background: '#e4e6ee', boxShadow: 'inset 3px 3px 6px rgba(166,177,198,0.5), inset -3px -3px 6px rgba(255,255,255,0.9)', borderRadius: '0.75rem', marginBottom: 14 }}>
                <p className="russo-one-regular" style={{ color: '#8a8f98', fontSize: 9, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>Method</p>
                <p style={{ color: '#2b2d33', fontSize: 12, fontWeight: 900 }}>{methodLabel}</p>
                <p style={{ color: '#8a8f98', fontSize: 9, marginTop: 2 }}>Chain: {pendingRequest.chainId}</p>
              </div>

              {/* Params preview */}
              <div style={{ padding: '10px 14px', background: '#e4e6ee', boxShadow: 'inset 4px 4px 8px rgba(166,177,198,0.5), inset -4px -4px 8px rgba(255,255,255,0.9)', borderRadius: '0.75rem', marginBottom: 16, maxHeight: 160, overflowY: 'auto' }}>
                <p className="russo-one-regular" style={{ color: '#8a8f98', fontSize: 9, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6 }}>Details</p>
                <pre style={{ color: '#8a8f98', fontSize: 9, fontFamily: "var(--font-sf-mono), 'SF Mono', monospace", wordBreak: 'break-all', whiteSpace: 'pre-wrap', margin: 0 }}>
                  {paramsStr.length > 600 ? paramsStr.slice(0, 600) + '\n...' : paramsStr}
                </pre>
              </div>

              {/* GoPlus security risk warning for this dApp */}
              {dappRisk && !dappRiskDismissed && dappRisk.level !== 'safe' && dappRisk.level !== 'unknown' && dappRisk.flags.length > 0 && (
                <div style={{ background: riskBg(dappRisk.level), border: `1px solid ${riskColor(dappRisk.level)}44`, borderRadius: '1rem', padding: '12px 14px', marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="russo-one-regular" style={{ fontSize: 10, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.1em', color: riskColor(dappRisk.level), display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      {dappRisk.level === 'danger' ? <AlertTriangle size={12} /> : <Zap size={12} />}
                      {dappRisk.level === 'danger' ? 'Suspicious dApp' : 'Caution'}
                    </span>
                    <button onClick={() => setDappRiskDismissed(true)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a8f98', fontSize: 12, padding: '0 2px', lineHeight: 1 }}>✕</button>
                  </div>
                  {dappRisk.flags.map((f, i) => (
                    <p key={i} style={{ fontSize: 11, color: riskColor(dappRisk.level), margin: '1px 0', fontWeight: 600 }}>• {f}</p>
                  ))}
                  <p style={{ fontSize: 9, color: '#8a8f98', margin: '4px 0 0', fontStyle: 'italic' }}>Powered by GoPlus Security</p>
                </div>
              )}

              {/* Warning */}
              <div style={{ display: 'flex', gap: 10, padding: '10px 14px', background: 'rgba(43,45,51,0.06)', border: '1px solid rgba(43,45,51,0.2)', borderRadius: '0.75rem', marginBottom: 20 }}>
                <AlertTriangle size={14} style={{ color: '#23262b', flexShrink: 0, marginTop: 1 }} />
                <p style={{ color: '#23262b', fontSize: 10, lineHeight: 1.5 }}>
                  {pendingRequest.method.includes('send')
                    ? 'This will broadcast a transaction. Verify the details carefully.'
                    : 'Only sign messages from sites you trust.'}
                </p>
              </div>

              {requestError && (
                <p style={{ color: '#b91c1c', fontSize: 11, marginBottom: 14 }}>{requestError}</p>
              )}

              {(() => {
                const blocked = !dappRiskDismissed && dappRisk?.level === 'danger' && (dappRisk.flags.length > 0);
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <Button variant="bordered" radius="lg" isDisabled={requestLoading} onPress={handleRejectRequest}
                      className="h-12 russo-one-regular tracking-wide text-[#23262b]">
                      {upperEn('Reject')}
                    </Button>
                    <Button color={blocked ? 'danger' : 'primary'} variant={blocked ? 'flat' : 'solid'} radius="lg"
                      isDisabled={requestLoading || !!blocked} isLoading={requestLoading} onPress={handleApproveRequest}
                      className={`h-12 russo-one-regular tracking-wide ${blocked ? 'text-[10px]' : 'text-[13px]'}`}>
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

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      className="popup-backdrop"
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(228,230,238,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="popup-enter" style={{ background: '#e4e6ee', boxShadow: '9px 9px 18px rgba(166,177,198,0.55), -9px -9px 18px rgba(255,255,255,0.9)', borderRadius: '2rem', width: 520, maxWidth: '96vw', padding: '28px', border: '1px solid rgba(166,177,198,0.1)', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="sf-display-black" style={{ color: '#1e293b', fontSize: 20, fontWeight: 900, fontStyle: 'normal', textTransform: 'uppercase', letterSpacing: '0.02em' }}>WalletConnect</span>
          <button
            aria-label="Close WalletConnect modal"
            onClick={onClose}
            style={{ color: '#23262b', background: '#e4e6ee', boxShadow: '3px 3px 6px rgba(166,177,198,0.55), -3px -3px 6px rgba(255,255,255,0.9)', border: 'none', borderRadius: '0.75rem', padding: 8, cursor: 'pointer', display: 'flex' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Missing project ID hint */}
        {!wcIsConfigured() && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', borderRadius: '0.9rem', background: 'rgba(185,28,28,0.07)', border: '1px solid rgba(185,28,28,0.25)' }}>
            <AlertTriangle size={14} style={{ color: '#b91c1c', flexShrink: 0, marginTop: 1 }} />
            <p className="sf-bold" style={{ color: '#b91c1c', fontSize: 10, margin: 0, lineHeight: 1.5, fontWeight: 700 }}>
              WalletConnect Project ID not configured. Get a free ID at cloud.reown.com and add
              NEXT_PUBLIC_WC_PROJECT_ID to .env.local, then restart the dev server.
            </p>
          </div>
        )}

        {/* URI Input */}
        <div>
          <p className="sf-display-black" style={{ color: '#475569', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Paste WalletConnect URI
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div className="neu-pill-inset" style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '9px 16px', borderRadius: 9999 }}>
              <input
                type="text"
                placeholder="wc:abc123...@2?relay-protocol=irn&symKey=..."
                value={uri}
                onChange={e => setUri(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handlePair(); }}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontFamily: "var(--font-sf-mono), 'SF Mono', monospace",
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#1e293b',
                }}
              />
            </div>
            <button
              disabled={pairLoading}
              onClick={handlePair}
              className="sf-display-black"
              style={{
                flexShrink: 0,
                background: '#1e293b',
                color: '#ffffff',
                border: 'none',
                borderRadius: 9999,
                padding: '0 18px',
                height: 38,
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: '0.08em',
                cursor: pairLoading ? 'not-allowed' : 'pointer',
                opacity: pairLoading ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '2px 2px 6px rgba(166, 177, 198, 0.4)',
                transition: 'all 0.15s',
              }}
            >
              {pairLoading ? '...' : upperEn('Pair')}
            </button>
          </div>
          {pairError && <p className="sf-bold" style={{ color: '#b91c1c', fontSize: 11, marginTop: 6, fontWeight: 700 }}>{pairError}</p>}
          <p className="sf-bold" style={{ color: '#64748b', fontSize: 10, marginTop: 6, fontWeight: 600 }}>
            Go to a dApp → click &quot;Connect Wallet&quot; → choose WalletConnect → copy the URI
          </p>
        </div>

        {/* dApp Browser */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p className="sf-display-black" style={{ color: '#475569', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>dApp Browser</p>
            <div className="neu-pill-inset" style={{ width: 145, display: 'flex', alignItems: 'center', padding: '6px 14px', borderRadius: 9999 }}>
              <input
                type="text"
                placeholder="Search..."
                value={dappFilter}
                onChange={e => setDappFilter(e.target.value)}
                className="sf-bold"
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#1e293b',
                }}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {filteredDapps.map(d => (
              <a key={d.url} href={d.url} target="_blank" rel="noopener noreferrer" className="dapp-tile">
                <DappIcon icon={d.icon} name={d.name} color={d.color} />
                <span className="sf-display-black" style={{ color: '#1e293b', fontSize: 10, fontWeight: 800, textAlign: 'center', lineHeight: 1.2, wordBreak: 'break-word', letterSpacing: '-0.01em' }}>{d.name}</span>
                <span
                  className="neu-pill-dark"
                  style={{
                    fontSize: 8,
                    padding: '2.5px 7px',
                    background: TAG_STYLES[d.tag]?.bg || 'rgba(43, 45, 51, 0.76)',
                    color: TAG_STYLES[d.tag]?.color || '#f8fafc',
                  }}
                >
                  {d.tag}
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* Active sessions */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p className="sf-display-black" style={{ color: '#475569', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', margin: 0 }}>
              {upperEn('Active Sessions')}
            </p>
            <button className="sf-display-black" onClick={refreshSessions} style={{ background: 'none', border: 'none', color: '#475569', fontSize: 10, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800 }}>
              Refresh
            </button>
          </div>

          {sessions.length === 0 ? (
            <div style={{ padding: '24px', border: '1px dashed rgba(166,177,198,0.15)', borderRadius: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <WifiOff size={20} style={{ color: '#8a8f98' }} />
              <p className="sf-bold" style={{ color: '#64748b', fontSize: 11, fontWeight: 700 }}>No active connections</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sessions.map(s => (
                <div key={s.topic} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#e4e6ee', boxShadow: 'inset 3px 3px 6px rgba(166,177,198,0.5), inset -3px -3px 6px rgba(255,255,255,0.9)', borderRadius: '1rem' }}>
                  {s.icon ? (
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e4e6ee', boxShadow: '3px 3px 6px rgba(166,177,198,0.55), -3px -3px 6px rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <img src={s.icon} alt={s.name} style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }} />
                    </div>
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e4e6ee', boxShadow: '3px 3px 6px rgba(166,177,198,0.55), -3px -3px 6px rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Wifi size={16} style={{ color: '#2b2d33' }} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="sf-display-black" style={{ color: '#1e293b', fontSize: 12, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{s.name}</p>
                    <p className="sf-bold" style={{ color: '#64748b', fontSize: 10, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.url}</p>
                  </div>
                  <Button size="sm" variant="bordered" radius="md" onPress={() => handleDisconnect(s.topic)}
                    className="shrink-0 h-8 min-w-0 px-3.5 text-[10px] sf-display-black font-black tracking-wider text-[#23262b]">
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
