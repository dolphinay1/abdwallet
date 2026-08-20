import { NextResponse } from 'next/server';
import { checkRateLimitAsync } from '@/lib/rate-limit';
import { resolveRpcUrl, rpcRequest } from '@/lib/rpc-registry';
import { getChainById } from '@/lib/chains';
import { ethers } from 'ethers';

export const dynamic = 'force-dynamic';

const ERC20_ABI = [
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
];

const SELECTOR_TRANSFER = '0xa9059cbb';
const SELECTOR_APPROVE = '0x095ea7b3';

interface SimChange {
  changeType: string;
  from: string;
  to: string;
  amount?: string;
  symbol?: string;
}

/**
 * Transaction simulation via eth_call dry-run + eth_estimateGas.
 * POST { tx: { from, to, value, data }, chainId } → { changes, gasUsed }
 * Soft-fails (empty changes) when RPC is unavailable so the send flow never breaks.
 */
export async function POST(req: Request) {
  const limit = await checkRateLimitAsync(req, 60, 60_000);
  if (!limit.allowed) return limit.response!;

  try {
    const body = await req.json();
    const { tx, chainId } = body;

    if (!tx || !tx.from || !tx.to || chainId == null) {
      return NextResponse.json({ error: 'tx.from, tx.to and chainId are required' }, { status: 400 });
    }
    if (!ethers.isAddress(tx.from) || !ethers.isAddress(tx.to)) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
    }

    const chain = getChainById(Number(chainId));
    const rpcUrl = await resolveRpcUrl(Number(chainId));
    if (!rpcUrl) {
      return NextResponse.json({ changes: [], gasUsed: '0x0' });
    }

    const callObj: Record<string, string> = {
      from: tx.from,
      to: tx.to,
      value: typeof tx.value === 'string' && tx.value.startsWith('0x') ? tx.value : '0x0',
      data: typeof tx.data === 'string' && tx.data.startsWith('0x') ? tx.data : '0x',
    };

    let simFailed = false;
    try {
      await rpcRequest(rpcUrl, 'eth_call', [callObj, 'latest']);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      const isRealRevert = /revert|execution reverted|insufficient funds|out of gas/i.test(msg);
      if (isRealRevert) {
        return NextResponse.json({ error: `Transaction would revert: ${msg.slice(0, 140)}` }, { status: 422 });
      }
      simFailed = true;
    }

    let gasUsed = '0x0';
    if (!simFailed) {
      try {
        gasUsed = await rpcRequest(rpcUrl, 'eth_estimateGas', [callObj]);
      } catch {
        gasUsed = '0x5208';
      }
    }

    const changes: SimChange[] = [];
    const data: string = callObj.data;
    const nativeSymbol = chain?.symbol ?? 'ETH';

    if (!data || data === '0x') {
      const wei = BigInt(callObj.value);
      if (wei > 0n) {
        changes.push({
          changeType: 'TRANSFER',
          from: tx.from,
          to: tx.to,
          amount: ethers.formatEther(wei),
          symbol: nativeSymbol,
        });
      }
    } else if (data.startsWith(SELECTOR_TRANSFER) && data.length >= 138) {
      const recipient = '0x' + data.slice(34, 74);
      const rawAmount = BigInt('0x' + data.slice(74, 138));
      let symbol = 'TOKEN';
      let decimals = 18;
      try {
        const iface = new ethers.Interface(ERC20_ABI);
        const [symHex, decHex] = await Promise.all([
          rpcRequest(rpcUrl, 'eth_call', [{ to: tx.to, data: iface.encodeFunctionData('symbol') }, 'latest']),
          rpcRequest(rpcUrl, 'eth_call', [{ to: tx.to, data: iface.encodeFunctionData('decimals') }, 'latest']),
        ]);
        symbol = iface.decodeFunctionResult('symbol', symHex)[0] as string;
        decimals = Number(iface.decodeFunctionResult('decimals', decHex)[0]);
      } catch {
        // keep defaults
      }
      changes.push({
        changeType: 'TRANSFER',
        from: tx.from,
        to: recipient,
        amount: ethers.formatUnits(rawAmount, decimals),
        symbol,
      });
    } else if (data.startsWith(SELECTOR_APPROVE) && data.length >= 138) {
      const spender = '0x' + data.slice(34, 74);
      changes.push({ changeType: 'APPROVE', from: tx.from, to: spender });
    } else {
      changes.push({ changeType: 'CONTRACT_CALL', from: tx.from, to: tx.to });
    }

  } catch (err) {
    console.error('Simulation error:', err);
    return NextResponse.json({ error: 'Simulation failed' }, { status: 500 });
  }
}
