module.exports = {
  content: ['./*.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--color-bg) / <alpha-value>)',
        bgElevated: 'rgb(var(--color-bg-elevated) / <alpha-value>)',
        bgSubtle: 'rgb(var(--color-bg-subtle) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        surfaceHover: 'rgb(var(--color-surface-hover) / <alpha-value>)',
        surfaceActive: 'rgb(var(--color-surface-active) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        borderStrong: 'rgb(var(--color-border-strong) / <alpha-value>)',
        text: 'rgb(var(--color-text) / <alpha-value>)',
        textMuted: 'rgb(var(--color-text-muted) / <alpha-value>)',
        textSoft: 'rgb(var(--color-text-soft) / <alpha-value>)',
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        primaryHover: 'rgb(var(--color-primary-hover) / <alpha-value>)',
        primarySoft: 'rgb(var(--color-primary-soft) / var(--alpha-primary-soft))',
        secondary: 'rgb(var(--color-secondary) / <alpha-value>)',
        secondaryHover: 'rgb(var(--color-secondary-hover) / <alpha-value>)',
        secondarySoft: 'rgb(var(--color-secondary-soft) / var(--alpha-secondary-soft))',
        success: 'rgb(var(--color-success) / <alpha-value>)',
        successSoft: 'rgb(var(--color-success-soft) / var(--alpha-success-soft))',
        warning: 'rgb(var(--color-warning) / <alpha-value>)',
        warningSoft: 'rgb(var(--color-warning-soft) / var(--alpha-warning-soft))',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
        dangerSoft: 'rgb(var(--color-danger-soft) / var(--alpha-danger-soft))',
        info: 'rgb(var(--color-info) / <alpha-value>)',
        infoSoft: 'rgb(var(--color-info-soft) / var(--alpha-info-soft))',
        focusRing: 'rgb(var(--color-focus-ring) / var(--alpha-focus-ring))',
        glow: 'rgb(var(--color-glow) / <alpha-value>)'
      },
      fontSize: {
        display: ['1.75rem', { lineHeight: '2rem', fontWeight: '600' }],
        h1: ['1.375rem', { lineHeight: '1.75rem', fontWeight: '600' }],
        h2: ['1.125rem', { lineHeight: '1.5rem', fontWeight: '600' }],
        h3: ['1rem', { lineHeight: '1.375rem', fontWeight: '600' }],
        body: ['0.875rem', { lineHeight: '1.25rem', fontWeight: '400' }],
        bodyStrong: ['0.875rem', { lineHeight: '1.25rem', fontWeight: '500' }],
        meta: ['0.75rem', { lineHeight: '1rem', fontWeight: '500' }],
        micro: ['0.6875rem', { lineHeight: '0.875rem', fontWeight: '500' }]
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px'
      },
      boxShadow: {
        /* Uses --color-shadow from index.css (black in dark, ink tone in light). */
        panel: '0 8px 24px rgb(var(--color-shadow) / 0.28)',
        hover: '0 12px 30px rgb(var(--color-shadow) / 0.34)',
        glow: '0 0 0 1px rgb(var(--color-shadow) / 0.08), 0 0 20px rgb(var(--color-shadow) / 0.06)'
      },
      transitionDuration: {
        fast: '120ms',
        base: '180ms',
        slow: '260ms'
      },
      ringColor: {
        focusRing: 'rgb(var(--color-focus-ring) / var(--alpha-focus-ring))'
      }
    }
  },
  plugins: []
};
