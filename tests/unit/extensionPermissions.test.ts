/**
 * The extension asks for exactly what it uses.
 *
 * The manifest requested `tabs` and `activeTab`. Neither was needed.
 *
 * The only `chrome.tabs` API in the codebase is `chrome.tabs.create`, which
 * requires no permission at all — it works for any extension. The `tabs`
 * permission grants something quite different: read access to the `url`,
 * `title` and `favIconUrl` of **every open tab**. Chrome surfaces that at
 * install time as *"Read your browsing history"*, which is a great deal to ask
 * of someone installing a tool to manage their own professional profile, in
 * exchange for nothing.
 *
 * `activeTab` was equally unused: it exists to grant temporary host access when
 * the user invokes the extension, and nothing here injects — no
 * `chrome.scripting`, no `executeScript`, no `insertCSS`, no `tabs.query`. The
 * LinkedIn content script runs from `host_permissions` and `matches`, which is a
 * separate mechanism.
 *
 * Unused permissions are not free. They widen what a compromised extension can
 * reach, they draw extra scrutiny in store review, and they spend user trust at
 * the exact moment it is being asked for.
 *
 * This test enforces the correspondence in **both directions**, because each
 * catches a different mistake: a permission with no matching API is over-asking,
 * and an API with no matching permission is a feature that will fail at runtime
 * in a way local development may never show.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const MANIFEST = 'public/manifest.template.json';

interface Manifest {
  permissions: string[];
  host_permissions: string[];
  optional_host_permissions?: string[];
  content_scripts: Array<{ matches: string[]; js: string[] }>;
  web_accessible_resources?: Array<{ resources: string[]; matches: string[] }>;
}

const manifest = (): Manifest => JSON.parse(readFileSync(MANIFEST, 'utf8'));

function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(ts|tsx)$/.test(entry)) out.push(path.replace(/\\/g, '/'));
    }
  };
  walk('src');
  return out;
}

const allSource = () =>
  sourceFiles()
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');

/**
 * Matches a `chrome.<api>` call, optional chaining included.
 *
 * The first version of this required a literal `.` after the namespace, so
 * `chrome.notifications?.create` — how the background script actually guards a
 * possibly-absent API — did not match, and the test reported a permission the
 * product genuinely needs as unused. A guard whose failure mode is *remove a
 * working feature's permission* is worse than no guard, so the pattern is
 * written once here rather than twelve times below.
 */
function ns(api: string): RegExp {
  // `[.]` rather than an escaped dot: inside a template literal `\.` is a string
  // escape that collapses to a bare `.`, which in the regex would then match any
  // character. The character class needs no escaping and says what it means.
  return new RegExp(`chrome[.]${api}[?!]?[.]`);
}

/**
 * Permission → the APIs that actually require it.
 *
 * `chrome.tabs.create` is deliberately absent from the `tabs` entry: it is
 * available without the permission, and treating it as justification is exactly
 * the reasoning that put `tabs` in this manifest.
 */
const REQUIRES: Record<string, RegExp> = {
  storage: ns('storage'),
  alarms: ns('alarms'),
  notifications: ns('notifications'),
  // `chrome.tabs.create` is deliberately absent: it needs no permission, and
  // treating it as justification is what put `tabs` in this manifest.
  tabs: /chrome[.]tabs[?!]?[.](query|get|getCurrent|captureVisibleTab|sendMessage|onUpdated)/,
  activeTab: /chrome[.]scripting[?!]?[.]|executeScript|insertCSS/,
  scripting: ns('scripting'),
  cookies: ns('cookies'),
  webRequest: ns('webRequest'),
  history: ns('history'),
  bookmarks: ns('bookmarks'),
  downloads: ns('downloads'),
  clipboardRead: /clipboardRead|navigator\.clipboard\.read/
};

describe('declared permissions', () => {
  it('are all actually used', () => {
    const source = allSource();
    const unjustified = manifest().permissions.filter((permission) => {
      const pattern = REQUIRES[permission];
      // An unknown permission is reported rather than assumed fine: a name this
      // test does not know is a name nobody has justified.
      if (!pattern) return true;
      return !pattern.test(source);
    });

    expect(
      unjustified,
      `requested but unused — each one widens what a compromised extension reaches:\n  ${unjustified.join('\n  ')}`
    ).toEqual([]);
  });

  it('cover every sensitive API the code calls', () => {
    const source = allSource();
    const declared = new Set(manifest().permissions);
    const missing = Object.entries(REQUIRES)
      .filter(([permission, pattern]) => pattern.test(source) && !declared.has(permission))
      .map(([permission]) => permission);

    // The other direction. A missing permission is a feature that fails at
    // runtime, often only once it is installed rather than in development.
    expect(missing, `used but not declared:\n  ${missing.join('\n  ')}`).toEqual([]);
  });

  it('does not ask to read browsing history', () => {
    // Named explicitly because this is what the user is shown at install time,
    // and it was being asked for in exchange for nothing.
    expect(manifest().permissions).not.toContain('tabs');
    expect(manifest().permissions).not.toContain('history');
  });
});

describe('host access', () => {
  it('grants standing access only to hosts the product needs', () => {
    const hosts = manifest().host_permissions;
    for (const host of hosts) {
      // A standing wildcard is access to the whole web on install. Broad access
      // belongs in `optional_host_permissions`, where the user is asked at the
      // moment it is needed and can say no.
      expect(host, `standing wildcard host permission: ${host}`).not.toMatch(/^https?:\/\/\*\/\*$/);
      expect(host).toMatch(/^https:\/\//);
    }
  });

  it('keeps broad access optional rather than standing', () => {
    const optional = manifest().optional_host_permissions ?? [];
    // Recorded as deliberate: the wildcard exists, and it is in the right list.
    expect(optional).toContain('https://*/*');
  });

  it('injects into LinkedIn only', () => {
    for (const script of manifest().content_scripts) {
      for (const match of script.matches) {
        // The content script reads the page and writes to the workspace. Every
        // origin it runs on is an origin that can influence stored records.
        expect(match, `content script runs on ${match}`).toMatch(/linkedin\.com/);
      }
    }
  });

  it('exposes the fewest possible resources to the page', () => {
    const exposed = manifest().web_accessible_resources ?? [];
    for (const entry of exposed) {
      for (const resource of entry.resources) {
        // Anything listed here is fetchable by the host page. A wildcard would
        // let LinkedIn enumerate the extension's files.
        expect(resource, `web-accessible: ${resource}`).not.toContain('*');
      }
      for (const match of entry.matches) {
        expect(match).toMatch(/linkedin\.com/);
      }
    }
  });
});
