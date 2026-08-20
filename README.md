# ABD Wallet

**Free, anonymous, ephemeral wallet for EVM chains. No signup. No KYC. Keys never leave the browser.**

🌐 [abdwallet.com](https://abdwallet.com) · 📄 [Apache 2.0](./LICENSE)

---

## What it is

ABD Wallet is a browser wallet for throwaway addresses. Open the site, get a fresh Ethereum-compatible address, use it, close the tab — the in-memory wallet is gone.

Built for: one-off DeFi, dApp testing, airdrop claims, or any time you do not want to expose a main wallet.

Nothing is written to disk unless you explicitly save a vault.

---

## Features

- **Instant temp wallet** — new EVM address per session, no account
- **Import** — restore a 12- or 24-word BIP-39 seed
- **Multi-chain EVM** — Ethereum, BNB Chain, Polygon, Arbitrum, Optimism, Base, Avalanche, Fantom, and other EVM networks
- **Send & receive** — native coin and ERC-20, with live fee estimates and a dry-run preview
- **Swap** — LiFi quotes via a server-side `/api/swap` proxy
- **WalletConnect v2** — pair with Uniswap, Aave, OpenSea, and other dApps (needs a Reown project ID)
- **Optional Saved Vaults** — keep a wallet encrypted in *this* browser only; delete anytime
- **Optional passphrase vault** — encrypt the seed with a passphrase (PBKDF2 + AES-GCM in IndexedDB)
- **Approvals** — list known ERC-20 allowances from a server-side spender registry
- **Liquid staking** — Lido (stETH) and Rocket Pool (rETH) with live APY
- **Ledger** — sign with a hardware wallet over WebHID / WebUSB
- **QR** — show a receive QR; decode a recipient QR from an image file
- **Browser extension** — unpacked MV3 build in `extension/` (not on the Chrome Web Store yet)

There is no app fee and no ads. Network gas is paid to the chain as usual.

---

## How it works

1. Open [abdwallet.com](https://abdwallet.com) and create or import a wallet.
2. Send, receive, swap, or connect a dApp with WalletConnect.
3. Close the tab — in-memory keys are wiped.
4. Optional: use the save icon on the active wallet in history to store it encrypted in this browser, or set a passphrase vault.

Idle sessions wipe after 5 minutes. A session also ends after 30 minutes.

**Write down the seed if you will need the address again.** There is no account recovery.

---

## Security model (honest)

- Seeds and keys are generated in-browser with [ethers.js](https://ethers.org).
- The server never receives your private key or mnemonic.
- In-memory material is encrypted for the session and cleared on wipe / tab close.
- Saved Vaults use AES-GCM. The key is derived in this browser — it is not a user passphrase. Treat it as “locked to this device/profile,” not as a backup you can move.
- The passphrase vault uses PBKDF2 (600k) + AES-GCM.
- No first-party analytics or accounts.

**What this is not:** public RPCs, explorers, CoinGecko, LiFi, and WalletConnect can still see your IP and addresses. A malicious dApp signature can still drain funds. XSS in the page can still read in-memory keys. This is a temp wallet, not a custody product.

---

## Tech stack

- [Next.js 14](https://nextjs.org) (App Router)
- [ethers.js v6](https://ethers.org)
- [Reown WalletKit](https://reown.com) (WalletConnect v2)
- TypeScript · Tailwind CSS · HeroUI · Framer Motion

---

## Run locally

```bash
git clone https://github.com/dolphinay1/abdwallet.git
cd abdwallet
npm install
