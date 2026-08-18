# ABD Wallet — Stabilizasyon ve Düzeltme Planı

> **Proje:** `C:\Users\X\.gemini\antigravity\scratch\abdwallet` — Next.js 14 (App Router) + TypeScript + Tailwind + HeroUI, tarayıcı tabanlı geçici (ephemeral) EVM cüzdanı.
> **Proje tipi:** WEB (Next.js full-stack; API route'lar sunucu tarafı).
> **Kapsam dışı:** UI kimlik yenilemesi (renk/tema/typography değişikliği YOK).
> **Plan tarihi:** 2026-08-18 · **HEAD:** `ff8e8a1 feat: apply new transparent logo and typography refinements`
> **Yedek:** Görev öncesi `.rollback/` tam kopyası alındı (robocopy /MIR).

---

## Özet Tablo

| # | Görev | Öncelik | Bağımlılık | Risk |
|---|-------|---------|-----------|------|
| 1 | Repo hijyeni (.gitignore, `imported`, favicon, commit) | P0 | — | Düşük |
| 3 | SSRF kapatma (txhistory/tokens/approvals) | P0 | 1 | Düşük-Orta |
| 2 | Eksik API'ler: `/api/swap` + `/api/simulate` + approvals uyumu | P0 | 1 | Orta |
| 4 | Ephemeral vaadi düzeltmesi | P0 | 1 | **Yüksek** |
| 5 | Extension düzeltmeleri | P1 | 1 | Orta |
| 6 | Ölü kod temizliği | P1 | 2, 4 | Orta |
| 7 | Staking hardcoded değerler | P1 | 3 | Düşük |
| 8 | Dil/marka karmaşası | P1 | 4, 6 | Düşük |
| 9 | Playwright yenileme + GitHub Actions CI | P2 | 1-8 | Orta |

**Uygulama sırası:** `1 → 3 → 2 → 4 → 5 → 6 → 7 → 8 → 9` (her görev sonunda commit).

---

## Görevler Arası Bağımlılık Grafiği

```
1 (repo hijyeni + temiz baseline commit)
├── 3 (SSRF) ──────────────┐
│                          ├── 6 (ölü kod; 2'nin yeni dosyalarına dokunmaz,
│                          │      4'ün sildiği fonksiyonları bekler)
├── 2 (swap/simulate/      │
│    approvals uyumu) ─────┤
├── 4 (ephemeral) ─────────┤── 8 (dil/marka; 4'ün sildiği toggle'ları ve
│                          │      6'nın sildiği AETHILM sabitlerini bekler)
├── 5 (extension)          │
│                          └── 9 (test + CI; tüm davranışlar sabitlenince)
├── 7 (staking; 3'ün registry desenini yeniden kullanır)
```

**Neden bu sıra?**
- **3, 2'den önce:** 2. görev `/api/approvals`'u yeniden yazarken 3. görevin "client'tan URL kabul etme" yasağını aynı anda uygular; iki kez dokunmamak için önce ilke (3), sonra yeniden yazım (2).
- **4, 6'dan önce:** 6. görev WalletContext'ten `enableSessionLock`, `markSessionRestored`, `getMnemonic` vb. silecek; 4. görev bu fonksiyonların akıbetine karar verir (kaldır/ yeniden adlandır). Karar önce verilmeli.
- **8, 4 ve 6'dan sonra:** `isSessionLocked` durumu ve `AETHILM_CONSTANTS` 4/6'da değişir; 8 bunların üzerine inşa eder.
- **9 en son:** Testler sabit davranışa yazılır; davranış değişirken test yazmak israf.

---

## GÖREV 1 — Repo Hijyeni ve Temiz Baseline

### (a) Değişecek Dosyalar
| Dosya | İşlem |
|-------|-------|
| `.gitignore` | Son satır onarımı (UTF-16LE kalıntısı) |
| `imported` | `git rm --cached` (index'ten çıkar, diskte kalır) + `.gitignore`'a ekle |
| `public/favicon.ico` | Silinme commit'e eklenir (`git add -A public/`) |
| `src/app/icon.png` | `git add` (App Router otomatik favicon) |
| `extension/popup_wrapper.js` | `git add` (yeni dosya, popup.html bunu yüklüyor) |
| Değişik 6 dosya (MnemonicGeneratorModal, DashboardActionGrid, WalletHistorySection, WalletContext, popup.html, useExtensionBridge) | Mevcut working tree değişiklikleri commit'e dahil |

### (b) Değişiklikler (madde madde)
1. **`.gitignore` onarımı:** Dosyanın sonundaki bozuk `. e n v` UTF-16LE kalıntısı (hex `2E 00 65 00 6E 00 76 00 0D 00 0A 00`) silinir; yerine ASCII olarak `.env` satırı eklenir. Nihai son blok:
   ```gitignore
   # IDE
   .qoder/
   .claude/
   .agents.md
   .env

   # local analysis notes
   imported
   ```
   > Not: `.env*.local` zaten gitignore'da; `.env` (uzantısız) ayrıca eklenir çünkü bozuk satırın niyeti oydu.
2. **`imported` dosyası:** `git rm --cached imported` → dosya diskte kalır (analiz notu), takipten çıkar. `.gitignore`'a `imported` satırı eklenir.
3. **Favicon geçişi:** `public/favicon.ico` silinmesi (`D` durumu) ve `src/app/icon.png` (untracked) birlikte stage edilir. Next.js 14 App Router `src/app/icon.png`'yi otomatik favicon olarak sunar — ek kod gerekmez.
4. **Commit:** Tek commit: `chore: repo hygiene — fix .gitignore encoding, untrack imported, complete favicon migration`.

### (c) Doğrulama
```powershell
# 1. .gitignore artık UTF-8/ASCII okunabilir
Get-Content .gitignore -Tail 5
# Beklenen: ".env" ve "imported" satırları; garip karakter yok

# 2. imported takipten çıktı
git ls-files imported            # boş çıktı
git check-ignore -v imported     # .gitignore:NN:imported  imported

# 3. favicon
git status --porcelain           # public/favicon.ico D, src/app/icon.png A
npm run dev                      # http://localhost:3000/favicon.ico → 200 (icon.png sunulur)

# 4. working tree temiz
git status --porcelain           # boş (yalnızca .env.local, .rollback/ vb. ignored)
```

### (d) Bağımlılık / (e) Risk
- Bağımlılık: yok — **ilk çalıştırılacak görev**.
- Risk: **Düşük.** Tek risk: `.gitignore`'ı elle düzenlerken dosyayı tekrar UTF-16 ile kaydetmemek. Dosya Write/Edit aracıyla UTF-8 yazılmalı.

---

## GÖREV 3 — SSRF Kapatma (P0 Güvenlik)

### Mevcut Durum (kanıt)
- `src/app/api/txhistory/route.ts:50` → `const explorerUrl = apiUrl || ...` — client'tan gelen `apiUrl` sunucuda fetch ediliyor.
- `src/app/api/tokens/route.ts:44` → `const rpcUrl = explicitRpc || ...` — client'tan `rpcUrl` kabul ediliyor.
- `src/app/api/approvals/route.ts:24` → `rpcUrl` zorunlu body parametresi.
- **İyi örnek zaten var:** `src/app/api/gas/route.ts` ve `src/app/api/proxy/route.ts` yalnız `resolveRpcUrl(chainId)` kullanıyor. Aynı desene geçilecek.
- Mevcut client kodu (`lib/tokens.ts`, `lib/approvals.ts`, `useSendForm.ts`) **zaten** URL göndermiyor; yalnız `{address, chainId}` gönderiyor → client tarafı kırılmaz.

### (a) Değişecek Dosyalar
| Dosya | İşlem |
|-------|-------|
| `src/app/api/txhistory/route.ts` | `apiUrl`, `apiKey` body parametreleri kaldırılır |
| `src/app/api/tokens/route.ts` | `rpcUrl` body parametresi kaldırılır |
| `src/app/api/approvals/route.ts` | `rpcUrl` kaldırılır; `chainId` ile `resolveRpcUrl` kullanılır (Görev 2'de tam yeniden yazılacak — burada yalnız SSRF yüzeyi kapatılır) |
| `.env.example` | `ETHERSCAN_API_KEY` açıklaması güncellenir (tek sunucu-taraflı anahtar) |

### (b) Değişiklikler
**txhistory/route.ts:**
1. `const { address, chainId, apiUrl, apiKey } = body;` → `const { address, chainId } = body;`
2. `chainId` zorunlu yapılır: `if (!address || chainId == null) return 400`.
3. `const explorerUrl = EXPLORER_API[Number(chainId)];` (client `apiUrl` yok; zincir yoksa `[]` dönmeye devam).
4. `const key = process.env.ETHERSCAN_API_KEY || '';` (client `apiKey` yok).
5. JSDoc güncellenir: "Accepts { address, chainId } only — explorer resolved server-side (SSRF-safe)".

**tokens/route.ts:**
1. `const { address, chainId, rpcUrl: explicitRpc, tokens = [] } = body;` → `const { address, chainId, tokens = [] } = body;`
2. `const rpcUrl = await resolveRpcUrl(Number(chainId));` — `explicitRpc` tamamen silinir.
3. `chainId` zorunlu: `if (!address || chainId == null) return 400`.
4. `tokens[]` (özel ERC-20 listesi) korunur — adres listesi SSRF değildir (RPC sabit).

**approvals/route.ts (geçici adım — tam düzeltme Görev 2'de):**
1. `rpcUrl` zorunluluğu kaldırılır: `const { address, chainId, rpcUrl, tokenList = [] } = body;` → `chainId` varsa `resolveRpcUrl(chainId)`, yoksa ve `rpcUrl` de yoksa 400.
   > Bu geçici adımın tek amacı: SSRF yüzeyini Görev 2 beklerken kapatmak. Görev 2 route'u GET'e çevirip tamamen yeniden yazar.

### (c) Doğrulama
```powershell
npm run lint
npm run build
npm run dev

# SSRF denemesi — 400/403 bekleniyor, asla 200 ile iç ağa istek gitmemeli:
curl.exe -X POST http://localhost:3000/api/txhistory -H "Content-Type: application/json" `
  -d '{\"address\":\"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045\",\"chainId\":1,\"apiUrl\":\"http://169.254.169.254/latest/meta-data/\"}'
# Beklenen: apiUrl yok sayılır, normal etherscan yanıtı (veya zincir yoksa [])

curl.exe -X POST http://localhost:3000/api/tokens -H "Content-Type: application/json" `
  -d '{\"address\":\"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045\",\"chainId\":1,\"rpcUrl\":\"http://localhost:6379\"}'
# Beklenen: rpcUrl yok sayılır; registry RPC'siyle normal token listesi

# Regresyon: normal istekler çalışmaya devam
curl.exe -X POST http://localhost:3000/api/tokens -H "Content-Type: application/json" `
  -d '{\"address\":\"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045\",\"chainId\":1}'

# Kod taraması: API route'larda client kaynaklı URL kalmadı
rg "apiUrl|explicitRpc|body\.rpcUrl" src/app/api
# Beklenen: yalnız approvals'ta geçici uyum satırı (Görev 2'de o da silinecek)
```

### (d) Bağımlılık / (e) Risk
- Bağımlılık: Görev 1 (temiz baseline).
- Risk: **Düşük-Orta.** `custom-tokens.ts`/`CustomChainModal.tsx` client'ta kendi RPC'sini kullanır (`lib/custom-tokens.ts:51`) — bu **client-side** akıştır, API route'larından bağımsızdır, dokunulmaz. Risk: üçüncü parti bir entegrasyonun legacy `apiUrl`'e güvenmesi — grep ile client'ta `apiUrl`/`rpcUrl` POST body kullanımı doğrulandı: **yok**.

---

## GÖREV 2 — Eksik API Route'ları: `/api/swap`, `/api/simulate`, approvals uyumu

### Araştırma Bulguları (canlı test edildi)

**LiFi API (`https://li.quest/v1`):**
- API anahtarı **gerekmez**; anahtar yalnızca daha yüksek limit içindir. Anahtar varsa `x-lifi-api-key` header'ı ile gönderilir (asla client'a inmez).
- **Rate limit (anahtarsız, IP başına):** `/quote` ve `/advanced/routes` → **2 saatte 75 istek**; diğer public endpoint'ler (`/tokens`, `/chains`) → **dakikada 100**. 429 → hata kodu 1005.
- `GET /tokens?chains=1` → `{ "1": [ {chainId, address, symbol, name, decimals, priceUSD, logoURI, ...} ] }` — canlı test: chain 1 için ~5365 token. Native token adresi `0x0000000000000000000000000000000000000000` (SwapModal'ın beklediği formatla birebir uyumlu).
- `GET /quote?fromChain=1&toChain=137&fromToken=0x0...&toToken=0x2791...&fromAmount=1e17&fromAddress=0x...&slippage=0.005` → canlı test: `estimate.toAmount`, `estimate.approvalAddress` (LiFi Diamond: `0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE`), `estimate.gasCosts[].amountUSD`, `estimate.executionDuration`, `transactionRequest {value,to,data,from,chainId,gasPrice,gasLimit}` döndürüyor — SwapModal'ın `LifiQuote` interface'iyle **birebir uyumlu**.
- **Sonuç:** SwapModal.tsx'te hiçbir değişiklik gerekmez; yalnız sunucu proxy'si yazılır.

**Simülasyon (Tenderly'siz):**
- `eth_call` + `eth_estimateGas` tüm public RPC'lerde desteklenir (canlı test: publicnode).
- ERC-20 Transfer event topic: `keccak256("Transfer(address,address,uint256)")` = `0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef`.
- Strateji: tx'i `eth_call` ile dry-run et → revert yoksa `eth_estimateGas` → bilinen contract (ERC-20) ise Transfer loglarını `eth_getLogs` ile çek (from=tx.from, o blok) → `changes[]` dizisine çevir. Balance diff yaklaşımı (öncesi/sonrası balanceOf) ek RPC turu gerektirir ve public RPC'de yavaştır; log-tabanlı yaklaşım yeterlidir.

**Rocket Pool (Görev 7 için ön-not):** `https://api.rocketpool.net/mainnet/reth/apr` canlı → `{"yearlyAPR":"2.168..."}`. rETH/ETH kuru on-chain `getExchangeRate()` selector `0xe6aa216c` (doğrulandı: publicnode → 1.1697).

### (a) Değişecek Dosyalar
| Dosya | İşlem |
|-------|-------|
| `src/app/api/swap/route.ts` | **YENİ** — LiFi sunucu proxy'si (GET) |
| `src/app/api/simulate/route.ts` | **YENİ** — eth_call tabanlı simülasyon (POST) |
| `src/app/api/approvals/route.ts` | **YENİDEN YAZ** — GET + server-side registry + bilinen spender listesi |
| `lib/approvals.ts` | Response mapping düzeltmesi (`{approvals}` wrapper + alan adları) |
| `.env.example` | `LIFI_API_KEY=""` eklenir |
| `next.config.mjs` | CSP `connect-src`'e `https://li.quest` eklenir (yalnızca ileride client'tan doğrudan erişim gerekirse; proxy kullanıldığı sürece zorunlu değil — yine de savunma amaçlı eklenir) |

### (b) Değişiklikler

#### 2.1 `src/app/api/swap/route.ts` (yeni)
```
GET /api/swap?action=tokens&chainId=1
GET /api/swap?action=quote&fromChain=1&toChain=137&fromToken=0x..&toToken=0x..&fromAmount=123&fromAddress=0x..
```
1. `export const dynamic = 'force-dynamic';` + `checkRateLimit(req, 30, 60_000)` (mevcut limiter).
2. `action=tokens`:
   - `chainId` zorunlu ve `getChainById(chainId)` ile doğrulanır (kayıtlı zincir değilse 400).
   - `GET https://li.quest/v1/tokens?chains=${chainId}` — header: `Accept: application/json` + varsa `x-lifi-api-key: process.env.LIFI_API_KEY`.
   - **Sunucu-taraflı önbellek:** `Map<chainId, {data, ts}>`, TTL **10 dk** (LiFi "cache /tokens results" tavsiyesi). Aynı modül `prices/route.ts`'deki `SERVER_PRICE_CACHE` deseniyle yazılır.
   - Yanıt doğrudan LiFi JSON'u (`{tokens: {chainId: [...]}}`) — SwapModal `d.tokens?.[chainId]` okuyor.
   - Zincir LiFi'de yoksa (LiFi 404/boş) → `{ tokens: { [chainId]: [] } }`.
3. `action=quote`:
   - Zorunlu parametreler: `fromChain, toChain, fromToken, toToken, fromAmount, fromAddress`. `fromAddress` `ethers.isAddress` ile doğrulanır (server-side input validation).
   - `slippage=0.005` sabiti eklenir (SwapModal UI'da "0.5% slippage" gösteriyor).
   - `GET https://li.quest/v1/quote?...` — 15 sn `AbortSignal.timeout`.
   - LiFi 4xx/5xx → `{ error: <LiFi message> }` + aynı HTTP status (özellikle 429 → client "rate limit" gösterebilsin).
   - Başarı → LiFi JSON'u olduğu gibi iletilir (SwapModal `transactionRequest` dahil tamamını kullanıyor).
4. Güvenlik: tüm hedef URL'ler **yalnızca** `https://li.quest` — client'tan hiçbir URL/parametre tabanlı host türetilmez. `LIFI_API_KEY` asla response'a yazılmaz.

#### 2.2 `src/app/api/simulate/route.ts` (yeni)
```
POST /api/simulate  { tx: {from,to,value,data}, chainId } → { changes, gasUsed }
```
(useSendForm.ts:228 sözleşmesi — birebir korunur.)
1. `export const dynamic = 'force-dynamic';` + `checkRateLimit(req, 60, 60_000)`.
2. Girdi doğrulama: `chainId` kayıtlı zincir olmalı; `tx.from`/`tx.to` `ethers.isAddress`; `value` hex veya yok; `data` hex veya `0x`.
3. `const rpcUrl = await resolveRpcUrl(chainId)` — registry yoksa `{ changes: [], gasUsed: '0x0' }` (yumuşak düşüş; useSendForm zaten `simRes.ok` kontrolü yapıyor, simülasyon başarısızsa gönderim akışı devam eder).
4. Adımlar:
   - `eth_call` `[{from,to,value,data}, 'latest']` → hata/revert ise `{ changes: [], gasUsed: '0x0', revertReason: <message> }` döndür (HTTP 200 — useSendForm hata durumunda yalnızca preview'ı atlar).
   - `eth_estimateGas` `[tx]` → `gasUsed` hex string.
   - **changes üretimi:**
     - `data` `0xa9059cbb` (ERC-20 transfer) ile başlıyorsa: calldata'dan `to`+`amount` parse edilir; `to` contract'ından `symbol()` + `decimals()` okunur (tek `eth_call` batch); `changes: [{changeType:'TRANSFER', from: tx.from, to: <alıcı>, amount: <formatlı>, symbol}]`.
     - Native transfer ise (`data` boş/0x): `changes: [{changeType:'TRANSFER', from: tx.from, to: tx.to, amount: <formatEther(value)>, symbol: chain.symbol}]`.
     - Ek olarak (best-effort, 1 ek RPC): `eth_getLogs` `{fromBlock:'latest', toBlock:'latest', address: tx.to, topics:[TRANSFER_TOPIC, paddedFrom]}` — log varsa calldata yerine log'daki gerçek amount kullanılır. Public RPC'de `latest` blok log sorgusu desteklenmezse sessizce atlanır.
5. Yanıt: `{ changes: [...], gasUsed: '0x...' }` — `TransactionPreview.tsx` `changes[].changeType/from/to/amount/symbol` ve `parseInt(gasUsed,16)` bekliyor; uyumlu.

#### 2.3 `src/app/api/approvals/route.ts` (yeniden yazım) + `lib/approvals.ts`
1. Route **GET**'e çevrilir (lib/approvals.ts zaten GET çağırıyor):
   ```
   GET /api/approvals?address=0x..&chainId=1
   ```
2. `rpcUrl` body/param tamamen kaldırılır → `resolveRpcUrl(chainId)` (Görev 3 ilkesi).
3. **Bilinen spender registry** route içine eklenir (client tokenList göndermez):
   - `KNOWN_SPENDERS: Record<number, Array<{address, name}>>` — chain başına yaygın DEX/bridge router'ları. SwapModal'ın kullandığı LiFi Diamond (`0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE`) tüm zincirlere eklenir; chain 1 için Uniswap V2/V3 router, 1inch V5, vb. (toplam ~5-8 spender/zincir; ApprovalsTab "Scanned N common DEX/bridge spenders" gösteriyor → `KNOWN_SPENDERS_COUNT` sabiti `components/dashboard/types.ts`'de gerçek sayıyla güncellenir).
   - **Token listesi sorunu:** Mevcut POST tasarımı client'tan `tokenList` bekliyordu. GET tasarımında tokenlar server-side üretilir: (i) LiFi token cache (Görev 2.1 cache'i) varsa ilk 30 token, (ii) yoksa zincirin yaygın stable/DEX tokenlarının sabit listesi (USDC/USDT/DAI/WETH vb.). Bu, ApprovalsTab'ın "No active approvals found — Scanned N spenders" davranışını korur.
4. Yanıt şekli **değiştirilmez**: `{ approvals: [...] }` (mevcut route'un şekli) — bunun yerine `lib/approvals.ts` düzeltilir:
   ```ts
   const data = await res.json();
   return (data.approvals ?? []).map(a => ({
     token: a.token, symbol: a.tokenSymbol, decimals: a.decimals ?? 18,
     spender: a.spender, spenderName: a.spenderName,
     allowance: a.allowance, unlimited: a.isUnlimited,
   }));
   ```
   (Route `decimals` alanını da döndürmeye başlar — ApprovalsTab `a.symbol`/`a.unlimited` kullanıyor, mapping sonrası uyumlu.)
5. `allowance > 0n` filtresi korunur; `ethers.MaxUint256` karşılaştırması korunur.

#### 2.4 `.env.example`
```env
# LiFi API (opsiyonel — anahtarsız da çalışır; anahtar daha yüksek rate limit sağlar)
# https://li.fi/plans — asla client'a gönderilmez (server-side proxy kullanır)
LIFI_API_KEY=""
```

### (c) Doğrulama
```powershell
npm run lint; npx tsc --noEmit; npm run build
npm run dev

# 1) Token listesi
curl.exe "http://localhost:3000/api/swap?action=tokens&chainId=1"
# Beklenen: {"tokens":{"1":[{...ETH 0x000...000...},{...USDC...}]}} — ETH ilk sırada, logoURI dolu

# 2) Quote (canlı LiFi)
curl.exe "http://localhost:3000/api/swap?action=quote&fromChain=1&toChain=137&fromToken=0x0000000000000000000000000000000000000000&toToken=0x2791bca1f2de4661ed88a30c99a7a9449aa84174&fromAmount=100000000000000000&fromAddress=0x552008c0f6870c2f77e5cC1d2eb9bdff03e30Ea0"
# Beklenen: estimate.toAmount, estimate.approvalAddress, transactionRequest.data alanları dolu

# 3) Simulate — native transfer (vitalik.eth → örnek adres)
curl.exe -X POST http://localhost:3000/api/simulate -H "Content-Type: application/json" `
  -d '{\"tx\":{\"from\":\"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045\",\"to\":\"0x000000000000000000000000000000000000dEaD\",\"value\":\"0x2386f26fc10000\",\"data\":\"0x\"},\"chainId\":1}'
# Beklenen: {"changes":[{"changeType":"TRANSFER",...,"symbol":"ETH"}],"gasUsed":"0x5208"}

# 4) Approvals GET
curl.exe "http://localhost:3000/api/approvals?address=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045&chainId=1"
# Beklenen: {"approvals":[...]} (boş dizi de geçerli — önemli olan 200 + doğru şekil)

# 5) Tarayıcıda canlı kontrol
#    - Swap modalını aç → zincir seç → token picker listesi dolar (Loading… → tokenlar)
#    - ETH→USDC 0.1 quote al → "Swap Preview" ekranı: toAmount, gas ~$, ~min, 0.5% slippage
#    - Send modalı: isAlchemy zincirde (Ethereum) gönderim → "Simulated Balance Changes" bloğu görünür
#    - Advanced mode → Approvals sekmesi → spinner → "No active approvals found / Scanned N spenders"

# 6) Rate limit
for ($i=0; $i -lt 35; $i++) { curl.exe -s -o NUL -w "%{http_code} " "http://localhost:3000/api/swap?action=tokens&chainId=137" }
# Beklenen: ilk ~30 istek 200 (cache'li), ardından 429
```

### (d) Bağımlılık / (e) Risk
- Bağımlılık: Görev 1. Görev 3 ile aynı sprint'te, 3'ten sonra.
- Riskler:
  - **LiFi quote limiti (2 saatte 75, anahtarsız, IP başına):** sunucu IP'si paylaşılıyorsa (Vercel serverless) hızla tükenir. **Azaltma:** (i) `LIFI_API_KEY` desteği hazır (100 RPM), (ii) client'ta quote debounce'u zaten var (buton tetikli), (iii) 429 → kullanıcıya "Rate limit — try again shortly" mesajı (SwapModal `data.error` gösteriyor).
  - **LiFi token listesi büyük** (chain 1 ~5365 token): SwapModal zaten 200 ile sınırlıyor; sunucu da `slice(0, 300)` uygular.
  - **eth_getLogs bazı public RPC'lerde kısıtlı:** simülasyon log okuyamazsa calldata-parse fallback devrede — akış kırılmaz.
  - **Approvals GET'e geçiş:** `tests/08-comprehensive.spec.ts:415` `**/api/approvals**` route mock'u kullanıyor — pattern her iki yönteme de uyumlu; Görev 9'da yine de kontrol edilir.

---

## GÖREV 4 — Ephemeral Vaadi Düzeltmesi

### Mevcut Durum (kanıt)
1. `WalletContext.tsx:192,236` → `createABDWallet`/`importABDWallet` **her zaman** `saveSession()` (localStorage `__gwvs__` + `__gwsh__` shadow) ve `storeVaultBlob()` (localStorage `__gw_vault_<id>__`) çağırıyor → mnemonic tarayıcıda kalıcı. README "close the tab — everything is wiped" iddiası **yanlış**.
2. `getTabKey()` (session-lock.ts:164) aslında **tarayıcı-kalıcı** bir anahtar (`__gwvs_bk__` localStorage) — "tab key" adı yanıltıcı.
3. `wipeABDWallet` blob'ları ve session'ı silmiyor; `useDashboardState.handleConfirmWipe` yalnız `disableSessionLock()` + `clearShadow()` yapıyor, `__gw_vault_*` blob'ları ve `__gw_wallet_history__` kalıyor.
4. `addToHistory` (wallet-history.ts:119) 5 kayıtla sınırlıyor; düşen kaydın `__gw_vault_<id>__` blob'u **yetim** kalıyor (`removeFromHistory` siler ama `addToHistory`'nin trim'i silmez).
5. README: "PNG key file", "session lock toggle", "beforeunload clears all in-memory state" iddiaları mevcut UI/kod ile uyuşmuyor (PNG akışı UI'dan kaldırılmış; `beforeunload` handler'ı `keepSession: true` ile session'ı bilinçli KORUR).
6. Mevcut gerçek model: **Saved Vaults** (WalletHistorySection'daki save ikonu → `persistCurrentWallet` → `isSaved: true`) kalıcılığın tek meşru yolu.

### Tasarım Kararı (bu planın önerisi — uygulanmadan önce onaylanmalı)
> **Ephemeral varsayılan, kalıcılık opt-in:** create/import sırasında otomatik `saveSession()` ve `storeVaultBlob()` **kaldırılır**. Kalıcılık yalnızca (a) kullanıcının "Save" ikonuyla kaydetmesi (`persistCurrentWallet`) veya (b) "Connect Extension" akışı ile olur. Sayfa yenilemede oturum kaybolur (ephemeral vaadi gerçek olur). History kayıtları (adres + meta, mnemonic blob'suz) tutulur; blob yalnız `isSaved` kayıtlar için yazılır.

### (a) Değişecek Dosyalar
| Dosya | İşlem |
|-------|-------|
| `context/WalletContext.tsx` | Otomatik persist kaldırılır; wipe güçlendirilir |
| `lib/wallet-history.ts` | `addToHistory` trim'inde blob temizliği; `clearHistory` zaten var |
| `hooks/useDashboardState.ts` | History-tracking effect'indeki otomatik `storeVaultBlob` kaldırılır; wipe akışı blob temizler |
| `README.md` | Security Model + How It Works + Features yeniden yazılır (Görev 8 ile birleşik yapılabilir; burada teknik iddialar düzeltilir) |
| `components/dashboard/DashboardHeader.tsx` | "Device-Bound" / "RAM only" alt yazıları gerçeğe uygunlanır (Görev 8'e de temas eder; burada yalnız yanlış güvenlik iddiası düzeltilir) |

### (b) Değişiklikler

**WalletContext.tsx:**
1. `createABDWallet` içinden `try { saveSession(...) } catch {}` (satır ~192) **silinir**.
2. `createABDWallet` içinden otomatik `storeVaultBlob` bloğu (satır ~209-218) **silinir**.
3. `importABDWallet` için aynı iki silme (satır ~236, ~253-264).
4. `makeRotationHandler` içindeki `try { saveSession(...) } catch {}` (satır ~163) **silinir** (rotasyon session'ı yeniden yazmamalı).
5. `wipeABDWallet` güçlendirilir:
   ```ts
   // mevcut clearSession() çağrısına ek:
   clearHistory();               // tüm __gw_vault_* bloblarını + history kaydını siler
   try { localStorage.removeItem('__gw_non_evm_warned__'); } catch {}
   ```
   (`clearHistory` wallet-history.ts:151 zaten her snapshot için `deleteSavedVault` çağırıyor.)
6. `beforeunload` handler'ı (satır ~451) **korunur** (`keepSession: true`) — ancak ephemeral modda session artık yazılmadığı için koruyacak bir şey yoktur; davranış kendiliğinden doğru olur.

**lib/wallet-history.ts:**
7. `addToHistory`: `.slice(0, MAX_HISTORY)` ile düşen kayıtlar için `deleteSavedVault(dropped.id)` çağrılır:
   ```ts
   const updated = [full, ...filtered].slice(0, MAX_HISTORY);
   const dropped = filtered.filter(s => !updated.some(u => u.id === s.id));
   dropped.forEach(s => deleteSavedVault(s.id));
   ```
8. (Öneri, düşük öncelik) `save()` içinde history kayıtları için `sessionStorage` alternatifi değerlendirilebilir — ancak Saved Vaults özelliği localStorage gerektirdiğinden **yapılmaz**; yalnız blob politikası düzeltilir.

**hooks/useDashboardState.ts:**
9. History-tracking effect (satır ~148-175): `wallet.getMnemonicForExport().then(m => storeVaultBlob(...))` çağrıları **silinir**. Effect yalnız snapshot meta verisi (adres, zincir bilgisi) yönetir. Blob yazımı yalnız `persistCurrentWallet` (WalletContext:403) ve `switchToSavedWallet` akışlarında kalır.
10. `persistCurrentWallet` (WalletContext:403) mevcut mantığı korunur: blob yoksa aktif mnemonic ile yazar (`loadSavedMnemonic` verify → fallback). Bu, "Save" ikonunun tek blob yazma noktası olmasını sağlar.
11. `handleConfirmWipe` (satır ~397): `wallet.wipeABDWallet()` artık `clearHistory()` yaptığından `clearShadow()` redundant kalır — silinir veya korunur (zararsız); öneri: sil.

**README.md (teknik iddialar — dil temizliği Görev 8'de):**
12. "How It Works" 3. madde: "Close the tab — everything is wiped from memory" → korunur ama **koşul eklenir**: "unless you explicitly saved the wallet to Saved Vaults".
13. "Persistent vault — optionally encrypt and save your wallet with a passphrase + PNG key file" → **silinir/ güncellenir**: "Optional Saved Vaults — mark a wallet as saved to keep it encrypted (AES-GCM, session-derived key) in this browser; delete anytime."
14. "Session restore — wallet survives page refresh when session lock is enabled" → **silinir** (toggle yok; ephemeral modda refresh = yeni oturum).
15. Security Model: "`beforeunload` handler clears all in-memory state on tab close" → "In-memory key material is cleared on tab close; nothing is written to disk unless you save a vault."
16. "Integrity watchers wipe the vault on tampering detection" → breach.ts davranışıyla uyumlu kısa ifade olarak korunabilir (kod var).
17. Tech Stack'ten "Supabase — asset storage + kill-switch" **silinir** (lib/supabase.ts ölü — Görev 6; kill route statik).

**DashboardHeader.tsx:**
18. Satır 86: `'Encrypted · Device-Bound'` → `'Encrypted · Saved in this browser'`; `'Volatile wallet — RAM only'` → `'Ephemeral — nothing stored'` (ephemeral modda artık gerçekten hiçbir şey yazılmadığı için doğru olur).

### (c) Doğrulama
```powershell
npm run lint; npx tsc --noEmit; npm run build; npx vitest run
npm run dev
```
Tarayıcıda (gizli pencere, DevTools → Application → Local Storage):
1. **CREATE NEW WALLET** → Local Storage'da `__gwvs__`, `__gwsh__`, `__gw_vault_*` anahtarları **YOK** (yalnız `__gw_wallet_history__` içinde adres kaydı, blob yok).
2. Sayfayı yenile (F5) → AuthScreen gelir (oturum geri yüklenmez) — ephemeral vaat doğru.
3. Wallet History'de bir kayda **Save** ikonu → `__gw_vault_<id>__` anahtarı belirir; kayıt "Saved" rozeti alır.
4. 6 farklı cüzdan oluştur (Create New Wallet ×6) → history 5'e iner; düşen kaydın `__gw_vault_*` anahtarı **yok** (yetim blob yok).
5. **Wipe** (DashboardActionGrid wipe akışı) → tüm `__gw_*` anahtarları silinir.
6. Sekmeyi kapat → yeni gizli pencerede aç → temiz.
7. `npx vitest run` → `security-hardening.test.ts` session-lock testleri: `saveSession`/`loadSession`/`clearSession` fonksiyonları hâlâ export edildiğinden testler geçmeli (fonksiyonlar silinmez, yalnız otomatik çağrı kaldırılır).

### (d) Bağımlılık / (e) Risk
- Bağımlılık: Görev 1. Görev 6 (ölü fonksiyon temizliği) ve Görev 8 (README dil) bu görevin kararlarını bekler.
- Riskler:
  - **YÜKSEK — davranış değişikliği:** "refresh'te oturum korunuyor" davranışına alışık kullanıcılar için geri adım. **Azaltma:** bu, ürün vaadinin (ephemeral) gereği; kalıcılık Saved Vaults ile zaten mevcut. Uygulamadan önce ürün sahibi onayı önerilir.
  - `persistCurrentWallet` fallback'i (`loadSavedMnemonic` başarısız → aktif mnemonic) artık daha sık tetiklenecek (blob otomatik yazılmadığı için) — mevcut fallback doğru çalışır, risk yok.
  - `switchToSavedWallet` yalnız `isSaved` blob'u olan kayıtlarda çalışır — blob'suz "Temp" kayda geçiş zaten `loadSavedMnemonic` hatası verir; WalletDashboard `alert('Vault data not found.')` yakalar. **İyileştirme (opsiyonel):** blob'suz Temp kayda tıklandığında geçiş yerine "This temporary wallet was not saved" uyarısı — Görev 9 test kapsamına alınır.

---

## GÖREV 5 — Extension Düzeltmeleri

### Mevcut Durum (kanıt)
- `background.js:225,238` → session'a yalnız `{address, unlockedAt}` yazılıyor; `background.js:295,307,322` → `signMessage(session.mnemonic, ...)` → `session.mnemonic` her zaman `undefined` → **tüm imzalama kırık**.
- `background.js:149` → `43220: 'https://forno.celo.org'` — yanlış chainId (doğrusu **42220**; lib/chains.ts:33 ve txhistory route'u 42220 kullanıyor).
- `popup.html` (working tree) → `<iframe src="http://localhost:3000">` — production'da ölü. **HEAD'deki popup.html** ise tam özellikli native popup (attach/unlock/send/receive; `popup.js` bağlı). Working tree popup.html + yeni popup_wrapper.js + popup.js'in bir kısmı bu görev kapsamında netleştirilir.
- `hooks/useExtensionBridge.ts:36-43` → `window.postMessage({mnemonic, passphrase}, '*')` — wildcard origin. Content script (`content_abdwallet.js:10`) origin kontrolü yapıyor olsa da gönderim `'*'` ile yapılıyor.

### (a) Değişecek Dosyalar
| Dosya | İşlem |
|-------|-------|
| `extension/background.js` | mnemonic şifreli session; Celo chainId; imzalama öncesi decrypt |
| `extension/popup.html` | iframe src yapılandırılabilir hale getirilir |
| `extension/popup_wrapper.js` | src çözümleme mantığı (yeni dosya, zaten untracked) |
| `hooks/useExtensionBridge.ts` | `'*'` → `window.location.origin` |
| `extension/HOW_TO_INSTALL.txt` | production URL notu |

### (b) Değişiklikler

**background.js:**
1. **Şifreli mnemonic session'da tutulur** (SW her istekte vault'u passphrase'siz açamaz; passphrase yalnız attach/unlock anında vardır):
   - `CW_ATTACH` ve `CW_UNLOCK` handler'larında: `const blob = await encryptMnemonic(mnemonic, passphrase);` (mevcut helper) → `setSession({ address, unlockedAt: Date.now(), blob })`.
   - Yeni helper: `async function getSessionMnemonic()` → session.blob'u `decryptMnemonic(vault, passphrase)` ile açar. **Passphrase nereden?** Session'a yazılmaz; bunun yerine attach/unlock sırasında türetilen AES-GCM anahtarı session-scoped bir değişkende (`let _sessionKey`) tutulur — `chrome.storage.session` SW restart'larında hayatta kalır ama tarayıcı kapanınca ölür (ephemeral vaatle uyumlu). Pratik uygulama:
     - `CW_ATTACH`/`CW_UNLOCK` → `const key = await deriveKey(passphrase, salt)`; salt'ı session'a, `_sessionKey`'i modül değişkenine koy.
     - SW uyanıp `_sessionKey` kaybolmuşsa (Chrome SW'yi öldürmüşse) → imzalama istekleri `{ error: 'Locked — reopen popup and unlock again' }` döner; popup `CW_UNLOCK` ile tekrar açar. Bu, mevcut "Locked" UX'iyle tutarlıdır.
   - `CW_PERSONAL_SIGN` / `CW_SIGN_TYPED` / `CW_SEND_TX`: `const mnemonic = await getSessionMnemonic(); if (!mnemonic) return { error: 'Locked' };` → sonra `signMessage(mnemonic, ...)`.
   - `CW_LOCK` / `CW_WIPE` → `_sessionKey = null`.
2. **Celo chainId:** `43220` → `42220` (satır 149).
3. `CW_SEND_TX` içinde `getRpcForChain(chainId)` çağrısı düzeltilmiş map üzerinden çalışmaya devam eder.

**popup.html + popup_wrapper.js:**
4. Karar (öneri): **HEAD'deki native popup korunur** (working tree'deki iframe'li sürüm iptal edilir → `git checkout -- extension/popup.html` ile HEAD sürümüne dönülür; `popup_wrapper.js` silinir veya popup.html kullanmadığı için untracked kalır). Gerekçe: native popup production'da `http://localhost:3000` olmadan çalışır; iframe yaklaşımı `default-src 'self'` CSP ve CORS nedeniyle kırılgandır.
   - **Alternatif (iframe korunacaksa):** `popup.html` içinde `<iframe id="wallet-frame">` src'siz başlar; `popup_wrapper.js` şu mantıkla doldurur: `chrome.storage.local.get('abd_site_url')` → yoksa `https://abdwallet.app` → `frame.src = url`. Dev'de kullanıcı `abd_site_url = http://localhost:3000` ayarlar. `manifest.json` `externally_connectable`'a localhost eklenir.
   - **Uygulayıcı notu:** iki seçenekten biri seçilir; bu plan **native popup'ı (seçenek A)** önerir.
5. `HOW_TO_INSTALL.txt`: "Site URL: https://abdwallet.app (dev: http://localhost:3000)" notu eklenir.

**hooks/useExtensionBridge.ts:**
6. `window.postMessage({...}, '*')` → `window.postMessage({...}, window.location.origin)` (2 yer: satır 29 `CW_STATUS_REQUEST`, satır 36-43 `CW_ATTACH_REQUEST`).
7. `message` event handler'ına origin filtresi eklenir: `if (e.origin !== window.location.origin) return;` (content script zaten `event.origin` echo'luyor — `content_abdwallet.js:25,44`).

### (c) Doğrulama
```powershell
# Statik: syntax + chainId
node --check extension/background.js
rg "43220" extension/          # Beklenen: eşleşme yok
rg "42220" extension/background.js
rg "'\*'" hooks/useExtensionBridge.ts   # Beklenen: eşleşme yok
npm run lint; npm run build
```
Tarayıcıda (Chrome → `chrome://extensions` → Load unpacked → `extension/`):
1. abdwallet.app (veya localhost:3000) aç → cüzdan oluştur → **Connect Extension** → passphrase gir → `CW_ATTACH_RESULT ok:true`.
2. Extension popup → unlock → dApp'te (ör. app.uniswap.org veya test sayfası) `window.ethereum` → `eth_requestAccounts` → adres döner.
3. **İmza testi (kritik):** dApp'ten `personal_sign("hello", address)` → popup onayı → **imza döner** (önceki sürümde `undefined` mnemonic hatası). `eth_sendTransaction` küçük bir transfer → tx hash döner.
4. Celo ağına RPC çağrısı (`eth_chainId` chainId 42220) → `0xa4ec` döner.
5. Tarayıcı tamamen kapatılıp açılınca extension kilitli (session ölmüş) → popup unlock ister.
6. DevTools console (site): postMessage trafiğinde `targetOrigin` = origin; `'*'` yok.

### (d) Bağımlılık / (e) Risk
- Bağımlılık: Görev 1. Görev 4'ten bağımsız (extension kendi vault'unu yönetir).
- Riskler:
  - **SW yaşam döngüsü:** Chrome MV3 service worker'ı ~30 sn boşta kalınca öldürür; `_sessionKey` modül değişkeni ölür. **Azaltma:** anahtar kaybında "Locked — unlock again" net hatası; kullanıcı popup'ı açtığında tek tıkla unlock. (Anahtarı `chrome.storage.session`'a plaintext yazmak ephemeral vaatle çelişir — yapılmaz.)
  - Working tree'deki popup.html değişikliği (648 satır silinmiş) geri alınırken mevcut `extension/popup.html` değişikliği kaybolur — bu **bilinçli** bir karardır (seçenek A); uygulayıcı önce `git diff extension/popup.html` çıktısını kontrol etmeli.
  - `popup.js` HEAD'de tracked ve native popup'a bağlı — seçenek A'da korunur; Görev 6'nın "popup.js ölü" tespiti bu kararla geçersiz olur (yalnızca seçenek B seçilirse popup.js ölüdür).

---

## GÖREV 6 — Ölü Kod Temizliği (~20 dosya)

### Ön Doğrulama (uygulamadan önce çalıştırılacak)
```powershell
# Her aday dosya için import taraması — beklenen: yalnız kendi iç referansları
rg "from ['\"]@?/?(lib|components)/" --type ts --type tsx -l | % { }
rg -l "decoy|webauthn|steganography|network-profile|visual-entropy|singularity|DevToolsGuard|FingerprintScanner|CardSpotlight|AuroraBackground|ChainMarquee|FloatingDock|ABDLink|AdvancedDashboard|ChainPanel|LitecoinPanel" src components lib hooks context __tests__ tests
```
Bu planın tarama sonucu (kanıtlı):
- `lib/singularity.ts` → yalnız `components/DevToolsGuard.tsx` import ediyor (o da ölü) → **ikisi birlikte silinir** ("kısmen" notu kalkar).
- `lib/supabase.ts` → hiçbir yer import etmiyor (`scripts/upload-assets.mjs` kendi `createClient`'ını kullanıyor) → silinir; `@supabase/supabase-js` paketi package.json'da kalır (script kullanıyor).
- `lib/decoy.ts`, `lib/webauthn.ts`, `lib/steganography.ts`, `lib/network-profile.ts`, `lib/visual-entropy.ts` → import eden yok.
- 10 component dosyası → hiçbir canlı import yok (yalnız test yorumlarında ad geçiyor).
- `src/app/page.tsx:12` JSDoc "steganography vault, WebAuthn session lock" → yorum güncellenir.

### (a) Değişecek Dosyalar

**Silinecekler (17 dosya):**
```
lib/decoy.ts
lib/webauthn.ts
lib/steganography.ts
lib/supabase.ts
lib/network-profile.ts
lib/visual-entropy.ts
lib/singularity.ts
components/DevToolsGuard.tsx
components/FingerprintScanner.tsx
components/CardSpotlight.tsx
components/AuroraBackground.tsx
components/ChainMarquee.tsx
components/FloatingDock.tsx
components/ABDLink.tsx
components/AdvancedDashboard.tsx
components/ChainPanel.tsx
components/LitecoinPanel.tsx
```
**Düzenlenecekler:**
| Dosya | İşlem |
|-------|-------|
| `context/WalletContext.tsx` | Ölü fonksiyonlar kaldırılır (aşağıda) |
| `src/app/page.tsx` | JSDoc güncellenir |
| `extension/ethers_sw.js` | Silinir (manifest `background.js`'i module type kullanıyor; ethers_sw.js referanssız) |
| `extension/popup.js` | **Karara bağlı:** Görev 5 seçenek A → KALIR; seçenek B → silinir |
| `imported` | Zaten görev 1'de untracked edildi; içerik güncel tutulur |

### (b) WalletContext Ölü Fonksiyon Temizliği (madde madde)
Kaldırılacaklar (kanıt: component/hook taramasında çağrı yok):
1. `triggerPanic` (satır 137-144) — interface satırı 74 ve provider value satırı 537 de silinir. (`NEXT_PUBLIC_EXTERNAL_LINK` kullanımı yalnız `lib/history.ts` ve `/api/kill`'de kalır — onlar canlı.)
2. `switchAccount` (satır 387-401) — interface 85, provider 547 silinir. `lib/accounts.ts` (`getPrivateKeyAtIndex`) başka yerde kullanılıyor mu kontrol edilir; yalnız `switchAccount` kullanıyorsa `lib/accounts.ts` da silinir (uygulama anında `rg "accounts" lib context components` ile teyit).
3. `markSessionRestored` (satır 383-385) — interface 84, provider 546 silinir.
4. `enableSessionLock` (satır 369-376) — interface 82, provider 544 silinir. (Görev 4 kararıyla otomatik session kaldırıldı; manuel toggle UI'da yok.)
5. `getMnemonic` (satır 285-289) — interface 76, provider 539 silinir. (`getMnemonicForExport` CANLI — useDashboardState/useWalletBalances kullanıyor; DOKUNULMAZ. `mnemonicShownRef` yalnız `getMnemonic` kullanıyorsa o da silinir.)
6. `disableSessionLock` **CANLI** (useDashboardState:399,406) — korunur.
7. `_updateDecoys` / decoy değişkenleri (satır 59-66, 134, 477-480): heap-inspection yanıltması için **korunur** (lib/decoy.ts ayrı bir UI hile modülüdür, bu yerel decoy'larla ilgisi yok). Yorumla netleştirilir.

**AETHILM kalıntıları (Görev 8'e köprü):**
8. Canary trap effect (satır 483-490): `_aethilm_canary` → `_abd_canary`, değer `'abd_sovereign'`.
9. Branding self-heal effect (satır 506-524): `[data-aethilm="brand"]` → `[data-abd="brand"]` + `components/AbdLogo.tsx`'ye `data-abd="brand"` attribute'u eklenir (self-heal'in izleyeceği gerçek eleman — şu an DOM'da yok, self-heal hiç tetiklenmiyor).

### (c) Doğrulama
```powershell
npm run lint
npx tsc --noEmit          # silinen import kalmadığını kanıtlar
npm run build
npx vitest run            # 7 test dosyası geçmeli (hiçbiri ölü lib'leri import etmiyor)
rg -i "decoy\.ts|webauthn|steganography|singularity|visual-entropy|network-profile|DevToolsGuard|FingerprintScanner|CardSpotlight|AuroraBackground|ChainMarquee|FloatingDock|ABDLink|AdvancedDashboard|ChainPanel|LitecoinPanel" src components lib hooks context
# Beklenen: eşleşme yok (test yorumları hariç — Görev 9'da temizlenir)
npm run dev               # AuthScreen → cüzdan oluştur → dashboard tam çalışır; console'da error yok
```

### (d) Bağımlılık / (e) Risk
- Bağımlılık: Görev 2 (yeni API dosyaları silinmesin), Görev 4 (WalletContext kararları kesinleşsin).
- Risk: **Orta.** Dinamik import gözden kaçar (`next/dynamic` yalnız WalletDashboard için var — kanıtlı). Silme öncesi her dosya için `rg` taraması zorunludur; şüpheli dosya silinmez, `imported` notuna "kararsız" olarak eklenir. `tsconfig.json` `include: **/*.ts` olduğundan silinen dosya derlemeyi bozmaz ama **import eden** varsa `tsc` yakalar — bu yüzden `npx tsc --noEmit` zorunlu adım.

---

## GÖREV 7 — Staking Hardcoded Değerler

### (a) Değişecek Dosyalar
| Dosya | İşlem |
|-------|-------|
| `src/app/api/staking/route.ts` | Rocket Pool APY + rETH kuru gerçek kaynağa bağlanır |

### (b) Değişiklikler
1. **Rocket Pool APY** (satır 42-44):
   ```ts
   if (protocol === 'rocketpool') {
     try {
       const res = await fetch('https://api.rocketpool.net/mainnet/reth/apr', {
         headers: { Accept: 'application/json' },
         next: { revalidate: 3600 },
       });
       if (res.ok) {
         const data = await res.json();
         const apr = parseFloat(data?.yearlyAPR);
         if (isFinite(apr)) return NextResponse.json({ apy: Math.round(apr * 100) / 100 });
       }
     } catch {}
     return NextResponse.json({ apy: 2.2 }); // son bilinen değer, fallback
   }
   ```
   Canlı doğrulandı: endpoint `{"yearlyAPR":"2.1684..."}` döndürüyor.
2. **rETH→ETH kuru** (satır 86, `* 1.1` sabiti):
   - On-chain okuma: rETH contract `0xae78736Cd615f374D3085123A210448E74Fc6393` → `getExchangeRate()` selector **`0xe6aa216c`** (bu plan için canlı hesaplandı ve publicnode RPC'de test edildi: sonuç 1.1697 — yani hardcoded 1.1 zaten yanlış).
   - Uygulama: `rpcRequest(rpcUrl, 'eth_call', [{ to: ROCKET_POOL_RETH, data: '0xe6aa216c' }, 'latest'])` → `rate = Number(BigInt(hex)) / 1e18` → `balanceETH = rEthBalance * rate`.
   - Fallback: eth_call başarısızsa `rate = 1` (olduğu gibi rETH miktarı) + yanıta `rateLive: false` notu; `* 1.1` **asla** kullanılmaz.
   - Rate modül-seviye cache (TTL 10 dk) — positions her çağrıda yeniden okumaz.
3. Lido dalı (satır 26-39) zaten canlı API kullanıyor; fallback `3.2` → `3.0` (son bilinen seviyeye yakın tutucu değer) veya olduğu gibi kalır — **öneri: değiştirme**, yalnız Rocket Pool düzeltilir (kapsam kontrolü).

### (c) Doğrulama
```powershell
npm run build
npm run dev
curl.exe "http://localhost:3000/api/staking?action=apy&protocol=rocketpool"
# Beklenen: {"apy":2.1x} — canlı API'den; 3.1 DEĞİL

curl.exe "http://localhost:3000/api/staking?action=apy&protocol=lido"
# Beklenen: {"apy":3.x} (lido.fi API)

# rETH pozisyonu olan bir adresle (ör. rETH balinası — etherscan holders):
curl.exe "http://localhost:3000/api/staking?action=positions&address=0x<rEthHolder>"
# Beklenen: balanceETH ≈ balance × 1.16-1.18 (1.1 sabit çarpan yok)

# Tarayıcı: Advanced → Staking sekmesi → Rocket Pool APY kartı canlı değeri gösterir
npx vitest run   # faz2-features.test.ts staking testleri (buildStakeTx) hâlâ geçer
```

### (d) Bağımlılık / (e) Risk
- Bağımlılık: Görev 3 (registry/rpcRequest deseni; route zaten kullanıyor).
- Risk: **Düşük.** `api.rocketpool.net` erişilemezse fallback devrede. `next: { revalidate: 3600 }` `force-dynamic` route'ta fetch cache'i etkisizleştirir — bunun yerine modül cache (Map + TTL) kullanılır (prices route deseni).

---

## GÖREV 8 — Dil/Marka Karmaşası

### (a) Değişecek Dosyalar
| Dosya | İşlem |
|-------|-------|
| `src/app/layout.tsx` | metadata İngilizce |
| `components/dashboard/modals/send/useSendForm.ts` | Türkçe hata mesajı |
| `components/MnemonicGeneratorModal.tsx` | Tamamen İngilizce |
| `components/dashboard/DashboardHeader.tsx` | "Total Curated Value" etiketi |
| `context/WalletContext.tsx` | Aethilm → ABD (Görev 6'da başlanan iş tamamlanır) |
| `lib/singularity.ts` | (Görev 6'da silindiyse madde düşer) |
| `README.md` | Görev 4'ün teknik düzeltmeleri + dil birliği |
| `tests/04-security.spec.ts` | `data-aethilm` selector güncellenir |

### (b) Değişiklikler
1. **layout.tsx:13-16:**
   ```ts
   export const metadata: Metadata = {
     title: "ABD Wallet — Free Anonymous EVM Wallet",
     description: "Free anonymous temp wallet for all EVM chains. No signup, no KYC, no tracking. Your keys never leave your browser.",
   };
   ```
2. **useSendForm.ts:208:** `'Secili Networkta Bakiye Yetersiz'` → `'Insufficient balance on selected network'`.
3. **MnemonicGeneratorModal.tsx** (tüm Türkçe metinler):
   - `12 Kelimelik Kurtarma Anahtarı` → `12-Word Recovery Phrase`
   - `Offline ve Güvenli Yerel Entropi` → `Offline & Secure Local Entropy`
   - `Yeniden Üret` → `Regenerate`
   - `Kopyalandı!` → `Copied!` · `Tümünü Kopyala` → `Copy All`
   - `KRİTİK UYARI: Bu 12 kelimeyi kaybederseniz...` → `CRITICAL: If you lose these 12 words you can never recover this wallet. Download the backup file.`
   - `CİHAZA İNDİR (.TXT)` → `DOWNLOAD (.TXT)`
   - `CÜZDAN KURULUYOR...` → `CREATING WALLET...` · `BU ANAHTARLA CÜZDANI BAŞLAT` → `CREATE WALLET WITH THIS PHRASE`
   - `.txt` indirme içeriği (satır 70-90): tüm Türkçe başlıklar İngilizce (`SECRET RECOVERY KEY`, `Generated`, `12 SECRET RECOVERY WORDS`, güvenlik uyarıları).
   - `new Date().toLocaleString('tr-TR')` → `('en-US')`.
4. **DashboardHeader.tsx:139:** `Total Curated Value` → **`Selected Chain Balance`** (hesaplanan değer `chainTotalUSD` — yalnız seçili zincir; etiket gerçeği söyler). Alternatif: gerçek toplam gösterilmek istenirse `useWalletBalances.allChainsTotal` prop olarak geçirilir — **öneri: etiket düzeltmesi** (davranış değişikliği yok, kapsam minimal).
5. **Aethilm kalıntıları** (Görev 6'da yapılan canary/self-heal yeniden adlandırmasına ek):
   - `tests/04-security.spec.ts:31` → `[data-abd="brand"]`.
   - `__tests__/crypto.test.ts:29` → `sha256('abdwallet')` (kozmik).
   - `next.config.mjs:70` → `X-ABD-Status: Sovereign` zaten doğru; değişiklik yok.
6. **README.md:** Görev 4'ün madde 12-17 düzeltmeleri burada uygulanır (tek elde toplanır); dil tamamen İngilizce kalır (zaten öyle), Türkçe `.env.example` yorumları (`RPC Uç Noktaları`, "özel API key'li") İngilizce yapılır.

### (c) Doğrulama
```powershell
npm run lint; npm run build; npx vitest run
rg -i "kurtarma|kelimelik|yetersiz|secili|üretil|kopyala|cihaza|uç noktaları|aethilm" src components lib hooks context README.md .env.example tests __tests__
# Beklenen: eşleşme yok
npm run dev
# Tarayıcı: view-source → <title> İngilizce; mnemonic modal İngilizce; send: yetersiz bakiye mesajı İngilizce
# Dashboard başlığı: "SELECTED CHAIN BALANCE"
```

### (d) Bağımlılık / (e) Risk
- Bağımlılık: Görev 4 (README içerik kararları), Görev 6 (AETHILM sabitleri silinmiş/ yeniden adlandırılmış).
- Risk: **Düşük.** Yalnız metin. Tek dikkat: Playwright testleri Türkçe metne bağlı olmamalı (tarama: bağlı değil — helpers.ts eski İngilizce metinleri arıyor, onlar da Görev 9'da güncellenir).

---

## GÖREV 9 — Playwright Test Yenileme + CI

### Mevcut Durum
- `tests/helpers.ts` SEL sabitleri eski UI'dan: `PERSIST CURRENT SESSION`, `INITIALIZE NEW VAULT`, `ACCESS EXISTING VAULT`, `Forge Vault`, `VAULT SECURED` — mevcut UI'da **yok** (mevcut: `CREATE NEW WALLET` (id: `create-new-wallet-btn`), `IMPORT EXISTING` (id: `import-existing-wallet-btn`), `Generate 12-Word Recovery Phrase`).
- PNG persist akışı (`persistSession`, `dropPNG`, `decodePNGPayload`) UI'dan kaldırılmış → bu akışa bağlı spec'ler (`02-persist-and-access`, `saved-vaults`) bayat.
- `playwright.config.ts`: `headless: false`, `viewport: null`, `--start-maximized` → CI'da çalışamaz.
- `.github/` yok → CI yok.

### (a) Değişecek Dosyalar
| Dosya | İşlem |
|-------|-------|
| `tests/helpers.ts` | SEL sabitleri + persist yardımcıları yeni UI'a |
| `tests/01-wallet-lifecycle.spec.ts` | Gözden geçir/güncelle |
| `tests/02-persist-and-access.spec.ts` | Saved Vaults akışına yeniden yazılır |
| `tests/03-session-lock.spec.ts` | Görev 4 davranışına göre yeniden yazılır veya silinir |
| `tests/04-security.spec.ts` | `data-abd="brand"` + güncel güvenlik davranışı |
| `tests/05-advanced-mode.spec.ts` | Advanced mode toggle güncel (kalır, selector kontrolü) |
| `tests/06-ui-smoke.spec.ts` | Güncelle |
| `tests/07-ledger-and-security.spec.ts` | Ledger mock kontrolü |
| `tests/08-comprehensive.spec.ts` | API mock'ları yeni route şekillerine |
| `tests/saved-vaults.spec.ts` | Save ikonu + switch + delete akışı |
| `playwright.config.ts` | CI uyumlu (headless) |
| `.github/workflows/ci.yml` | **YENİ** |
| `package.json` | `"test": "vitest run"`, `"test:e2e": "playwright test"` script'leri |

### (b) Değişiklikler

**helpers.ts:**
1. SEL güncelleme:
   ```ts
   export const SEL = {
     createBtn:      '#create-new-wallet-btn',
     importBtn:      '#import-existing-wallet-btn',
     saveBtn:        'button:has(.material-symbols-outlined):has-text("save")', // WalletHistorySection save ikonu
     advancedBtn:    'button:has-text("Advanced")',
     simpleBtn:      'button:has-text("Simple")',
     hintLink:       'button:has-text("Didn\'t find")',
     networkBtn:     'button:has-text("Network")',
     walletHistory:  'text=Wallet History',
   };
   ```
2. `waitForWallet`: mevcut mantık (history localStorage kontrolü + create butonu retry) **korunur** — hâlâ geçerli.
3. `persistSession`/`dropPNG`/`decodePNGPayload` **silinir** (PNG akışı yok). Yerine:
   ```ts
   export async function saveWalletViaIcon(page: Page) {
     const saveIcon = page.locator(SEL.saveBtn).first();
     await expect(saveIcon).toBeVisible({ timeout: 8000 });
     await saveIcon.click();
     await page.waitForTimeout(500);
   }
   export async function getVaultBlobKeys(page: Page) { /* __gw_vault_* anahtarları */ }
   ```

**Spec yeniden yazımları (özet):**
- `01-wallet-lifecycle`: create → adres görünür → wipe → AuthScreen'e dönüş → localStorage temiz (Görev 4 doğrulaması otomatikleşir).
- `02-persist-and-access`: create → save ikonu → `__gw_vault_*` var → wipe → history'den switch → cüzdan geri gelir.
- `03-session-lock`: **yeniden adlandırılır → `03-ephemeral.spec.ts`**: create → `__gwvs__`/`__gw_vault_*` YOK → F5 → AuthScreen (ephemeral vaat testi).
- `04-security`: `data-abd="brand"` logo var; honey input trap DOM'da; console hatasız.
- `08-comprehensive`: `/api/approvals**` mock GET şekline (`{approvals:[]}`); `/api/swap` ve `/api/simulate` mock'ları eklenir (swap modalı testinde).

**playwright.config.ts:**
```ts
headless: process.env.CI ? true : false,
viewport: { width: 1440, height: 900 },
// launchOptions.args: CI'da --start-maximized kaldırılır
retries: process.env.CI ? 2 : 1,
```

**.github/workflows/ci.yml:**
```yaml
name: CI
on: [push, pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npx vitest run
      - run: npm run build
  e2e:
    runs-on: ubuntu-latest
    needs: quality
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run build
      - run: npx playwright test
        env:
          NEXT_PUBLIC_WC_PROJECT_ID: ${{ secrets.WC_PROJECT_ID }}
          CI: true
      - uses: actions/upload-artifact@v4
        if: failure()
        with: { name: playwright-report, path: playwright-report/ }
```
> Not: `next build` sırasında font fetch gerekir (Google Fonts) — CI'da ağ erişimi varsayılır; sorun olursa `next/font` `adjustFontFallback` notu eklenir. E2E için dev server yerine `next start` (build çıktısı) kullanılır: `webServer: { command: 'npm run start', port: 3000 }` playwright.config'e eklenir.

**package.json:**
```json
"test": "vitest run",
"test:e2e": "playwright test"
```

### (c) Doğrulama
```powershell
npm run lint; npm run build; npx vitest run
npx playwright test --headed          # yerel: tüm spec'ler yeşil
$env:CI="true"; npx playwright test   # headless modda da yeşil (CI provası)
# GitHub'a push sonrası Actions sekmesinde quality + e2e job'ları yeşil
```

### (d) Bağımlılık / (e) Risk
- Bağımlılık: Görev 1-8 tamamlanmış olmalı (testler sabit davranışa yazılır).
- Risk: **Orta.** Playwright spec'lerinin tamamı yeniden yazılırken beklenmedik UI durumları çıkabilir; her spec tek tek (`npx playwright test tests/01-wallet-lifecycle.spec.ts --headed`) doğrulanır. CI'da WalletConnect/Ledger testleri gerçek servis istememeli — mock şart (07-ledger spec'i WebHID mock'uyla çalışmalı ya da `test.skip(!process.env.LEDGER_TEST)` ile işaretlenmeli).

---

## Ortak Doğrulama Matrisi (her görev sonunda)

| Kontrol | Komut | Eşik |
|---------|-------|------|
| Lint | `npm run lint` | 0 hata |
| Tip | `npx tsc --noEmit` | 0 hata |
| Unit | `npx vitest run` | 7/7 dosya yeşil |
| Build | `npm run build` | exit 0 |
| Runtime | `npm run dev` + curl testleri | görev bazlı (yukarıda) |

## Global Riskler

| Risk | Etki | Azaltma |
|------|------|---------|
| Görev 4 davranış değişikliği kullanıcı beklentisini kırar | Yüksek | Uygulamadan önce ürün onayı; README netleştirilir; Saved Vaults görünür tutulur |
| LiFi rate limit (75/2h anahtarsız) | Orta | `LIFI_API_KEY` env desteği + sunucu cache + 429 mesajı |
| Public RPC tutarsızlığı (simulate/approvals) | Orta | rpc-registry health probe + yumuşak düşüş (boş sonuç, asla 500) |
| Extension SW yaşam döngüsü anahtarı öldürür | Orta | Net "Locked" UX; popup'tan tek tık unlock |
| Ölü kod silinirken canlı referans kaçar | Orta | Her dosya için rg taraması + tsc + build + vitest üçlüsü |
| Playwright yeniden yazımı uzun sürer | Düşük | Spec'ler tek tek koşutulur; CI son adım |

## Uygulama Sırası (özet)

```
1. Görev 1  → commit: chore: repo hygiene
2. Görev 3  → commit: security: remove SSRF surface from API routes
3. Görev 2  → commit: feat: /api/swap (LiFi proxy), /api/simulate, approvals GET
4. Görev 4  → commit: fix: true ephemeral behavior — opt-in persistence only
5. Görev 5  → commit: fix(extension): encrypted session mnemonic, Celo chainId, origin-safe bridge
6. Görev 6  → commit: refactor: remove dead code (~20 files)
7. Görev 7  → commit: fix(staking): live Rocket Pool APR + on-chain rETH rate
8. Görev 8  → commit: fix: unify language to English, remove Aethilm remnants
9. Görev 9  → commit: test: refresh Playwright suite + add GitHub Actions CI
```
