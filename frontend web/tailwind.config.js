/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#F0FDF9',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A',
          950: '#042F2E',
        },
        // Richer green for CTA matching the screenshots
        green: {
          50:  '#F0FDF4',
          100: '#DCFCE7',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#08AA68',
          700: '#16A34A',
          800: '#166534',
        },
        // Blue accent matching screenshots
        blue: {
          500: '#3B82F6',
          600: '#087EE9',
          700: '#1D4ED8',
        },
        navy: {
          50:  '#EFF6FF',
          600: '#143e6d',
          700: '#0f3460',
          800: '#0B3564',
          850: '#092a49',
          900: '#0B1120',
          950: '#060A13',
        },
        accent: {
          amber:   '#F59E0B',
          coral:   '#F97316',
          emerald: '#08AA68',
          cyan:    '#06B6D4',
        },
      },
      fontFamily: {
        sans:    ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Outfit', '"Plus Jakarta Sans"', 'sans-serif'],
      },
      boxShadow: {
        'soft':    '0 4px 20px -2px rgba(15,23,42,0.06), 0 2px 6px -1px rgba(15,23,42,0.04)',
        'premium': '0 20px 35px -10px rgba(13,148,136,0.12), 0 10px 15px -5px rgba(15,23,42,0.04)',
        'card':    '0 3px 14px rgba(23,69,110,0.07)',
        'hover':   '0 8px 25px rgba(23,69,110,0.13)',
        'cta':     '0 8px 18px rgba(7,126,233,0.28)',
        'green':   '0 8px 18px rgba(8,170,104,0.28)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%':      { opacity: '1',   transform: 'scale(1.08)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        'slide-up':   'slideUp 0.35s ease-out',
        'fade-in':    'fadeIn 0.3s ease-out',
        'shimmer':    'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
}
