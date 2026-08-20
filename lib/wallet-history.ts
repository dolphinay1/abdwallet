import { persistVault, loadPersistedVault, nukePersistedVault } from './persistent-vault';

const HISTORY_KEY = '__gw_wallet_history__';
/**
 * Maximum number of UNSAVED (ephemeral) wallets kept in history.
 * Saved wallets are pinned and never counted against — or evicted by — this limit.
 */
const MAX_HISTORY = 5;
export const MAX_UNSAVED_HISTORY = MAX_HISTORY;
const NON_EVM_WARNED_KEY = '__gw_non_evm_warned__';
const VAULT_PREFIX = '__gw_vault_';

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

// ── One-time migration & legacy cleanup ───────────────────────────────────────
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('__gw_hs_key__');
    localStorage.removeItem('__gwvs_bk__');
    // Clear any legacy plaintext or weakly keyed vault blobs from localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(VAULT_PREFIX)) {
        localStorage.removeItem(key);
      }
    }
  } catch {}
}

export function markWalletSaved(id: string): void {
  const history = load();
  const updated = history.map(s => s.id === id ? { ...s, isSaved: true, vaultMode: 'PERSISTENT' as const } : s);
  save(updated);
}

export async function persistWallet(id: string, mnemonic: string, passphrase?: string): Promise<void> {
  const secretKey = passphrase || id;
  await persistVault(mnemonic, secretKey, id);
  markWalletSaved(id);
}

export async function loadSavedMnemonic(id: string, passphrase?: string): Promise<string> {
  const secretKey = passphrase || id;
  return loadPersistedVault(secretKey, id);
}

export async function deleteSavedVault(id: string): Promise<void> {
  await nukePersistedVault(id);
  const history = load();
  const updated = history.map(s => s.id === id ? { ...s, isSaved: false, vaultMode: 'EPHEMERAL' as const } : s);
  save(updated);
}

export function getSavedVaults(): WalletSnapshot[] {
  return load().filter(s => isSnapshotSaved(s));
}

/**
 * Backward-compatible "is this wallet saved to a vault?" check.
 * Older history entries written before `isSaved` existed only carry `vaultMode`,
 * so fall back to that instead of crashing or silently dropping them.
 */
export function isSnapshotSaved(snap?: Partial<WalletSnapshot> | null): boolean {
  if (!snap || typeof snap !== 'object') return false;
  if (typeof snap.isSaved === 'boolean') return snap.isSaved;
  return snap.vaultMode === 'PERSISTENT';
}

// ── History CRUD ──────────────────────────────────────────────────────────────
function load(): WalletSnapshot[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Normalise legacy entries that predate the `isSaved` flag so downstream
    // code can rely on it without extra guards.
    return parsed
      .filter((s): s is WalletSnapshot => !!s && typeof s === 'object' && typeof s.id === 'string')
      .map(s => {
        const saved = isSnapshotSaved(s);
        return {
          ...s,
          isSaved: saved,
          vaultMode: s.vaultMode ?? (saved ? 'PERSISTENT' : 'EPHEMERAL'),
        };
      });
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
  const previous = history.find(s => s.id === snapshot.id);
  const filtered = history.filter(s => s.id !== snapshot.id);
  const full: WalletSnapshot = {
    ...snapshot,
    // Never downgrade an already-saved wallet when its snapshot is refreshed.
    isSaved: isSnapshotSaved(snapshot) || isSnapshotSaved(previous),
    createdAt: Date.now(),
  };
  if (full.isSaved) full.vaultMode = 'PERSISTENT';

  const combined = [full, ...filtered];

  // Saved wallets are pinned: they neither occupy an unsaved slot nor get evicted.
  // Only the newest MAX_HISTORY unsaved wallets survive; older unsaved ones drop off.
  const keptUnsaved = new Set(
    combined.filter(s => !isSnapshotSaved(s)).slice(0, MAX_HISTORY).map(s => s.id)
  );
  const updated = combined.filter(s => isSnapshotSaved(s) || keptUnsaved.has(s.id));

  combined
    .filter(s => !isSnapshotSaved(s) && !updated.some(u => u.id === s.id))
    .forEach(s => deleteSavedVault(s.id));
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

export function clearUnsavedBlobs(): void {
  const history = load();
  history.forEach(s => { if (!isSnapshotSaved(s)) deleteSavedVault(s.id); });
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
