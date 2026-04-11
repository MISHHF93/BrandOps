module.exports = {
  content: ['./*.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#090D13',
        panel: '#101826',
        glow: '#3B82F6',
        accent: '#7C3AED'
      },
      boxShadow: {
        panel: '0 12px 50px rgba(59,130,246,0.12)',
        subtle: 'inset 0 1px 0 rgba(255,255,255,0.06)'
      }
    }
  },
  plugins: []
};
