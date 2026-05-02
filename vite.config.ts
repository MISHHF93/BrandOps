import dns from 'node:dns';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

/** Avoid Node preferring `::1` for `localhost` in ways that desync with the dev server (see `server.hmr` host). */
dns.setDefaultResultOrder('ipv4first');

export default defineConfig({
  /** Vercel sets `VERCEL=1` during `vite build`; expose for client demo mode (see `isPreviewCockpitUngated`). */
  define: {
    'import.meta.env.VITE_VERCEL': JSON.stringify(process.env.VERCEL ?? '')
  },
  plugins: [react()],
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
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  }
});
