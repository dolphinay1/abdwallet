// ABD Wallet — Background Service Worker (Manifest V3, module type)
// Handles: attach flow, key storage, signing queue, dApp request routing

import { Wallet } from './ethers.esm.js';

const STORAGE_KEY = 'cw_vault';
const SESSION_KEY = 'cw_session';
const CONNECTED_ORIGINS_KEY = 'cw_connected_origins';
const UNLOCK_ATTEMPTS_KEY = 'cw_unlock_attempts';
const ALLOWED_ATTACH_ORIGINS = new Set(['https://www.abdwallet.com', 'https://abdwallet.com']);

// ── Crypto helpers ─────────────────────────────────────────────────────────

async function deriveKey(passphrase, salt) {
  const enc = new TextEncoder();
  const keyMat = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256' },
    keyMat,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function toHex(buf) {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex) {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) arr[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  return arr;
}

async function encryptMnemonic(mnemonic, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const enc = new TextEncoder();
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(mnemonic));
  return { salt: toHex(salt), iv: toHex(iv), ct: toHex(ct) };
}

async function decryptMnemonic(vault, passphrase) {
  const salt = fromHex(vault.salt);
  const iv = fromHex(vault.iv);
  const ct = fromHex(vault.ct);
  const key = await deriveKey(passphrase, salt);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new TextDecoder().decode(plain);
}

// ── Session state (cleared when browser closes) ────────────────────────────

let _sessionKey = null;

async function getSession() {
  return new Promise(resolve => {
    chrome.storage.session.get([SESSION_KEY], r => resolve(r[SESSION_KEY] || null));
  });
}

async function setSession(data) {
  return new Promise(resolve => {
    chrome.storage.session.set({ [SESSION_KEY]: data }, resolve);
  });
}

async function clearSession() {
  _sessionKey = null;
  return new Promise(resolve => {
    chrome.storage.session.remove([SESSION_KEY], resolve);
  });
}

async function decryptWithKey(vault, key) {
  const iv = fromHex(vault.iv);
  const ct = fromHex(vault.ct);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new TextDecoder().decode(plain);
}

async function getSessionMnemonic() {
  const session = await getSession();
  if (!session || !session.blob) return null;
  if (!_sessionKey) return null;
  try {
    return await decryptWithKey(session.blob, _sessionKey);
  } catch {
    return null;
  }
}

// ── Persistent vault ───────────────────────────────────────────────────────

async function getVault() {
  return new Promise(resolve => {
    chrome.storage.local.get([STORAGE_KEY], r => resolve(r[STORAGE_KEY] || null));
  });
}

async function saveVault(vault) {
  return new Promise(resolve => {
    chrome.storage.local.set({ [STORAGE_KEY]: vault }, resolve);
  });
}

async function clearVault() {
  return new Promise(resolve => {
    chrome.storage.local.remove([STORAGE_KEY], resolve);
  });
}

// ── Unlock attempts & Exponential Backoff ──────────────────────────────────

async function getUnlockAttempts() {
  return new Promise(resolve => {
    chrome.storage.local.get([UNLOCK_ATTEMPTS_KEY], r => resolve(r[UNLOCK_ATTEMPTS_KEY] || { count: 0, lockedUntil: 0 }));
  });
}

async function recordFailedUnlock() {
  const state = await getUnlockAttempts();
  state.count = (state.count || 0) + 1;
  const now = Date.now();
  if (state.count >= 10) {
    state.lockedUntil = now + 300_000; // 5 min lockout
  } else if (state.count >= 5) {
    state.lockedUntil = now + 10_000; // 10 sec lockout
  }
  await new Promise(resolve => chrome.storage.local.set({ [UNLOCK_ATTEMPTS_KEY]: state }, resolve));
  return state;
}

async function resetUnlockAttempts() {
  await new Promise(resolve => chrome.storage.local.set({ [UNLOCK_ATTEMPTS_KEY]: { count: 0, lockedUntil: 0 } }, resolve));
}

// ── Connected Origins (Per-origin connection permissions) ──────────────────

async function getConnectedOrigins() {
  return new Promise(resolve => {
    chrome.storage.local.get([CONNECTED_ORIGINS_KEY], r => resolve(r[CONNECTED_ORIGINS_KEY] || []));
  });
}

