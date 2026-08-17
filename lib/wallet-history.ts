// Wallet history — session-based auto-tracking + encrypted persist.
// Uses session-derived ephemeral keying without plaintext key storage in localStorage.

import { getTabKey } from './session-lock';

const HISTORY_KEY = '__gw_wallet_history__';
const MAX_HISTORY = 5;
const NON_EVM_WARNED_KEY = '__gw_non_evm_warned__';
const VAULT_PREFIX = '__gw_vault_';
const LEGACY_KEY_MATERIAL = '__gw_hs_key__';

export interface WalletSnapshot {
  id: string;
  address: string;           // EVM address for display
  shortAddress: string;      // 0x1234...5678
  createdAt: number;         // unix ms
  label?: string;
  isSaved: boolean;
  vaultMode: 'EPHEMERAL' | 'PERSISTENT';
  chainId?: number;
  chainName?: string;
  chainColor?: string;
  chainLogo?: string;
  coinSymbol?: string;
  isNonEvm?: boolean;
}

// ── AES-GCM helpers using session-derived ephemeral key ─────────────────────────
async function getAppKey(): Promise<CryptoKey> {
  // Wipe any legacy plaintext key material from localStorage
  try { localStorage.removeItem(LEGACY_KEY_MATERIAL); } catch {}

  const keyHex = getTabKey();
  const rawBytes = new Uint8Array(keyHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  return crypto.subtle.importKey('raw', rawBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function encryptMnemonic(mnemonic: string): Promise<string> {
  const iv  = crypto.getRandomValues(new Uint8Array(12));
  const key = await getAppKey();
  const ct  = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(mnemonic));
  const buf = new Uint8Array(12 + ct.byteLength);
  buf.set(iv, 0);
  buf.set(new Uint8Array(ct), 12);
  return btoa(String.fromCharCode(...buf));
}

async function decryptMnemonic(blob: string): Promise<string> {
  const buf = Uint8Array.from(atob(blob), c => c.charCodeAt(0));
  const iv  = buf.slice(0, 12);
  const ct  = buf.slice(12);
  const key = await getAppKey();
  const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new TextDecoder().decode(dec);
}

// ── Saved vault storage ───────────────────────────────────────────────────────
function vaultKey(id: string): string { return `${VAULT_PREFIX}${id}__`; }

export async function storeVaultBlob(id: string, mnemonic: string): Promise<void> {
  const blob = await encryptMnemonic(mnemonic);
  try { localStorage.setItem(vaultKey(id), blob); } catch {}
}

export function markWalletSaved(id: string): void {
  const history = load();
  const updated = history.map(s => s.id === id ? { ...s, isSaved: true } : s);
  save(updated);
}

export async function persistWallet(id: string, mnemonic: string): Promise<void> {
  await storeVaultBlob(id, mnemonic);
  markWalletSaved(id);
}

export async function loadSavedMnemonic(id: string): Promise<string> {
  const blob = localStorage.getItem(vaultKey(id));
  if (!blob) throw new Error('Vault not found');
  return decryptMnemonic(blob);
}

export function deleteSavedVault(id: string): void {
  try { localStorage.removeItem(vaultKey(id)); } catch {}
}

export function getSavedVaults(): WalletSnapshot[] {
  return load().filter(s => s.isSaved && !!localStorage.getItem(vaultKey(s.id)));
}

// ── History CRUD ──────────────────────────────────────────────────────────────
function load(): WalletSnapshot[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(list: WalletSnapshot[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch {}
}

export function getHistory(): WalletSnapshot[] {
  return load();
}

export function addToHistory(snapshot: Omit<WalletSnapshot, 'createdAt'>): WalletSnapshot[] {
  const history = load();
  const filtered = history.filter(s => s.id !== snapshot.id);
  const full: WalletSnapshot = {
    ...snapshot,
    createdAt: Date.now(),
  };
  const updated = [full, ...filtered].slice(0, MAX_HISTORY);
  save(updated);
  return updated;
}

export function updateSnapshotLabel(id: string, label: string): void {
  const history = load();
  const updated = history.map(s => s.id === id ? { ...s, label: label.trim() || undefined } : s);
  save(updated);
}

export function updateSnapshotChain(id: string, chainData: {
  chainId?: number;
  chainName?: string;
  chainColor?: string;
  chainLogo?: string;
  coinSymbol?: string;
  isNonEvm?: boolean;
}): void {
  const history = load();
  const updated = history.map(s => s.id === id ? { ...s, ...chainData } : s);
  save(updated);
}

export function removeFromHistory(id: string): WalletSnapshot[] {
  const history = load();
  const updated = history.filter(s => s.id !== id);
  save(updated);
  deleteSavedVault(id);
  return updated;
}

export function clearHistory(): void {
  const history = load();
  history.forEach(s => deleteSavedVault(s.id));
  try { localStorage.removeItem(HISTORY_KEY); } catch {}
}

export function findSnapshot(id: string): WalletSnapshot | undefined {
  return load().find(s => s.id === id);
}

export function makeSnapshot(
  address: string,
  vaultMode: 'EPHEMERAL' | 'PERSISTENT' = 'EPHEMERAL',
  chainData?: {
    chainId?: number;
    chainName?: string;
    chainColor?: string;
    chainLogo?: string;
    coinSymbol?: string;
    isNonEvm?: boolean;
  }
): Omit<WalletSnapshot, 'createdAt'> {
  const shortAddress = address.length > 10
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : address;
  const id = `${address.toLowerCase()}_${Date.now()}`;
  return {
    id,
    address,
    shortAddress,
    isSaved: false,
    vaultMode,
    ...chainData,
  };
}

export function hasNonEvmWarned(): boolean {
  try { return !!localStorage.getItem(NON_EVM_WARNED_KEY); } catch { return false; }
}

export function setNonEvmWarned(): void {
  try { localStorage.setItem(NON_EVM_WARNED_KEY, '1'); } catch {}
}
