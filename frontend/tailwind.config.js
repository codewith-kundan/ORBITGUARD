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
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#7b8ba1',
          600: '#475569',
          700: '#273244',
          800: '#1a2332',
          850: '#131a24',
          900: '#0e131b',
          950: '#080b10',
          dark: '#0a0e14',
          blue: '#162030',
          border: '#1f2937',
        },
        accent: {
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0284c7',
          600: '#0369a1',
        },
        cyan: {
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0284c7',
          neon: '#38bdf8',
          stitch: '#38bdf8',
        },
        danger: {
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          900: '#450a0a',
          950: '#2a0707',
          neon: '#f87171',
        },
        warning: {
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          neon: '#fbbf24',
        },
        success: {
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          neon: '#34d399',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"SF Mono"', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
