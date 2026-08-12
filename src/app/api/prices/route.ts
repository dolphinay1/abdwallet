import { NextResponse } from 'next/server';

/**
 * Price oracle proxy — CoinGecko simple price, server-side to avoid CORS
 * and client rate limits. Returns { [id]: { price, change24h } }.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ids = (searchParams.get('ids') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (ids.length === 0) {
    return NextResponse.json({ error: 'ids query param is required' }, { status: 400 });
  }

  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids.join(','))}&vs_currencies=usd&include_24hr_change=true`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 30 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: 'Price provider unavailable' }, { status: 502 });
    }
    const data = await res.json();

    const out: Record<string, { price: number; change24h: number | null }> = {};
    for (const id of ids) {
      const entry = data[id];
      out[id] = {
        price: typeof entry?.usd === 'number' ? entry.usd : 0,
        change24h: typeof entry?.usd_24h_change === 'number' ? entry.usd_24h_change : null,
      };
    }
    return NextResponse.json(out);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch prices', detail: String(err) }, { status: 502 });
  }
}
