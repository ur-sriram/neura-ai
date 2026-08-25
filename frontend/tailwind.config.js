/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc7fb',
          400: '#36abf7',
          500: '#0c8fe9',
          600: '#0170c7',
          700: '#0259a1',
          800: '#064b85',
          900: '#0a3f6f',
          950: '#072849',
        },
        navy: {
          800: '#152238',
          900: '#0f172a',
          950: '#090d16',
        },
        gov: {
          emerald: '#047857',
          saffron: '#d97706',
          blue: '#1d4ed8',
          slate: '#334155'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
