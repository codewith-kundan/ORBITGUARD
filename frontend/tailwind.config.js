/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        space: {
          950: '#060913',
          900: '#0b1021',
          850: '#101730',
          800: '#141d3b',
          700: '#1c284f',
          600: '#2c3e75',
          dark: '#0a1128',
          blue: '#1a2b4c',
          border: '#2d4b73',
        },
        cyan: {
          400: '#22d3ee',
          500: '#06b6d4',
          neon: '#00f0ff',
          stitch: '#00f2ff'
        },
        danger: {
          500: '#ef4444',
          600: '#dc2626',
          neon: '#ff3344'
        },
        warning: {
          500: '#f59e0b',
          neon: '#ffaa00'
        },
        success: {
          500: '#10b981',
          neon: '#00ffaa'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
