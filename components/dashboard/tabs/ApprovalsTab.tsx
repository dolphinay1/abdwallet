'use client';

import React from 'react';
import type { Chain } from '@/lib/chains';
import type { TokenApproval } from '@/lib/approvals';
import { getSpenders } from '@/lib/approval-registry';

export function ApprovalsTab({
  selectedChain,
  approvals,
  isLoadingApprovals,
  revokingApproval,
  onRevoke,
}: {
  selectedChain: Chain;
  approvals: TokenApproval[];
  isLoadingApprovals: boolean;
  revokingApproval: string | null;
  onRevoke: (approval: TokenApproval) => void;
}) {
  if (!selectedChain.isAlchemy) {
    return (
      <div className="flex items-center gap-3 p-6 neu-card-sm rounded-xl border border-transparent">
        <span className="material-symbols-outlined text-[#8a8f98]" style={{ fontSize: 18 }}>
          info
        </span>
        <p className="text-[#8a8f98] font-black text-xs uppercase tracking-widest">Approval scanning requires Alchemy RPC</p>
      </div>
    );
  }

  if (isLoadingApprovals) {
    return (
      <div className="flex justify-center py-12">
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            border: '2px solid rgba(248,113,113,0.2)',
            borderTopColor: '#b91c1c',
            animation: 'spin 1s linear infinite',
          }}
        />
      </div>
    );
  }

  if (approvals.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 p-10 neu-card-sm rounded-xl border border-transparent">
        <span className="material-symbols-outlined text-4xl" style={{ color: '#23262b', opacity: 0.6 }}>
          verified_user
        </span>
        <p className="text-[#8a8f98] font-black text-xs uppercase tracking-widest">No active approvals found</p>
        <p style={{ fontSize: 10, color: 'rgba(166,177,198,0.25)', textAlign: 'center' }}>
          Scanned {getSpenders(selectedChain.id).length} common DEX/bridge spenders on {selectedChain.name}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px 4px' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#b91c1c' }}>
          warning
        </span>
        <p style={{ fontSize: 10, fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {approvals.length} Active Approval{approvals.length > 1 ? 's' : ''}
        </p>
        <p style={{ fontSize: 10, color: 'rgba(166,177,198,0.25)', marginLeft: 4 }}>— revoke unused allowances to reduce risk</p>
      </div>
      {approvals.map((a) => {
        const key = `${a.token}-${a.spender}`;
        const isRevoking = revokingApproval === key;
        return (
          <div
            key={key}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              background: a.unlimited ? 'rgba(248,113,113,0.05)' : 'rgba(166,177,198,0.02)',
              border: `1px solid ${a.unlimited ? 'rgba(248,113,113,0.2)' : 'rgba(166,177,198,0.06)'}`,
              borderRadius: 12,
              gap: 12,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <p style={{ fontWeight: 900, color: '#23262b', fontSize: 13, margin: 0 }}>{a.symbol}</p>
                {a.unlimited && (
                  <span
                    className="russo-one-regular"
                    style={{
                      fontSize: 8,
                      fontWeight: 400,
                      color: '#b91c1c',
                      background: 'rgba(248,113,113,0.15)',
                      borderRadius: 4,
                      padding: '2px 6px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      flexShrink: 0,
                    }}
                  >
                    Unlimited
                  </span>
                )}
              </div>
              <p style={{ fontSize: 10, color: 'rgba(166,177,198,0.4)', margin: '2px 0 0', fontWeight: 700 }}>→ {a.spenderName}</p>
              {!a.unlimited && (
                <p style={{ fontSize: 9, color: 'rgba(166,177,198,0.25)', margin: '1px 0 0', fontFamily: "var(--font-sf-mono), 'SF Mono', monospace" }}>
                  {parseFloat(a.allowance).toLocaleString()} {a.symbol}
                </p>
              )}
            </div>
            <button
              onClick={() => onRevoke(a)}
              disabled={isRevoking}
              style={{
                background: 'rgba(248,113,113,0.1)',
                border: '1px solid rgba(248,113,113,0.3)',
                borderRadius: 999,
                color: '#b91c1c',
                fontSize: 10,
                fontWeight: 900,
                padding: '7px 16px',
                cursor: isRevoking ? 'not-allowed' : 'pointer',
                opacity: isRevoking ? 0.5 : 1,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                flexShrink: 0,
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!isRevoking) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(248,113,113,0.2)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(248,113,113,0.1)';
              }}
            >
              {isRevoking ? 'Revoking…' : 'Revoke'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
