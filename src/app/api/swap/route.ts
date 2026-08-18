import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { getChainById } from '@/lib/chains';
import { ethers } from 'ethers';

export const dynamic = 'force-dynamic';

const LIFI_BASE = 'https://li.quest/v1';
const TOKEN_CACHE_TTL = 10 * 60_000;

const tokenCache = new Map<number, { data: unknown; ts: number }>();

function lifiHeaders(): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/json' };
  if (process.env.LIFI_API_KEY) h['x-lifi-api-key'] = process.env.LIFI_API_KEY;
  return h;
}

/**
 * LiFi swap proxy — server-side only, no client-supplied URLs.
 * GET /api/swap?action=tokens&chainId=1
 * GET /api/swap?action=quote&fromChain=1&toChain=137&fromToken=0x..&toToken=0x..&fromAmount=123&fromAddress=0x..
 */
export async function GET(req: Request) {
  const limit = checkRateLimit(req, 30, 60_000);
  if (!limit.allowed) return limit.response!;

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  if (action === 'tokens') {
    const chainId = Number(searchParams.get('chainId'));
    if (!chainId || !getChainById(chainId)) {
      return NextResponse.json({ error: 'Valid chainId is required' }, { status: 400 });
    }

    const cached = tokenCache.get(chainId);
    if (cached && Date.now() - cached.ts < TOKEN_CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    try {
      const res = await fetch(`${LIFI_BASE}/tokens?chains=${chainId}`, {
        headers: lifiHeaders(),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        return NextResponse.json({ tokens: { [chainId]: [] } });
      }
      const data = await res.json();
      const tokens = data.tokens?.[chainId] ?? [];
      const payload = { tokens: { [chainId]: tokens } };
      tokenCache.set(chainId, { data: payload, ts: Date.now() });
      return NextResponse.json(payload);
    } catch {
      return NextResponse.json({ tokens: { [chainId]: [] } });
    }
  }

  if (action === 'quote') {
    const fromChain = searchParams.get('fromChain');
    const toChain = searchParams.get('toChain');
    const fromToken = searchParams.get('fromToken');
    const toToken = searchParams.get('toToken');
    const fromAmount = searchParams.get('fromAmount');
    const fromAddress = searchParams.get('fromAddress');

    if (!fromChain || !toChain || !fromToken || !toToken || !fromAmount || !fromAddress) {
      return NextResponse.json({ error: 'Missing required quote parameters' }, { status: 400 });
    }
    if (!ethers.isAddress(fromAddress)) {
      return NextResponse.json({ error: 'Invalid fromAddress' }, { status: 400 });
    }

    const params = new URLSearchParams({
      fromChain, toChain, fromToken, toToken, fromAmount, fromAddress,
      slippage: '0.005',
    });

    try {
      const res = await fetch(`${LIFI_BASE}/quote?${params}`, {
        headers: lifiHeaders(),
        signal: AbortSignal.timeout(15_000),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = res.status === 429 || data.code === 1005
          ? 'Rate limited — try again shortly'
          : (typeof data.message === 'string' ? data.message : 'Quote failed');
        return NextResponse.json({ error: msg }, { status: res.status });
      }
      return NextResponse.json(data);
    } catch {
      return NextResponse.json({ error: 'Quote request failed' }, { status: 502 });
    }
  }

  return NextResponse.json({ error: 'Unknown action. Use tokens or quote.' }, { status: 400 });
}
