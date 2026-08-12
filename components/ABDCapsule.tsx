'use client';
// Shadow DOM Encapsulation — Block 21 + Block 33 (React integration fix)

import React, { useRef, useEffect } from 'react';

interface ABDCapsuleProps {
  children?: React.ReactNode;
  onValue?: (value: string) => void;
  placeholder?: string;
  type?: 'password' | 'text';
  className?: string;
  theme?: 'dark' | 'light';
}

export function ABDCapsule({
  onValue,
  placeholder = '',
  type = 'text',
  className,
  theme = 'dark',
}: ABDCapsuleProps) {
  const isLight = theme === 'light';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onValue) onValue(e.target.value);
  };

  return (
    <div
      className={className}
      style={{
        borderLeft: `0.5px solid ${isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'}`,
        paddingLeft: '4px',
      }}
    >
      <input
        type={type}
        placeholder={placeholder}
        onChange={handleChange}
        autoComplete="off"
        spellCheck={false}
        style={{
          background: 'transparent',
          border: 'none',
          borderBottom: `1px solid ${isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.1)'}`,
          color: isLight ? '#111827' : '#ffffff',
          fontSize: '13px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontWeight: 400,
          letterSpacing: '0.02em',
          outline: 'none',
          padding: '6px 0',
          width: '100%',
          caretColor: isLight ? '#111827' : 'white',
          transition: 'border-color 0.15s',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderBottomColor = isLight ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.35)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderBottomColor = isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.1)';
        }}
      />
    </div>
  );
}
