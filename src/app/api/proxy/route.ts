import { NextResponse } from 'next/server';
import { resolveRpcUrl } from '@/lib/rpc-registry';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * Proxy route — forwards RPC or external API requests server-side
 * to avoid CORS issues and hide private API keys from the client.
 */
export async function POST(req: Request) {
  // Rate limit: 120 requests per minute per IP for RPC
  const limit = checkRateLimit(req, 120, 60_000);
  if (!limit.allowed) return limit.response!;

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

      // Single call vs ethers batch
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

    // ── Format 2: restricted forward (only whitelisted domains) ──────────
    const { url, method = 'POST', payload, headers: customHeaders = {} } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    // Block private/reserved networks (SSRF protection)
    const blocklist = [
      'localhost', '127.0.0.1', '0.0.0.0', '169.254.',
      '10.', '172.16.', '172.17.', '172.18.', '172.19.',
      '172.20.', '172.21.', '172.22.', '172.23.', '172.24.',
      '172.25.', '172.26.', '172.27.', '172.28.', '172.29.',
      '172.30.', '172.31.', '192.168.', '[::1]', '::1',
      'fc00:', 'fe80:',
    ];
    if (blocklist.some((b) => url.includes(b))) {
      return NextResponse.json({ error: 'Blocked destination' }, { status: 403 });
    }

    // Only allow known public RPC and API domains
    const ALLOWED_HOSTS = [
      'cloudflare-eth.com', 'ethereum-rpc.publicnode.com', '1rpc.io',
      'eth.drpc.org', 'bsc-dataseed', 'defibit.io', 'binance.llamarpc.com',
      'polygon-rpc.com', 'polygon-bor-rpc', 'arb1.arbitrum.io',
      'arbitrum-one-rpc', 'mainnet.optimism.io', 'optimism-rpc',
      'mainnet.base.org', 'base-rpc', 'api.avax.network',
      'avalanche.public-rpc.com', 'rpc.ftm.tools', 'fantom-rpc',
      'mainnet.era.zksync.io', 'rpc.linea.build', 'rpc.scroll.io',
      'rpc.blast.io', 'rpc.gnosischain.com', 'forno.celo.org',
      'evm.cronos.org', 'rpc.api.moonbeam', 'rpc.mantle.xyz',
      'zkevm-rpc.com', 'mainnet.aurora.dev', 'aurora.drpc.org',
      'andromeda.metis.io', 'metis.drpc.org', 'evm.kava.io',
      'kava.drpc.org', 'public-en.node.kaia.io', 'klaytn.drpc.org',
      'rpc.fuse.io', 'fuse.drpc.org', 'ethereum-sepolia-rpc',
      'sepolia.base.org', 'sepolia-rollup.arbitrum.io',
      'api.coingecko.com', 'api.gopluslabs.io', 'eth-api.lido.fi',
      'solana-rpc.publicnode.com', 'api.mainnet-beta.solana.com',
      'xrplcluster.com', 's1.ripple.com', 's2.ripple.com',
      'api.etherscan.io', 'api.bscscan.com', 'api.polygonscan.com',
      'api.arbiscan.io', 'api-optimistic.etherscan.io', 'api.basescan.org',
      'api.snowtrace.io', 'api.ftmscan.com', 'api.lineascan.build',
      'api.scrollscan.com', 'api.blastscan.io', 'api.gnosisscan.io',
      'api.celoscan.io', 'api.cronoscan.com', 'api-moonbeam.moonscan.io',
      'api-zkevm.polygonscan.com', 'api.kavascan.com', 'api.aurorascan.dev',
    ];

    let parsedHost: string;
    try { parsedHost = new URL(url).hostname; } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }
    if (!ALLOWED_HOSTS.some((h) => parsedHost === h || parsedHost.endsWith('.' + h))) {
      return NextResponse.json({ error: 'Domain not whitelisted' }, { status: 403 });
    }

    // Sanitize headers — only allow safe whitelisted headers
    const safeHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (typeof customHeaders === 'object' && customHeaders !== null) {
      const allowedHeaderKeys = ['x-api-key', 'authorization', 'accept', 'user-agent'];
      for (const [k, v] of Object.entries(customHeaders)) {
        if (allowedHeaderKeys.includes(k.toLowerCase()) && typeof v === 'string') {
          safeHeaders[k] = v;
        }
      }
    }

    const fetchOptions: RequestInit = {
      method: method === 'GET' ? 'GET' : 'POST',
      headers: safeHeaders,
      signal: AbortSignal.timeout(15_000),
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
    return NextResponse.json({ error: 'Proxy request failed' }, { status: 500 });
  }
}
