import { NextResponse } from 'next/server';

interface NFTItem {
  tokenId: string;
  contractAddress: string;
  name: string;
  imageUrl: string;
  collectionName: string;
}

/**
 * Fetches NFT holdings for an EVM address via Alchemy NFT API.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { address, alchemyApiKey, network = 'eth-mainnet' } = body;

    if (!address) {
      return NextResponse.json({ error: 'address is required' }, { status: 400 });
    }

    if (!alchemyApiKey) {
      return NextResponse.json({ nfts: [], note: 'No Alchemy API key — set ALCHEMY_API_KEY in .env.local' });
    }

    const url = `https://${network}.g.alchemy.com/nft/v3/${alchemyApiKey}/getNFTsForOwner?owner=${address}&withMetadata=true&pageSize=20`;
    const res = await fetch(url);
    const data = await res.json();

    const nfts: NFTItem[] = (data.ownedNfts || []).map((nft: Record<string, unknown>) => {
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

    return NextResponse.json({ nfts });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch NFTs', detail: String(err) }, { status: 500 });
  }
}
