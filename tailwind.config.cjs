module.exports = {
  content: ['./*.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      borderRadius: {
        xl: '0.9rem',
        '2xl': '1rem'
      },
      boxShadow: {
        luxe: '0 18px 48px rgba(6, 16, 34, 0.48)'
      }
    }
  },
  plugins: []
};
