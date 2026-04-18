import { mkdir, readFile, access, rm } from 'node:fs/promises';
import { constants } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';

const DIST_DIR = 'dist';
const RELEASE_DIR = 'release';

const run = (command, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} failed with code ${code}`));
    });
  });

const ensureDist = async () => {
  try {
    await access(path.join(DIST_DIR, 'manifest.json'), constants.F_OK);
  } catch {
    throw new Error('dist/manifest.json is missing. Run `npm run build` first.');
  }
};

const getVersion = async () => {
  const pkgRaw = await readFile('package.json', 'utf8');
  const pkg = JSON.parse(pkgRaw);
  if (!pkg.version || typeof pkg.version !== 'string') {
    throw new Error('package.json version is missing or invalid.');
  }
  return pkg.version;
};

const main = async () => {
  await ensureDist();

  const version = await getVersion();
  await mkdir(RELEASE_DIR, { recursive: true });

  const artifactName = `brandops-extension-v${version}.tar.gz`;
  const artifactPath = path.join(RELEASE_DIR, artifactName);

  await rm(artifactPath, { force: true });
  await run('tar', ['-czf', artifactPath, '-C', DIST_DIR, '.']);

  console.log(`Release artifact created: ${artifactPath}`);
  console.log('Upload this archive or extract it and load the dist/ bundle as an unpacked extension.');
};

await main();
