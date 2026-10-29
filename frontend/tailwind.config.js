/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base Palette
        'cream-base': '#F5F0E6',
        'burgundy': {
          DEFAULT: '#642A3A',
          dark: '#491425',
          light: '#703343',
          soft: '#EFE2E5',
          container: '#642A3A',
        },
        'sage': {
          DEFAULT: '#A3ADA0',
          dark: '#576156',
          light: '#BFC9BC',
          soft: '#E5EAE2',
          container: '#D9E3D4',
        },
        'ink': {
          primary: '#302A29',
          secondary: '#77716E',
          outline: '#847376',
          'outline-variant': '#D7C1C4',
        },
        'card-surface': '#FFFCF7',
        'hairline': '#DED6CA',

        // Stitch Semantic Tokens
        'primary': '#491425',
        'on-primary': '#ffffff',
        'primary-container': '#642A3A',
        'on-primary-container': '#e092a4',

        'secondary': '#576156',
        'on-secondary': '#ffffff',
        'secondary-container': '#d9e3d4',
        'on-secondary-container': '#5c655a',

        'tertiary': '#002f0e',
        'tertiary-container': '#154620',
        'on-tertiary-container': '#81b483',

        'surface': '#fff8f6',
        'surface-dim': '#e3d8d6',
        'surface-bright': '#fff8f6',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#fdf1ef',
        'surface-container': '#f7ebe9',
        'surface-container-high': '#f1e6e4',
        'surface-container-highest': '#ebe0de',

        'on-surface': '#201a19',
        'on-surface-variant': '#524346',
        'inverse-surface': '#352f2e',
        'inverse-on-surface': '#faeeec',

        'error': '#ba1a1a',
        'on-error': '#ffffff',
        'error-container': '#ffdad6',
        'on-error-container': '#93000a',
      },
      fontFamily: {
        sans: ['"Comic Neue"', 'sans-serif'],
        serif: ['"Prompt"', 'sans-serif'],
        heading: ['"Prompt"', 'sans-serif'],
        prompt: ['"Prompt"', 'sans-serif'],
        comic: ['"Comic Neue"', 'sans-serif'],
        mono: ['"Prompt"', 'sans-serif'],
      },
      borderRadius: {
        'sm': '0.125rem',
        'DEFAULT': '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
      },
      spacing: {
        'space-xs': '0.25rem',
        'space-sm': '0.5rem',
        'space-md': '1rem',
        'space-lg': '1.5rem',
        'space-xl': '2rem',
        'space-2xl': '3rem',
        'gutter': '1.25rem',
        'gutter-desktop': '1.5rem',
        'margin': '1rem',
        'margin-desktop': '2rem',
      },
    },
  },
  plugins: [],
};

