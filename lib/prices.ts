// Real-time USD prices — routed through /api/prices to avoid CORS and rate limits
const CACHE: Map<string, { price: number; change24h: number | null; ts: number }> = new Map();
const CACHE_TTL = 45_000; // 45 seconds

let _pendingBatch: Promise<void> | null = null;
const _pendingIds = new Set<string>();

export interface PriceData {
  price: number;
  change24h: number | null;
}

async function processPendingBatch(): Promise<void> {
  const idsToFetch = Array.from(_pendingIds);
  _pendingIds.clear();
  if (idsToFetch.length === 0) return;

  try {
    const res = await fetch(`/api/prices?ids=${encodeURIComponent(idsToFetch.join(','))}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return;
    const data = await res.json();
    const now = Date.now();
    for (const id of idsToFetch) {
      const entry = data[id];
      const price = typeof entry === 'number' ? entry : (entry?.price ?? entry?.usd ?? (CACHE.get(id)?.price ?? 0));
      const change24h = entry?.change24h ?? entry?.usd_24h_change ?? (CACHE.get(id)?.change24h ?? null);
      CACHE.set(id, { price, change24h, ts: now });
    }
  } catch {
    // Network or API silent fallback
  }
}

async function fetchAndCache(ids: string[]): Promise<void> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return;

  const uncached = unique.filter((id) => {
    const c = CACHE.get(id);
    return !c || Date.now() - c.ts >= CACHE_TTL;
  });

  if (uncached.length === 0) return;

  uncached.forEach((id) => _pendingIds.add(id));

  if (!_pendingBatch) {
    _pendingBatch = Promise.resolve().then(async () => {
      try {
        await processPendingBatch();
      } finally {
        _pendingBatch = null;
      }
    });
  }

  await _pendingBatch;
}

export async function getPrices(ids: string[]): Promise<Record<string, number>> {
  await fetchAndCache(ids);
  return Object.fromEntries(ids.filter(Boolean).map((id) => [id, CACHE.get(id)?.price ?? 0]));
}

export async function getPriceData(ids: string[]): Promise<Record<string, PriceData>> {
  await fetchAndCache(ids);
  return Object.fromEntries(ids.filter(Boolean).map((id) => [
    id,
    { price: CACHE.get(id)?.price ?? 0, change24h: CACHE.get(id)?.change24h ?? null },
  ]));
}

export async function getPrice(coingeckoId: string): Promise<number> {
  const map = await getPrices([coingeckoId]);
  return map[coingeckoId] ?? 0;
}

export function formatUSD(value: number): string {
  if (value === 0) return '$0.00';
  if (value < 0.01) return '<$0.01';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}
