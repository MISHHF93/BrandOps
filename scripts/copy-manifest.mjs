/**
 * Copies public/manifest.template.json → dist/manifest.json.
 *
 * Naming note: manifest.template.json should match the in-app product name (BrandOps). Update the template only;
 * do not assume dist/manifest.json is hand-edited (it is overwritten each build).
 */
import { cp, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const dist = resolve(root, 'dist');
await mkdir(resolve(dist, 'icons'), { recursive: true });
await cp(resolve(root, 'public', 'manifest.template.json'), resolve(dist, 'manifest.json'));
await cp(resolve(root, 'public', 'icons'), resolve(dist, 'icons'), {
  recursive: true,
  force: true
});
