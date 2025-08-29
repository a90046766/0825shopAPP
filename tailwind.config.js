/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#00B5AD',
          50: '#E6FFFB',
          100: '#CFF9F4',
          200: '#A8F0E8',
          300: '#6FE2D7',
          400: '#3AD1C5',
          500: '#00B5AD',
          600: '#0EA5A4',
        },
        accent: { orange: '#FF8A4D', warn: '#F59E0B', success: '#22C55E' },
      },
      boxShadow: {
        card: '0 8px 24px rgba(0,0,0,0.06)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'bounce': 'bounce 1s infinite',
        'ping': 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}


