# ABD Wallet — AI Analiz Briefi (Gumloop'a Yüklemek İçin)

> Bu dosya, projenin **tam mevcut durumunu** tek belgede özetler. Gumloop chat'teki
> AI modeline yükleyip şunları sorabilirsiniz:
> - "Projenin eksikleri neler? Hangi alanlar riskli?"
> - "Bu projeye hangi özellikler eklenebilir? Öncelik sırası ver."
> - "Mimari ve güvenlik açısından neler iyileştirilmeli?"
> - "Kullanıcı edinme / monetizasyon fikirleri üret."
>
> Eksiksiz kaynak kod için ayrıca `git ls-files` çıktısı ve `package.json` ekte verilmiştir.

---

## 1. Proje Kimliği

| Alan | Değer |
|------|-------|
| Ad | **ABD Wallet** (abd-wallet) |
| Slogan | "Free anonymous temp wallet for all EVM chains. No signup, no KYC, no tracking." |
| Site | https://abdwallet.app (canlı, production) |
| Lisans | Apache 2.0 |
| Tip | Tarayıcı tabanlı geçici (ephemeral) EVM cüzdanı + Chrome MV3 uzantısı |
| Stack | Next.js 14 (App Router) · TypeScript · Tailwind CSS · HeroUI · Framer Motion |
| Test | Vitest (unit) · Playwright (E2E) · GitHub Actions CI |

**Tek cümle:** Kullanıcı siteye girer, anında anonim bir EVM adresi alır, kullanır,
sekme kapanınca her şey silinir — kayıt yok, e-posta yok, KYC yok, takip yok.

---

## 2. Teknoloji Yığını (package.json özeti)

