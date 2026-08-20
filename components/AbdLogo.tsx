import React from 'react';
import Image from 'next/image';

interface AbdLogoProps {
  size?: number;
  width?: number;
  height?: number;
  className?: string;
}

export const AbdLogo: React.FC<AbdLogoProps> = ({ size = 200, width, height, className = '' }) => {
  const targetWidth = width || size;
  const targetHeight = height || Math.round(targetWidth * (313 / 530));

  return (
    <div
      data-abd="brand"
      className={`relative flex items-center justify-center select-none transition-transform duration-300 ${className}`}
      style={{
        width: `${targetWidth}px`,
        height: `${targetHeight}px`,
      }}
    >
      <Image
        src="/abd-logo-final.png"
        alt="ABD Wallet"
        width={530}
        height={313}
        className="w-full h-full object-contain pointer-events-none"
        priority
      />
    </div>
  );
};

