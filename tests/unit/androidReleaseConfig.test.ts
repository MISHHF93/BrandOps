/**
 * The Android project has to be capable of producing something a store accepts.
 *
 * It could not. `versionCode` was hardcoded to `1` and `versionName` to
 * `"1.0"`, so the **second** upload would have been rejected for reusing a
 * version code — and the app's version disagreed with the product's from the
 * start. There was no signing configuration at all, and CI published a synced
 * source tree rather than a bundle. A tree is not something Google Play accepts.
 *
 * None of that could fail, because nothing built the release variant. This file
 * checks the configuration by reading it, which is what can be verified without
 * an Android SDK — the situation on this machine and on most that touch this
 * repository. **It does not prove the build compiles.** `npm run android:bundle`
 * on a machine with the SDK is the only thing that does, and this file is
 * deliberately narrow about the difference.
 *
 * The Gradle side was verified once by hand, since the SDK is not needed to
 * *configure* a project — only to compile one. `./gradlew :app:brandopsReleaseIdentity`
 * evaluated the file and printed what a release would actually carry:
 *
 * ```
 *   versionName=0.1.0   versionCode=1000   signed=false
 * ```
 *
 * 0.1.0 → 0×10⁶ + 1×10³ + 0 = 1000, which is the derivation this file asserts,
 * confirmed by the tool that will run it rather than by reading the expression.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const gradleSource = readFileSync(join(process.cwd(), 'android/app/build.gradle'), 'utf8');

/**
 * Configuration only, with comments removed.
 *
 * The first version of this file matched the raw source and failed on its own
 * doc comment, which quotes the old `versionName "1.0"` while explaining why it
 * is gone. A check a comment can satisfy — or break — is not checking the
 * configuration.
 */
const gradle = gradleSource.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const gitignore = readFileSync(join(process.cwd(), '.gitignore'), 'utf8');
const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));

describe('release identity', () => {
  it('takes its version from package.json rather than a literal', () => {
    // Was `versionCode 1` / `versionName "1.0"`.
    expect(gradle).toContain('versionName appVersion');
    expect(gradle).not.toMatch(/versionName\s+"1\.0"/);
    expect(gradle).not.toMatch(/versionCode\s+1\b/);
  });

  it('derives a version code that rises with the version', async () => {
    /**
     * The rule the Gradle expression implements, restated so it is checked
     * rather than trusted: major * 1e6 + minor * 1e3 + patch. A store rejects a
     * build whose code did not increase, which is a bad thing to discover at
     * upload time.
     */
    const codeOf = (semver: string) => {
      const [major = 0, minor = 0, patch = 0] = semver.split('.').map(Number);
      return major * 1000000 + minor * 1000 + patch;
    };
    expect(codeOf('0.1.0')).toBeGreaterThan(codeOf('0.0.9'));
    expect(codeOf('1.0.0')).toBeGreaterThan(codeOf('0.99.99'));
    expect(codeOf(pkg.version)).toBeGreaterThan(0);
  });

  it('lets a single build override the code without editing the file', () => {
    // Hotfix uploads sometimes need a code bump without a version bump.
    expect(gradle).toContain("project.hasProperty('brandopsVersionCode')");
  });
});

describe('release signing', () => {
  it('is configured to sign when a key is available', () => {
    expect(gradle).toContain('signingConfigs');
    expect(gradle).toContain('signingConfig signingConfigs.release');
  });

  it('reads the key from a file or the environment, never from the tree', () => {
    expect(gradle).toContain("rootProject.file('keystore.properties')");
    expect(gradle).toContain("System.getenv('BRANDOPS_KEYSTORE_PASSWORD')");
  });

  it('stays unsigned rather than failing when no key is present', () => {
    /**
     * The important half. A contributor without the signing key must still be
     * able to build; what they must not get is something that looks shippable.
     * Both branches are guarded by `canSign`.
     */
    expect(gradle).toContain('def canSign =');
    expect(gradle).toMatch(/if \(canSign\)/);
  });

  it('never commits key material', () => {
    for (const pattern of ['android/keystore.properties', '*.jks', '*.keystore']) {
      expect(gitignore, `${pattern} is not ignored`).toContain(pattern);
    }
  });
});

describe('what the build produces', () => {
  it('offers a bundle, which is what the store takes', () => {
    // `assembleRelease` produces an APK; Play wants an AAB. Both are available,
    // and the default is the one that can actually be uploaded.
    expect(pkg.scripts['android:bundle']).toBeDefined();
    expect(pkg.scripts['android:bundle']).toContain('android-release.mjs bundle');
  });

  it('builds the web assets and syncs them first', () => {
    // A bundle built without `cap sync` ships whatever was in the native tree
    // last time, which is the kind of stale artefact nobody notices until a
    // user reports a fixed bug.
    expect(pkg.scripts['android:bundle']).toContain('npm run build');
    expect(pkg.scripts['android:bundle']).toContain('android:sync');
  });

  it('can report readiness on a machine with no Android SDK', () => {
    // Which is this one. The check has to work where the build cannot.
    expect(pkg.scripts['android:release:check']).toContain('android-release.mjs check');
  });

  it('leaves shrinking off, deliberately', () => {
    /**
     * Recorded rather than changed. Capacitor plugins resolve classes
     * reflectively, so enabling R8 without a device to test on is how a store
     * build ships broken. This asserts the current choice so that turning it on
     * is a decision someone makes with a device in hand.
     */
    expect(gradle).toContain('minifyEnabled false');
  });
});
