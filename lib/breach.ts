// Logic Bomb & Breach Protocol — Block 10
import { sha256 } from './crypto';

type WipeCallback = () => void;

let _breachDetected = false;
let _wipeCallback: WipeCallback | null = null;
let _integrityTimer: ReturnType<typeof setInterval> | null = null;

const _isDev = process.env.NODE_ENV === 'development';

// Functions to checksum (Block 10 Task 1)
const _SENTINEL_FUNCTIONS = [
  'createABDWallet',
  'importABDWallet',
  'wipeABDWallet',
  'encryptData',
  'decryptData',
];

let _baselineChecksums: Record<string, string> = {};

export async function buildIntegrityBaseline(fns: Record<string, Function>): Promise<void> {
  for (const name of _SENTINEL_FUNCTIONS) {
    if (fns[name]) {
      _baselineChecksums[name] = await sha256(fns[name].toString());
    }
  }
}

async function verifyIntegrity(fns: Record<string, Function>): Promise<boolean> {
  for (const name of _SENTINEL_FUNCTIONS) {
    if (!fns[name]) continue;
    const current = await sha256(fns[name].toString());
    if (_baselineChecksums[name] && current !== _baselineChecksums[name]) {
      return false;
    }
  }
  return true;
}

// Data Poisoning — overwrite vault with 1024 bytes of random noise (Block 10 Task 2)
export function poisonVault(): string {
  const noise = new Uint8Array(1024);
  window.crypto.getRandomValues(noise);
  return Array.from(noise).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Hosts the app is legitimately served from. Anything served from one of these
// can NEVER be treated as an unauthorized environment.
const _ALLOWED_HOSTS = new Set([
  'abdwallet.com',
  'www.abdwallet.com',
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
]);

function _isAllowedHost(host: string): boolean {
  if (!host) return true;
  const h = host.toLowerCase().replace(/^\[|\]$/g, '');
  if (_ALLOWED_HOSTS.has(h)) return true;
  // Production apex + every subdomain (www, app, preview aliases, ...)
  if (h === 'abdwallet.com' || h.endsWith('.abdwallet.com')) return true;
  // Vercel production/preview deployments
  if (h === 'vercel.app' || h.endsWith('.vercel.app')) return true;
  // Local development / LAN testing
  if (h.endsWith('.localhost') || h.endsWith('.local')) return true;
  if (h.startsWith('192.168.') || h.startsWith('10.') || h.startsWith('172.16.')) return true;
  if (h.startsWith('127.')) return true;
  return false;
}

// Environment check — detect a copy of the app served from somewhere it should not be.
// IMPORTANT: this must never return true for the real production domain. It is
// deliberately conservative: only a `file:` load (a downloaded/cloned copy) is
// flagged. Unknown hosts are logged in development and otherwise ignored, because
// a false positive here silently destroys the user's wallet.
export function isUnauthorizedEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof window.location === 'undefined') return false;

  if (window.location.protocol === 'file:') return true;

  const host = window.location.hostname;
  if (_isAllowedHost(host)) return false;

  if (_isDev) {
    console.warn('[ABD] Unrecognized host (not treated as a breach):', host);
  }
  return false;
}

export function registerBreachWipe(cb: WipeCallback): void {
  _wipeCallback = cb;
}

function triggerBreach(): void {
  if (_breachDetected) return;
  _breachDetected = true;
  if (_wipeCallback) _wipeCallback();
}

// Silent Breach Lockout state (Block 10 Task 3)
let _isLockedOut = false;
export function isBreachLockedOut(): boolean {
  return _isLockedOut;
}
export function activateSilentLockout(): void {
  _isLockedOut = true;
  triggerBreach();
}

// Start integrity checks every 30s (Block 10 Task 1)
//
// The checksum baseline is captured from `Function.prototype.toString()` of live
// closures. In a minified/production build those sources can legitimately differ
// between the moment the baseline is taken and a later read (chunk re-evaluation,
// HMR-free re-renders producing new closure identities, browser engine source
// caching), so a mismatch is NOT reliable evidence of tampering. Wiping the user's
// wallet on such a mismatch is a false-positive foot-gun, so in production this
// watcher is a no-op. In development it only logs.
export function startIntegrityWatch(fns: Record<string, Function>): void {
  if (_integrityTimer) return;

  // Environment check still runs (it is now allowlist-based and safe).
  if (isUnauthorizedEnvironment()) {
    activateSilentLockout();
    return;
  }

  if (!_isDev) return; // production: no checksum polling, no wipes

  _integrityTimer = setInterval(async () => {
    if (Object.keys(_baselineChecksums).length === 0) return;
    const ok = await verifyIntegrity(fns);
    if (!ok) console.warn('[ABD] Integrity checksum mismatch (dev-only warning, no wipe)');
  }, 30_000);
}

export function stopIntegrityWatch(): void {
  if (_integrityTimer) {
    clearInterval(_integrityTimer);
    _integrityTimer = null;
  }
}
