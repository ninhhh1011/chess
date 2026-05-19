/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        ink: '#0f172a',
        cream: '#f8fafc',
        board: '#334155',
        gold: '#f59e0b',
      },
      boxShadow: {
        glow: '0 22px 70px rgba(245,158,11,.18)',
        panel: '0 18px 48px rgba(2,6,23,.32)',
      },
    },
  },
  plugins: [],
};
