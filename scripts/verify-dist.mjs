import { readFile } from 'node:fs/promises';
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';

const requiredFiles = [
  'dist/manifest.json',
  'dist/mobile.html',
  'dist/mobile.js',
  'dist/chunks/mobileApp.js',
  'dist/dashboard.html',
  'dist/integrations.html',
  'dist/welcome.html',
  'dist/help.html',
  'dist/privacy-policy.html',
  'dist/brandops-oauth-public.json',
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

  const requiredKeys = ['manifest_version', 'name', 'version', 'permissions', 'background', 'action'];
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

const main = async () => {
  for (const filePath of requiredFiles) {
    await ensureFileExists(filePath);
  }

  await assertManifest();
  console.log('Build artifact verification passed.');
};

await main();
