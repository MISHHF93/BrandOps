import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.brandops.mobile',
  appName: 'BrandOps Agent',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
    /** Same-origin rules as Android; set when `ios` platform is added (`npm run ios:add` on macOS). */
    iosScheme: 'https'
  }
};

export default config;
