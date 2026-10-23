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
      keyframes: {
        'fade-rise': {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-rise': 'fade-rise 0.9s ease-out both',
      },
    },
  },
  plugins: [],
}
