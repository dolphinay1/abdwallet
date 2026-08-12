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
          black: "#050505",
          dark: "#121212",
          gray: "#2A2A2A",
          white: "#F5F5F5",
          accent: "#FFFFFF",
          fee: "#FF4D4D",
          success: "#00E676",
          emerald: "#10b981",
          violet: "#8b5cf6",
        },
      },
      fontFamily: {
        sans: ['var(--font-space-grotesk)', 'Inter', 'sans-serif'],
        display: ['var(--font-space-grotesk)', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'glow': '0 0 20px rgba(255, 255, 255, 0.15)',
        'glow-emerald': '0 0 20px rgba(16, 185, 129, 0.25)',
        'glow-violet': '0 0 20px rgba(139, 92, 246, 0.25)',
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
          '0%, 100%': { boxShadow: '0 0 8px rgba(16, 185, 129, 0.15)' },
          '50%': { boxShadow: '0 0 24px rgba(16, 185, 129, 0.4)' },
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
      dark: {
        colors: {
          primary: {
            DEFAULT: '#52ffac',
            foreground: '#002111',
          },
        },
      },
    },
  })],
};
