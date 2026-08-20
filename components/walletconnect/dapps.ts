export interface DAppInfo {
  name: string;
  url: string;
  icon: string;
  tag: string;
  color: string;
}

const CI = (sym: string) => `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/${sym}.png`;
const FAV = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

export const METHOD_LABELS: Record<string, string> = {
  eth_sendTransaction: 'Send Transaction',
  eth_signTransaction: 'Sign Transaction',
  personal_sign: 'Sign Message',
  eth_sign: 'Sign Message (Legacy)',
  eth_signTypedData: 'Sign Typed Data',
  eth_signTypedData_v4: 'Sign Typed Data v4',
};

export const TAG_COLORS: Record<string, string> = {
  DEX: '#2b2d33',
  Lending: '#8a8f98',
  Staking: '#8a8f98',
  'Aggreg.': '#8a8f98',
  Perps: '#b91c1c',
  Yield: '#23262b',
  Bridge: '#23262b',
  NFT: '#8a8f98',
  'Govern.': '#23262b',
  Multisig: '#8a8f98',
  Explorer: '#8a8f98',
  Portfolio: '#23262b',
  DAO: '#23262b',
};

export const TAG_STYLES: Record<string, { bg: string; color: string }> = {
  DEX: { bg: 'rgba(185, 45, 45, 0.82)', color: '#ffffff' }, // Soluk Kırmızı (Pale Red)
  NFT: { bg: 'rgba(37, 99, 185, 0.82)', color: '#ffffff' }, // Soluk Mavi (Pale Blue)
  Perps: { bg: 'rgba(25, 30, 40, 0.92)', color: '#ffffff' }, // Siyah / Koyu Kömür
  'Aggreg.': { bg: 'rgba(25, 30, 40, 0.92)', color: '#ffffff' }, // Siyah / Koyu Kömür
  Lending: { bg: 'rgba(51, 65, 85, 0.88)', color: '#ffffff' }, // Kapalı Koyu Gri
  Yield: { bg: 'rgba(51, 65, 85, 0.88)', color: '#ffffff' }, // Kapalı Koyu Gri
  Staking: { bg: 'rgba(71, 85, 105, 0.88)', color: '#ffffff' }, // Orta Gri
  Bridge: { bg: 'rgba(71, 85, 105, 0.88)', color: '#ffffff' }, // Orta Gri
  Portfolio: { bg: 'rgba(85, 100, 120, 0.88)', color: '#ffffff' }, // Orta-Açık Gri
  Explorer: { bg: 'rgba(100, 116, 139, 0.88)', color: '#ffffff' }, // Açıkça Gri
  'Govern.': { bg: 'rgba(100, 116, 139, 0.88)', color: '#ffffff' }, // Açıkça Gri
  Multisig: { bg: 'rgba(100, 116, 139, 0.88)', color: '#ffffff' }, // Açıkça Gri
  DAO: { bg: 'rgba(100, 116, 139, 0.88)', color: '#ffffff' }, // Açıkça Gri
};

