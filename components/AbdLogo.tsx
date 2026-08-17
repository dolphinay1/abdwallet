import React from 'react';
import Image from 'next/image';

interface AbdLogoProps {
  size?: number;
  className?: string;
}

export const AbdLogo: React.FC<AbdLogoProps> = ({ size = 125, className = '' }) => {
  const width = size;
  const height = size;

  return (
    <div
      className={`relative flex items-center justify-center select-none transition-transform duration-300 ${className}`}
      style={{
        width: `${width}px`,
        height: `${height}px`
      }}
    >
      <Image
        src="/abd-logo-final.png"
        alt="ABD Wallet"
        width={width}
        height={height}
        className="w-full h-full object-contain pointer-events-none"
        priority
      />
    </div>
  );
};
