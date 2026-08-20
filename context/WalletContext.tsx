'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { ethers } from 'ethers';
import {
  encryptData,
  decryptData,
  startKeyRotation,
  stopKeyRotation,
  rotateKeys,
  getCurrentKey,
} from '@/lib/crypto';
import { buildSuperEntropySeed } from '@/lib/entropy';
import { scatterStore, ScatteredStore, wipeScatteredStore, startHeapNoise, stopHeapNoise } from '@/lib/memory-vault';
import {
  registerBreachWipe,
  startIntegrityWatch,
  stopIntegrityWatch,
  activateSilentLockout,
  poisonVault,
  isUnauthorizedEnvironment,
} from '@/lib/breach';
import { checkSingletonTab, startHistoryScrubber, releaseSingletonTab } from '@/lib/history';
import {
  persistVault,
  hasPersistedVault,
  loadPersistedVault,
} from '@/lib/persistent-vault';
import { persistWallet as historyPersistWallet, loadSavedMnemonic, getHistory, clearUnsavedBlobs } from '@/lib/wallet-history';
import { saveSession, loadSession, clearSession, getTabKey } from '@/lib/session-lock';
import { clearWalletKit } from '@/lib/walletconnect';

export type WalletMode = 'EPHEMERAL' | 'PERSISTENT';

interface WalletState {
  _u_ap: string | null;
  _v_enc: string | null;
  _k_enc: string | null;
  isUnlocked: boolean;
  mode: WalletMode;
  isPulseActive: boolean;
  isBlurred: boolean;
  isABDLocked: boolean;
  sessionStartedAt: number | null;
  devToolsDetected: number;
  isBreachLocked: boolean;
  hasPersisted: boolean;
  isSessionLocked: boolean;
}

let _seedData = '';
let _pvt_key_vault = '';
let _wallet_backup = '';
const _updateDecoys = () => {
  _seedData = Math.random().toString(36).repeat(4);
  _pvt_key_vault = Math.random().toString(36).repeat(4);
  _wallet_backup = Math.random().toString(36).repeat(4);
};

let _vaultCombinedKey: string | null = null;

/**
 * Diagnostics: records WHY the vault was last wiped.
 *
 * Every call site of `wipeABDWallet` passes a short, non-sensitive reason string.
 * Nothing derived from key material, mnemonics, addresses or ciphertext may ever
 * be passed in here — reasons are static labels only.
 */
let _lastWipeReason = 'none';

export function getLastWipeReason(): string {
  return _lastWipeReason;
}