export const DAPPS: DAppInfo[] = [
  // 1. Perps (Siyah / Koyu Kömür)
  { name: 'dYdX', url: 'https://dydx.exchange', icon: FAV('dydx.exchange'), tag: 'Perps', color: '#6966FF' },
  { name: 'GMX', url: 'https://app.gmx.io', icon: FAV('app.gmx.io'), tag: 'Perps', color: '#03D1CF' },
  { name: 'Gains Network', url: 'https://gains.trade', icon: FAV('gains.trade'), tag: 'Perps', color: '#00B9AE' },

  // 2. Aggregators (Siyah / Koyu Kömür)
  { name: '1inch', url: 'https://app.1inch.io', icon: CI('1inch'), tag: 'Aggreg.', color: '#1B314F' },
  { name: 'Odos', url: 'https://app.odos.xyz', icon: FAV('app.odos.xyz'), tag: 'Aggreg.', color: '#A040FF' },

  // 3. DEX (Soluk Kırmızı)
  { name: 'Uniswap', url: 'https://app.uniswap.org', icon: CI('uni'), tag: 'DEX', color: '#FF007A' },
  { name: 'Curve', url: 'https://curve.fi', icon: CI('crv'), tag: 'DEX', color: '#3466CE' },
  { name: 'Balancer', url: 'https://app.balancer.fi', icon: CI('bal'), tag: 'DEX', color: '#1E1E1E' },
  { name: 'SushiSwap', url: 'https://www.sushi.com/swap', icon: CI('sushi'), tag: 'DEX', color: '#0E0F23' },
  { name: 'Velodrome', url: 'https://velodrome.finance', icon: FAV('velodrome.finance'), tag: 'DEX', color: '#FF0420' },
  { name: 'Aerodrome', url: 'https://aerodrome.finance', icon: FAV('aerodrome.finance'), tag: 'DEX', color: '#0052FF' },
  { name: 'CoW Swap', url: 'https://swap.cow.fi', icon: FAV('swap.cow.fi'), tag: 'DEX', color: '#FF784A' },

  // 4. NFT (Soluk Mavi)
  { name: 'OpenSea', url: 'https://opensea.io', icon: FAV('opensea.io'), tag: 'NFT', color: '#2081E2' },
  { name: 'Blur', url: 'https://blur.io', icon: FAV('blur.io'), tag: 'NFT', color: '#FF8700' },
  { name: 'Rarible', url: 'https://rarible.com', icon: FAV('rarible.com'), tag: 'NFT', color: '#FEDA03' },
  { name: 'Foundation', url: 'https://foundation.app', icon: FAV('foundation.app'), tag: 'NFT', color: '#8a8f98' },
  { name: 'Zora', url: 'https://zora.co', icon: FAV('zora.co'), tag: 'NFT', color: '#A040FF' },
  { name: 'Manifold', url: 'https://app.manifold.xyz', icon: FAV('app.manifold.xyz'), tag: 'NFT', color: '#0038FF' },

  // 5. Lending (Kapalı Koyu Gri)
  { name: 'Aave', url: 'https://app.aave.com', icon: CI('aave'), tag: 'Lending', color: '#B6509E' },
  { name: 'Compound', url: 'https://app.compound.finance', icon: CI('comp'), tag: 'Lending', color: '#00D395' },
  { name: 'Morpho', url: 'https://app.morpho.org', icon: FAV('app.morpho.org'), tag: 'Lending', color: '#2470FF' },
  { name: 'Spark', url: 'https://app.spark.fi', icon: FAV('app.spark.fi'), tag: 'Lending', color: '#FF8151' },

  // 6. Yield (Kapalı Koyu Gri)
  { name: 'Pendle', url: 'https://app.pendle.finance', icon: FAV('app.pendle.finance'), tag: 'Yield', color: '#5BCEAE' },
  { name: 'Yearn', url: 'https://yearn.fi', icon: CI('yfi'), tag: 'Yield', color: '#006AE3' },
  { name: 'Convex', url: 'https://www.convexfinance.com', icon: FAV('www.convexfinance.com'), tag: 'Yield', color: '#FF5A5A' },

  // 7. Staking (Orta Gri)
  { name: 'Lido', url: 'https://stake.lido.fi', icon: FAV('stake.lido.fi'), tag: 'Staking', color: '#00A3FF' },

  // 8. Bridge (Orta Gri)
  { name: 'Across', url: 'https://app.across.to', icon: FAV('app.across.to'), tag: 'Bridge', color: '#6CF9D8' },
  { name: 'Hop', url: 'https://app.hop.exchange', icon: FAV('app.hop.exchange'), tag: 'Bridge', color: '#E96DFF' },
  { name: 'Orbiter', url: 'https://www.orbiter.finance', icon: FAV('www.orbiter.finance'), tag: 'Bridge', color: '#8a8f98' },
  { name: 'Socket', url: 'https://www.bungee.exchange', icon: FAV('www.bungee.exchange'), tag: 'Bridge', color: '#F55000' },
  { name: 'Stargate', url: 'https://stargate.finance', icon: FAV('stargate.finance'), tag: 'Bridge', color: '#8a8f98' },
  { name: 'Synapse', url: 'https://synapseprotocol.com', icon: FAV('synapseprotocol.com'), tag: 'Bridge', color: '#BF00FF' },

  // 9. Portfolio (Orta-Açık Gri)
  { name: 'DeBank', url: 'https://debank.com', icon: FAV('debank.com'), tag: 'Portfolio', color: '#FF7D00' },
  { name: 'Zapper', url: 'https://zapper.xyz', icon: FAV('zapper.xyz'), tag: 'Portfolio', color: '#784FFE' },

  // 10. Explorer (Açıkça Gri)
  { name: 'Etherscan', url: 'https://etherscan.io', icon: FAV('etherscan.io'), tag: 'Explorer', color: '#21325B' },
  { name: 'Arbiscan', url: 'https://arbiscan.io', icon: FAV('arbiscan.io'), tag: 'Explorer', color: '#28A0F0' },
  { name: 'Basescan', url: 'https://basescan.org', icon: FAV('basescan.org'), tag: 'Explorer', color: '#0052FF' },
  { name: 'Optimism Scan', url: 'https://optimistic.etherscan.io', icon: FAV('optimistic.etherscan.io'), tag: 'Explorer', color: '#FF0420' },

  // 11. Governance & Multisig (Açıkça Gri)
  { name: 'Snapshot', url: 'https://snapshot.org', icon: FAV('snapshot.org'), tag: 'Govern.', color: '#F3B04E' },
  { name: 'Safe', url: 'https://app.safe.global', icon: FAV('app.safe.global'), tag: 'Multisig', color: '#12FF80' },
];
