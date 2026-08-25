/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0f',
        surface: '#14141a',
        border: '#2a2a35',
        primary: '#3b82f6',
        accent: '#60a5fa',
        status: {
          open: '#22c55e',
          suspected: '#f59e0b',
          closed: '#ef4444'
        },
        accessibility: {
          critical: '#ef4444',
          difficult: '#f97316',
          moderate: '#eab308',
          highly: '#22c55e'
        }
      }
    },
  },
  plugins: [],
}