function recordWipeReason(reason: string): void {
  _lastWipeReason = `${reason} @ ${new Date().toISOString()}`;
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[ABD] wallet wipe triggered — reason: ${reason}`);
  }
}

interface WalletContextType extends WalletState {
  createABDWallet: () => Promise<void>;
  importABDWallet: (mnemonic: string) => Promise<void>;
  wipeABDWallet: (opts?: { keepSession?: boolean; reason?: string }) => void;
  rotateVaultKeys: () => void;
  getMnemonicForExport: () => Promise<string | null>;
  activeAddress: string | null;
  scatteredKeyStore: ScatteredStore | null;
  enablePersistentMode: (passphrase: string, mnemonic: string) => Promise<void>;
  unlockPersistentVault: (passphrase: string) => Promise<void>;
  disableSessionLock: () => void;
  persistCurrentWallet: (id: string) => Promise<void>;
  switchToSavedWallet: (id: string) => Promise<void>;
}

const WalletContext = createContext<WalletContextType | null>(null);

const INITIAL_STATE: WalletState = {
  _u_ap: null,
  _v_enc: null,
  _k_enc: null,
  isUnlocked: false,
  mode: 'EPHEMERAL',
  isPulseActive: false,
  isBlurred: false,
  isABDLocked: false,
  sessionStartedAt: null,
  devToolsDetected: 0,
  isBreachLocked: false,
  hasPersisted: false,
  isSessionLocked: false,
};

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WalletState>(INITIAL_STATE);
  const scatteredKeyRef = useRef<ScatteredStore | null>(null);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mnemonicRef = useRef<string | null>(null);
  const vaultKeyRef = useRef<string | null>(null);
  // Mirror of `state.isUnlocked` readable from timers/intervals without
  // re-creating those callbacks on every state change.
  const isUnlockedRef = useRef(false);

  const wipeABDWallet = useCallback((opts?: { keepSession?: boolean; destroyHistory?: boolean; reason?: string }) => {
    recordWipeReason(opts?.reason ?? 'unspecified');
    if (scatteredKeyRef.current) {
      wipeScatteredStore(scatteredKeyRef.current);
      scatteredKeyRef.current = null;
    }
    mnemonicRef.current = null;
    _vaultCombinedKey = null;
    vaultKeyRef.current = null;
    setState(INITIAL_STATE);
    stopKeyRotation();
    stopHeapNoise();
    stopIntegrityWatch();
    void clearWalletKit();
    if (!opts?.keepSession) clearSession();
    clearUnsavedBlobs();
    try { localStorage.removeItem('__gw_non_evm_warned__'); } catch {}
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (sessionTimer.current) clearTimeout(sessionTimer.current);
    _updateDecoys();
  }, []);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      // Only wipe if the wallet is still actually unlocked when the timer fires.
      if (!isUnlockedRef.current) return;
      wipeABDWallet({ reason: 'inactivity-timeout-5m' });
    }, 5 * 60 * 1000);
  }, [wipeABDWallet]);

  // Key rotation handler — re-encrypts vault with new session key (no hwId)
  const makeRotationHandler = useCallback(
    () => (oldKey: string, newKey: string) => {
      setState((prev) => {
        if (!prev._v_enc || !prev._k_enc) return prev;
        try {
          const rawMnemonic = decryptData(prev._v_enc, oldKey);
          const rawPrivKey  = decryptData(prev._k_enc, oldKey);
          if (!rawMnemonic || rawMnemonic.trim().split(/\s+/).length < 12) return prev;
          _vaultCombinedKey   = newKey;
          vaultKeyRef.current = newKey;
          mnemonicRef.current = rawMnemonic;
          return {
            ...prev,
            _v_enc: encryptData(rawMnemonic, newKey),
            _k_enc: encryptData(rawPrivKey,  newKey),
            isPulseActive: true,
          };
        } catch { return prev; }
      });
      setTimeout(() => setState(p => ({ ...p, isPulseActive: false })), 500);
    },
    []
  );

  const createABDWallet = useCallback(async () => {
    try {
      await buildSuperEntropySeed();
      const wallet = ethers.Wallet.createRandom();
      const mnemonic = wallet.mnemonic?.phrase ?? '';
      if (!mnemonic || mnemonic.trim().split(/\s+/).length < 12) throw new Error('Failed to generate mnemonic');
      const privateKey = wallet.privateKey;
      const address = wallet.address;
      const sessionKey = getCurrentKey();

      _vaultCombinedKey = sessionKey;
      vaultKeyRef.current = sessionKey;
      mnemonicRef.current = mnemonic;
      scatteredKeyRef.current = scatterStore(privateKey);

      if (sessionTimer.current) clearTimeout(sessionTimer.current);
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);

      setState(prev => ({
        ...prev,
        _u_ap: address,
        _v_enc: encryptData(mnemonic, sessionKey),
        _k_enc: encryptData(privateKey, sessionKey),
        isUnlocked: true,
        sessionStartedAt: Date.now(),
        isSessionLocked: false,
      }));

      startHeapNoise();
      startKeyRotation(makeRotationHandler());
      resetInactivityTimer();
      sessionTimer.current = setTimeout(() => wipeABDWallet({ reason: 'session-max-age-30m' }), 30 * 60 * 1000);
    } catch {
      console.error('Vault creation failed');
    }
  }, [resetInactivityTimer, wipeABDWallet, makeRotationHandler]);

  const importABDWallet = useCallback(async (mnemonic: string) => {
    try {
      const wallet = ethers.Wallet.fromPhrase(mnemonic.trim());
      const privateKey = wallet.privateKey;
      const address = wallet.address;
      const sessionKey = getCurrentKey();

      _vaultCombinedKey = sessionKey;
      vaultKeyRef.current = sessionKey;
      mnemonicRef.current = mnemonic.trim();
      scatteredKeyRef.current = scatterStore(privateKey);

      setState(prev => ({
        ...prev,
        _u_ap: address,
        _v_enc: encryptData(mnemonic, sessionKey),
        _k_enc: encryptData(privateKey, sessionKey),
        isUnlocked: true,
        sessionStartedAt: Date.now(),
        isSessionLocked: false,
      }));

      startHeapNoise();
      startKeyRotation(makeRotationHandler());
      resetInactivityTimer();
      sessionTimer.current = setTimeout(() => wipeABDWallet({ reason: 'session-max-age-30m' }), 30 * 60 * 1000);
    } catch {
      throw new Error('Invalid mnemonic');
    }
  }, [resetInactivityTimer, wipeABDWallet, makeRotationHandler]);

  const rotateVaultKeys = useCallback(() => {
    rotateKeys((oldKey, newKey) => {
      setState(prev => {
        if (!prev._v_enc || !prev._k_enc) return prev;
        return {
          ...prev,
          _v_enc: encryptData(decryptData(prev._v_enc, oldKey), newKey),
          _k_enc: encryptData(decryptData(prev._k_enc, oldKey), newKey),
          isPulseActive: true,
        };
      });
      setTimeout(() => setState(p => ({ ...p, isPulseActive: false })), 300);
    });
  }, []);

  const getMnemonicForExport = useCallback(async (): Promise<string | null> => {
    // Primary: in-memory ref (always up-to-date)
    if (mnemonicRef.current && mnemonicRef.current.trim().split(/\s+/).length >= 12) {
      return mnemonicRef.current;
    }
    // Fallback: try known session keys
    const enc = state._v_enc;
    if (enc) {
      const candidates: string[] = [];
      if (vaultKeyRef.current) candidates.push(vaultKeyRef.current);
      if (_vaultCombinedKey && _vaultCombinedKey !== vaultKeyRef.current) candidates.push(_vaultCombinedKey);
      candidates.push(getCurrentKey());
      for (const key of candidates) {
        try {
          const decoded = decryptData(enc, key);
          if (decoded && decoded.trim().split(/\s+/).length >= 12) {
            mnemonicRef.current = decoded;
            return decoded;
          }
        } catch {}
      }
    }
    // Last resort: read directly from localStorage session
    try {
      const saved = loadSession();
      if (saved) {
        const tabKey = getTabKey();
        const decoded = decryptData(saved, tabKey);
        if (decoded && decoded.trim().split(/\s+/).length >= 12) {
          mnemonicRef.current = decoded;
          return decoded;
        }
      }
    } catch {}
    return null;
  }, [state._v_enc]);

  const enablePersistentMode = useCallback(async (passphrase: string, mnemonic: string) => {
    // localStorage first — survives mobile backgrounding/security trap wipes
    let resolvedMnemonic = mnemonic || '';
    if (!resolvedMnemonic || resolvedMnemonic.trim().split(/\s+/).length < 12) {
      try {
        const saved = loadSession();
        if (saved) {
          const decoded = decryptData(saved, getTabKey());
          if (decoded && decoded.trim().split(/\s+/).length >= 12) resolvedMnemonic = decoded;
        }
      } catch {}
    }
    // in-memory ref fallback
    if (!resolvedMnemonic || resolvedMnemonic.trim().split(/\s+/).length < 12) {
      resolvedMnemonic = mnemonicRef.current || '';
    }
    // last resort: try known vault keys against encrypted state snapshot
    if (!resolvedMnemonic || resolvedMnemonic.trim().split(/\s+/).length < 12) {
      const encSnap = state._v_enc;
      if (encSnap) {
        for (const k of [vaultKeyRef.current, _vaultCombinedKey, getCurrentKey()].filter(Boolean) as string[]) {
          try {
            const d = decryptData(encSnap, k);
            if (d && d.trim().split(/\s+/).length >= 12) { resolvedMnemonic = d; break; }
          } catch {}
        }
      }
    }
    if (!resolvedMnemonic || resolvedMnemonic.trim().split(/\s+/).length < 12) throw new Error('Vault empty');
    mnemonicRef.current = resolvedMnemonic;
    try { saveSession(encryptData(resolvedMnemonic, getTabKey())); } catch {}
    await persistVault(resolvedMnemonic, passphrase);
    setState(p => ({ ...p, mode: 'PERSISTENT' }));
  }, [state._v_enc]);

  const unlockPersistentVault = useCallback(async (passphrase: string) => {
    const mnemonic = await loadPersistedVault(passphrase);
    await importABDWallet(mnemonic);
    setState(p => ({ ...p, mode: 'PERSISTENT' }));
  }, [importABDWallet]);

  const disableSessionLock = useCallback(() => {
    clearSession();
    setState((p) => ({ ...p, isSessionLocked: false }));
  }, []);

  const persistCurrentWallet = useCallback(async (id: string) => {
    // Persistence is opt-in: only the currently active wallet can be saved.
    // Writing the active mnemonic into a different history entry would corrupt it,
    // and non-active ephemeral wallets no longer have recoverable key material.
    const snap = getHistory().find(s => s.id === id);
    if (!snap) throw new Error('Wallet not found');
    const active = state._u_ap;
    if (!active || snap.address.toLowerCase() !== active.toLowerCase()) {
      throw new Error('Only the active wallet can be saved');
    }
    const mnemonic = await getMnemonicForExport();
    if (!mnemonic || mnemonic.trim().split(/\s+/).length < 12) throw new Error('No active wallet');
    await historyPersistWallet(id, mnemonic);
  }, [getMnemonicForExport, state._u_ap]);

  const switchToSavedWallet = useCallback(async (id: string) => {
    const mnemonic = await loadSavedMnemonic(id);
    await importABDWallet(mnemonic);
  }, [importABDWallet]);

  // Check for persisted vault on mount
  useEffect(() => {
    hasPersistedVault().then(has => { if (has) setState(p => ({ ...p, hasPersisted: true })); });
  }, []);

  // Keep the unlocked mirror in sync for timer/interval callbacks
  useEffect(() => {
    isUnlockedRef.current = state.isUnlocked;
  }, [state.isUnlocked]);

  // Breach registration
  useEffect(() => {
    registerBreachWipe(() => {
      setState(p => ({ ...p, _v_enc: poisonVault(), _k_enc: poisonVault(), isBreachLocked: true }));
      setTimeout(() => wipeABDWallet({ reason: 'breach-protocol' }), 100);
    });
    if (isUnauthorizedEnvironment()) {
      if (process.env.NODE_ENV === 'development') console.warn('[ABD] Unauthorized environment detected');
      activateSilentLockout();
    }
  }, [wipeABDWallet]);

  // History scrubber + singleton tab
  useEffect(() => {
    checkSingletonTab();
    startHistoryScrubber();
    return () => {
      // Release the tab lock via the module that owns the key. The previous
      // cleanup removed '_abd_tab_lock' while lib/history.ts writes '_gw_tab_lock',
      // so the lock was never actually released.
      releaseSingletonTab();
    };
  }, []);

  // Wipe on unload — keep session so refresh can restore
  useEffect(() => {
    const handler = () => wipeABDWallet({ keepSession: true, reason: 'page-unload' });
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [wipeABDWallet]);

  // Blur on tab switch
  useEffect(() => {
    const handler = () => {
      if (document.hidden) { setState(p => ({ ...p, isBlurred: true })); document.title = 'ABD Wallet'; }
      else { setState(p => ({ ...p, isBlurred: false })); document.title = 'ABD Wallet'; }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  // Activity listeners for inactivity timer
  useEffect(() => {
    if (!state.isUnlocked) return;
    const events = ['mousemove', 'keydown', 'click', 'touchstart'];
    const handler = () => resetInactivityTimer();
    events.forEach(e => window.addEventListener(e, handler));
    return () => events.forEach(e => window.removeEventListener(e, handler));
  }, [state.isUnlocked, resetInactivityTimer]);

  // Decoy updater
  useEffect(() => {
    const id = setInterval(_updateDecoys, 5000);
    return () => clearInterval(id);
  }, []);

  // Canary trap — reads are always safe (extensions and devtools enumerate/inspect
  // window constantly); only a real *mutation* of the canary is treated as tampering.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const CANARY_VALUE = 'abd_sovereign';
    const target = { value: CANARY_VALUE };
    const canaryProxy = new Proxy(target, {
      // Explicit passthrough traps so inspection can never trip the wipe.
      get: (t, prop, recv) => Reflect.get(t, prop, recv),
      has: (t, prop) => Reflect.has(t, prop),
      ownKeys: (t) => Reflect.ownKeys(t),
      getOwnPropertyDescriptor: (t, prop) => Reflect.getOwnPropertyDescriptor(t, prop),
      set: (_t, prop, value) => {
        // Writing the identical value back (some extensions clone/re-assign window
        // props) is a no-op, not an attack.
        if (prop === 'value' && value === CANARY_VALUE) return true;
        wipeABDWallet({ reason: 'canary-mutated' });
        return false;
      },
      deleteProperty: () => { wipeABDWallet({ reason: 'canary-deleted' }); return false; },
    });
    (window as unknown as Record<string, unknown>)['_abd_canary'] = canaryProxy;
  }, [wipeABDWallet]);

  // Honey input trap
  //
  // Password managers, browser autofill and extensions routinely write into any
  // input whose name looks like a credential field ("wallet_seed_backup" is a
  // magnet for exactly that). Firing a wipe on *any* input/change event here is a
  // guaranteed false positive. We now require all three of:
  //   1. event.isTrusted  (a real user/agent-driven event, not a synthetic one)
  //   2. a non-empty value
  //   3. a value that actually looks like a seed phrase (>= 12 words)
  // Anything else is ignored and the field is cleared.
  useEffect(() => {
    const trap = document.createElement('input');
    trap.setAttribute('name', 'wallet_seed_backup');
    trap.setAttribute('aria-hidden', 'true');
    trap.setAttribute('tabindex', '-1');
    trap.setAttribute('autocomplete', 'off');
    trap.setAttribute('data-1p-ignore', 'true');
    trap.setAttribute('data-lpignore', 'true');
    trap.setAttribute('data-form-type', 'other');
    trap.style.cssText = 'position:fixed;width:0;height:0;opacity:0;pointer-events:none;';

    const looksLikeSeedPhrase = (raw: string): boolean => {
      const words = raw.trim().split(/\s+/).filter(Boolean);
      if (words.length < 12) return false;
      // Seed words are plain lowercase-ish alphabetic tokens; reject emails,
      // URLs, JSON blobs and other autofill payloads.
      return words.every(w => /^[A-Za-z]{3,}$/.test(w));
    };

    const handler = (e: Event) => {
      const value = trap.value;
      // Always clear whatever landed in the trap, wipe or not.
      trap.value = '';
      if (!e.isTrusted) return;
      if (!value || !value.trim()) return;
      if (!looksLikeSeedPhrase(value)) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[ABD] honey trap received non-seed input — ignored (likely autofill)');
        }
        return;
      }
      wipeABDWallet({ reason: 'honey-trap-seed-exfil' });
    };

    trap.addEventListener('input', handler);
    trap.addEventListener('change', handler);
    document.body.appendChild(trap);
    return () => {
      trap.removeEventListener('input', handler);
      trap.removeEventListener('change', handler);
      try { document.body.removeChild(trap); } catch {}
    };
  }, [wipeABDWallet]);

  // Branding watchdog (formerly "branding self-heal")
  //
  // FIXED — this effect was the cause of the "dashboard appears, then I'm thrown
  // back to the auth screen every ~5 seconds" loop:
  //   * The only element carrying [data-abd="brand"] is <AbdLogo/>, which is
  //     rendered exclusively by AuthScreen. On the auth screen the watchdog
  //     recorded knownCount = 1; the moment the user unlocked and the dashboard
  //     rendered, the brand element was gone, so on the next tick it called
  //     wipeABDWallet() -> state reset -> AuthScreen -> repeat, forever.
  //   * `return () => clearInterval(id)` was returned from the *setTimeout*
  //     callback, so it was never used as cleanup. The interval leaked, and with
  //     StrictMode double-mounting, multiple watchdogs stacked up.
  //
  // It is now strictly observational: it can never wipe the wallet. Absence of
  // the brand node is a rendering/branding concern, never a reason to destroy
  // key material.
  useEffect(() => {
    const BRAND_SELECTOR = '[data-abd="brand"]';
    const TICK_MS = 5000;
    const REQUIRED_CONSECUTIVE_MISSES = 12; // ~60s of continuous absence
    let seenBrandOnce = false;
    let consecutiveMisses = 0;
    let warned = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const countBrand = () => {
      try { return document.querySelectorAll(BRAND_SELECTOR).length; } catch { return 0; }
    };

    // Delay first check to allow React to fully mount
    const startDelay = setTimeout(() => {
      intervalId = setInterval(() => {
        const current = countBrand();

        if (current > 0) {
          seenBrandOnce = true;
          consecutiveMisses = 0;
          warned = false;
          return;
        }

        if (!seenBrandOnce) return;
        consecutiveMisses++;
        if (consecutiveMisses < REQUIRED_CONSECUTIVE_MISSES) return;

        // Re-check immediately before reacting — the DOM may have changed between
        // ticks (route transitions, animated mounts, suspense boundaries).
        if (countBrand() > 0) {
          consecutiveMisses = 0;
          return;
        }

        // Non-destructive by design. NEVER call wipeABDWallet() from here: an
        // unlocked wallet living on a screen that simply does not render the logo
        // is completely normal (the dashboard does not include one).
        if (process.env.NODE_ENV === 'development' && !warned) {
          warned = true;
          console.warn(
            '[ABD] branding watchdog: no [data-abd="brand"] node for ' +
            `${(REQUIRED_CONSECUTIVE_MISSES * TICK_MS) / 1000}s (informational only, no action taken)`
          );
        }
        consecutiveMisses = 0;
      }, TICK_MS);
    }, 10000);

    // Clear BOTH timers — the interval handle is captured in the outer scope so
    // this cleanup actually reaches it.
    return () => {
      clearTimeout(startDelay);
      if (intervalId) clearInterval(intervalId);
      intervalId = null;
    };
  }, []);

  // Console honey-trap — disabled: browser wallet extensions (MetaMask, Trust Wallet)
  // probe window.wallet to detect providers, causing false-positive breach detection.
  // This was triggering a full wipe on page load for any user with a wallet extension.

  return (
    <WalletContext.Provider value={{
      ...state,
      activeAddress: state._u_ap,
      createABDWallet,
      importABDWallet,
      wipeABDWallet,
      rotateVaultKeys,
      getMnemonicForExport,
      scatteredKeyStore: scatteredKeyRef.current,
      enablePersistentMode,
      unlockPersistentVault,
      disableSessionLock,
      persistCurrentWallet,
      switchToSavedWallet,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextType {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}
