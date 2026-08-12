import { copyFile, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const mobileEntry = join(dist, 'mobile.html');
const capacitorEntry = join(dist, 'index.html');

const mobileHtml = await readFile(mobileEntry, 'utf8').catch(() => '');
if (!mobileHtml.includes('mobile.js')) {
  throw new Error(
    '[prepare-capacitor-web] dist/mobile.html is missing or invalid. Run `npm run build` first.'
  );
}

await copyFile(mobileEntry, capacitorEntry);
console.log('[prepare-capacitor-web] Capacitor index now boots the BrandOps mobile shell.');
