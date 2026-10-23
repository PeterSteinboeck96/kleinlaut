/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        accent: '#ffff00',
      },
      fontFamily: {
        display: ['"Proxima Nova"', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        body: ['"Alegreya Sans"', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        'soft-glow': '0 12px 40px rgba(0, 0, 0, 0.45)',
      },
      keyframes: {
        'fade-rise': {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'fade-rise': 'fade-rise 0.9s ease-out both',
        'fade-in': 'fade-in 1.1s ease-out both',
      },
    },
  },
  plugins: [],
}
