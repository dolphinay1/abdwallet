import { NextResponse } from 'next/server';
import { checkRateLimitAsync } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const GOPLUS_BASE = 'https://api.gopluslabs.io/api/v1';

/**
 * Security scanner proxy — forwards requests to GoPlus Security API
 * Server-side execution avoids client CORS issues and centralizes rate limits.
 */
export async function GET(req: Request) {
  const limit = await checkRateLimitAsync(req, 60, 60_000);
  if (!limit.allowed) return limit.response!;

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  try {
    if (action === 'token') {
      const chainId = searchParams.get('chainId') || '1';
      const address = searchParams.get('address');
      if (!address) {
        return NextResponse.json({ error: 'Address required' }, { status: 400 });
      }
      const url = `${GOPLUS_BASE}/token_security/${chainId}?contract_addresses=${encodeURIComponent(address.toLowerCase())}`;
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        next: { revalidate: 60 },
      });
      if (!res.ok) {
        return NextResponse.json({ result: {} });
      }
      const data = await res.json();
      return NextResponse.json(data);
    }

    if (action === 'address') {
      const address = searchParams.get('address');
      if (!address) {
        return NextResponse.json({ error: 'Address required' }, { status: 400 });
      }
      const url = `${GOPLUS_BASE}/address_security/${encodeURIComponent(address.toLowerCase())}`;
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        next: { revalidate: 60 },
      });
      if (!res.ok) {
        return NextResponse.json({ result: {} });
      }
      const data = await res.json();
      return NextResponse.json(data);
    }

    if (action === 'dapp') {
      const targetUrl = searchParams.get('url');
      if (!targetUrl) {
        return NextResponse.json({ error: 'URL required' }, { status: 400 });
      }

      let parsed: URL;
      try {
        parsed = new URL(targetUrl);
      } catch {
        return NextResponse.json({ error: 'Invalid target URL' }, { status: 400 });
      }

      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return NextResponse.json({ error: 'Invalid URL protocol' }, { status: 400 });
      }

      const host = parsed.hostname.toLowerCase();
      if (
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '::1' ||
        host === '0.0.0.0' ||
        host.startsWith('192.168.') ||
        host.startsWith('10.') ||
        host.startsWith('172.') ||
        host.startsWith('169.254.')
      ) {
        return NextResponse.json({ error: 'Scanning private or internal targets is not permitted' }, { status: 403 });
      }

      const url = `${GOPLUS_BASE}/dapp_security?url=${encodeURIComponent(targetUrl)}`;
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        next: { revalidate: 60 },
      });
      if (!res.ok) {
        return NextResponse.json({ result: {} });
      }
      const data = await res.json();
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('Scan API error:', err);
    return NextResponse.json({ result: {}, error: 'Scan request failed' }, { status: 200 });
  }
}
