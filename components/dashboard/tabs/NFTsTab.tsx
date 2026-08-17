'use client';

import React from 'react';
import type { Chain } from '@/lib/chains';
import type { NFTItem } from '@/lib/nfts';

export function NFTsTab({
  selectedChain,
  nfts,
  isLoadingNfts,
}: {
  selectedChain: Chain;
  nfts: NFTItem[];
  isLoadingNfts: boolean;
}) {
  if (isLoadingNfts) {
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

  if (nfts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 p-10 neu-card-sm rounded-xl border border-transparent">
        <span className="material-symbols-outlined text-4xl text-[#8a8f98] opacity-30">image</span>
        <p className="text-[#8a8f98] font-black text-xs uppercase tracking-widest">
          {selectedChain.isAlchemy ? `No NFTs on ${selectedChain.name}` : 'NFT tab requires Alchemy RPC'}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
      {nfts.map((nft, i) => (
        <div
          key={`${nft.contractAddress}-${nft.tokenId}-${i}`}
          style={{
            background: 'rgba(166,177,198,0.03)',
            border: '1px solid rgba(166,177,198,0.07)',
            borderRadius: '1rem',
            overflow: 'hidden',
          }}
        >
          {nft.imageUrl ? (
            <img
              src={nft.imageUrl}
              alt={nft.name}
              style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                aspectRatio: '1',
                background: 'rgba(166,177,198,0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'rgba(166,177,198,0.15)' }}>
                image
              </span>
            </div>
          )}
          <div style={{ padding: '10px 12px' }}>
            <p
              style={{
                color: '#23262b',
                fontWeight: 900,
                fontSize: 12,
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {nft.name}
            </p>
            {nft.collectionName && (
              <p
                style={{
                  color: '#8a8f98',
                  fontSize: 10,
                  margin: '2px 0 0',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {nft.collectionName}
              </p>
            )}
            <p style={{ color: '#8a8f98', fontSize: 9, fontFamily: 'monospace', margin: '4px 0 0' }}>#{nft.tokenId.slice(0, 10)}</p>
            {nft.floorPrice != null && (
              <p style={{ color: '#2b2d33', fontSize: 9, fontWeight: 700, margin: '3px 0 0' }}>
                Floor {nft.floorPrice < 0.001 ? '< 0.001' : nft.floorPrice.toFixed(3)} {nft.floorPriceCurrency ?? 'ETH'}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
