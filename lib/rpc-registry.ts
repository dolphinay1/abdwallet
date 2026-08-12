// Server-side RPC registry — resolves chainId to a JSON-RPC endpoint.
// Prefers private RPCs from env; falls back to public endpoints.
// Used only by API routes (never shipped to the browser).

import { getChainById } from '@/lib/chains';

const ENV_RPC: Record<number, string | undefined> = {
  1: process.env.RPC_ETHEREUM,
  56: process.env.RPC_BNB,
  137: process.env.RPC_POLYGON,
  42161: process.env.RPC_ARBITRUM,
  10: process.env.RPC_OPTIMISM,
  8453: process.env.RPC_BASE,
  43114: process.env.RPC_AVALANCHE,
  250: process.env.RPC_FANTOM,
};

// Ordered public fallbacks per chain — first healthy one wins (probed on demand).
const PUBLIC_RPC: Record<number, string[]> = {
  1: ['https://ethereum-rpc.publicnode.com', 'https://cloudflare-eth.com'],
  56: ['https://bsc-dataseed.bnbchain.org', 'https://binance.llamarpc.com'],
  137: ['https://polygon-rpc.com', 'https://polygon-bor-rpc.publicnode.com'],
  42161: ['https://arb1.arbitrum.io/rpc', 'https://arbitrum-one-rpc.publicnode.com'],
  10: ['https://mainnet.optimism.io', 'https://optimism-rpc.publicnode.com'],
  8453: ['https://mainnet.base.org', 'https://base-rpc.publicnode.com'],
  43114: ['https://api.avax.network/ext/bc/C/rpc'],
  250: ['https://rpc.ftm.tools', 'https://fantom-rpc.publicnode.com'],
  324: ['https://mainnet.era.zksync.io'],
  59144: ['https://rpc.linea.build'],
  534352: ['https://rpc.scroll.io'],
  81457: ['https://rpc.blast.io'],
  100: ['https://rpc.gnosischain.com'],
  42220: ['https://forno.celo.org'],
  25: ['https://evm.cronos.org'],
  1284: ['https://rpc.api.moonbeam.network'],
  5000: ['https://rpc.mantle.xyz'],
  1101: ['https://zkevm-rpc.com'],
  11155111: ['https://ethereum-sepolia-rpc.publicnode.com'],
  84532: ['https://sepolia.base.org'],
  421614: ['https://sepolia-rollup.arbitrum.io/rpc'],
};

// Endpoints confirmed broken at runtime — skipped on subsequent resolutions.
const unhealthy = new Set<string>();
// Positive health cache — avoid re-probing healthy endpoints on every request.
const healthyUntil = new Map<string, number>();
const HEALTH_TTL = 5 * 60_000;

async function isHealthy(url: string): Promise<boolean> {
  if (unhealthy.has(url)) return false;
  const cached = healthyUntil.get(url);
  if (cached && Date.now() < cached) return true;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] }),
      signal: AbortSignal.timeout(6_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (typeof data.result !== 'string') throw new Error('Bad RPC response');
    healthyUntil.set(url, Date.now() + HEALTH_TTL);
    return true;
  } catch {
    unhealthy.add(url);
    return false;
  }
}

export async function resolveRpcUrl(chainId: number): Promise<string | null> {
  // 1. Chain-specific private RPC from env (CHAINS.rpcEnvKey)
  const chain = getChainById(chainId);
  const chainEnv = chain?.rpcEnvKey ? process.env[chain.rpcEnvKey] : undefined;
  if (chainEnv && (await isHealthy(chainEnv))) return chainEnv;
  // 2. Well-known env keys
  const env = ENV_RPC[chainId];
  if (env && env !== chainEnv && (await isHealthy(env))) return env;
  // 3. Public fallbacks — first healthy endpoint
  for (const url of PUBLIC_RPC[chainId] ?? []) {
    if (await isHealthy(url)) return url;
  }
  return null;
}

/** Performs a single JSON-RPC call against a resolved endpoint. */
export async function rpcRequest(rpcUrl: string, method: string, params: unknown[]): Promise<any> {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'RPC error');
  return data.result;
}
