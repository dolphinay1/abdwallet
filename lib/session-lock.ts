// Session Lock — explicit user opt-in to localStorage persistence.
// Encrypted with a stable per-browser key stored in localStorage alongside the payload.
// Survives page refresh; cleared only when user disables the toggle or wipes the wallet.

const _KEY = '__gwvs__';
const _BK = '__gwvs_bk__';
const _SHADOW = '__gwsh__'; // shadow copy — survives wipes, used only for persist flow recovery

// Pure TypeScript SHA-256 and HMAC-SHA256 implementation for synchronous derivation
function utf8Encode(str: string): number[] {
  const utf8: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let charcode = str.charCodeAt(i);
    if (charcode < 0x80) utf8.push(charcode);
    else if (charcode < 0x800) {
      utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
    }
    else if (charcode < 0xd800 || charcode >= 0xe000) {
      utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
    }
    else {
      i++;
      charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      utf8.push(0xf0 | (charcode >> 18), 0x80 | ((charcode >> 12) & 0x3f), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
    }
  }
  return utf8;
}

function sha256Sync(message: number[]): number[] {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  const H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  let l = message.length * 8;
  message.push(0x80);
  while ((message.length * 8 + 64) % 512 !== 0) message.push(0);
  
  message.push(
    0, 0, 0, 0,
    (l >>> 24) & 0xff, (l >>> 16) & 0xff, (l >>> 8) & 0xff, l & 0xff
  );

  for (let i = 0; i < message.length; i += 64) {
    const w: number[] = [];
    for (let j = 0; j < 16; j++) {
      w[j] = (message[i + j * 4] << 24) | (message[i + j * 4 + 1] << 16) | (message[i + j * 4 + 2] << 8) | (message[i + j * 4 + 3]);
    }
    for (let j = 16; j < 64; j++) {
      const s0 = (w[j - 15] >>> 7 | w[j - 15] << 25) ^ (w[j - 15] >>> 18 | w[j - 15] << 14) ^ (w[j - 15] >>> 3);
      const s1 = (w[j - 2] >>> 17 | w[j - 2] << 15) ^ (w[j - 2] >>> 19 | w[j - 2] << 13) ^ (w[j - 2] >>> 10);
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
    }

    let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];

    for (let j = 0; j < 64; j++) {
      const S1 = (e >>> 6 | e << 26) ^ (e >>> 11 | e << 21) ^ (e >>> 25 | e << 7);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[j] + w[j]) | 0;
      const S0 = (a >>> 2 | a << 30) ^ (a >>> 13 | a << 19) ^ (a >>> 22 | a << 10);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g; g = f; f = e; e = (d + temp1) | 0;
      d = c; c = b; b = a; a = (temp1 + temp2) | 0;
    }

    H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
  }

  const out = [];
  for (let i = 0; i < 8; i++) {
    out.push((H[i] >>> 24) & 0xff, (H[i] >>> 16) & 0xff, (H[i] >>> 8) & 0xff, H[i] & 0xff);
  }
  return out;
}

function hmacSha256(key: string, message: string): string {
  let keyBytes = utf8Encode(key);
  const msgBytes = utf8Encode(message);

  if (keyBytes.length > 64) {
    keyBytes = sha256Sync(keyBytes);
  }
  while (keyBytes.length < 64) {
    keyBytes.push(0);
  }

  const ipad = [];
  const opad = [];
  for (let i = 0; i < 64; i++) {
    ipad.push(keyBytes[i] ^ 0x36);
    opad.push(keyBytes[i] ^ 0x5c);
  }

  const innerHash = sha256Sync(ipad.concat(msgBytes));
  const outerHash = sha256Sync(opad.concat(innerHash));

  let res = '';
  for (let i = 0; i < outerHash.length; i++) {
    res += outerHash[i].toString(16).padStart(2, '0');
  }
  return res;
}

function getBrowserFingerprint(): string {
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'unknown';
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
    const sw = typeof screen !== 'undefined' ? screen.width : 0;
    const sh = typeof screen !== 'undefined' ? screen.height : 0;
    return `${origin}|${ua}|${sw}x${sh}`;
  } catch {
    return 'fallback-fingerprint';
  }
}

let _inMemoryTabSeed: string | null = null;

// One-time cleanup of legacy insecure master seed and key material from localStorage
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem(_BK);
    localStorage.removeItem('__gw_hs_key__');
  } catch {}
}

function getOrCreateBrowserKey(): string {
  // Use in-memory ephemeral seed (never stored in localStorage)
  if (!_inMemoryTabSeed) {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      _inMemoryTabSeed = Array.from(array)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    } else {
      throw new Error('No secure random generator available');
    }
  }

  // Derive the session key in-memory safely with fingerprint salt
  const salt = "abdwallet_salt_" + getBrowserFingerprint();
  const derivedKey = hmacSha256(_inMemoryTabSeed, salt);
  return derivedKey;
}

export function getTabKey(): string {
  return getOrCreateBrowserKey();
}

export function saveSession(encrypted: string): void {
  try {
    localStorage.setItem(_KEY, encrypted);
    localStorage.setItem(_SHADOW, encrypted);
  } catch {}
}

export function loadSession(): string | null {
  try { return localStorage.getItem(_KEY) || localStorage.getItem(_SHADOW) || null; } catch { return null; }
}

export function clearShadow(): void {
  try { localStorage.removeItem(_SHADOW); } catch {}
}

export function clearSession(): void {
  // Wipe both active session and shadow copy to prevent data persistence after lock/wipe
  try {
    localStorage.removeItem(_KEY);
    localStorage.removeItem(_SHADOW);
  } catch {}
}

export function hasSession(): boolean {
  try { return !!localStorage.getItem(_KEY); } catch { return false; }
}

