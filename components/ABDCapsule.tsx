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
  // App is light-neumorphic only; both theme variants render the inset pill.
  void theme;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onValue) onValue(e.target.value);
  };

  return (
    <div className={`${className ?? ''} neu-pill-inset px-4 py-1`}>
      <input
        type={type}
        placeholder={placeholder}
        onChange={handleChange}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        data-lpignore="true"
        data-form-type="other"
        style={{
          background: 'transparent',
          border: 'none',
          color: '#23262b',
          fontSize: '13px',
          fontFamily: 'inherit',
          fontWeight: 500,
          letterSpacing: '0.02em',
          outline: 'none',
          padding: '8px 0',
          width: '100%',
          caretColor: '#2b2d33',
        }}
      />
    </div>
  );
}