**Çekirdek:**
- `next@14.2.3` (App Router, API route'ları server-side)
- `ethers@6.12` — cüzdan üretimi, imzalama, RPC
- `@heroui/react@2.8.10` + `@heroui/theme@2.4.5` — UI kütüphanesi (light neumorphic tema)
- `tailwindcss@3.4.3` · `framer-motion@11`
- `crypto-js@4.2` — AES-256 (ephemeral vault şifreleme)
- `bip39` / `bip32` / `bitcoinjs-lib` / `tiny-secp256k1` — BIP-39 mnemonic + non-EVM adres üretimi

**Multi-chain / Non-EVM SDK'lar:**
- `@solana/web3.js` (Solana) · `xrpl` (XRP) · `@stellar/stellar-sdk` (Stellar/XLM)
- `tronweb` (Tron) · `@aptos-labs/ts-sdk` (Aptos) · `@mysten/sui` (Sui)
- `@hashgraph/sdk` (Hedera) · `nanocurrency-web` (Nano)
- `@ledgerhq/hw-app-eth` + `hw-transport-webhid/webusb` (Ledger donanım cüzdanı)

**WalletConnect / Diğer:**
- `@reown/walletkit@1.5.6` + `@walletconnect/core` — dApp bağlantısı (v2)
- `@supabase/supabase-js` — yalnız isteğe bağlı asset storage script'inde
- `jsqr` — QR tarayıcı · `qrcode.react` · `lucide-react`

---

## 3. Mevcut Özellikler (Feature Inventory)

### 3.1 Cüzdan Çekirdeği
- Anında anonim EVM cüzdan üretimi (`createABDWallet`) — oturum açıkken bellekte
- BIP-39 mnemonic üretimi/import + `.txt` yedek indirme (İngilizce UI)
- AES-256 in-memory vault, 60 sn'de bir anahtar rotasyonu, bellek shard'lama
- Integrity watchers + breach detection (`lib/breach.ts`) — tahrifat algılamada vault wipe
- **Ephemeral vaat (2026-08-18'de gerçek yapıldı):** create/import'ta otomatik persist YOK;
  kalıcılık yalnız opt-in "Saved Vaults" (AES-GCM, oturum türevli anahtar, localStorage)
- Wipe akışı: tüm `__gw_*` localStorage anahtarlarını temizler
- Wallet History (son 5 kayıt) + Save ikonu + kayıtlı cüzdana geri dönme

### 3.2 Multi-chain
- **EVM:** Ethereum, BNB, Polygon, Arbitrum, Optimism, Base, Avalanche, Fantom (+ özel zincir ekleme)
- **Non-EVM:** Bitcoin (BTC), Litecoin (LTC), Dogecoin (DOGE), Bitcoin Cash (BCH),
  Solana (SOL), XRP, Stellar (XLM), Tron (TRX), Aptos, Sui, Hedera (HBAR), Nano (XNO)
- Custom chain / custom token / custom API (client-side RPC) ekleme modalları
- RPC registry (`lib/rpc-registry.ts`) — server-side `resolveRpcUrl(chainId)` SSRF-güvenli
- CoinGecko fiyatlar + Coingecko/Blockchair/Mempool vb. fiyat ve bakiye kaynakları

### 3.3 Gönderme & DeFi
- ETH + ERC-20 gönderimi, canlı gas tahmini (`/api/gas`), gaz fiyat istatistikleri
- **Swap (LiFi):** `/api/swap` server proxy → `li.quest/v1` tokens + quote (10 dk cache)
- **Simülasyon:** `/api/simulate` → `eth_call` dry-run + `eth_estimateGas` +
  ERC-20 Transfer log çıkarımı → "Simulated Balance Changes" önizleme
- **Approvals yöneticisi:** `/api/approvals` GET + server-side KNOWN_SPENDERS registry +
  bilinen token listesi → "Scanned N common DEX/bridge spenders", unlimited tespiti
- **Staking (bilgi amaçlı):** Rocket Pool (canlı APR + on-chain rETH/ETH `getExchangeRate()`),
  Lido (canlı stETH APR) — `/api/staking` route'u + StakingPanel
- **NFT görüntüleme:** Alchemy ile koleksiyon listesi (`/api/nfts`)
- WalletConnect v2 (Reown WalletKit) — dApp'e bağlanma, dApp tarayıcı, imzalama
- QR ile alıcı adresi tarama / gösterme · Adres defteri (Address Book)

### 3.4 Tarayıcı Uzantısı (Chrome MV3)
- `extension/background.js` — service worker; attach/unlock/sign/send/wipe mesaj protokolü
- Şifreli mnemonic session (AES-GCM, `_sessionKey` modül değişkeni; SW ölürse "Locked")
- `content_inject_loader.js` → `inject.js` → tüm sitelere `window.ethereum` (EIP-1193) enjeksiyonu
- Native popup (attach/unlock/send/receive), dApp imzalama akışları
- `externally_connectable`: sadece abdwallet.app

### 3.5 Diğer
- Güvenlik başlıkları: CSP, HSTS, X-Frame-Options DENY, Permissions-Policy, COOP/CORP,
  no-cache; custom `X-ABD-Status: Sovereign` header
- `NEXT_PUBLIC_EXTERNAL_LINK` panic redirect; `/api/kill` karşılığı
- Panik / kill-switch altyapısı; fiyat panelleri; Lightning (LN) sekmesi
- Gizlilik: analitik yok, çerez yok, fingerprint yok

---

## 4. Mimari / Dosya Yapısı

```
abdwallet/
├─ src/app/
│  ├─ layout.tsx / page.tsx / globals.css     # Kök layout + AuthScreen giriş
│  └─ api/                                    # 12 server-side route
│     ├─ approvals/route.ts  (GET, registry)  ├─ gas/route.ts
│     ├─ kill/route.ts       (panic)          ├─ nfts/route.ts  (Alchemy)
│     ├─ prices/route.ts     (CoinGecko, cache)├─ proxy/route.ts (SSRF-güvenli RPC proxy)
│     ├─ scan/route.ts       (breach)         ├─ simulate/route.ts (eth_call dry-run)
│     ├─ staking/route.ts    (RocketPool+Lido)├─ swap/route.ts  (LiFi proxy, cache)
│     ├─ tokens/route.ts     (ERC-20 listesi) └─ txhistory/route.ts (Etherscan ailesi)
├─ components/                                # UI
│  ├─ AuthScreen · WalletDashboard · TransferModal · SwapModal
│  ├─ WalletConnectModal · MnemonicGeneratorModal · LedgerConnectModal
│  ├─ StakingPanel · WarningBanner · ErrorBoundary · Custom{Chain,Token,API}Modal
│  └─ dashboard/  (ActionGrid, Header, Modals, tabs/, ui/)
│     ├─ tabs/  Balance · Transactions · NFTs · Approvals · Lightning · WalletHistory
│     ├─ modals/ Send (useSendForm + Amount/Recipient/NetworkTokenPicker/Preview)
│     │         AddressBook · AllNetworks · NonEvmSend · Passphrase · QR · SavedVaults
│     └─ ui/  ChainIcon · CoinIcon · NetworkOfflineBanner
├─ context/WalletContext.tsx                  # Merkezi cüzdan state + vault + imzalama
├─ hooks/                                     # useDashboardState · useWalletBalances
│  └─ useNonEvmWallet · useExtensionBridge · useNetworkStatus · usePageVisibility
├─ lib/                                       # İş mantığı (crypto, chain'ler, SDK'lar)
│  ├─ crypto.ts / signer.ts / memory-vault.ts / persistent-vault.ts / breach.ts
│  ├─ session-lock.ts / entropy.ts / fingerprint.ts / history.ts / wallet-history.ts
│  ├─ chains.ts / rpc-registry.ts / provider.ts / gas.ts / tokens.ts / prices.ts
│  ├─ btc / ltc / doge / bch / sol / xrp / xlm / tron / aptos / sui / hedera / nano
│  ├─ staking.ts / transaction.ts / walletconnect.ts / approval-registry.ts / nfts.ts
│  └─ rate-limit.ts / custom-{chains,tokens,apis}.ts / address-book.ts / text.ts
├─ extension/                                 # Chrome MV3 (kendi bağımsız kopya ethers ile)
│  ├─ manifest.json · background.js · popup.html/js · inject.js
│  ├─ content_abdwallet.js · content_inject_loader.js · HOW_TO_INSTALL.txt
├─ tests/                                     # Playwright E2E (9 spec)
├─ __tests__/                                 # Vitest unit (7 dosya / 22 test)
├─ .github/workflows/ci.yml                   # CI: lint + tsc + vitest + build + E2E
├─ public/llms.txt · abd-logo-*.png · og-image.png
└─ scripts/  (smoke-api, probe-rpc, upload-assets, make-env-example)
```

---

## 5. Test & Kalite Durumu (2026-08-19 itibarıyla)

- **Unit (Vitest):** 7 dosya / **22 test geçiyor** (crypto, signer, entropy, memory-vault,
  security-hardening, faz2-features, faz4-performance)
- **E2E (Playwright):** 9 spec (wallet-lifecycle, persist-and-access, ephemeral,
  security, advanced-mode, ui-smoke, ledger-and-security, comprehensive, saved-vaults)
- **CI (GitHub Actions):** `quality` job (lint + tsc + vitest + build) ve
  `e2e` job (build + playwright) kurulu
- `npm run lint` · `npx tsc --noEmit` · `npm run build` → temiz

---

## 6. Son Çalışmalar (git log, son 10 commit)

| Tarih | Commit | Ne yapıldı |
|-------|--------|-----------|
| 08-19 | fd00b61 | Dil birliği İngilizce; Aethilm kalıntıları temizlendi; dashboard etiketi "Selected Chain Balance" |
| 08-18 | 199d0de | Staking: Rocket Pool canlı APR + on-chain rETH kuru (hardcoded 3.1/1.1 kaldırıldı) |
| 08-18 | b93c106 | 18 ölü kod dosyası silindi; WalletContext ölü export'lar prune edildi; Aethilm→ABD |
| 08-18 | dbaeb58 | Uzantı: şifreli mnemonic session (imzalama düzeldi), Celo chainId 42220, native popup geri, origin-güvenli postMessage |
| 08-18 | 3686c8e | Ephemeral vaat gerçek oldu: otomatik persist kaldırıldı, wipe blob temizler, Save opt-in |
| 08-18 | 05d21fa | `/api/swap` (LiFi proxy) + `/api/simulate` + approvals GET + server registry |
| 08-18 | fabcb95 | SSRF yüzeyi kapatıldı: API route'lar client URL kabul etmiyor |
| 08-18 | 9982b59 | Repo hijyeni: .gitignore, favicon migrasyonu, extension iframe compat |
| 08-17 | ff8e8a1 | Yeni şeffaf logo + tipografi |
| 08-12 | a0c1227 | HeroUI yeniden tasarımı, WalletConnect dApp tarayıcı, RPC/API düzeltmeleri |

**Ayrıca:** `PLAN-neumorphic-redesign.md` — tüm UI light neumorphic + monokrom temaya
geçirildi (tamamlandı). `abdwallet-stabilization.md` — 9 görevlik stabilizasyon planı
uygulandı. `wallet-fix-plan.md` — build/lint/test stabilizasyonu tamamlandı.

---

## 7. Bilinen Eksikler, Riskler ve Geliştirme Alanları (Analiz İçin Başlangıç Noktası)

### 7.1 Güvenlik / Mimari Riskler
1. **Kendi kripto uygulamak zorunda kalınmış** — crypto-js AES-256, şifreli vault,
   shard'lama, breach detection özel olarak yazılmış. WebCrypto'ya geçiş mi? Audit mi?
2. **Non-EVM zincirler "gösteri" mi yoksa gerçek gönderim mi?** — SOL/XRP/TRX vb.
   bakiye görüntüleme var; hangileri gerçek imzalama/gönderim destekliyor? (Örn.
   `NonEvmSendModal` hangi zincirler için aktif?)
3. **Ledger entegrasyonu** (hw-app-eth) — hangi akışlar gerçekten kullanılabilir durumda?
4. **Extension güvenlik modeli** — `_sessionKey` SW ölünce kaybolur; dApp imzaları için
   popup onayı şart mı? EIP-2255 / permission sistemi var mı?
5. **Rate limit stratejisi** — IP bazlı in-memory; Vercel serverless'ta doğru mu çalışır?

### 7.2 Ürün / Kullanıcı Deneyimi
6. **Farklılaşma net mi?** "Ephemeral anonymous wallet" boşluğunda rakipler
   (burnerwallet, privacy tx relayer'lar vb.) — gerçek kullanıcı ihtiyacına yanıt veriyor mu?
7. **Mobil deneyim** — Web App manzaralı mı, PWA / push bildirim yok; "mobile friendly"
   iddiası hangi özelliklerle doğrulanabilir?
8. **Onboarding** — 12 kelime + AuthScreen akışı; anonim/ephemeral kullanıcıya kayıt
   olmadan nasıl değer gösterilir?
9. **Localization** — yalnız İngilizce. TR/ES/FR vb. eklemek büyüme getirir mi?
10. **A11y** — klavye navigasyonu, ARIA, renk kontrastı (light neumorphism düşük kontrast riski taşır)

### 7.3 Monetizasyon / Sürdürülebilirlik
11. Gelir modeli yok (fees: %0.7/%0.5 env'de tanımlı ama aktif mi?).
12. RPC sağlayıcı bağımlılığı: public RPC'ler (llamarpc vb.) + LiFi (2 saatte 75 istek
    limitsiz) — Vercel serverless IP paylaşımı riski.
13. Kullanıcı kalıcılığı: ephemeral ürün nasıl geri dönüş yaratır? (Saved Vaults opt-in)

### 7.4 Teknik Borç / Bakım
14. `lib/` içinde zincir başına ayrı dosya (`btc.ts`, `ltc.ts`, `doge.ts`, `bch.ts`,
    `sol.ts`, ...) — çoğu benzer; DRY ile ortak bir `UtxoChain`/`AccountChain` soyutlaması?
15. API route'larda benzer cache deseni tekrar ediyor (prices/swap/staking).
16. E2E spec'lerde gerçek ağ bağımlılıkları (fiyatlar, RPC) — CI'da flaky riski.

---

## 8. Potansiyel Yol Haritası Fikirleri (Düşünce Tetikleyicileri)

- **PWA + push** ile "temp wallet" deneyimini masaüstüne taşıma
- **Bulut-senkronlu değil, cihaz-güvenli vault** — Saved Vaults için güçlü şifre yöneticisi UX
- **Zincir başına "instant claim/faucet"** listesi (ephemeral cüzdan kullanım örneği)
- **Batch / toplu gönderim**, **swap zincirler arası (LiFi route seçici)**, **token yönetimi**
- **dApp allowlist / phishing koruması** (WalletConnect + imza önizleme zaten var, genişletilebilir)
- **P2P veya sosyal gönderim** (link ile ödeme, "claim here" sayfası) — ephemeral'e çok uygun
- **Analytics yok (gizlilik vaadi)** — ancak anonim, cookieless, aggregate metrikler ile ürün kararları
- **Per-chain explorer bağlantıları**, **tx detayı modalı**, **notification'lar**
- **Multi-hesap (derive index)**, **named accounts**, **kategori etiketleri**

---

## 9. Gumloop AI'a Önerilen Soru Kalıpları

1. "Bu projeyi 3 ay sonra ölçeklemek için en kritik 5 teknik borç nedir?"
2. "Ephemeral anonim cüzdan pazarında ABD Wallet'ı farklılaştıracak 5 özellik öner."
3. "Güvenlik açısından kod tabanında en savunmasız 3 alanı tespit et ve öneri ver."
4. "Hangi zincir entegrasyonları gerçek gönderim için tamamlanmalı, hangileri kaldırılmalı?"
5. "Gizlilik vaadini bozmadan ölçülebilir büyüme metrikleri nasıl kurulur?"
6. "Bu mimaride hangi parçalar aşırı mühendislik, hangileri eksik?"
7. "Public RPC/LiFi bağımlılığını azaltacak mimari değişiklikler öner."
8. "Kullanıcıya değer gösteren 30 saniyelik onboarding akışı tasarla (ephemeral cüzdan)."

---

## 10. Ek Veriler

- **Tam dosya listesi:** `git ls-files` çıktısı aşağıdadır.
- **Bağımlılıkların tam listesi:** `package.json` (bölüm 2'de özet).
- **Detaylı mimari belgeler:** repo kökünde `abdwallet-stabilization.md`,
  `PLAN-neumorphic-redesign.md`, `wallet-fix-plan.md` ve `.qoder/repowiki/` altında.