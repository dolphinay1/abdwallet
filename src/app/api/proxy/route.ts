import { NextResponse } from 'next/server';
import dns from 'dns';
import net from 'net';
import { resolveRpcUrl } from '@/lib/rpc-registry';
import { checkRateLimitAsync } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

function isPrivateIp(ip: string): boolean {
  const ipVer = net.isIP(ip);
  if (ipVer === 0) return false;

  if (ipVer === 4) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some(n => isNaN(n) || n < 0 || n > 255)) return true;
    const [a, b, c] = parts;

    // 0.0.0.0/8
    if (a === 0) return true;
    // 10.0.0.0/8 (Private)
    if (a === 10) return true;
    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true;
    // 100.64.0.0/10 (CGNAT)
    if (a === 100 && b >= 64 && b <= 127) return true;
    // 169.254.0.0/16 (Link Local)
    if (a === 169 && b === 254) return true;
    // 172.16.0.0/12 (Private)
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.0.0.0/24 & 192.0.2.0/24 (TEST-NET-1)
    if (a === 192 && b === 0 && (c === 0 || c === 2)) return true;
    // 192.168.0.0/16 (Private)
    if (a === 192 && b === 168) return true;
    // 198.18.0.0/15 (Benchmark)
    if (a === 198 && (b === 18 || b === 19)) return true;
    // 198.51.100.0/24 (TEST-NET-2) & 203.0.113.0/24 (TEST-NET-3)
    if (a === 198 && b === 51 && c === 100) return true;
    if (a === 203 && b === 0 && c === 113) return true;
    // Multicast & Reserved
    if (a >= 224) return true;
    return false;
  }

  if (ipVer === 6) {
    const normalized = ip.toLowerCase();
    if (normalized === '::1' || normalized === '::' || normalized === '0:0:0:0:0:0:0:1' || normalized === '0:0:0:0:0:0:0:0') return true;
    // Unique Local Address (fc00::/7)
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
    // Link-local (fe80::/10)
    if (/^fe[89ab]/i.test(normalized)) return true;
    // IPv4-mapped IPv6 (::ffff:127.0.0.1)
    if (normalized.includes('::ffff:')) {
      const v4 = normalized.split('::ffff:')[1];
      if (v4 && isPrivateIp(v4)) return true;
    }
    return false;
  }

  return false;
}

async function validateHostIsNotPrivate(hostname: string): Promise<boolean> {
  try {
    // Direct IP literal check
    if (net.isIP(hostname) !== 0) {
      return !isPrivateIp(hostname);
    }
    // Domain hostname: resolve all DNS A/AAAA records
    const records = await dns.promises.lookup(hostname, { all: true });
    if (!records || records.length === 0) return false;

    for (const record of records) {
      if (isPrivateIp(record.address)) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Proxy route — forwards RPC or external API requests server-side
 * to avoid CORS issues and hide private API keys from the client.
 */
export async function POST(req: Request) {
  // Rate limit: 120 requests per minute per IP for RPC
  const limit = await checkRateLimitAsync(req, 120, 60_000);
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

      // Verify resolved RPC URL host is public
      try {
        const rpcHost = new URL(rpcUrl).hostname;
        const isSafe = await validateHostIsNotPrivate(rpcHost);
        if (!isSafe) {
          return NextResponse.json({ jsonrpc: '2.0', id: null, error: { code: -32603, message: 'Internal RPC safety rejection' } }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ jsonrpc: '2.0', id: null, error: { code: -32603, message: 'Invalid RPC target' } }, { status: 403 });
      }

      // Single call vs ethers batch
      const rpcBody = Array.isArray(decoded.method)
        ? decoded.method.map((call, i) => ({ jsonrpc: '2.0', id: i + 1, method: call.method, params: call.params ?? [] }))
        : { jsonrpc: '2.0', id: 1, method: decoded.method, params: decoded.params ?? [] };

      const res = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rpcBody),
        redirect: 'manual',
        signal: AbortSignal.timeout(15_000),
      });

      if (res.status >= 300 && res.status < 400) {
        return NextResponse.json({ jsonrpc: '2.0', id: null, error: { code: -32603, message: 'RPC redirect blocked' } }, { status: 403 });
      }

      const data = await res.json();
      return NextResponse.json(data);
    }

    // ── Format 2: restricted forward (only whitelisted domains) ──────────
    const { url, method = 'POST', payload, headers: customHeaders = {} } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    if (parsedUrl.protocol !== 'https:') {
      return NextResponse.json({ error: 'HTTPS protocol is required' }, { status: 400 });
    }

    const parsedHost = parsedUrl.hostname;

    // DNS pre-resolution & private IP verification (SSRF Protection)
    const isPublicHost = await validateHostIsNotPrivate(parsedHost);
    if (!isPublicHost) {
      return NextResponse.json({ error: 'SSRF blocked: Private or reserved IP target' }, { status: 403 });
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
      'fullnode.mainnet.sui.io', 'api.mainnet.aptoslabs.com', 'horizon.stellar.org',
      'xrplcluster.com', 's1.ripple.com', 's2.ripple.com',
      'api.etherscan.io', 'api.bscscan.com', 'api.polygonscan.com',
      'api.arbiscan.io', 'api-optimistic.etherscan.io', 'api.basescan.org',
      'api.snowtrace.io', 'api.ftmscan.com', 'api.lineascan.build',
      'api.scrollscan.com', 'api.blastscan.io', 'api.gnosisscan.io',
      'api.celoscan.io', 'api.cronoscan.com', 'api-moonbeam.moonscan.io',
      'api-zkevm.polygonscan.com', 'api.kavascan.com', 'api.aurorascan.dev',
    ];

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
      redirect: 'manual',
      signal: AbortSignal.timeout(15_000),
    };

    if (method !== 'GET' && payload) {
      fetchOptions.body = JSON.stringify(payload);
    }

    const res = await fetch(url, fetchOptions);

    // Reject unvalidated 3xx redirects
    if (res.status >= 300 && res.status < 400) {
      return NextResponse.json({ error: 'Redirects not permitted' }, { status: 403 });
    }

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
