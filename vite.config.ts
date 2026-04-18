import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    /** Prefer picking the next free port over failing when 5173 is taken. */
    strictPort: false
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
