// History Scrubbing & Temporal Erasure — Block 14

// Singleton tab check (Block 14 Task 4)
export const TAB_KEY = '_gw_tab_lock';
// Legacy key that older builds wrote/cleaned up under a different name.
const LEGACY_TAB_KEYS = ['_abd_tab_lock'];

let _tabHeartbeat: ReturnType<typeof setInterval> | null = null;
let _tabUnloadHandler: (() => void) | null = null;

export function checkSingletonTab(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    // Never stack two heartbeats (React StrictMode double-invokes effects in dev).
    releaseSingletonTab();

    sessionStorage.setItem(TAB_KEY, Date.now().toString());

    // Update timestamp periodically so the key stays fresh while open
    _tabHeartbeat = setInterval(() => {
      try { sessionStorage.setItem(TAB_KEY, Date.now().toString()); } catch {}
    }, 5000);

    _tabUnloadHandler = () => { releaseSingletonTab(); };
    window.addEventListener('beforeunload', _tabUnloadHandler);
  } catch {}
  return true;
}

// Release the tab lock. Clears the heartbeat and BOTH the current and the legacy
// storage keys — the previous cleanup removed `_abd_tab_lock` while the lock was
// actually written under `_gw_tab_lock`, so the lock was never released.
export function releaseSingletonTab(): void {
  if (typeof window === 'undefined') return;
  if (_tabHeartbeat) {
    clearInterval(_tabHeartbeat);
    _tabHeartbeat = null;
  }
  if (_tabUnloadHandler) {
    try { window.removeEventListener('beforeunload', _tabUnloadHandler); } catch {}
    _tabUnloadHandler = null;
  }
  try {
    sessionStorage.removeItem(TAB_KEY);
    for (const legacy of LEGACY_TAB_KEYS) sessionStorage.removeItem(legacy);
  } catch {}
}

// URL masking — always stay at root (Block 14 Task 1)
// Installed at most once per page load. Re-patching on every mount (StrictMode,
// provider remounts) would wrap the already-patched function repeatedly and can
// turn a single navigation into a cascade of history writes.
let _scrubberInstalled = false;

export function startHistoryScrubber(): void {
  if (typeof window === 'undefined') return;
  if (_scrubberInstalled) return;
  _scrubberInstalled = true;

  // Keep unpatched references so the scrubber never calls back into itself.
  const origPush = window.history.pushState.bind(window.history);
  const origReplace = window.history.replaceState.bind(window.history);

  const scrub = () => {
    try {
      if (window.location.pathname !== '/') {
        // replaceState only — never pushState — so this cannot grow the history
        // stack or trigger a navigation/remount loop. Query + hash are preserved.
        origReplace(null, '', '/' + window.location.search + window.location.hash);
      }
    } catch {}
  };

  window.addEventListener('popstate', scrub);

  window.history.pushState = (...args) => {
    origPush(...args);
    scrub();
  };
  window.history.replaceState = (...args) => {
    origReplace(...args);
  };
}
