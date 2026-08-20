// Persistent Vault — passphrase-only AES-GCM encryption with per-vault random salt
// Mnemonic is encrypted with PBKDF2(passphrase, random_salt, 600k iterations) and stored as 4 shards in IndexedDB.
import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'sys_cache';
const DB_VERSION = 1;
const STORES = ['theme_config', 'ui_state', 'app_meta', 'render_cache'];
const SHARD_KEYS = ['theme_config_part_1', 'ui_state_delta', 'app_meta_fragment', 'render_cache_v2'];
const LEGACY_SALT = 'abd-vault-v2';

interface EncryptedShard {
  iv: string;
  data: string;
  salt?: string; // hex-encoded 16-byte salt
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

async function encryptShard(data: string, key: CryptoKey, saltHex: string): Promise<EncryptedShard> {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(data));
  return {
    iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
    data: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    salt: saltHex,
  };
}

async function decryptShard(shard: EncryptedShard, passphrase: string): Promise<{ text: string; wasLegacy: boolean }> {
  const isLegacy = !shard.salt;
  const saltBytes = shard.salt
    ? new Uint8Array(shard.salt.match(/.{2}/g)!.map(b => parseInt(b, 16)))
    : new TextEncoder().encode(LEGACY_SALT);

  const key = await deriveKey(passphrase, saltBytes);
  const iv = new Uint8Array(shard.iv.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  const data = Uint8Array.from(atob(shard.data), c => c.charCodeAt(0));
  const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
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
    const encrypted = await encryptShard(shard, key, saltHex);
    await db.put(STORES[i], encrypted, getShardKey(i, vaultId));
  }
}

export async function hasPersistedVault(vaultId?: string): Promise<boolean> {
  try {
    const db = await getDB();
    return !!(await db.get(STORES[0], getShardKey(0, vaultId)));
  } catch { return false; }
}

let _failedAttempts = 0;

export async function loadPersistedVault(passphrase: string, vaultId?: string): Promise<string> {
  if (_failedAttempts >= 5) { await nukePersistedVault(vaultId); throw new Error('Too many attempts'); }
  try {
    const db = await getDB();
    const parts: string[] = [];
    let hadLegacyShards = false;

    for (let i = 0; i < SHARD_KEYS.length; i++) {
      const shard: EncryptedShard | undefined = await db.get(STORES[i], getShardKey(i, vaultId));
      if (!shard) throw new Error('Vault not found');
      const res = await decryptShard(shard, passphrase);
      parts.push(res.text);
      if (res.wasLegacy) hadLegacyShards = true;
    }
    _failedAttempts = 0;
    const mnemonic = parts.join(' ').trim();

    // Transparent automatic migration for legacy vaults: re-encrypt with modern random salt
    if (hadLegacyShards) {
      try {
        await persistVault(mnemonic, passphrase, vaultId);
      } catch {}
    }

    return mnemonic;
  } catch {
    _failedAttempts++;
    if (_failedAttempts >= 5) await nukePersistedVault(vaultId);
    throw new Error('Wrong passphrase');
  }
}

export async function nukePersistedVault(vaultId?: string): Promise<void> {
  try {
    const db = await getDB();
    for (let i = 0; i < SHARD_KEYS.length; i++) await db.delete(STORES[i], getShardKey(i, vaultId));
  } catch {}
  _failedAttempts = 0;
}
