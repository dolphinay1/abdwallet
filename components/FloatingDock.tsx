'use client';
// Adapted from TempWallets/temp-wallets-website floating-dock.tsx

import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';

export interface DockItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  color?: string;
  active?: boolean;
}

interface FloatingDockProps {
  items: DockItem[];
}

function DockIcon({ item, mouseX }: { item: DockItem; mouseX: ReturnType<typeof useMotionValue<number>> }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  const distance = useMotionValue(Infinity);

  const widthSync = useTransform(distance, [-120, 0, 120], [44, 60, 44]);
  const width = useSpring(widthSync, { stiffness: 300, damping: 30 });

  const handleMouseMove = () => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    distance.set(mouseX.get() - (rect.left + rect.width / 2));
  };

  return (
    <motion.div
      ref={ref}
      style={{ width, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { distance.set(Infinity); setHovered(false); }}
      onMouseEnter={() => setHovered(true)}
    >
      {/* Tooltip */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.12 }}
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 8px)',
              background: '#2b2d33',
              color: '#f5f6fa',
              fontSize: 10,
              padding: '3px 8px',
              borderRadius: 6,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
          >
            {item.label}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Button */}
      <motion.button
        onClick={item.onClick}
        style={{
          width: '100%',
          aspectRatio: '1',
          borderRadius: '50%',
          background: '#e4e6ee',
          boxShadow: item.active
            ? 'inset 3px 3px 6px rgba(166,177,198,0.55), inset -3px -3px 6px rgba(255,255,255,0.9)'
            : '3px 3px 6px rgba(166,177,198,0.55), -3px -3px 6px rgba(255,255,255,0.9)',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: item.active ? '#23262b' : '#8a8f98',
          transition: 'box-shadow 0.15s',
        }}
        whileTap={{ scale: 0.92 }}
      >
        {item.icon}
      </motion.button>

      {/* Label */}
      <span style={{ color: '#8a8f98', fontSize: 9, marginTop: 4, whiteSpace: 'nowrap' }}>
        {item.label}
      </span>
    </motion.div>
  );
}

export function FloatingDock({ items }: FloatingDockProps) {
  const mouseX = useMotionValue(Infinity);

  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: 10,
        padding: '10px 14px',
        borderRadius: 24,
        background: '#e4e6ee',
        boxShadow: '9px 9px 18px rgba(166,177,198,0.55), -9px -9px 18px rgba(255,255,255,0.9)',
        width: 'fit-content',
        margin: '0 auto',
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 }}
    >
      {items.map((item) => (
        <DockIcon key={item.label} item={item} mouseX={mouseX} />
      ))}
    </motion.div>
  );
}
