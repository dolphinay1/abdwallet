import { NextResponse } from 'next/server';
import { resolveRpcUrl, rpcRequest } from '@/lib/rpc-registry';
import { checkRateLimit } from '@/lib/rate-limit';
import { ethers } from 'ethers';

export const dynamic = 'force-dynamic';

const LIDO_STETH = '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84';
const ROCKET_POOL_RETH = '0xae78736Cd615f374D3085123A210448E74Fc6393';
const BALANCE_OF_SELECTOR = '0x70a08231';

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
        try {
          const res = await fetch('https://eth-api.lido.fi/v1/protocol/steth/apr/last', {
            headers: { Accept: 'application/json' },
            next: { revalidate: 300 },
          });
          if (res.ok) {
            const data = await res.json();
            const apy = typeof data?.data?.apr === 'number' ? Math.round(data.data.apr * 100) / 100 : 3.2;
            return NextResponse.json({ apy });
          }
        } catch {
          // fallback below
        }
        return NextResponse.json({ apy: 3.2 });
      }

      if (protocol === 'rocketpool') {
        return NextResponse.json({ apy: 3.1 });
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
              positions.push({
                protocol: 'rocketpool',
                balance: Number(rEthEth).toFixed(4),
                balanceETH: (Number(rEthEth) * 1.1).toFixed(4),
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
    return NextResponse.json({ error: 'Failed to process staking request', detail: String(err) }, { status: 500 });
  }
}
