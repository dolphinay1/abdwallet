import { NextResponse } from 'next/server';
import { ethers, Network } from 'ethers';
import { resolveRpcUrl } from '@/lib/rpc-registry';
import { getChainById } from '@/lib/chains';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
];

interface TokenEntry {
  symbol: string;
  name: string;
  decimals: number;
  balance: string;       // formatted
  balanceRaw: string;    // raw
  contractAddress: string | 'native';
  logo?: string;
  coingeckoId?: string;
}

/**
 * Fetches native + ERC-20 token balances for a given address on an EVM chain.
 * Accepts { address, chainId } (RPC resolved server-side) or the legacy
 * { address, rpcUrl, tokens } format. Returns TokenBalance[] directly.
 */
export async function POST(req: Request) {
  const limit = checkRateLimit(req, 120, 60_000);
  if (!limit.allowed) return limit.response!;
  try {
    const body = await req.json();
    const { address, chainId, rpcUrl: explicitRpc, tokens = [] } = body;

    if (!address) {
      return NextResponse.json({ error: 'address is required' }, { status: 400 });
    }

    const chain = chainId != null ? getChainById(Number(chainId)) : undefined;
    const rpcUrl = explicitRpc || (chainId != null ? await resolveRpcUrl(Number(chainId)) : null);
    if (!rpcUrl) {
      return NextResponse.json({ error: 'Unsupported chain / missing RPC' }, { status: 400 });
    }

    const net = ethers.Network.from(Number(chainId) || 1);
    const provider = new ethers.JsonRpcProvider(rpcUrl, net, { staticNetwork: net, batchMaxCount: 1 });
    const result: TokenEntry[] = [];

    // Native balance
    try {
      const nativeBalance = await provider.getBalance(address);
      result.push({
        symbol: chain?.symbol ?? 'ETH',
        name: chain?.name ?? 'Native',
        decimals: 18,
        balance: ethers.formatEther(nativeBalance),
        balanceRaw: nativeBalance.toString(),
        contractAddress: 'native',
        coingeckoId: chain?.coingeckoId,
      });
    } catch {
      result.push({
        symbol: chain?.symbol ?? 'ETH',
        name: chain?.name ?? 'Native',
        decimals: 18,
        balance: '0',
        balanceRaw: '0',
        contractAddress: 'native',
        coingeckoId: chain?.coingeckoId,
      });
    }

    // Optional custom ERC-20 tokens
    for (const token of tokens) {
      try {
        const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
        const [balance, decimals, symbol, name] = await Promise.all([
          contract.balanceOf(address),
          contract.decimals(),
          contract.symbol().catch(() => token.symbol ?? 'TOKEN'),
          contract.name().catch(() => token.symbol ?? 'Custom Token'),
        ]);
        result.push({
          symbol,
          name,
          decimals: Number(decimals),
          balance: ethers.formatUnits(balance, decimals),
          balanceRaw: balance.toString(),
          contractAddress: token.address,
          logo: token.logo,
          coingeckoId: token.coingeckoId,
        });
      } catch {
        // Unreadable contract — skip rather than failing the whole response
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch token balances', detail: String(err) }, { status: 500 });
  }
}
