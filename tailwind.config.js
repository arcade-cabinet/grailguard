/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}', './app/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
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
  plugins: [],
};
