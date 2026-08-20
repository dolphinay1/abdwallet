import { NextResponse } from 'next/server';
import { resolveRpcUrl, rpcRequest } from '@/lib/rpc-registry';
import { checkRateLimit } from '@/lib/rate-limit';
import { ethers } from 'ethers';

export const dynamic = 'force-dynamic';

const LIDO_STETH = '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84';
const ROCKET_POOL_RETH = '0xae78736Cd615f374D3085123A210448E74Fc6393';
const BALANCE_OF_SELECTOR = '0x70a08231';
const GET_EXCHANGE_RATE_SELECTOR = '0xe6aa216c';

const rethRateCache: { value: number | null; ts: number } = { value: null, ts: 0 };
const RETH_RATE_TTL = 10 * 60 * 1000;

const apyCache: Record<string, { value: number; ts: number }> = {};
const APY_TTL = 10 * 60 * 1000;

/**
 * Returns cached APY if fresh, otherwise null.
 */
function getCachedApy(key: string): number | null {
  const hit = apyCache[key];
  if (hit && Date.now() - hit.ts < APY_TTL) return hit.value;
  return null;
}

/**
 * Stores a freshly fetched APY in the module cache.
 */
function setCachedApy(key: string, value: number): void {
  apyCache[key] = { value, ts: Date.now() };
}

async function getRethExchangeRate(rpcUrl: string): Promise<number | null> {
  if (rethRateCache.value !== null && Date.now() - rethRateCache.ts < RETH_RATE_TTL) {
    return rethRateCache.value;
  }
  try {
    const hex = await rpcRequest(rpcUrl, 'eth_call', [{ to: ROCKET_POOL_RETH, data: GET_EXCHANGE_RATE_SELECTOR }, 'latest']);
    if (hex && hex !== '0x') {
      const rate = Number(BigInt(hex)) / 1e18;
      if (rate > 0.5 && rate < 2) {
        rethRateCache.value = rate;
        rethRateCache.ts = Date.now();
        return rate;
      }
    }
  } catch {}
  return null;
}

/**
 * Liquid staking proxy — fetches APY and staked positions for Lido and Rocket Pool.
 */
export async function GET(req: Request) {
  const limit = checkRateLimit(req, 60, 60_000);
  if (!limit.allowed) return limit.response!;

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  try {
    if (action === 'apy') {
      const protocol = searchParams.get('protocol');
      if (protocol === 'lido') {
        const cached = getCachedApy('lido');
        if (cached !== null) return NextResponse.json({ apy: cached });
        try {
          const res = await fetch('https://eth-api.lido.fi/v1/protocol/steth/apr/last', {
            headers: { Accept: 'application/json' },
            cache: 'no-store',
          });
          if (res.ok) {
            const data = await res.json();
            if (typeof data?.data?.apr === 'number') {
              const apy = Math.round(data.data.apr * 100) / 100;
              setCachedApy('lido', apy);
              return NextResponse.json({ apy });
            }
          }
        } catch {
          // fallback below
        }
        return NextResponse.json({ apy: 3.2 });
      }

      if (protocol === 'rocketpool') {
        const cached = getCachedApy('rocketpool');
        if (cached !== null) return NextResponse.json({ apy: cached });
        try {
          const res = await fetch('https://api.rocketpool.net/mainnet/reth/apr', {
            headers: { Accept: 'application/json' },
            cache: 'no-store',
          });
          if (res.ok) {
            const data = await res.json();
            const apr = parseFloat(data?.yearlyAPR);
            if (isFinite(apr)) {
              const apy = Math.round(apr * 100) / 100;
              setCachedApy('rocketpool', apy);
              return NextResponse.json({ apy });
            }
          }
        } catch {
          // fallback below
        }
        return NextResponse.json({ apy: 2.2 });
      }

      return NextResponse.json({ apy: 3.2 });
    }

    if (action === 'positions') {
      const address = searchParams.get('address');
      if (!address || !ethers.isAddress(address)) {
        return NextResponse.json([]);
      }

      const positions: Array<{ protocol: 'lido' | 'rocketpool'; balance: string; balanceETH: string }> = [];

      try {
        const rpcUrl = await resolveRpcUrl(1);
        if (rpcUrl) {
          const paddedAddr = address.toLowerCase().replace('0x', '').padStart(64, '0');
          const data = `${BALANCE_OF_SELECTOR}${paddedAddr}`;

          // Check stETH
          const stEthHex = await rpcRequest(rpcUrl, 'eth_call', [{ to: LIDO_STETH, data }, 'latest']);
          if (stEthHex && stEthHex !== '0x') {
            const stEthWei = BigInt(stEthHex);
            if (stEthWei > 0n) {
              const stEthEth = ethers.formatEther(stEthWei);
              positions.push({
                protocol: 'lido',
                balance: Number(stEthEth).toFixed(4),
                balanceETH: Number(stEthEth).toFixed(4),
              });
            }
          }

          // Check rETH
          const rEthHex = await rpcRequest(rpcUrl, 'eth_call', [{ to: ROCKET_POOL_RETH, data }, 'latest']);
          if (rEthHex && rEthHex !== '0x') {
            const rEthWei = BigInt(rEthHex);
            if (rEthWei > 0n) {
              const rEthEth = ethers.formatEther(rEthWei);
              const rate = await getRethExchangeRate(rpcUrl);
              positions.push({
                protocol: 'rocketpool',
                balance: Number(rEthEth).toFixed(4),
                balanceETH: (Number(rEthEth) * (rate ?? 1)).toFixed(4),
              });
            }
          }
        }
      } catch {
        // Fallback gracefully on query error
      }

      return NextResponse.json(positions);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('Staking processing error:', err);
    return NextResponse.json({ error: 'Failed to process staking request' }, { status: 500 });
  }
}
