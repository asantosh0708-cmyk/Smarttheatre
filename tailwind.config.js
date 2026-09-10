/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#1a1410',
          800: '#241c16',
          700: '#2e251d',
          600: '#3a2f25',
          500: '#4a3d30',
          400: '#6b5a48',
        },
        brass: {
          50: '#fbf6ee',
          100: '#f5e9d0',
          200: '#e9d3a0',
          300: '#dcbd6e',
          400: '#cda84a',
          500: '#bd9033',
          600: '#a07428',
          700: '#7d5a22',
          800: '#5e4419',
        },
        teal: {
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
        },
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
        },
        red: {
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
