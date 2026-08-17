import { NextResponse } from 'next/server';
import { resolveRpcUrl, rpcRequest } from '@/lib/rpc-registry';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const round2 = (n: number) => Math.round(n * 100) / 100;

const DEFAULT_GAS_BY_CHAIN: Record<number, { slow: number; medium: number; fast: number; baseFee: number }> = {
  1: { slow: 12, medium: 18, fast: 25, baseFee: 10 },
  56: { slow: 3, medium: 3.5, fast: 5, baseFee: 3 },
  137: { slow: 30, medium: 45, fast: 70, baseFee: 25 },
  42161: { slow: 0.1, medium: 0.15, fast: 0.25, baseFee: 0.08 },
  10: { slow: 0.01, medium: 0.02, fast: 0.05, baseFee: 0.005 },
  8453: { slow: 0.01, medium: 0.02, fast: 0.05, baseFee: 0.005 },
  43114: { slow: 25, medium: 30, fast: 40, baseFee: 25 },
  250: { slow: 20, medium: 30, fast: 50, baseFee: 15 },
};

/**
 * Gas price oracle — returns { slow, medium, fast, baseFee } in gwei
 * for an EVM chain, derived from eth_gasPrice + eth_feeHistory.
 */
export async function GET(req: Request) {
  const limit = checkRateLimit(req, 120, 60_000);
  if (!limit.allowed) return limit.response!;

  const chainId = Number(new URL(req.url).searchParams.get('chainId') || 1);
  const fallback = DEFAULT_GAS_BY_CHAIN[chainId] || { slow: 15, medium: 20, fast: 30, baseFee: 12 };

  try {
    const rpcUrl = await resolveRpcUrl(chainId);
    if (!rpcUrl) {
      return NextResponse.json(fallback);
    }

    const gasPriceHex = await rpcRequest(rpcUrl, 'eth_gasPrice', []);
    const gasPriceGwei = Number(BigInt(gasPriceHex)) / 1e9;

    let baseFeeGwei = gasPriceGwei * 0.8;
    try {
      const hist = await rpcRequest(rpcUrl, 'eth_feeHistory', ['0x5', 'latest', [50]]);
      const fees: string[] | undefined = hist?.baseFeePerGas;
      if (Array.isArray(fees) && fees.length > 0) {
        baseFeeGwei = Number(BigInt(fees[fees.length - 1])) / 1e9;
      }
    } catch {
      // feeHistory unsupported on some chains — keep gasPrice-derived base fee
    }

    const tip = Math.max(gasPriceGwei - baseFeeGwei, 0.1);
    const medium = Math.max(gasPriceGwei, baseFeeGwei + tip * 0.5);
    return NextResponse.json({
      slow: round2(Math.max(baseFeeGwei + tip * 0.25, medium * 0.85)),
      medium: round2(medium),
      fast: round2(baseFeeGwei + tip * 1.5 + (medium - gasPriceGwei)),
      baseFee: round2(baseFeeGwei),
    });
  } catch {
    return NextResponse.json(fallback);
  }
}
