import type { TokenBalance, TxRecord } from '@/lib/tokens';

export type { TokenBalance, TxRecord };

export type Tab = 'balance' | 'transactions' | 'nfts' | 'lightning' | 'approvals' | 'staking';

export interface NonEvmMeta {
  coin: string;
  name: string;
  color: string;
  explorerBase: string;
  symbol: string;
  coingeckoId: string;
  feeUnit?: string;
  logoUrl?: string;
}

export const NON_EVM_META: Record<string, NonEvmMeta> = {
  BTC: {
    coin: 'BTC',
    name: 'Bitcoin',
    color: '#F7931A',
    explorerBase: 'https://blockchair.com/bitcoin/transaction',
    symbol: 'BTC',
    coingeckoId: 'bitcoin',
    feeUnit: 'sat/vByte',
    logoUrl: 'https://icons.llamao.fi/icons/chains/rsz_bitcoin',
  },
  DOGE: {
    coin: 'DOGE',
    name: 'Dogecoin',
    color: '#C2A633',
    explorerBase: 'https://blockchair.com/dogecoin/transaction',
    symbol: 'DOGE',
    coingeckoId: 'dogecoin',
    feeUnit: 'sat/vByte',
    logoUrl: 'https://icons.llamao.fi/icons/chains/rsz_dogecoin',
  },
  BCH: {
    coin: 'BCH',
    name: 'Bitcoin Cash',
    color: '#8DC351',
    explorerBase: 'https://blockchair.com/bitcoin-cash/transaction',
    symbol: 'BCH',
    coingeckoId: 'bitcoin-cash',
    feeUnit: 'sat/vByte',
    logoUrl: 'https://icons.llamao.fi/icons/chains/rsz_bitcoin-cash',
  },
  SOL: {
    coin: 'SOL',
    name: 'Solana',
    color: '#9945FF',
    explorerBase: 'https://solscan.io/tx',
    symbol: 'SOL',
    coingeckoId: 'solana',
    feeUnit: 'lamports',
    logoUrl: 'https://icons.llamao.fi/icons/chains/rsz_solana',
  },
  XRP: {
    coin: 'XRP',
    name: 'XRP',
    color: '#346AA9',
    explorerBase: 'https://xrpscan.com/tx',
    symbol: 'XRP',
    coingeckoId: 'ripple',
    logoUrl: 'https://cryptologos.cc/logos/xrp-xrp-logo.png',
  },
  XLM: {
    coin: 'XLM',
    name: 'Stellar',
    color: '#7D00FF',
    explorerBase: 'https://stellarchain.io/transactions',
    symbol: 'XLM',
    coingeckoId: 'stellar',
    logoUrl: 'https://cryptologos.cc/logos/stellar-xlm-logo.png',
  },
  NANO: {
    coin: 'NANO',
    name: 'Nano',
    color: '#4A90D9',
    explorerBase: 'https://nanolooker.com/block',
    symbol: 'NANO',
    coingeckoId: 'nano',
    logoUrl: 'https://icons.llamao.fi/icons/chains/rsz_nano',
  },
  HBAR: {
    coin: 'HBAR',
    name: 'Hedera',
    color: '#5d8fbc',
    explorerBase: 'https://hashscan.io/mainnet/transaction',
    symbol: 'HBAR',
    coingeckoId: 'hedera-hashgraph',
    logoUrl: 'https://icons.llamao.fi/icons/chains/rsz_hedera',
  },
  SUI: {
    coin: 'SUI',
    name: 'Sui',
    color: '#6FBCF0',
    explorerBase: 'https://suiscan.xyz/mainnet/tx',
    symbol: 'SUI',
    coingeckoId: 'sui',
    logoUrl: 'https://icons.llamao.fi/icons/chains/rsz_sui',
  },
  APTOS: {
    coin: 'APTOS',
    name: 'Aptos',
    color: '#00BFAE',
    explorerBase: 'https://explorer.aptoslabs.com/txn',
    symbol: 'APT',
    coingeckoId: 'aptos',
    logoUrl: 'https://icons.llamao.fi/icons/chains/rsz_aptos',
  },
  LTC: {
    coin: 'LTC',
    name: 'Litecoin',
    color: '#A5A9B1',
    explorerBase: 'https://blockchair.com/litecoin/transaction',
    symbol: 'LTC',
    coingeckoId: 'litecoin',
    feeUnit: 'sat/vByte',
    logoUrl: 'https://cryptologos.cc/logos/litecoin-ltc-logo.png',
  },
  TRON: {
    coin: 'TRON',
    name: 'Tron',
    color: '#EB0029',
    explorerBase: 'https://tronscan.org/#/transaction',
    symbol: 'TRX',
    coingeckoId: 'tron',
    logoUrl: 'https://icons.llamao.fi/icons/chains/rsz_tron',
  },
  USDT: {
    coin: 'USDT',
    name: 'Tether',
    color: '#26A17B',
    explorerBase: 'https://etherscan.io/tx',
    symbol: 'USDT',
    coingeckoId: 'tether',
    logoUrl: 'https://icons.llamao.fi/icons/chains/rsz_tether',
  },
};

export interface ChainTx {
  txid: string;
  amount: number;
  timestamp: number;
}

export type NetworkTagKind = 'GASLESS' | 'EOA' | 'NON-EVM' | 'TESTNET';

/**
 * Network classification chips. Same solid capsule as the dApp tags in the
 * WalletConnect browser (`.neu-pill-dark`), so a chip means the same thing
 * everywhere in the app.
 *
 * The ramp encodes hierarchy: the deeper the capsule, the more it matters.
 * Black = the gasless flagship, navy = standard EOA chains, dark grey = the
 * non-EVM family, grey = testnets (no real money, lowest weight).
 */
export const NETWORK_TAG_STYLES: Record<NetworkTagKind, { bg: string; color: string }> = {
  GASLESS: { bg: 'rgba(20, 25, 34, 0.94)', color: '#ffffff' },
  EOA: { bg: 'rgba(28, 43, 78, 0.92)', color: '#ffffff' },
  'NON-EVM': { bg: 'rgba(51, 65, 85, 0.90)', color: '#ffffff' },
  TESTNET: { bg: 'rgba(100, 116, 139, 0.88)', color: '#ffffff' },
};
