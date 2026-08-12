import dns from 'node:dns';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

/** Avoid Node preferring `::1` for `localhost` in ways that desync with the dev server (see `server.hmr` host). */
dns.setDefaultResultOrder('ipv4first');

/** Absolute base for social preview tags (`og:image`, `twitter:image`). Example: `https://your-app.vercel.app` */
function resolveDeployedOgImageUrl(publicOrigin: string): string {
  const origin = publicOrigin.trim().replace(/\/$/, '');
  return origin ? `${origin}/branding/og-image.png` : '/branding/og-image.png';
}

/** Injects shared favicons, PWA manifest link, and Open Graph / Twitter meta into each HTML entry that contains `<!--brand-head-->`. */
function brandHeadPlugin(publicOrigin: string): Plugin {
  return {
    name: 'brandops-brand-head',
    transformIndexHtml(html) {
      if (!html.includes('<!--brand-head-->')) return html;
      const og = resolveDeployedOgImageUrl(publicOrigin);
      const snippet = `    <meta name="description" content="Personal brand operating system for technical AI builders." />
    <meta name="application-name" content="BrandOps" />
    <link rel="icon" type="image/svg+xml" href="/brandops-crown.svg" />
    <link rel="icon" type="image/png" sizes="32x32" href="/icons/32.png" />
    <link rel="icon" type="image/png" sizes="16x16" href="/icons/16.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/branding/apple-touch-icon.png" />
    <link rel="manifest" href="/site.webmanifest" />
    <meta name="theme-color" content="#000000" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="BrandOps" />
    <meta property="og:description" content="Personal brand operating system for technical AI builders." />
    <meta property="og:image" content="${og}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="BrandOps" />
    <meta name="twitter:description" content="Personal brand operating system for technical AI builders." />
    <meta name="twitter:image" content="${og}" />`;
      return html.replace('<!--brand-head-->', snippet);
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [react(), brandHeadPlugin(env.VITE_PUBLIC_ORIGIN ?? '')],
    server: {
      port: 5173,
      /** Fail fast if 5173 is busy so the app never silently moves to 5174. */
      strictPort: true,
      /**
       * Listen on all local addresses (`0.0.0.0` + IPv6). With `dns.setDefaultResultOrder('ipv4first')`, browsers
       * often hit **`127.0.0.1`** for `localhost`; binding **only** `::` plus passing `--host ::` from `dev.mjs`
       * can refuse those IPv4 connections on Windows → **`ERR_CONNECTION_REFUSED` (-102)**.
       */
      host: true
    },
    preview: {
      port: 4173,
      strictPort: true,
      host: true
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      /** Skip per-asset gzip/RLE size computation; the build is much faster and nothing consumes those numbers. */
      reportCompressedSize: false,
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'index.html'),
          integrations: resolve(__dirname, 'integrations.html'),
          dashboard: resolve(__dirname, 'dashboard.html'),
          welcome: resolve(__dirname, 'welcome.html'),
          help: resolve(__dirname, 'help.html'),
          mobile: resolve(__dirname, 'mobile.html'),
          background: resolve(__dirname, 'src/background/index.ts'),
          linkedinOverlay: resolve(__dirname, 'src/content/linkedinOverlay.ts')
        },
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: 'chunks/[name].js',
          assetFileNames: 'assets/[name].[ext]',
          /**
           * Stable vendor chunks so the framework/library download once across tabs, entry pages, and
           * redeploys — instead of being re-bundled into every HTML entry's JS. Chrome MV3 + Capacitor
           * both cache these; name stability is required by `verify-dist.mjs`.
           */
          manualChunks: {
            react: ['react', 'react-dom'],
            icons: ['lucide-react']
          }
        }
      }
    }
  };
});
