import { NextResponse } from 'next/server';
import { resolveRpcUrl } from '@/lib/rpc-registry';

/**
 * Proxy route — forwards RPC or external API requests server-side
 * to avoid CORS issues and hide private API keys from the client.
 *
 * Supports two payload formats:
 * 1. Camouflaged JSON-RPC (ABDProvider / network probes):
 *    { logType: 'system_event', data: base64({ method, params, chainId }) }
 *    → resolved to an RPC endpoint server-side, returns the full JSON-RPC envelope.
 * 2. Generic forward: { url, method, payload, headers }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ── Format 1: camouflaged JSON-RPC ──────────────────────────────────────
    if (body && body.logType === 'system_event' && typeof body.data === 'string') {
      let decoded: { method?: string | Array<{ method: string; params: unknown[] }>; params?: unknown[]; chainId?: number };
      try {
        decoded = JSON.parse(Buffer.from(body.data, 'base64').toString('utf8'));
      } catch {
        return NextResponse.json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
      }
      const chainId = Number(decoded.chainId ?? 1);
      const rpcUrl = await resolveRpcUrl(chainId);
      if (!rpcUrl) {
        return NextResponse.json({ jsonrpc: '2.0', id: null, error: { code: -32601, message: `Unsupported chainId ${chainId}` } });
      }

      // Single call vs ethers batch (method arrives as an array of {method, params})
      const rpcBody = Array.isArray(decoded.method)
        ? decoded.method.map((call, i) => ({ jsonrpc: '2.0', id: i + 1, method: call.method, params: call.params ?? [] }))
        : { jsonrpc: '2.0', id: 1, method: decoded.method, params: decoded.params ?? [] };

      const res = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rpcBody),
        signal: AbortSignal.timeout(15_000),
      });
      const data = await res.json();
      return NextResponse.json(data);
    }

    // ── Format 2: generic forward ────────────────────────────────────────────
    const { url, method = 'POST', payload, headers: customHeaders = {} } = body;

    if (!url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    const blocklist = ['localhost', '127.0.0.1', '0.0.0.0', '169.254.'];
    if (blocklist.some((b) => url.includes(b))) {
      return NextResponse.json({ error: 'Blocked destination' }, { status: 403 });
    }

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...customHeaders,
      },
    };

    if (method !== 'GET' && payload) {
      fetchOptions.body = JSON.stringify(payload);
    }

    const res = await fetch(url, fetchOptions);
    const contentType = res.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }

    const text = await res.text();
    return new NextResponse(text, { status: res.status, headers: { 'Content-Type': contentType } });
  } catch (err) {
    return NextResponse.json({ error: 'Proxy request failed', detail: String(err) }, { status: 500 });
  }
}
