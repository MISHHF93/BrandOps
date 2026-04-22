import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  /** Vercel sets `VERCEL=1` during `vite build`; expose for client demo mode (see `isPreviewCockpitUngated`). */
  define: {
    'import.meta.env.VITE_VERCEL': JSON.stringify(process.env.VERCEL ?? '')
  },
  plugins: [react()],
  server: {
    port: 5173,
    /** Fail fast if 5173 is busy so the app never silently moves to 5174. */
    strictPort: true
  },
  preview: {
    port: 4173,
    strictPort: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        options: resolve(__dirname, 'options.html'),
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
