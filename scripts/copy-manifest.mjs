import { cp, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const root = process.cwd();
const dist = resolve(root, 'dist');
await mkdir(resolve(dist, 'icons'), { recursive: true });
await cp(resolve(root, 'public', 'manifest.template.json'), resolve(dist, 'manifest.json'));

const transparentPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5Wew4AAAAASUVORK5CYII=', 'base64');
for (const size of [16, 32, 48, 128]) {
  await writeFile(resolve(dist, 'icons', `${size}.png`), transparentPng);
}
