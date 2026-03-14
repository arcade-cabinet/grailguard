/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}', './index.html'],
  theme: {
    extend: {
      colors: {
        bezel: {
          dark: '#2b1d14',
          border: '#5c4033',
        },
        parchment: {
          DEFAULT: '#eaddcf',
          text: '#3e2723',
        },
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        grailguard: {
          'primary': '#d4af37',       // Sacred gold
          'primary-content': '#1a120d',
          'secondary': '#4A6741',     // Forest green
          'secondary-content': '#f5f0e8',
          'accent': '#4A2D6B',        // Royal purple
          'accent-content': '#f5f0e8',
          'neutral': '#3D3D3D',       // Stone gray
          'neutral-content': '#e8dcc8',
          'base-100': '#1a120d',      // Dark medieval
          'base-200': '#241711',
          'base-300': '#2b1d14',
          'base-content': '#e8dcc8',  // Parchment text
          'info': '#4A5568',          // Iron blue
          'success': '#4A6741',       // Forest green
          'warning': '#D4A574',       // Sacred gold (warm)
          'error': '#8B2500',         // Blood red
        },
      },
    ],
  },
};
