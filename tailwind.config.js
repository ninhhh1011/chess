/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        ink: '#17120d',
        cream: '#fff8ed',
        board: '#8a5a32',
        gold: '#d6a74b',
      },
      boxShadow: { glow: '0 24px 80px rgba(214,167,75,.22)' },
    },
  },
  plugins: [],
};
