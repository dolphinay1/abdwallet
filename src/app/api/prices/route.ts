import { NextResponse } from 'next/server';
import { checkRateLimitAsync } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

interface PriceEntry {
  price: number;
  change24h: number | null;
  timestamp: number;
}

const SERVER_PRICE_CACHE: Map<string, PriceEntry> = new Map();
const CACHE_TTL_MS = 45_000; // 45 seconds fresh
const STALE_TTL_MS = 600_000; // 10 minutes stale tolerance

/**
 * Price oracle proxy — CoinGecko simple price with server-side stale-while-revalidate caching.
 * Returns { [id]: { price, change24h } }.
 */
export async function GET(req: Request) {
  const limit = await checkRateLimitAsync(req, 120, 60_000);
  if (!limit.allowed) return limit.response!;

  const { searchParams } = new URL(req.url);
  const ids = (searchParams.get('ids') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (ids.length === 0) {
    return NextResponse.json({ error: 'ids query param is required' }, { status: 400 });
  }

  const now = Date.now();
  const needFetchIds: string[] = [];
  const result: Record<string, { price: number; change24h: number | null }> = {};

  for (const id of ids) {
    const cached = SERVER_PRICE_CACHE.get(id);
    if (!cached || now - cached.timestamp > CACHE_TTL_MS) {
      needFetchIds.push(id);
    } else {
      result[id] = { price: cached.price, change24h: cached.change24h };
    }
  }

  if (needFetchIds.length === 0) {
    return NextResponse.json(result);
  }

  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(needFetchIds.join(','))}&vs_currencies=usd&include_24hr_change=true`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      const data = await res.json();
      for (const id of needFetchIds) {
        const entry = data[id];
        const price = typeof entry?.usd === 'number' ? entry.usd : (SERVER_PRICE_CACHE.get(id)?.price ?? 0);
        const change24h = typeof entry?.usd_24h_change === 'number' ? entry.usd_24h_change : (SERVER_PRICE_CACHE.get(id)?.change24h ?? null);
        SERVER_PRICE_CACHE.set(id, { price, change24h, timestamp: now });
        result[id] = { price, change24h };
      }
      return NextResponse.json(result);
    }

    // If rate-limited (429) or upstream error, fallback to any available cached/stale data
    for (const id of needFetchIds) {
      const cached = SERVER_PRICE_CACHE.get(id);
      if (cached && now - cached.timestamp <= STALE_TTL_MS) {
        result[id] = { price: cached.price, change24h: cached.change24h };
      } else {
        result[id] = { price: 0, change24h: null };
      }
    }
    return NextResponse.json(result);
  } catch {
    // Fallback to cached data if network failed
    for (const id of needFetchIds) {
      const cached = SERVER_PRICE_CACHE.get(id);
      result[id] = {
        price: cached?.price ?? 0,
        change24h: cached?.change24h ?? null,
      };
    }
    return NextResponse.json(result);
  }
}
