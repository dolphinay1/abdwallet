import CryptoJS from 'crypto-js';

// Generate session key using crypto.getRandomValues, Node.js fallback
function generateSessionKey(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.getRandomValues) {
    const array = new Uint8Array(32);
    globalThis.crypto.getRandomValues(array);
    return Array.from(array)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } else {
    // SSR/Build fallback
    try {
      // eslint-disable-next-line
      const cryptoNode = require('crypto');
      return cryptoNode.randomBytes(32).toString('hex');
    } catch {
      throw new Error('No secure random number generator available.');
    }
  }
}

// SESSION_SALT: volatile, non-persistent — lives only in module scope (RAM)
let _currentKey: string = generateSessionKey();
let _nextKey: string = generateSessionKey();
let _keyRotationTimer: ReturnType<typeof setInterval> | null = null;

export function getCurrentKey(): string {
  return _currentKey;
}

export function getNextKey(): string {
  return _nextKey;
}

// Timing safe equality check for HMAC verification
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// Encrypt with random IV + HKDF/HMAC key derivation + HMAC integrity check
export function encryptData(plaintext: string, key?: string): string {
  const k = key ?? _currentKey;
  const salt = CryptoJS.lib.WordArray.random(16);
  // Fast, secure HKDF-style key derivation from 256-bit entropy (non-blocking for UI thread)
  const derivedKey = CryptoJS.HmacSHA256(salt, k);
  const iv = CryptoJS.lib.WordArray.random(16);
  const encrypted = CryptoJS.AES.encrypt(plaintext, derivedKey, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
  // HMAC for integrity verification
  const hmac = CryptoJS.HmacSHA256(salt.toString() + iv.toString() + encrypted.ciphertext.toString(), derivedKey);
  // Output: salt:iv:ciphertext:hmac (all hex except ciphertext which is base64 in output)
  return salt.toString() + ':' + iv.toString() + ':' + encrypted.ciphertext.toString(CryptoJS.enc.Base64) + ':' + hmac.toString();
}

// Decrypt with HMAC integrity verification
export function decryptData(ciphertextStr: string, key?: string): string {
  const k = key ?? _currentKey;
  const parts = ciphertextStr.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid ciphertext format');
  }
  const [saltHex, ivHex, cipherBase64, hmacHex] = parts;

  const salt = CryptoJS.enc.Hex.parse(saltHex);
  const iv = CryptoJS.enc.Hex.parse(ivHex);
  const cipherBase64Parsed = CryptoJS.enc.Base64.parse(cipherBase64);
  const cipherHex = cipherBase64Parsed.toString();

  const derivedKey = CryptoJS.HmacSHA256(salt, k);

  // Verify HMAC
  const expectedHmac = CryptoJS.HmacSHA256(saltHex + ivHex + cipherHex, derivedKey).toString();
  if (!timingSafeEqual(hmacHex, expectedHmac)) {
    throw new Error('Integrity check failed: invalid HMAC');
  }

  const cipherParams = CryptoJS.lib.CipherParams.create({
    ciphertext: cipherBase64Parsed
  });

  const decrypted = CryptoJS.AES.decrypt(cipherParams, derivedKey, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
  const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
  
  // Zero-fill the derived key words from memory
  for (let i = 0; i < derivedKey.words.length; i++) {
    derivedKey.words[i] = 0;
  }
  
  return plaintext;
}

// Rotate session keys — called from WalletContext
export function rotateKeys(onRotate: (oldKey: string, newKey: string) => void): void {
  const oldKey = _currentKey;
  _currentKey = _nextKey;
  _nextKey = generateSessionKey();
  onRotate(oldKey, _currentKey);
}

// Start automatic key rotation every 60 seconds
export function startKeyRotation(onRotate: (oldKey: string, newKey: string) => void): void {
  if (_keyRotationTimer) return;
  _keyRotationTimer = setInterval(() => {
    rotateKeys(onRotate);
  }, 60_000);
}

export function stopKeyRotation(): void {
  if (_keyRotationTimer) {
    clearInterval(_keyRotationTimer);
    _keyRotationTimer = null;
  }
}

// Scrub a string variable by overwriting with random data
export function scrubString(target: { value: string }): void {
  const noise = generateSessionKey();
  target.value = noise;
  target.value = '';
}

// Zero-fill a Uint8Array
export function zeroFill(buf: Uint8Array): void {
  buf.fill(0);
}

// SHA-256 hash (hex)
export async function sha256(data: string): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  let hashBuffer: ArrayBuffer;
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
    hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', encoded);
  } else {
    return CryptoJS.SHA256(data).toString();
  }
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
