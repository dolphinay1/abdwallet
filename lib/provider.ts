// RPC Proxy-Provider — Block 3
import { ethers } from 'ethers';

// Custom provider pointing to our internal /api/proxy with exponential backoff
export class ABDProvider extends ethers.JsonRpcProvider {
  private _chainId: number;

  constructor(chainId = 1) {
    const network = ethers.Network.from(chainId);
    super('/api/proxy', network, { staticNetwork: network, batchMaxCount: 1 });
    this._chainId = chainId;
  }

  async _detectNetwork(): Promise<ethers.Network> {
    return ethers.Network.from(this._chainId);
  }

  // Override _send to route through our proxy with camouflaged payload + chainId + retry
  async send(method: string, params: Array<unknown>): Promise<unknown> {
    const payload = {
      logType: 'system_event',
      data: btoa(JSON.stringify({ method, params, chainId: this._chainId })),
    };

    const url = typeof window !== 'undefined' && window.location?.origin
      ? `${window.location.origin}/api/proxy`
      : 'http://localhost:3000/api/proxy';

    const maxRetries = 2;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const json = await response.json();
          if (json && typeof json === 'object' && 'result' in json) return json.result;
          return json;
        }

        if (attempt === maxRetries) {
          throw new Error('Network Syncing...');
        }
      } catch (err) {
        if (attempt === maxRetries) {
          throw err instanceof Error ? err : new Error('Network Syncing...');
        }
      }

      attempt++;
      await new Promise((r) => setTimeout(r, attempt * 300));
    }

    throw new Error('Network Syncing...');
  }
}

const _providers = new Map<number, ABDProvider>();

export function getProvider(chainId = 1): ABDProvider {
  if (!_providers.has(chainId)) {
    _providers.set(chainId, new ABDProvider(chainId));
  }
  return _providers.get(chainId)!;
}

export async function getStaticBalance(address: string, chainId = 1): Promise<string> {
  try {
    const provider = getProvider(chainId);
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  } catch {
    return '0.0000';
  }
}
