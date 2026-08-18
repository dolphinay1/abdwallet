import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { resolveRpcUrl } from '@/lib/rpc-registry';
import { getChainById } from '@/lib/chains';
import { getSpenders, getKnownTokens } from '@/lib/approval-registry';
import { ethers } from 'ethers';

export const dynamic = 'force-dynamic';

const ERC20_ABI = [
  'function allowance(address owner, address spender) view returns (uint256)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
];

/**
 * Fetches ERC-20 token approvals for a given address.
 * GET /api/approvals?address=0x..&chainId=1
 * Spenders and token lists resolved server-side from the known registry (SSRF-safe).
 */
export async function GET(req: Request) {
  const limit = checkRateLimit(req, 60, 60_000);
  if (!limit.allowed) return limit.response!;

  const { searchParams } = new URL(req.url);
  const address = searchParams.get('address');
  const chainId = Number(searchParams.get('chainId'));

  if (!address || !ethers.isAddress(address) || !chainId || !getChainById(chainId)) {
    return NextResponse.json({ error: 'Valid address and chainId are required' }, { status: 400 });
  }

  const rpcUrl = await resolveRpcUrl(chainId);
  if (!rpcUrl) {
    return NextResponse.json({ error: 'Unsupported chain / missing RPC' }, { status: 400 });
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const spenders = getSpenders(chainId);
  const tokens = getKnownTokens(chainId);
  const approvals = [];

  for (const token of tokens) {
    try {
      const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
      const [decimals, symbol] = await Promise.all([
        contract.decimals().catch(() => 18),
        contract.symbol().catch(() => token.symbol),
      ]);
      for (const spender of spenders) {
        const allowance = await contract.allowance(address, spender.address);
        if (allowance > 0n) {
          approvals.push({
            token: token.address,
            tokenSymbol: symbol,
            decimals: Number(decimals),
            spender: spender.address,
            spenderName: spender.name,
            allowance: ethers.formatUnits(allowance, decimals),
            isUnlimited: allowance === ethers.MaxUint256,
          });
        }
      }
    } catch {
      continue;
    }
  }

  return NextResponse.json({ approvals });
}
