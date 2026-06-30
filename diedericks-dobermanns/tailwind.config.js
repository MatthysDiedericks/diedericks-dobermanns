/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand palette — see constants/colors.ts for the typed source of truth.
        black: {
          DEFAULT: '#0A0A0A', // Deep Black — primary background
          rich: '#111008', // Warm Dark — card backgrounds
        },
        nav: '#1C1A0E', // Deep Olive / Dark Gold — navigation bars
        surface: '#1A1A1A', // Dark Grey — secondary backgrounds, inputs
        gold: {
          DEFAULT: '#C4A35A', // Gold Primary — warm, muted; CTAs, highlights
          light: '#D8BC82', // Gold Light — hover / secondary gold
          muted: '#8A7A4E', // Muted Gold — inactive nav text/icons
        },
        silver: '#9E9E9E', // Subtext, borders, inactive icons
        ink: {
          DEFAULT: '#F5F5F5', // White — primary text
          muted: '#CCCCCC', // Off-White — secondary text
        },
        danger: '#C0392B',
        success: '#27AE60',
      },
      fontFamily: {
        display: ['Cinzel_700Bold'],
        'display-semibold': ['Cinzel_600SemiBold'],
        body: ['Inter_400Regular'],
        'body-medium': ['Inter_500Medium'],
        'body-semibold': ['Inter_600SemiBold'],
        'body-bold': ['Inter_700Bold'],
      },
    },
  },
  plugins: [],
};
