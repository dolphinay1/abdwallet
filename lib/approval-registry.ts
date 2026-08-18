// Server-side registry of well-known DEX/bridge spenders and common tokens
// used by the approvals scanner. Shared by /api/approvals and the ApprovalsTab UI.
// No client-supplied URLs or lists — everything is resolved from this registry.

export interface KnownSpender {
  address: string;
  name: string;
}

export interface KnownToken {
  address: string;
  symbol: string;
}

const LIFI_DIAMOND = '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE';
const ONEINCH_V5 = '0x1111111254EEB25477B68fb85Ed929f73A960582';
const PARASWAP_AUGUSTUS = '0xDEF171Fe48CF0115B1d80b88dc8eAB59176FEe57';
const ZEROX_PROXY = '0xDef1C0ded9bec7F1a1670819833240f027b25EfF';
const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';
const UNISWAP_UNIVERSAL = '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD';

const CROSS_CHAIN_SPENDERS: KnownSpender[] = [
  { address: LIFI_DIAMOND, name: 'LiFi Diamond' },
  { address: ONEINCH_V5, name: '1inch v5 Router' },
  { address: PARASWAP_AUGUSTUS, name: 'ParaSwap Augustus' },
  { address: ZEROX_PROXY, name: '0x Exchange Proxy' },
];

export const KNOWN_SPENDERS: Record<number, KnownSpender[]> = {
  1: [
    ...CROSS_CHAIN_SPENDERS,
    { address: UNISWAP_V3_ROUTER, name: 'Uniswap v3 Router' },
    { address: UNISWAP_UNIVERSAL, name: 'Uniswap Universal Router' },
    { address: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', name: 'Uniswap v2 Router' },
  ],
  8453: [
    ...CROSS_CHAIN_SPENDERS,
    { address: '0x2626664c2603336E57B271c5C0b26F421741e481', name: 'Uniswap v3 Router' },
    { address: UNISWAP_UNIVERSAL, name: 'Uniswap Universal Router' },
    { address: '0x09aea4b2242abC8bb4BB78D537A67a245A7bEC64', name: 'Across Bridge' },
  ],
  42161: [
    ...CROSS_CHAIN_SPENDERS,
    { address: UNISWAP_V3_ROUTER, name: 'Uniswap v3 Router' },
    { address: UNISWAP_UNIVERSAL, name: 'Uniswap Universal Router' },
    { address: '0xe35e9842fceaCA96570B734083f4a58e8F7C5f2A', name: 'Across Bridge' },
  ],
  10: [
    ...CROSS_CHAIN_SPENDERS,
    { address: UNISWAP_V3_ROUTER, name: 'Uniswap v3 Router' },
    { address: UNISWAP_UNIVERSAL, name: 'Uniswap Universal Router' },
    { address: '0x6f26Bf09B1C792e3228e5467807a900A503c0281', name: 'Across Bridge' },
  ],
  137: [
    ...CROSS_CHAIN_SPENDERS,
    { address: UNISWAP_V3_ROUTER, name: 'Uniswap v3 Router' },
    { address: UNISWAP_UNIVERSAL, name: 'Uniswap Universal Router' },
    { address: '0x9295ee1d8C5b022Be115A2AD3c30C72E34e7F096', name: 'Across Bridge' },
  ],
  324: [...CROSS_CHAIN_SPENDERS],
  59144: [...CROSS_CHAIN_SPENDERS],
  534352: [...CROSS_CHAIN_SPENDERS],
  81457: [...CROSS_CHAIN_SPENDERS],
};

export const KNOWN_TOKENS: Record<number, KnownToken[]> = {
  1: [
    { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC' },
    { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT' },
    { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', symbol: 'DAI' },
    { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol: 'WETH' },
    { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', symbol: 'WBTC' },
    { address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', symbol: 'LINK' },
    { address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', symbol: 'UNI' },
    { address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', symbol: 'AAVE' },
  ],
  8453: [
    { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC' },
    { address: '0x4200000000000000000000000000000000000006', symbol: 'WETH' },
    { address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', symbol: 'DAI' },
    { address: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22', symbol: 'cbETH' },
    { address: '0x940181a94A35A4569E4529A3CDfB74e38FD98631', symbol: 'AERO' },
  ],
  42161: [
    { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', symbol: 'USDC' },
    { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', symbol: 'USDT' },
    { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', symbol: 'WETH' },
    { address: '0x912CE59144191C1204E64559FE8253a0e49E6548', symbol: 'ARB' },
    { address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', symbol: 'DAI' },
    { address: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4', symbol: 'LINK' },
  ],
  10: [
    { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', symbol: 'USDC' },
    { address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', symbol: 'USDT' },
    { address: '0x4200000000000000000000000000000000000006', symbol: 'WETH' },
    { address: '0x4200000000000000000000000000000000000042', symbol: 'OP' },
    { address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', symbol: 'DAI' },
  ],
  137: [
    { address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', symbol: 'USDC' },
    { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', symbol: 'USDT' },
    { address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', symbol: 'WETH' },
    { address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', symbol: 'WMATIC' },
    { address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', symbol: 'DAI' },
  ],
};

export function getSpenders(chainId: number): KnownSpender[] {
  return KNOWN_SPENDERS[chainId] ?? CROSS_CHAIN_SPENDERS;
}

export function getKnownTokens(chainId: number): KnownToken[] {
  return KNOWN_TOKENS[chainId] ?? [];
}
