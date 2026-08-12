// RPC connectivity probe — temporary diagnostic script
const fs = require('fs');
const lines = fs.readFileSync('.env.local', 'utf8').split('\n');
const env = {};
for (const l of lines) {
  const m = l.match(/^([A-Za-z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

async function probe(name, url) {
  if (!url) { console.log(name, ': (empty)'); return; }
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] }),
      signal: AbortSignal.timeout(8000),
    });
    const j = await r.json();
    console.log(name, 'OK chainId=', j.result, '| url=', url);
  } catch (e) {
    console.log(name, 'FAIL:', e.message, '| url=', url);
  }
}

(async () => {
  for (const k of ['RPC_ETHEREUM', 'PRIVATE_RPC_URL', 'NEXT_PUBLIC_RPC_ETHEREUM', 'ALCHEMY_API_KEY']) {
    if (k === 'ALCHEMY_API_KEY') {
      const key = env[k];
      if (!key || key.includes('YOUR_') || key.length < 10) { console.log(k, ': missing/placeholder'); continue; }
      await probe(k, `https://eth-mainnet.g.alchemy.com/v2/${key}`);
      continue;
    }
    await probe(k, env[k]);
  }
  await probe('publicnode', 'https://ethereum-rpc.publicnode.com');
  await probe('cloudflare', 'https://cloudflare-eth.com');
  await probe('ankr', 'https://rpc.ankr.com/eth');
  await probe('llamarpc', 'https://eth.llamarpc.com');
})();
