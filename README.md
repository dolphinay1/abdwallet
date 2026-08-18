# ABD Wallet

**Free anonymous temp wallet for all EVM chains. No signup, no KYC, no tracking.**

🌐 [abdwallet.app](https://abdwallet.app) · 📄 [Apache 2.0](./LICENSE)

---

## What is ABD Wallet?

ABD Wallet is a browser-based ephemeral crypto wallet. Open the site, get an instant anonymous Ethereum address, use it, close the tab — it's gone. No account, no email, no server ever sees your private key.

Designed for: throwaway addresses, anonymous DeFi interactions, dApp testing, airdrop claiming, or anytime you don't want to expose your main wallet.

---

## Features

- **Instant temp wallet** — generates a fresh EVM address on every session, no signup
- **100% anonymous** — no KYC, no email, no personal data, no tracking
- **AES-256 in-memory encryption** — private keys never leave your browser
- **Auto key rotation** — vault re-encrypts every 60 seconds
- **Multi-chain** — Ethereum, BNB Chain, Polygon, Arbitrum, Optimism, Base, Avalanche, Fantom and all EVM networks
- **WalletConnect v2** — connect to any dApp (Uniswap, Aave, OpenSea, etc.)
- **Send & receive** — ETH and all ERC-20 tokens with live fee estimation
- **Optional Saved Vaults** — mark a wallet as saved to keep it encrypted (AES-GCM, session-derived key) in this browser; delete anytime
- **QR code scanner** — scan recipient addresses with your camera
- **Mobile friendly** — works on iOS Safari and Android Chrome, no app needed
- **Free** — no fees, no ads, no subscription

---

## How It Works

1. Open [abdwallet.app](https://abdwallet.app) — wallet is generated instantly
2. Use it to receive or send crypto, connect to dApps via WalletConnect
3. Close the tab — everything is wiped from memory (unless you explicitly saved the wallet to Saved Vaults)
4. **Optional:** click the save icon on a wallet in Wallet History → it's stored encrypted in this browser only. Switch back to it anytime from history

---

## Security Model

- Private keys generated entirely in-browser via [ethers.js](https://ethers.org)
- Encrypted with AES-256 (CryptoJS) using an ephemeral session key
- Session key rotates every 60 seconds — vault re-encrypted on each rotation
- Memory vault uses scattered shards to resist heap inspection
- No analytics, no cookies, no fingerprinting
- Integrity watchers wipe the vault on tampering detection
- In-memory key material is cleared on tab close; nothing is written to disk unless you save a vault

---

## Tech Stack

- [Next.js 14](https://nextjs.org) (App Router)
- [ethers.js v6](https://ethers.org)
- [Reown WalletKit](https://reown.com) (WalletConnect v2)
- [CryptoJS](https://github.com/brix/crypto-js) — AES-256 encryption
- [jsQR](https://github.com/cozmo/jsQR) — QR code scanning fallback
- TypeScript · Tailwind CSS · Framer Motion

---

## Running Locally

```bash
git clone https://github.com/dolphinay1/abdwallet.git
cd abdwallet
npm install
```

Create a `.env.local` file:

```env
NEXT_PUBLIC_WC_PROJECT_ID=your_walletconnect_project_id
NEXT_PUBLIC_EXTERNAL_LINK=https://abdwallet.app
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

### Upload placeholder assets to Supabase (optional)

If you want to upload the example `logo`, `favicon`, and `banner` to your Supabase storage, set these environment variables locally and run the script:

```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"
node ./scripts/upload-assets.mjs
```

On Windows (PowerShell):

```powershell
$env:SUPABASE_URL = "https://your-project.supabase.co"
$env:SUPABASE_ANON_KEY = "your-anon-key"
node .\scripts\upload-assets.mjs
```


## Contributing

Pull requests are welcome. For major changes, open an issue first.

1. Fork the repo
2. Create a branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: your feature'`
4. Push and open a PR

---

## License

[Apache 2.0](./LICENSE) — free to use, modify, and distribute. Patent protection included.
