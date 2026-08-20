/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      '@aptos-labs/ts-sdk',
      '@hashgraph/sdk',
      '@ledgerhq/hw-transport-webusb',
      '@ledgerhq/hw-transport-webhid',
    ],
  },
  webpack: (config, { isServer }) => {
    config.experiments = { ...config.experiments, asyncWebAssembly: true, topLevelAwait: true };
    if (!isServer) {
      config.output = { ...config.output, webassemblyModuleFilename: 'static/wasm/[modulehash].wasm' };
      // Polyfill Node-only modules for browser bundle
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        got: false,
        '@sindresorhus/is': false,
        'node:buffer': false,
        'node:crypto': false,
      };
    }
    return config;
  },
  env: {
    NEXT_PUBLIC_EXTERNAL_LINK: process.env.NEXT_PUBLIC_EXTERNAL_LINK,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_WC_PROJECT_ID: process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              process.env.NODE_ENV === 'development'
                ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'"
                : "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "connect-src 'self' https://api.coingecko.com https://api.blockchair.com https://mempool.space https://api.blockcypher.com https://api.bitcore.io https://litecoinspace.org wss://relay.walletconnect.org wss://relay.walletconnect.com https://relay.walletconnect.org https://relay.walletconnect.com https://pulse.walletconnect.org https://pulse.walletconnect.com https://rpc.walletconnect.org https://rpc.walletconnect.com https://keys.walletconnect.org https://verify.walletconnect.org https://solana-rpc.publicnode.com https://api.mainnet-beta.solana.com https://api.devnet.solana.com wss://xrplcluster.com https://xrplcluster.com https://s1.ripple.com https://s2.ripple.com https://horizon.stellar.org https://fullnode.mainnet.sui.io https://api.mainnet.aptoslabs.com https://nanolooker.com https://api.nanolooker.com https://api.nano.to https://rpc.nano.to https://mainnet.hedera.com https://mirror.hedera.com https://mainnet-public.mirrornode.hedera.com https://mainnet.hashio.io https://mynano.ninja https://app.mynano.ninja https://api.trongrid.io",
              "img-src 'self' https: data: blob:",
              "font-src 'self' https://fonts.gstatic.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Robots-Tag', value: 'index, follow' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(self), bluetooth=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
      // Static assets — long cache for performance (Core Web Vitals)
      {
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default nextConfig;
