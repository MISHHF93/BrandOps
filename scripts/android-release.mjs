/**
 * Build, or explain why the build would not be shippable.
 *
 * The Android project has been present for a long time and could never produce
 * a store artefact: `versionCode` was hardcoded to 1, there was no signing
 * configuration, and CI published a synced source tree rather than a bundle. A
 * tree is not something a store accepts.
 *
 * `check` is the part that runs anywhere. It reports what is configured and what
 * is missing without needing an Android SDK, which is the situation on most
 * machines that touch this repository — including the one this was written on.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const androidDir = join(root, 'android');
const mode = process.argv[2] ?? 'check';

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

const env = (name) => process.env[name];
const propsFile = join(androidDir, 'keystore.properties');
const props = existsSync(propsFile)
  ? Object.fromEntries(
      readFileSync(propsFile, 'utf8')
        .split('\n')
        .filter((line) => line.includes('=') && !line.trim().startsWith('#'))
        .map((line) => {
          const at = line.indexOf('=');
          return [line.slice(0, at).trim(), line.slice(at + 1).trim()];
        })
    )
  : {};

const signing = {
  storeFile: props.storeFile ?? env('BRANDOPS_KEYSTORE_FILE'),
  storePassword: props.storePassword ?? env('BRANDOPS_KEYSTORE_PASSWORD'),
  keyAlias: props.keyAlias ?? env('BRANDOPS_KEY_ALIAS'),
  keyPassword: props.keyPassword ?? env('BRANDOPS_KEY_PASSWORD')
};
const missing = Object.entries(signing)
  .filter(([, value]) => !value)
  .map(([key]) => key);
const canSign = missing.length === 0;

const sdk = env('ANDROID_HOME') ?? env('ANDROID_SDK_ROOT');

console.log(`version        ${pkg.version}`);
console.log(
  `signing        ${canSign ? 'configured' : `NOT configured (missing: ${missing.join(', ')})`}`
);
console.log(`android sdk    ${sdk ?? 'not found (ANDROID_HOME / ANDROID_SDK_ROOT unset)'}`);
console.log(
  `native project ${existsSync(join(androidDir, 'app', 'build.gradle')) ? 'present' : 'MISSING'}`
);

if (mode === 'check') {
  if (!canSign) {
    console.log('');
    console.log('An unsigned build cannot be uploaded to Google Play. To sign, create');
    console.log('android/keystore.properties (git-ignored) with storeFile, storePassword,');
    console.log('keyAlias and keyPassword, or set the BRANDOPS_KEYSTORE_* variables in CI.');
  }
  process.exit(0);
}

if (!sdk) {
  console.error('');
  console.error('Cannot build: no Android SDK. Install it and set ANDROID_HOME.');
  process.exit(1);
}

const task = mode === 'apk' ? 'assembleRelease' : 'bundleRelease';
const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
console.log('');
console.log(`running ${task}${canSign ? '' : ' (output will be UNSIGNED)'}`);
execFileSync(gradlew, [task], { cwd: androidDir, stdio: 'inherit' });
