import { NextResponse } from 'next/server';
import { resolveRpcUrl, rpcRequest } from '@/lib/rpc-registry';

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Gas price oracle — returns { slow, medium, fast, baseFee } in gwei
 * for an EVM chain, derived from eth_gasPrice + eth_feeHistory.
 */
export async function GET(req: Request) {
  const chainId = Number(new URL(req.url).searchParams.get('chainId') || 1);
  const rpcUrl = await resolveRpcUrl(chainId);
  if (!rpcUrl) {
    return NextResponse.json({ error: `Unsupported chainId ${chainId}` }, { status: 400 });
  }

  try {
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
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch gas prices', detail: String(err) }, { status: 502 });
  }
}
