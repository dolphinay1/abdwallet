'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';

interface FingerprintScannerProps {
  onScanComplete?: () => void;
  className?: string;
  size?: number;
}

export const FingerprintScanner: React.FC<FingerprintScannerProps> = ({
  onScanComplete,
  className = '',
  size = 68,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');

  const handleScan = () => {
    if (isScanning) return;
    setIsScanning(true);
    setStatus('scanning');

    setTimeout(() => {
      setStatus('success');
      setIsScanning(false);
      if (onScanComplete) {
        setTimeout(() => {
          onScanComplete();
          setStatus('idle');
        }, 600);
      } else {
        setTimeout(() => setStatus('idle'), 1500);
      }
    }, 1200);
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Outer recessed neumorphic well */}
      <button
        id="biometric-fingerprint-btn"
        type="button"
        onClick={handleScan}
        title="Biometric Fingerprint Authentication"
        aria-label="Scan Fingerprint"
        className="relative rounded-full neu-well p-2.5 transition-all duration-200 cursor-pointer active:scale-95 focus:outline-none group"
        style={{
          width: `${size}px`,
          height: `${size}px`,
        }}
      >
        {/* Inner ambient ring */}
        <div className="w-full h-full rounded-full flex items-center justify-center relative overflow-hidden">
          
          {/* Authentic Neumorphic Fingerprint SVG Ridges */}
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full text-[#9aa7bb] group-hover:text-[#6c7d95] transition-colors duration-300 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="3.2"
          >
            {/* Center Core Loop */}
            <path d="M 50 42 A 8 10 0 0 1 50 58 A 8 10 0 0 1 50 42" strokeWidth="2.8" />
            
            {/* Inner Ridges */}
            <path d="M 43 36 A 14 18 0 0 1 57 36 C 62 44 62 58 55 67 C 52 71 47 75 42 78" />
            <path d="M 37 42 C 37 32 44 26 50 26 C 60 26 66 34 66 48 C 66 61 58 72 49 79" />
            
            {/* Mid Ridges */}
            <path d="M 31 46 C 30 31 41 20 50 20 C 66 20 73 31 73 51 C 73 66 63 80 52 86" />
            <path d="M 26 53 C 25 36 36 14 50 14 C 71 14 80 28 80 54 C 80 72 68 87 55 92" />
            
            {/* Outer Ridges */}
            <path d="M 22 62 C 20 45 30 9 50 9 C 78 9 87 26 87 57 C 87 76 74 92 61 96" />
            <path d="M 20 71 C 18 63 18 52 20 44" />
            <path d="M 25 80 C 23 74 23 68 24 64" />
            
            {/* Lower Whorl Arcs */}
            <path d="M 40 86 C 45 88 50 88 56 87" />
          </svg>

          {/* Active scanning light bar */}
          {status === 'scanning' && (
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-center overflow-hidden rounded-full">
              <div className="w-full h-1 bg-gradient-to-r from-transparent via-[#3b82f6] to-transparent shadow-[0_0_8px_#3b82f6] animate-scan-line" />
            </div>
          )}

          {/* Success Overlay Check */}
          <AnimatePresence>
            {status === 'success' && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="absolute inset-0 bg-emerald-500/20 backdrop-blur-[1px] rounded-full flex items-center justify-center text-emerald-600"
              >
                <Check className="w-6 h-6 stroke-[3]" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </button>

      {/* Touch prompt hint */}
      <span className="sr-only">Biometric Key Scan</span>
    </div>
  );
};
