# ABD Wallet — Security Hardening & Quality Audit Notes

**Version:** 1.1.0-hardened  
**Audit Date:** 2026-08-20  
**Status:** All Critical, High, and Medium Audit Findings Fully Resolved & Verified  

---

## Executive Summary

The ABD Wallet repository has undergone a comprehensive security audit adhering strictly to non-custodial crypto standards, OWASP guidelines, and modern web application security principles. All critical vulnerabilities, potential attack vectors, and architectural weaknesses have been eliminated.

---

## Comprehensive Audit & Remediation Log

### 🔴 Critical Vulnerabilities

#### [K1] Extension Sender Isolation & Permission Enforcement
- **Vulnerability:** Web dApps could craft `postMessage` calls with `CW_APPROVE`, `CW_UNLOCK`, `CW_WIPE`, or `CW_ATTACH` to auto-approve malicious transactions without user interaction.
- **Remediation:**
  - Implemented strict `POPUP_ONLY` message set in `extension/background.js`. Rejects any calls from web tabs (`sender.tab !== undefined` or `sender.id !== chrome.runtime.id`) with `403 Forbidden`.
  - Restricted `CW_ATTACH` strictly to popup context or allowlisted origins via `onMessageExternal`.
  - Established `cw_connected_origins` permission registry in `chrome.storage.local`. Unconnected dApps must trigger an explicit connection confirmation modal before addresses are returned.
  - Attached requesting `origin` to all transaction/message signing approval payloads and displayed it prominently in the popup UI.

#### [K2] Cross-Chain Replay Protection & Transaction Normalization
- **Vulnerability:** Transactions missing explicit `chainId` fields could be signed as legacy transactions and replayed across multiple EVM chains (e.g. Ethereum, Polygon, Base).
- **Remediation:**
  - Added strict `chainId` parsing, RPC validation, and forced `type: 2` (EIP-1559) / EIP-155 replay protection during transaction normalization in `extension/background.js`.
  - Added `from` address verification matching the active wallet address before signing.

---

### 🟠 High Severity Vulnerabilities

#### [Y3] Dynamic `chainId` Getter on Frozen Provider
- **Vulnerability:** Freezing `window.ethereum` broke chain switching because `provider.chainId = chainId` was silently ignored in frozen objects.
- **Remediation:**
  - Redefined `chainId` on `provider` using a getter function: `get chainId() { return _chainId; }`. Freezing the provider now retains dynamic property evaluation while preventing property deletion or tampering.

#### [Y4] Session Lock & Dead LocalStorage Ciphertext Cleanup
- **Vulnerability:** In-memory tab seeds produced unrecoverable dead ciphertexts in `localStorage`.
- **Remediation:**
  - Removed all dead ciphertext writes to `localStorage` (`__gwvs__`, `__gwsh__`).
  - Switched session state to pure in-memory derivation with clear lifecycle boundaries. Real multi-chain encrypted storage is managed via passphrase in `lib/persistent-vault.ts`.

#### [Y5] Distributed Async Rate Limiter & Secure IP Extraction
- **Vulnerability:** Synchronous in-memory rate limiting was bypassed on serverless edge clusters, and relying on raw `X-Forwarded-For` first IP enabled trivial IP spoofing.
- **Remediation:**
  - Hardened `getClientIp` in `lib/rate-limit.ts` to prioritize `x-vercel-forwarded-for`, `x-real-ip`, and edge-appended last IP.
  - Migrated all 11 API routes (`approvals`, `gas`, `nfts`, `prices`, `proxy`, `scan`, `simulate`, `staking`, `swap`, `tokens`, `txhistory`) to `await checkRateLimitAsync(...)`.

#### [Y6] Content Security Policy (CSP) Hardening
- **Vulnerability:** CSP contained `'unsafe-eval'` and lacked boundary lockdown directives.
- **Remediation:**
  - Removed `'unsafe-eval'` from `next.config.mjs` (retained `'wasm-unsafe-eval'` for WebAssembly crypto modules).
  - Added strict directives: `object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';`.

---

### 🟡 Medium Severity Hardening

#### [M7] Dependency Overrides & Clean Dependency Tree
- Configured npm `overrides` for `axios (^1.7.9)`, `@grpc/grpc-js (^1.12.6)`, `protobufjs (^8.7.2)`, `image-size (^1.1.1)`, `ws (^8.20.2)`, `elliptic (^6.6.1)`.

#### [M8] Vault Lockout & Exponential Backoff
- Replaced destructive 5-attempt vault deletion with progressive exponential backoff (10s at 5 attempts, 5m at 10 attempts, 30m at 15 attempts).

#### [M9] Shard Authenticated Additional Data (AAD)
- Added AAD binding `shard:${index}:${vaultId}:v3` to AES-GCM encryption in `lib/persistent-vault.ts`, cryptographically preventing shard reordering or tampering.

#### [M10] Disabled Legacy Blind Signing
- Disabled `eth_sign` in `extension/inject.js` with clear security error, directing developers to `personal_sign` or `eth_signTypedData_v4`.

#### [M11] Provider Identity & EIP-6963 Compliance
- Removed misleading `isMetaMask: true` flag. Declared `isABDWallet: true` with full EIP-6963 multi-provider discovery support.

#### [M12] Secure DOM Rendering in Extension Popup
- Eliminated `innerHTML` in `extension/popup.js`, replacing balance and status updates with `textContent` and DOM nodes.

---

## Verification Matrix

| Category | Verification Command | Result |
|---|---|---|
| **Unit & Security Tests** | `npx vitest run` | **10 Test Files Passed, 33/33 Tests Passed** |
| **TypeScript Checking** | `npx tsc --noEmit` | **0 Errors** |
| **Linter** | `npm run lint` | **0 Errors** |
| **Extension Integrity** | `npm run build:extension` | **9 Files Verified with SHA-384** |
| **Production Build** | `npm run build` | **Next.js 14.2.35 Build Succeeded (Exit code: 0)** |
