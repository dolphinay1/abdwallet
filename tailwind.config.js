/** @type {import('tailwindcss').Config} */
const { heroui } = require('@heroui/theme');

module.exports = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
    "./context/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        abd: {
          black: "#e4e6ee",
          dark: "#e4e6ee",
          gray: "#c9ced9",
          white: "#23262b",
          accent: "#2b2d33",
          fee: "#b91c1c",
          success: "#23262b",
          emerald: "#6b7280",
          violet: "#8a8f98",
        },
      },
      fontFamily: {
        sans: ['var(--font-space-grotesk)', 'Inter', 'sans-serif'],
        display: ['var(--font-space-grotesk)', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'glow': '9px 9px 18px rgba(166, 177, 198, 0.55), -9px -9px 18px rgba(255, 255, 255, 0.9)',
        'glow-emerald': '9px 9px 18px rgba(166, 177, 198, 0.55), -9px -9px 18px rgba(255, 255, 255, 0.9)',
        'glow-violet': '9px 9px 18px rgba(166, 177, 198, 0.55), -9px -9px 18px rgba(255, 255, 255, 0.9)',
        'neu': '9px 9px 18px rgba(166, 177, 198, 0.55), -9px -9px 18px rgba(255, 255, 255, 0.9)',
        'neu-sm': '6px 6px 12px rgba(166, 177, 198, 0.55), -6px -6px 12px rgba(255, 255, 255, 0.9)',
        'neu-inset': 'inset 4px 4px 8px rgba(166, 177, 198, 0.5), inset -4px -4px 8px rgba(255, 255, 255, 0.9)',
      },
      keyframes: {
        'fade-in-down': {
          '0%': { opacity: '0', transform: 'translateY(-16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '6px 6px 12px rgba(166, 177, 198, 0.55), -6px -6px 12px rgba(255, 255, 255, 0.9)' },
          '50%': { boxShadow: '9px 9px 18px rgba(166, 177, 198, 0.55), -9px -9px 18px rgba(255, 255, 255, 0.9)' },
        },
      },
      animation: {
        'fade-in-down': 'fade-in-down 0.5s ease-out forwards',
        'fade-in-up': 'fade-in-up 0.5s ease-out forwards',
        'shimmer': 'shimmer 1.5s infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [heroui({
    themes: {
      light: {
        colors: {
          primary: {
            DEFAULT: '#2b2d33',
            foreground: '#f5f6fa',
          },
          danger: {
            DEFAULT: '#b91c1c',
          },
        },
      },
    },
  })],
};
