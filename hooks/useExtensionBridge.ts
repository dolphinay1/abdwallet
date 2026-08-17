'use client';

import { useState, useEffect, useCallback } from 'react';

export function useExtensionBridge() {
  const [extPresent, setExtPresent] = useState(false);
  const [extAttached, setExtAttached] = useState(false);
  const [extAttaching, setExtAttaching] = useState(false);
  const [extError, setExtError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'CW_EXT_PRESENT') setExtPresent(true);
      if (e.data?.type === 'CW_STATUS_RESULT') {
        setExtPresent(true);
        setExtAttached(!!e.data.hasVault);
      }
      if (e.data?.type === 'CW_ATTACH_RESULT') {
        setExtAttaching(false);
        if (e.data.ok) {
          setExtAttached(true);
          setExtError(null);
        } else {
          setExtError(e.data.error || 'Unknown error — check extension console.');
        }
      }
    };
    window.addEventListener('message', handler);
    window.postMessage({ type: 'CW_STATUS_REQUEST' }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  const attachExtension = useCallback((mnemonic: string, passphrase: string) => {
    setExtAttaching(true);
    setExtError(null);
    window.postMessage(
      {
        type: 'CW_ATTACH_VAULT',
        mnemonic,
        passphrase,
      },
      '*'
    );
  }, []);

  return {
    extPresent,
    extAttached,
    extAttaching,
    extError,
    attachExtension,
  };
}
