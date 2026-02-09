import colors from 'tailwindcss/colors';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'cs-turquoise': 'var(--color-turquoise)',
        'cs-indigo': colors.indigo,
        'cs-amber': colors.amber,
        'cs-magenta': 'var(--color-magenta)'
      }
    }
  },
  plugins: [],
}
