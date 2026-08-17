import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { ethers } from 'ethers';

export const dynamic = 'force-dynamic';

const ERC20_ABI = [
  'function allowance(address owner, address spender) view returns (uint256)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
];

/**
 * Fetches ERC-20 token approvals for a given address.
 */
export async function POST(req: Request) {
  const limit = checkRateLimit(req, 60, 60_000);
  if (!limit.allowed) return limit.response!;

  try {
    const body = await req.json();
    const { address, rpcUrl, tokenList = [] } = body;

    if (!address || !rpcUrl) {
      return NextResponse.json({ error: 'address and rpcUrl are required' }, { status: 400 });
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const approvals = [];

    for (const token of tokenList) {
      try {
        const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
        for (const spender of (token.spenders || [])) {
          const allowance = await contract.allowance(address, spender.address);
          if (allowance > 0n) {
            const decimals = await contract.decimals();
            approvals.push({
              token: token.address,
              tokenSymbol: token.symbol || 'UNKNOWN',
              spender: spender.address,
              spenderName: spender.name || spender.address,
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
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch approvals', detail: String(err) }, { status: 500 });
  }
}