async function addConnectedOrigin(origin) {
  if (!origin || origin === 'null') return;
  const origins = await getConnectedOrigins();
  if (!origins.includes(origin)) {
    origins.push(origin);
    await new Promise(resolve => chrome.storage.local.set({ [CONNECTED_ORIGINS_KEY]: origins }, resolve));
  }
}

function getSenderOrigin(sender) {
  if (!sender) return 'extension';
  if (sender.tab?.url) {
    try { return new URL(sender.tab.url).origin; } catch {}
  }
  return sender.origin || 'extension';
}

// ── Signing helpers ────────────────────────────────────────────────────────

async function deriveWallet(mnemonic) {
  const wallet = Wallet.fromPhrase(mnemonic);
  return { address: wallet.address, privateKey: wallet.privateKey };
}

function normalizeTx(tx) {
  const out = { ...tx };
  if (out.gas && !out.gasLimit) { out.gasLimit = out.gas; delete out.gas; }
  if (out.chainId !== undefined) out.chainId = parseChainId(out.chainId);
  Object.keys(out).forEach(k => { if (out[k] === null || out[k] === undefined) delete out[k]; });
  return out;
}

async function signMessage(mnemonic, message) {
  const wallet = Wallet.fromPhrase(mnemonic);
  return wallet.signMessage(message);
}

async function signTypedData(mnemonic, domain, types, value) {
  const wallet = Wallet.fromPhrase(mnemonic);
  return wallet.signTypedData(domain, types, value);
}

// ── Chain → public RPC ─────────────────────────────────────────────────────

function parseChainId(chainId) {
  if (!chainId) return 1;
  if (typeof chainId === 'number') return chainId;
  return Number(BigInt(chainId));
}

function getRpcForChain(chainId) {
  const id = parseChainId(chainId);
  const rpcs = {
    1:       'https://cloudflare-eth.com',
    8453:    'https://mainnet.base.org',
    42161:   'https://arb1.arbitrum.io/rpc',
    10:      'https://mainnet.optimism.io',
    137:     'https://polygon-rpc.com',
    56:      'https://bsc-dataseed.binance.org',
    43114:   'https://api.avax.network/ext/bc/C/rpc',
    250:     'https://rpc.ftm.tools',
    324:     'https://mainnet.era.zksync.io',
    59144:   'https://rpc.linea.build',
    534352:  'https://rpc.scroll.io',
    81457:   'https://rpc.blast.io',
    100:     'https://rpc.gnosischain.com',
    42220:   'https://forno.celo.org',
  };
  return rpcs[id] || rpcs[1];
}

async function proxyRpc(chainId, method, params) {
  const url = getRpcForChain(chainId);
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params: params || [] }),
  });
  const data = await resp.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return data.result;
}

// ── Pending approvals — persisted in session storage ───────────────────────

const pendingRequests = new Map(); // requestId → { resolve }

async function setPendingRequest(requestId, payload) {
  await chrome.storage.session.set({ [`cw_pending_${requestId}`]: payload });
  chrome.action.setBadgeText({ text: '!' });
  chrome.action.setBadgeBackgroundColor({ color: '#a855f7' });
}

async function clearPendingRequest(requestId) {
  await chrome.storage.session.remove([`cw_pending_${requestId}`]);
  const all = await new Promise(r => chrome.storage.session.get(null, r));
  const remaining = Object.keys(all).filter(k => k.startsWith('cw_pending_'));
  if (remaining.length === 0) chrome.action.setBadgeText({ text: '' });
}

function requestApproval(requestId, payload) {
  return new Promise(async (resolve) => {
    pendingRequests.set(requestId, { resolve });
    await setPendingRequest(requestId, payload);
    // 5-minute timeout
    setTimeout(async () => {
      if (pendingRequests.has(requestId)) {
        pendingRequests.get(requestId).resolve(false);
        pendingRequests.delete(requestId);
        await clearPendingRequest(requestId);
      }
    }, 300000);
  });
}

// ── Message handlers ───────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  handleMessage(msg, sender).then(sendResponse).catch(err => {
    console.error('[CW bg] Error:', err);
    sendResponse({ error: err.message || String(err) });
  });
  return true; // keep async channel open
});

