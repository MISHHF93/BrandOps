/**
 * Rasterizes `public/brandops-crown.svg` into PNGs for favicons, extension manifest, PWA, and OG preview.
 * Run after changing the logo: `npm run brand:assets` (requires `sharp`).
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const svgPath = join(root, 'public', 'brandops-crown.svg');
const iconsDir = join(root, 'public', 'icons');
const brandingDir = join(root, 'public', 'branding');

async function main() {
  let sharp;
  try {
    ({ default: sharp } = await import('sharp'));
  } catch {
    console.error(
      '[brand:assets] Missing dependency `sharp`. Install devDependencies (`npm install`) then retry.'
    );
    process.exit(1);
  }

  mkdirSync(iconsDir, { recursive: true });
  mkdirSync(brandingDir, { recursive: true });

  const input = readFileSync(svgPath);
  const raster = sharp(input, { density: 300 });

  const writeIcon = async (size, file) => {
    await raster.clone().resize(size, size).png().toFile(file);
  };

  for (const s of [16, 32, 48, 128, 192, 512]) {
    await writeIcon(s, join(iconsDir, `${s}.png`));
  }

  await writeIcon(180, join(brandingDir, 'apple-touch-icon.png'));

  const logoOg = await raster.clone().resize(400, 400).png().toBuffer();
  await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 3,
      background: { r: 0, g: 0, b: 0 }
    }
  })
    .composite([{ input: logoOg, left: Math.floor((1200 - 400) / 2), top: Math.floor((630 - 400) / 2) }])
    .png()
    .toFile(join(brandingDir, 'og-image.png'));

  console.log('[brand:assets] Wrote public/icons/*.png, branding/apple-touch-icon.png, branding/og-image.png');
}

await main();
