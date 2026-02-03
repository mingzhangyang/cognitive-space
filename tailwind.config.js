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
        paper: '#fafaf9',
        'paper-dark': '#0f1115',
        ink: '#0c0a09',
        'ink-dark': '#e2e8f0',
        subtle: '#44403c',
        'subtle-dark': '#94a3b8',
        accent: '#0f766e',
        'accent-dark': '#2dd4bf',
        surface: '#ffffff',
        'surface-dark': '#1c1917',
        'surface-hover': '#f5f5f4',
        'surface-hover-dark': '#292524',
        'surface-hover-strong-dark': '#44403c',
        line: '#e7e5e4',
        'line-soft': '#f5f5f4',
        'line-dark': '#44403c',
        'line-muted': '#d6d3d1',
        'line-strong-dark': '#292524',
        'muted-200': '#e7e5e4',
        'muted-300': '#d6d3d1',
        'muted-400': '#a8a29e',
        'muted-500': '#78716c',
        'muted-600': '#57534e',
        'muted-700': '#44403c',
        action: '#1abc9c',
        'action-hover': '#16a085',
        'action-hover-dark': '#25d0b2',
        'action-ring': '#9ee7d8',
      },
      fontFamily: {
        sans: ['Raleway', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'Apple Color Emoji', 'Segoe UI Emoji', 'sans-serif'],
        serif: ['Lora', 'ui-serif', 'Georgia', 'Times New Roman', 'Times', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    }
  },
  plugins: [],
}
