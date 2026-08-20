'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export function NetworkOfflineBanner({ onRetry }: { onRetry?: () => void }) {
  const { isOnline, wasOffline, resetWasOffline } = useNetworkStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className="fixed top-3 left-1/2 -translate-x-1/2 z-[300] max-w-[92vw] w-auto"
        >
          <div
            style={{
              background: '#e4e6ee',
              boxShadow: '6px 6px 12px rgba(166,177,198,0.6), -6px -6px 12px rgba(255,255,255,0.9)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '9999px',
              padding: '8px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <WifiOff size={15} className="text-red-600 flex-shrink-0" />
            <span className="russo-one-regular text-[10px] text-[#23262b] uppercase tracking-wider">
              No Internet Connection — Operating in Local Mode
            </span>
            {onRetry && (
              <button
                onClick={onRetry}
                className="ml-2 flex items-center gap-1 text-[9px] russo-one-regular uppercase text-[#5b6270] hover:text-[#23262b] transition-colors"
              >
                <RefreshCw size={11} /> Retry
              </button>
            )}
          </div>
        </motion.div>
      )}

      {isOnline && wasOffline && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          onAnimationComplete={() => {
            setTimeout(resetWasOffline, 3500);
          }}
          className="fixed top-3 left-1/2 -translate-x-1/2 z-[300] max-w-[92vw] w-auto"
        >
          <div
            style={{
              background: '#e4e6ee',
              boxShadow: '6px 6px 12px rgba(166,177,198,0.6), -6px -6px 12px rgba(255,255,255,0.9)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '9999px',
              padding: '8px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="russo-one-regular text-[10px] text-[#23262b] uppercase tracking-wider">
              Connection Restored — Live Sync Active
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
