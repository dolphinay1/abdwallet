'use client';

import React from 'react';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import type { Chain } from '@/lib/chains';
import type { TxRecord } from '../types';

export function TransactionsTab({
  selectedChain,
  txs,
  isLoadingTxs,
}: {
  selectedChain: Chain;
  txs: TxRecord[];
  isLoadingTxs: boolean;
}) {
  if (isLoadingTxs) {
    return (
      <div className="flex justify-center py-12">
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            border: '2px solid rgba(43,45,51,0.2)',
            borderTopColor: '#2b2d33',
            animation: 'spin 1s linear infinite',
          }}
        />
      </div>
    );
  }

  if (txs.length === 0) {
    return (
      <div className="flex items-center p-6 neu-card-sm rounded-xl border border-transparent">
        <p className="text-[#5b6270] font-black text-xs uppercase tracking-widest">
          {selectedChain.isAlchemy ? `No transactions on ${selectedChain.name}` : 'TX history requires Alchemy RPC'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {txs.map((tx) => {
        const isOut = tx.direction === 'out';
        const txDate = tx.timestamp ? new Date(tx.timestamp) : null;
        const date = txDate ? txDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
        const time = txDate ? txDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
        return (
          <a
            key={tx.hash}
            href={`${selectedChain.explorerUrl}/tx/${tx.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-6 neu-card-sm rounded-xl border border-transparent hover:opacity-80 transition-colors cursor-pointer no-underline"
          >
            <div className="flex items-center gap-5">
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${
                  isOut ? 'bg-red-500/10' : 'bg-[rgba(166,177,198,0.2)]'
                }`}
              >
                {isOut ? <ArrowUpRight size={20} className="text-red-400" /> : <ArrowDownLeft size={20} className="text-[#5b6270]" />}
              </div>
              <div>
                <p className="sf-display-black font-black text-[#1e293b] text-lg">{isOut ? 'Sent' : 'Received'}</p>
                <p className="sf-mono-bold text-[0.7rem] text-[#64748b] uppercase tracking-wider font-bold">
                  {tx.hash.slice(0, 10)}...{tx.hash.slice(-4)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className={`sf-mono-bold font-bold text-lg ${isOut ? 'text-red-500' : 'text-emerald-600'}`}>
                {isOut ? '-' : '+'}
                {tx.value} {tx.asset}
              </p>
              <p className="sf-bold text-[0.7rem] text-[#64748b] tracking-wider font-bold">
                {date}
                {time ? ` · ${time}` : ''}
              </p>
            </div>
          </a>
        );
      })}
    </div>
  );
}
