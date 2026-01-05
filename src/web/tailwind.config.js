/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Parc Fermé brand colors
        'pf-green': {
          DEFAULT: '#00FF7F', // Signal green
          50: '#E6FFF2',
          100: '#B3FFD9',
          200: '#80FFC0',
          300: '#4DFFA6',
          400: '#1AFF8D',
          500: '#00FF7F',
          600: '#00CC66',
          700: '#00994C',
          800: '#006633',
          900: '#003319',
        },
        'pf-yellow': {
          DEFAULT: '#FFD700', // Safety car yellow
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#FFD700',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },
        'pf-red': {
          DEFAULT: '#FF4444', // Red flag
          500: '#FF4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