// Allow authorized web apps (e.g. abdwallet.com) to communicate securely
if (chrome.runtime.onMessageExternal) {
  chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {
    const origin = sender?.origin || (sender?.url ? new URL(sender.url).origin : '');
    if (!ALLOWED_ATTACH_ORIGINS.has(origin)) {
      sendResponse({ error: 'Forbidden origin: ' + origin });
      return false;
    }
    handleMessage(msg, sender).then(sendResponse).catch(err => {
      console.error('[CW bg external] Error:', err);
      sendResponse({ error: err.message || String(err) });
    });
    return true;
  });
}

async function handleMessage(msg, sender) {
  const { type } = msg || {};
  const isInternalPopup = sender && sender.id === chrome.runtime.id && !sender.tab;
  const senderOrigin = getSenderOrigin(sender);

  // ── SENDER ISOLATION: Strict enforcement ──────────────────────────────────
  const POPUP_ONLY = new Set(['CW_APPROVE', 'CW_UNLOCK', 'CW_LOCK', 'CW_WIPE', 'CW_STATUS']);
  if (POPUP_ONLY.has(type) && !isInternalPopup) {
    return { error: 'Forbidden: Message type restricted to extension popup only' };
  }

  // ── Attach ────────────────────────────────────────────────────────────────
  if (type === 'CW_ATTACH') {
    const isAllowed = isInternalPopup || ALLOWED_ATTACH_ORIGINS.has(senderOrigin);
    if (!isAllowed) {
      return { error: 'Forbidden: Attach is only permitted from extension popup or trusted webapp' };
    }
    const { mnemonic, passphrase } = msg;
    const vault = await encryptMnemonic(mnemonic, passphrase);
    const { address } = await deriveWallet(mnemonic);
    vault.address = address;
    await saveVault(vault);
    _sessionKey = await deriveKey(passphrase, fromHex(vault.salt));
    await setSession({ address, unlockedAt: Date.now(), blob: { salt: vault.salt, iv: vault.iv, ct: vault.ct } });
    await resetUnlockAttempts();
    return { ok: true, address };
  }

  // ── Unlock (with Exponential Backoff Protection) ──────────────────────────
  if (type === 'CW_UNLOCK') {
    const unlockState = await getUnlockAttempts();
    if (unlockState.lockedUntil && Date.now() < unlockState.lockedUntil) {
      const remainingSec = Math.ceil((unlockState.lockedUntil - Date.now()) / 1000);
      return { error: `Too many failed attempts. Locked for ${remainingSec}s` };
    }

    const { passphrase } = msg;
    const vault = await getVault();
    if (!vault) return { error: 'No vault — attach first' };
    try {
      const mnemonic = await decryptMnemonic(vault, passphrase);
      const { address } = await deriveWallet(mnemonic);
      _sessionKey = await deriveKey(passphrase, fromHex(vault.salt));
      await setSession({ address, unlockedAt: Date.now(), blob: { salt: vault.salt, iv: vault.iv, ct: vault.ct } });
      await resetUnlockAttempts();
      return { ok: true, address };
    } catch {
      const newState = await recordFailedUnlock();
      if (newState.lockedUntil && Date.now() < newState.lockedUntil) {
        const remainingSec = Math.ceil((newState.lockedUntil - Date.now()) / 1000);
        return { error: `Wrong passphrase. Locked for ${remainingSec}s` };
      }
      return { error: 'Wrong passphrase' };
    }
  }

  // ── Lock ──────────────────────────────────────────────────────────────────
  if (type === 'CW_LOCK') {
    await clearSession();
    return { ok: true };
  }

  // ── Wipe ──────────────────────────────────────────────────────────────────
  if (type === 'CW_WIPE') {
    await clearSession();
    await clearVault();
    chrome.action.setBadgeText({ text: '' });
    return { ok: true };
  }

  // ── Status ────────────────────────────────────────────────────────────────
  if (type === 'CW_STATUS') {
    const vault = await getVault();
    const session = await getSession();
    return {
      hasVault: !!vault,
      isUnlocked: !!session,
      address: vault?.address || session?.address || null,
    };
  }

  // ── EIP-1193: eth_requestAccounts (with explicit origin permission) ───────
  if (type === 'CW_ETH_REQUEST_ACCOUNTS') {
    const session = await getSession();
    if (!session) {
      chrome.action.setBadgeText({ text: '●' });
      return { error: 'Locked — click the ABD Wallet icon to unlock' };
    }
    const connected = await getConnectedOrigins();
    if (!connected.includes(senderOrigin)) {
      const requestId = String(Date.now());
      const approved = await requestApproval(requestId, {
        type: 'connect',
        origin: senderOrigin,
        address: session.address,
      });
      if (!approved) return { error: 'User rejected connection' };
      await clearPendingRequest(requestId);
      await addConnectedOrigin(senderOrigin);
    }
    chrome.action.setBadgeText({ text: '' });
    return { result: [session.address] };
  }

  // ── EIP-1193: eth_accounts (only returns address if origin is pre-connected)
  if (type === 'CW_ETH_ACCOUNTS') {
    const session = await getSession();
    if (!session) return { result: [] };
    const connected = await getConnectedOrigins();
    if (!connected.includes(senderOrigin)) return { result: [] };
    return { result: [session.address] };
  }

  // ── EIP-1193: personal_sign ───────────────────────────────────────────────
  if (type === 'CW_PERSONAL_SIGN') {
    const { message, requestId } = msg;
    const mnemonic = await getSessionMnemonic();
    if (!mnemonic) return { error: 'Locked — reopen the popup and unlock again' };
    const approved = await requestApproval(requestId, { type: 'personal_sign', message, origin: senderOrigin });
    if (!approved) return { error: 'User rejected signature request' };
    await clearPendingRequest(requestId);
    const sig = await signMessage(mnemonic, message);
    return { result: sig };
  }

  // ── EIP-1193: eth_signTypedData_v4 ────────────────────────────────────────
  if (type === 'CW_SIGN_TYPED') {
    const { domain, types, value, requestId } = msg;
    const mnemonic = await getSessionMnemonic();
    if (!mnemonic) return { error: 'Locked — reopen the popup and unlock again' };
    const approved = await requestApproval(requestId, { type: 'typed_data', domain, types, value, origin: senderOrigin });
    if (!approved) return { error: 'User rejected typed data signature' };
    await clearPendingRequest(requestId);
    const sig = await signTypedData(mnemonic, domain, types, value);
    return { result: sig };
  }

  // ── EIP-1193: eth_sendTransaction (Cross-Chain Replay Protected) ──────────
  if (type === 'CW_SEND_TX') {
    const { tx, requestId, chainId: msgChainId } = msg;
    const mnemonic = await getSessionMnemonic();
    if (!mnemonic) return { error: 'Locked — reopen the popup and unlock again' };

    const chainId = parseChainId(msgChainId || tx?.chainId || 1);
    const rpcUrl = getRpcForChain(chainId);
    if (!rpcUrl) return { error: 'Unsupported chain ID: ' + chainId };

    const wallet = Wallet.fromPhrase(mnemonic);
    if (tx.from && tx.from.toLowerCase() !== wallet.address.toLowerCase()) {
      return { error: 'Transaction from address mismatch: signer does not own ' + tx.from };
    }

    const normalizedTx = normalizeTx({
      ...tx,
      from: wallet.address,
      chainId,
      type: tx.type !== undefined ? tx.type : 2,
    });

    const approved = await requestApproval(requestId, { type: 'send_tx', tx: normalizedTx, origin: senderOrigin, chainId });
    if (!approved) return { error: 'User rejected transaction' };
    await clearPendingRequest(requestId);

    try {
      const signed = await wallet.signTransaction(normalizedTx);
      const resp = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_sendRawTransaction', params: [signed], id: 1 }),
      });
      const data = await resp.json();
      if (data.error) return { error: data.error.message || JSON.stringify(data.error) };
      return { result: data.result };
    } catch (e) {
      return { error: e.message };
    }
  }

  // ── Approval response from popup ──────────────────────────────────────────
  if (type === 'CW_APPROVE') {
    // Already checked isInternalPopup above
    const { requestId, approved } = msg;
    const pending = pendingRequests.get(requestId);
    if (pending) {
      pending.resolve(approved);
      pendingRequests.delete(requestId);
    }
    await clearPendingRequest(requestId);
    return { ok: true };
  }

  // ── RPC pass-through — all other eth_ methods ─────────────────────────────
  if (type === 'CW_RPC') {
    const { method, params, chainId } = msg;
    try {
      const result = await proxyRpc(chainId || 1, method, params);
      return { result };
    } catch (e) {
      return { error: e.message };
    }
  }

  return { error: 'Unknown message type: ' + type };
}

console.log('[ABD Wallet] Background service worker initialized with sender isolation');
