import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

interface NFTItem {
  tokenId: string;
  contractAddress: string;
  name: string;
  imageUrl: string;
  collectionName: string;
}

/**
 * Fetches NFT holdings for an EVM address via Alchemy NFT API.
 * API key resolution: request body first, then ALCHEMY_API_KEY env fallback.
 * Returns a plain NFTItem[] so the client can consume it directly.
 */
const ALCHEMY_NETWORK: Record<number, string> = {
  1: 'eth-mainnet',
  11155111: 'eth-sepolia',
  8453: 'base-mainnet',
  84532: 'base-sepolia',
  42161: 'arb-mainnet',
  421614: 'arb-sepolia',
  10: 'opt-mainnet',
  137: 'polygon-mainnet',
};

export async function POST(req: Request) {
  const limit = checkRateLimit(req, 60, 60_000);
  if (!limit.allowed) return limit.response!;

  try {
    const body = await req.json();
    const { address, chainId, alchemyApiKey } = body;

    if (!address) {
      return NextResponse.json({ error: 'address is required' }, { status: 400 });
    }

    const key = alchemyApiKey || process.env.ALCHEMY_API_KEY;
    const network = ALCHEMY_NETWORK[Number(chainId)];
    // No key or chain not supported by Alchemy NFT API — empty list, not an error
    if (!key || !network) {
      return NextResponse.json([]);
    }

    const url = `https://${network}.g.alchemy.com/nft/v3/${key}/getNFTsForOwner?owner=${address}&withMetadata=true&pageSize=20`;
    const res = await fetch(url);
    // Invalid/expired key or upstream outage — degrade to empty list, never 500
    if (!res.ok) return NextResponse.json([]);
    const data = await res.json().catch(() => null);
    if (!data || !Array.isArray(data.ownedNfts)) return NextResponse.json([]);

    const nfts: NFTItem[] = data.ownedNfts.map((nft: Record<string, unknown>) => {
      const meta = (nft.image || {}) as Record<string, string>;
      const contract = (nft.contract || {}) as Record<string, string>;
      return {
        tokenId: String(nft.tokenId || ''),
        contractAddress: contract.address || '',
        name: String(nft.name || `#${nft.tokenId}`),
        imageUrl: meta.cachedUrl || meta.originalUrl || '',
        collectionName: contract.name || 'Unknown Collection',
      };
    });

    return NextResponse.json(nfts);
  } catch {
    return NextResponse.json([]);
  }
}
