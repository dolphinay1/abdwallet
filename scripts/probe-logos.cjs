// Logo URL probe — verifies official logo candidates for each dApp.
// Candidate order: 1) cryptocurrency-icons (official token logos via jsDelivr)
//                  2) Google favicon service (site's own logo, 128px)
const CDN = (sym) => `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/${sym}.png`;
const GFAV = (domain) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

const DAPPS = [
  ['Uniswap', 'app.uniswap.org', 'uni'],
  ['Aave', 'app.aave.com', 'aave'],
  ['Curve', 'curve.fi', 'crv'],
  ['1inch', 'app.1inch.io', '1inch'],
  ['Compound', 'app.compound.finance', 'comp'],
  ['Lido', 'stake.lido.fi', 'ldo'],
  ['Balancer', 'app.balancer.fi', 'bal'],
  ['SushiSwap', 'www.sushi.com', 'sushi'],
  ['dYdX', 'dydx.exchange', 'dydx'],
  ['GMX', 'app.gmx.io', 'gmx'],
  ['Gains Network', 'gains.trade', null],
  ['Morpho', 'app.morpho.org', 'morpho'],
  ['Spark', 'app.spark.fi', null],
  ['Pendle', 'app.pendle.finance', 'pendle'],
  ['Yearn', 'yearn.fi', 'yfi'],
  ['Convex', 'www.convexfinance.com', 'cvx'],
  ['Velodrome', 'velodrome.finance', 'velodrome'],
  ['Aerodrome', 'aerodrome.finance', 'aerodrome'],
  ['Odos', 'app.odos.xyz', null],
  ['CoW Swap', 'swap.cow.fi', 'cow'],
  ['Stargate', 'stargate.finance', 'stg'],
  ['Across', 'app.across.to', 'across'],
  ['Hop', 'app.hop.exchange', 'hop'],
  ['Orbiter', 'www.orbiter.finance', null],
  ['Socket', 'www.bungee.exchange', null],
  ['Synapse', 'synapseprotocol.com', 'synapse'],
  ['OpenSea', 'opensea.io', null],
  ['Blur', 'blur.io', 'blur'],
  ['Rarible', 'rarible.com', 'rari'],
  ['Foundation', 'foundation.app', null],
  ['Zora', 'zora.co', null],
  ['Manifold', 'app.manifold.xyz', null],
  ['Snapshot', 'snapshot.org', null],
  ['Safe', 'app.safe.global', null],
  ['Etherscan', 'etherscan.io', null],
  ['Arbiscan', 'arbiscan.io', null],
  ['Basescan', 'basescan.org', null],
  ['Optimism Scan', 'optimistic.etherscan.io', null],
  ['DeBank', 'debank.com', null],
  ['Zapper', 'zapper.xyz', null],
];

async function ok(url) {
  try {
    const r = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(10000) });
    const ct = r.headers.get('content-type') || '';
    return r.ok && (ct.includes('image') || ct.includes('octet'));
  } catch {
    return false;
  }
}

(async () => {
  const result = [];
  for (const [name, domain, sym] of DAPPS) {
    let icon = null;
    let src = null;
    if (sym) {
      const u = CDN(sym);
      if (await ok(u)) { icon = u; src = 'crypto-icons'; }
    }
    if (!icon) {
      const u = GFAV(domain);
      if (await ok(u)) { icon = u; src = 'gfavicon'; }
    }
    result.push({ name, icon: icon || GFAV(domain), src: src || 'gfavicon-unverified' });
    console.log(`${name.padEnd(14)} [${src || 'gfavicon-unverified'}] ${icon || GFAV(domain)}`);
  }
  console.log('\n// paste-ready:');
  for (const r of result) console.log(`// ${r.name}: ${r.icon}`);
})();
