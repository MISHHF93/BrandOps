import { readFile } from 'node:fs/promises';
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';

const requiredFiles = ['dist/manifest.json', 'dist/popup.html', 'dist/dashboard.html', 'dist/options.html'];

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
};

const main = async () => {
  for (const filePath of requiredFiles) {
    await ensureFileExists(filePath);
  }

  await assertManifest();
  console.log('Build artifact verification passed.');
};

await main();
