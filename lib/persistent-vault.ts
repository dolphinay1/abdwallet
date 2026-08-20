// Persistent Vault — passphrase-only AES-GCM encryption with per-vault random salt and AAD
// Mnemonic is encrypted with PBKDF2(passphrase, random_salt, 600k iterations) and stored as 4 authenticated shards in IndexedDB.
import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'sys_cache';
const DB_VERSION = 1;
const STORES = ['theme_config', 'ui_state', 'app_meta', 'render_cache'];
const SHARD_KEYS = ['theme_config_part_1', 'ui_state_delta', 'app_meta_fragment', 'render_cache_v2'];
const LEGACY_SALT = 'abd-vault-v2';
const ATTEMPTS_STORE_KEY = '__pv_failed_attempts__';

interface EncryptedShard {
  iv: string;
  data: string;
  salt?: string; // hex-encoded 16-byte salt
  hasAAD?: boolean;
}

interface AttemptState {
  count: number;
  lockedUntil: number;
}

function getAttemptState(vaultId?: string): AttemptState {
  if (typeof window === 'undefined' || !window.localStorage) return { count: 0, lockedUntil: 0 };
  try {
    const raw = localStorage.getItem(`${ATTEMPTS_STORE_KEY}_${vaultId || 'default'}`);
    return raw ? JSON.parse(raw) : { count: 0, lockedUntil: 0 };
  } catch {
    return { count: 0, lockedUntil: 0 };
  }
}

function saveAttemptState(state: AttemptState, vaultId?: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(`${ATTEMPTS_STORE_KEY}_${vaultId || 'default'}`, JSON.stringify(state));
  } catch {}
}

function recordFailedAttempt(vaultId?: string): AttemptState {
  const state = getAttemptState(vaultId);
  state.count = (state.count || 0) + 1;
  const now = Date.now();
  if (state.count >= 15) {
    state.lockedUntil = now + 1800_000; // 30 minutes
  } else if (state.count >= 10) {
    state.lockedUntil = now + 300_000; // 5 minutes
  } else if (state.count >= 5) {
    state.lockedUntil = now + 10_000; // 10 seconds
  }
  saveAttemptState(state, vaultId);
  return state;
}

function resetFailedAttempts(vaultId?: string): void {
  saveAttemptState({ count: 0, lockedUntil: 0 }, vaultId);
}

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store);
      }
    },
  });
}

function getShardKey(index: number, vaultId?: string): string {
  const baseKey = SHARD_KEYS[index];
  return vaultId && vaultId !== 'default' ? `${baseKey}_${vaultId}` : baseKey;
}

function getShardAAD(index: number, vaultId?: string): Uint8Array {
  return new TextEncoder().encode(`shard:${index}:${vaultId || 'default'}:v3`);
}

// PBKDF2 with 600k iterations — passphrase + 16-byte cryptographic salt
async function deriveKey(passphrase: string, saltBytes: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBytes as unknown as BufferSource, iterations: 600_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptShard(data: string, key: CryptoKey, saltHex: string, aad: Uint8Array): Promise<EncryptedShard> {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: aad as unknown as BufferSource },
    key,
    enc.encode(data)
  );
  return {
    iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
    data: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    salt: saltHex,
    hasAAD: true,
  };
}

async function decryptShard(shard: EncryptedShard, passphrase: string, aad: Uint8Array): Promise<{ text: string; wasLegacy: boolean }> {
  const isLegacy = !shard.salt || !shard.hasAAD;
  const saltBytes = shard.salt
    ? new Uint8Array(shard.salt.match(/.{2}/g)!.map(b => parseInt(b, 16)))
    : new TextEncoder().encode(LEGACY_SALT);

  const key = await deriveKey(passphrase, saltBytes);
  const iv = new Uint8Array(shard.iv.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  const data = Uint8Array.from(atob(shard.data), c => c.charCodeAt(0));

  let dec: ArrayBuffer;
  if (shard.hasAAD) {
    dec = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, additionalData: aad as unknown as BufferSource },
      key,
      data
    );
  } else {
    // Legacy decrypt without AAD
    dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  }

  return {
    text: new TextDecoder().decode(dec),
    wasLegacy: isLegacy,
  };
}

export async function persistVault(mnemonic: string, passphrase: string, vaultId?: string): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const key = await deriveKey(passphrase, salt);

  const words = mnemonic.split(' ');
  const chunkSize = Math.ceil(words.length / SHARD_KEYS.length);
  const db = await getDB();
  for (let i = 0; i < SHARD_KEYS.length; i++) {
    const shard = words.slice(i * chunkSize, (i + 1) * chunkSize).join(' ');
    const aad = getShardAAD(i, vaultId);
    const encrypted = await encryptShard(shard, key, saltHex, aad);
    await db.put(STORES[i], encrypted, getShardKey(i, vaultId));
  }
  resetFailedAttempts(vaultId);
}

export async function hasPersistedVault(vaultId?: string): Promise<boolean> {
  try {
    const db = await getDB();
    return !!(await db.get(STORES[0], getShardKey(0, vaultId)));
  } catch { return false; }
}

export async function loadPersistedVault(passphrase: string, vaultId?: string): Promise<string> {
  const state = getAttemptState(vaultId);
  if (state.lockedUntil && Date.now() < state.lockedUntil) {
    const remainingSec = Math.ceil((state.lockedUntil - Date.now()) / 1000);
    throw new Error(`Too many failed attempts. Vault locked for ${remainingSec} seconds`);
  }

  try {
    const db = await getDB();
    const parts: string[] = [];
    let hadLegacyShards = false;

    for (let i = 0; i < SHARD_KEYS.length; i++) {
      const shard: EncryptedShard | undefined = await db.get(STORES[i], getShardKey(i, vaultId));
      if (!shard) throw new Error('Vault not found');
      const aad = getShardAAD(i, vaultId);
      const res = await decryptShard(shard, passphrase, aad);
      parts.push(res.text);
      if (res.wasLegacy) hadLegacyShards = true;
    }
    
    resetFailedAttempts(vaultId);
    const mnemonic = parts.join(' ').trim();

    // Transparent automatic migration for legacy vaults: re-encrypt with modern random salt & AAD
    if (hadLegacyShards) {
      try {
        await persistVault(mnemonic, passphrase, vaultId);
      } catch {}
    }

    return mnemonic;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '';
    if (message.includes('locked for')) {
      throw err;
    }
    const newState = recordFailedAttempt(vaultId);
    if (newState.lockedUntil && Date.now() < newState.lockedUntil) {
      const remainingSec = Math.ceil((newState.lockedUntil - Date.now()) / 1000);
      throw new Error(`Wrong passphrase. Vault locked for ${remainingSec} seconds`);
    }
    throw new Error('Wrong passphrase');
  }
}

export async function nukePersistedVault(vaultId?: string): Promise<void> {
  try {
    const db = await getDB();
    for (let i = 0; i < SHARD_KEYS.length; i++) await db.delete(STORES[i], getShardKey(i, vaultId));
  } catch {}
  resetFailedAttempts(vaultId);
}
