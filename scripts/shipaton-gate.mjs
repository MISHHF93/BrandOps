/**
 * Shipaton readiness, reported from the repository rather than from memory.
 *
 * The requirements were handed over as a checklist to tick by hand. A checklist
 * nobody can run is the same failure mode this repository has hit repeatedly —
 * the scorecard total that drifted 2.5 points, Knip reporting to nobody, a
 * typechecker wired into no pipeline. So the checkable half is checked, and the
 * rest is labelled as needing a human rather than silently assumed.
 *
 * Three states, and the third is the honest one:
 *
 *   PASS    verified true from the repository
 *   FAIL    verified false from the repository
 *   MANUAL  cannot be known from here — a store account, a video, a real user
 *
 * Nothing in this file can confirm the competition rules themselves. Those came
 * from the operator's research and are restated here only as the source of each
 * requirement, not as facts this repository verified.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (p) => {
  try {
    return readFileSync(join(root, p), 'utf8');
  } catch {
    return '';
  }
};
const pkg = JSON.parse(read('package.json') || '{}');
const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };

/** Width and height from a PNG's IHDR, or null when it is not a readable PNG. */
function pngSize(path) {
  try {
    const buf = readFileSync(join(root, path));
    if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) return null;
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  } catch {
    return null;
  }
}

const checks = [];
const pass = (area, what, detail) => checks.push({ state: 'PASS', area, what, detail });
const fail = (area, what, detail) => checks.push({ state: 'FAIL', area, what, detail });
const manual = (area, what, detail) => checks.push({ state: 'MANUAL', area, what, detail });

// ---------------------------------------------------------------- eligibility
manual('eligibility', 'first store release inside the window', 'only the store consoles know');
manual('eligibility', 'available in the United States', 'a store listing setting');
manual('eligibility', 'original work / licensing cleared', 'a judgement, not a file');

// -------------------------------------------------------------------- product
const androidGradle = read('android/app/build.gradle');
existsSync(join(root, 'android/app/build.gradle'))
  ? pass('product', 'android project present', 'android/app/build.gradle')
  : fail('product', 'android project present', 'no native project');

existsSync(join(root, 'ios'))
  ? pass('product', 'ios project present', 'ios/')
  : fail('product', 'ios project present', 'needs macOS; android alone satisfies eligibility');

androidGradle.includes('signingConfig signingConfigs.release')
  ? pass('product', 'release signing configured', 'reads a git-ignored key or CI env')
  : fail('product', 'release signing configured', 'an unsigned bundle cannot be uploaded');

androidGradle.includes('versionName appVersion')
  ? pass('product', 'version derives from package.json', `currently ${pkg.version}`)
  : fail('product', 'version derives from package.json', 'a hardcoded version blocks re-upload');

const keyPresent =
  existsSync(join(root, 'android/keystore.properties')) ||
  Boolean(process.env.BRANDOPS_KEYSTORE_FILE);
keyPresent
  ? pass('product', 'signing key available here', 'a release build would be signed')
  : fail('product', 'signing key available here', 'create android/keystore.properties');

const sdk = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
sdk
  ? pass('product', 'android sdk available', sdk)
  : fail('product', 'android sdk available', 'cannot compile a bundle without it');

// ---------------------------------------------------------------- revenue cat
const rc = Object.keys(deps).filter((d) => /revenuecat|purchases-/i.test(d));
rc.length
  ? pass('revenuecat', 'sdk installed', rc.join(', '))
  : fail('revenuecat', 'sdk installed', 'mandatory: entry requires a working integration');
manual('revenuecat', 'products, entitlements, offerings configured', 'RevenueCat dashboard');
manual('revenuecat', 'a real store purchase validated', 'needs a store account and a device');

// -------------------------------------------------------------------- backend
const hasBackend = /fetch\(\s*[`'"]https?:\/\/(?!localhost|127)/.test(
  read('src/services/interop/gateway.ts')
);
hasBackend
  ? pass('architecture', 'a hosted API exists', 'mobile could consume it')
  : fail(
      'architecture',
      'a hosted API exists',
      'storage is localStorage and auth is a local flag; cross-device approval needs a server'
    );

// --------------------------------------------------------------- submission
const icon = pngSize('public/icons/1024.png');
icon && icon.w === 1024 && icon.h === 1024
  ? pass('submission', '1024x1024 icon', 'public/icons/1024.png')
  : fail('submission', '1024x1024 icon', 'run npm run brand:assets');

const shots = existsSync(join(root, 'store/screenshots'))
  ? readdirSync(join(root, 'store/screenshots')).filter((f) => f.endsWith('.png'))
  : [];
const correctShot = shots.some((f) => {
  const size = pngSize(join('store/screenshots', f));
  return size && size.w === 1179 && size.h === 2556;
});
correctShot
  ? pass('submission', '1179x2556 screenshot', 'store/screenshots/')
  : fail(
      'submission',
      '1179x2556 screenshot',
      'no device frame; needs a rendered device or emulator'
    );

existsSync(join(root, 'public/privacy-policy.html'))
  ? pass('submission', 'privacy policy', 'public/privacy-policy.html')
  : fail('submission', 'privacy policy', 'required by both stores');

manual('submission', 'demo video under two minutes', 'YouTube or Vimeo, publicly visible');
manual('submission', 'devpost fields and category answers', 'devpost.com');
manual('submission', 'free trial or judge promo code', 'store + RevenueCat configuration');

// ------------------------------------------------------------------- growth
const analytics = Object.keys(deps).filter((d) =>
  /posthog|amplitude|mixpanel|segment|analytics/i.test(d)
);
analytics.length
  ? pass('growth', 'analytics installed', analytics.join(', '))
  : fail('growth', 'analytics installed', 'judging asks for installs, retention, conversion');
manual('growth', 'real users and measured retention', 'requires a published app');

// -------------------------------------------------------------------- report
const order = { FAIL: 0, MANUAL: 1, PASS: 2 };
checks.sort((a, b) => order[a.state] - order[b.state] || a.area.localeCompare(b.area));

const width = Math.max(...checks.map((c) => c.what.length));
for (const c of checks) {
  console.log(`${c.state.padEnd(6)} ${c.area.padEnd(12)} ${c.what.padEnd(width)}  ${c.detail}`);
}

const counts = checks.reduce((acc, c) => ({ ...acc, [c.state]: (acc[c.state] ?? 0) + 1 }), {});
console.log('');
console.log(
  `${counts.PASS ?? 0} verified, ${counts.FAIL ?? 0} missing, ${counts.MANUAL ?? 0} need a human.`
);
console.log("Rules are the operator's research; nothing here verifies them.");
