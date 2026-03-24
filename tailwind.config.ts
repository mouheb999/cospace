import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        black: '#080808',
        bg: '#0d0d0d',
        surface: '#141414',
        surface2: '#1c1c1c',
        border: 'rgba(91,191,181,0.12)',
        teal: {
          DEFAULT: '#5bbfb5',
          dark: '#2e7a74',
          glow: 'rgba(91,191,181,0.25)',
        },
        yellow: {
          DEFAULT: '#d4a017',
          bright: '#f0c040',
        },
        olive: '#6b7a1e',
        lime: '#c8e840',
        cream: '#e8d5c0',
        white: '#f2ede8',
        muted: 'rgba(242,237,232,0.35)',
        gold: '#ffd700',
        silver: '#c0c8d0',
        bronze: '#cd7f32',
        danger: '#e05050',
        warning: '#e08020',
        success: '#50c878',
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
        display: ['Bebas Neue', 'sans-serif'],
        handwriting: ['Caveat', 'cursive'],
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease both',
        'fade-in': 'fadeIn 0.3s ease both',
        'pulse-glow': 'pulse 2s ease infinite',
        'shimmer': 'shimmer 2.5s ease-in-out infinite',
        'flame': 'flame 1.5s ease-in-out infinite',
        'glow': 'glow 3s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        'slide-up': 'slideUp 0.3s ease',
        'confetti-fall': 'confetti-fall 1.5s ease forwards',
        'scan': 'scan 2s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        pulse: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(1.05)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        flame: {
          '0%, 100%': { transform: 'scaleY(1) rotate(-2deg)' },
          '50%': { transform: 'scaleY(1.1) rotate(2deg)' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(91,191,181,0.25)' },
          '50%': { boxShadow: '0 0 40px rgba(91,191,181,0.45)' },
        },
        slideUp: {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        'confetti-fall': {
          '0%': { transform: 'translateY(-20px) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(120px) rotate(720deg)', opacity: '0' },
        },
        scan: {
          '0%': { top: '15%', opacity: '0' },
          '20%': { opacity: '1' },
          '80%': { opacity: '1' },
          '100%': { top: '85%', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}

export default config
