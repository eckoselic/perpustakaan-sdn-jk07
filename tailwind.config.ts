import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6f8', 100: '#d6e9ee', 200: '#b0d3dc', 300: '#7fb5c4', 400: '#4a93a8',
          500: '#2c748b', 600: '#1f5d72', 700: '#194b5c', 800: '#143d4b', 900: '#0f2f3a',
        },
        marigold: { 100: '#fdf0c9', 400: '#f5b82e', 500: '#e9a30f', 600: '#c98a08' },
      },
      fontFamily: {
        sans: ['Figtree', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'Figtree', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
