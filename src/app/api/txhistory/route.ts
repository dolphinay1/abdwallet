import { NextResponse } from 'next/server';
import { getChainById } from '@/lib/chains';
import { checkRateLimitAsync } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// Etherscan-compatible explorer API endpoints per chain
const EXPLORER_API: Record<number, string> = {
  1: 'https://api.etherscan.io/api',
  56: 'https://api.bscscan.com/api',
  137: 'https://api.polygonscan.com/api',
  42161: 'https://api.arbiscan.io/api',
  10: 'https://api-optimistic.etherscan.io/api',
  8453: 'https://api.basescan.org/api',
  43114: 'https://api.snowtrace.io/api',
  250: 'https://api.ftmscan.com/api',
  59144: 'https://api.lineascan.build/api',
  534352: 'https://api.scrollscan.com/api',
  81457: 'https://api.blastscan.io/api',
  100: 'https://api.gnosisscan.io/api',
  42220: 'https://api.celoscan.io/api',
  25: 'https://api.cronoscan.com/api',
  1284: 'https://api-moonbeam.moonscan.io/api',
  1101: 'https://api-zkevm.polygonscan.com/api',
  2222: 'https://api.kavascan.com/api',
  1313161554: 'https://api.aurorascan.dev/api',
  11155111: 'https://api-sepolia.etherscan.io/api',
  84532: 'https://api-sepolia.basescan.org/api',
  421614: 'https://api-sepolia.arbiscan.io/api',
};

/**
 * Fetches transaction history from Etherscan-compatible explorers.
 * Accepts { address, chainId } only — explorer resolved server-side (SSRF-safe).
 * Returns TxRecord[] directly.
 */
export async function POST(req: Request) {
  const limit = await checkRateLimitAsync(req, 60, 60_000);
  if (!limit.allowed) return limit.response!;

  try {
    const body = await req.json();
    const { address, chainId } = body;

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: 'address is required (0x + 40 hex chars)' }, { status: 400 });
    }

    const chain = chainId != null ? getChainById(Number(chainId)) : undefined;
    const explorerUrl = chainId != null ? EXPLORER_API[Number(chainId)] : null;
    if (!explorerUrl) {
      return NextResponse.json([]);
    }
    const key = process.env.ETHERSCAN_API_KEY || '';

    const url = `${explorerUrl}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=20&sort=desc&apikey=${key}`;

    const res = await fetch(url, { next: { revalidate: 30 } });
    const data = await res.json();

    if (data.status !== '1' || !Array.isArray(data.result)) {
      return NextResponse.json([]);
    }

    const lowerAddr = address.toLowerCase();
    const transactions = data.result.map((tx: Record<string, string>) => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      asset: chain?.symbol ?? 'ETH',
      direction: tx.from?.toLowerCase() === lowerAddr ? 'out' : 'in',
      timestamp: Number(tx.timeStamp) || 0,
      blockNum: tx.blockNumber,
    }));

    return NextResponse.json(transactions);
  } catch (err) {
    console.error('Tx history fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch tx history' }, { status: 500 });
  }
}
