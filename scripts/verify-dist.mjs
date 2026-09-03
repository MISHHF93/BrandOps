import { readFile } from 'node:fs/promises';
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';

const requiredFiles = [
  'dist/manifest.json',
  'dist/mobile.html',
  'dist/mobile.js',
  /**
   * Mobile shell is code-split into `renderChatbotSurface` (shared with dashboard/help);
   * verifying that chunk is what actually proves the mobile bundle exists.
   */
  'dist/chunks/renderChatbotSurface.js',
  'dist/chunks/navigationIntents.js',
  'dist/dashboard.html',
  'dist/integrations.html',
  'dist/welcome.html',
  'dist/help.html',
  'dist/privacy-policy.html',
  'dist/site.webmanifest',
  'dist/icons/16.png',
  'dist/icons/32.png',
  'dist/branding/og-image.png',
  'dist/brandops-oauth-public.json',
  'dist/brandops-intelligence-rules.json',
  'dist/oauth/google-brandops.html',
  'dist/oauth/github-brandops.html',
  'dist/oauth/linkedin-brandops.html'
];

const ensureFileExists = async (path) => {
  try {
    await access(path, constants.F_OK);
  } catch {
    throw new Error(`Missing required build artifact: ${path}`);
  }
};

const assertManifest = async () => {
  const raw = await readFile('dist/manifest.json', 'utf8');
  const manifest = JSON.parse(raw);

  const requiredKeys = [
    'manifest_version',
    'name',
    'version',
    'permissions',
    'background',
    'action'
  ];
  for (const key of requiredKeys) {
    if (!(key in manifest)) {
      throw new Error(`manifest.json is missing required key: ${key}`);
    }
  }

  if (manifest.manifest_version !== 3) {
    throw new Error(`manifest_version must be 3. Received: ${manifest.manifest_version}`);
  }

  if (!Array.isArray(manifest.permissions)) {
    throw new Error('manifest permissions must be an array.');
  }

  if (manifest.background?.service_worker !== 'background.js') {
    throw new Error('manifest background.service_worker must be "background.js".');
  }

  if (manifest.options_ui?.page !== 'integrations.html') {
    throw new Error('manifest options_ui.page must be "integrations.html".');
  }
};

/**
 * Nothing that looks like a live credential may ship.
 *
 * The build inlines `import.meta.env`, so a `.env.local` holding a real key
 * becomes a string literal in the bundle. RevenueCat's public keys are safe by
 * design and are expected here; a provider secret, private key or session token
 * is not, and once published it is published.
 *
 * Patterns are deliberately narrow. A check that fires on the word "key" gets
 * switched off within a week.
 */
const SECRET_PATTERNS = [
  { name: 'OpenAI-style secret key', re: /sk-[A-Za-z0-9]{20,}/ },
  { name: 'Google API key', re: /AIza[A-Za-z0-9_-]{30,}/ },
  { name: 'GitHub token', re: /gh[pousr]_[A-Za-z0-9]{20,}/ },
  { name: 'Slack token', re: /xox[baprs]-[A-Za-z0-9-]{10,}/ },
  { name: 'AWS access key id', re: /AKIA[0-9A-Z]{16}/ },
  { name: 'private key block', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: 'Stripe secret key', re: /sk_(live|test)_[A-Za-z0-9]{16,}/ }
];

const assertNoLeakedSecrets = async () => {
  const { readdirSync, statSync } = await import('node:fs');
  const files = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = `${dir}/${name}`;
      if (statSync(p).isDirectory()) walk(p);
      else if (/[.](js|html|json|css|webmanifest)$/.test(name)) files.push(p);
    }
  };
  walk('dist');

  const found = [];
  for (const file of files) {
    const text = await readFile(file, 'utf8');
    for (const { name, re } of SECRET_PATTERNS) {
      const hit = text.match(re);
      if (hit) found.push(`${file}: ${name} (${hit[0].slice(0, 12)}…)`);
    }
  }

  if (found.length) {
    throw new Error('Build contains what look like live credentials:\n  ' + found.join('\n  '));
  }
  console.log(`Scanned ${files.length} build files for leaked credentials: none found.`);
};

const main = async () => {
  for (const filePath of requiredFiles) {
    await ensureFileExists(filePath);
  }

  await assertManifest();
  await assertNoLeakedSecrets();
  console.log('Build artifact verification passed.');
};

await main();
