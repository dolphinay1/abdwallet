// API smoke test — temporary diagnostic script
const BASE = 'http://localhost:3001';

async function get(path) {
  try {
    const r = await fetch(BASE + path, { signal: AbortSignal.timeout(60000) });
    console.log(`GET ${path} -> ${r.status}`);
    console.log(' ', (await r.text()).slice(0, 400));
  } catch (e) {
    console.log(`GET ${path} -> FAIL ${e.message}`);
  }
}

async function post(path, body) {
  try {
    const r = await fetch(BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });
    console.log(`POST ${path} -> ${r.status}`);
    console.log(' ', (await r.text()).slice(0, 400));
  } catch (e) {
    console.log(`POST ${path} -> FAIL ${e.message}`);
  }
}

(async () => {
  await get('/api/gas?chainId=1');
  await post('/api/tokens', { address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', chainId: 1 });
  // Camouflaged JSON-RPC (ABDProvider format)
  await post('/api/proxy', {
    logType: 'system_event',
    data: Buffer.from(JSON.stringify({ method: 'eth_chainId', params: [], chainId: 1 })).toString('base64'),
  });
  await post('/api/txhistory', { address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', chainId: 1 });
})();
