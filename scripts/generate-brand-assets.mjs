/**
 * Rasterizes `public/branding/brandops-logo.png` into PNGs for favicons, extension manifest,
 * PWA, social preview, and Android launcher/splash assets.
 * Run after changing the logo: `npm run brand:assets` (requires `sharp`).
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const iconsDir = join(root, 'public', 'icons');
const brandingDir = join(root, 'public', 'branding');
const sourceLogoPath = join(brandingDir, 'brandops-logo.png');
const compatSvgPath = join(root, 'public', 'brandops-crown.svg');
const androidResDir = join(root, 'android', 'app', 'src', 'main', 'res');

const androidLauncherSizes = {
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192
};

const androidForegroundSizes = {
  mdpi: 108,
  hdpi: 162,
  xhdpi: 216,
  xxhdpi: 324,
  xxxhdpi: 432
};

function logoSharp(sharp, input) {
  return sharp(input).rotate();
}

function writeCompatSvg(input, width, height) {
  const dataUri = `data:image/png;base64,${input.toString('base64')}`;
  writeFileSync(
    compatSvgPath,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="BrandOps Logo">
  <image href="${dataUri}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" />
</svg>
`
  );
}

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

  if (!existsSync(sourceLogoPath)) {
    console.error(`[brand:assets] Missing source logo at ${sourceLogoPath}`);
    process.exit(1);
  }

  const input = readFileSync(sourceLogoPath);
  const metadata = await logoSharp(sharp, input).metadata();
  const sourceWidth = metadata.width ?? 1024;
  const sourceHeight = metadata.height ?? 1024;
  writeCompatSvg(input, sourceWidth, sourceHeight);

  const writeIcon = async (size, file) => {
    await logoSharp(sharp, input).resize(size, size, { fit: 'cover', position: 'centre' }).png().toFile(file);
  };

  for (const s of [16, 32, 48, 128, 192, 512]) {
    await writeIcon(s, join(iconsDir, `${s}.png`));
  }

  await writeIcon(180, join(brandingDir, 'apple-touch-icon.png'));

  const logoOg = await logoSharp(sharp, input).resize(420, 420, { fit: 'contain' }).png().toBuffer();
  await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 3,
      background: { r: 0, g: 0, b: 0 }
    }
  })
    .composite([{ input: logoOg, left: Math.floor((1200 - 420) / 2), top: Math.floor((630 - 420) / 2) }])
    .png()
    .toFile(join(brandingDir, 'og-image.png'));

  if (existsSync(androidResDir)) {
    for (const [density, size] of Object.entries(androidLauncherSizes)) {
      const dir = join(androidResDir, `mipmap-${density}`);
      mkdirSync(dir, { recursive: true });
      await writeIcon(size, join(dir, 'ic_launcher.png'));
      await writeIcon(size, join(dir, 'ic_launcher_round.png'));
    }

    for (const [density, size] of Object.entries(androidForegroundSizes)) {
      const dir = join(androidResDir, `mipmap-${density}`);
      mkdirSync(dir, { recursive: true });
      await writeIcon(size, join(dir, 'ic_launcher_foreground.png'));
    }

    for (const dirName of readdirSync(androidResDir)) {
      if (!dirName.startsWith('drawable')) continue;
      const splashPath = join(androidResDir, dirName, 'splash.png');
      if (!existsSync(splashPath)) continue;
      const splashMetadata = await sharp(splashPath).metadata();
      const width = splashMetadata.width ?? 480;
      const height = splashMetadata.height ?? 800;
      const logoSize = Math.floor(Math.min(width, height) * 0.46);
      const splashLogo = await logoSharp(sharp, input)
        .resize(logoSize, logoSize, { fit: 'contain' })
        .png()
        .toBuffer();
      await sharp({
        create: {
          width,
          height,
          channels: 3,
          background: { r: 0, g: 0, b: 0 }
        }
      })
        .composite([
          {
            input: splashLogo,
            left: Math.floor((width - logoSize) / 2),
            top: Math.floor((height - logoSize) / 2)
          }
        ])
        .png()
        .toFile(splashPath);
    }

    writeFileSync(
      join(androidResDir, 'values', 'ic_launcher_background.xml'),
      `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#000000</color>
</resources>
`
    );
  }

  console.log(
    '[brand:assets] Wrote public icons, branding previews, compatibility SVG, and Android logo assets'
  );
}

await main();
