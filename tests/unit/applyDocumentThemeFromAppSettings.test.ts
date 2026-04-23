import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultAppSettings } from '../../src/config/workspaceDefaults';
import { applyDocumentThemeFromAppSettings } from '../../src/shared/ui/theme';
import type { AppSettings } from '../../src/types/domain';

describe('applyDocumentThemeFromAppSettings', () => {
  const attrs: Record<string, string> = {};
  const mockRoot = {
    style: { colorScheme: '' as string },
    setAttribute(k: string, v: string) {
      attrs[k] = v;
    },
    getAttribute(k: string) {
      return attrs[k] ?? null;
    },
    removeAttribute(k: string) {
      delete attrs[k];
    }
  };

  const prevDocument = globalThis.document;
  const prevWindow = globalThis.window;

  beforeEach(() => {
    Object.keys(attrs).forEach((k) => {
      delete attrs[k];
    });
    (globalThis as unknown as { document: typeof document }).document = {
      documentElement: mockRoot as unknown as HTMLElement,
      body: { classList: { add: vi.fn(), remove: vi.fn() } }
    } as unknown as Document;
    (globalThis as unknown as { window: typeof window }).window = {
      matchMedia: () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
      sessionStorage: { getItem: () => null, removeItem: vi.fn(), setItem: vi.fn() },
      setTimeout: (fn: () => void) => {
        fn();
        return 0;
      }
    } as unknown as Window & typeof globalThis;
  });

  afterEach(() => {
    if (prevDocument !== undefined) {
      (globalThis as unknown as { document: Document }).document = prevDocument;
    } else {
      delete (globalThis as unknown as { document?: Document }).document;
    }
    if (prevWindow !== undefined) {
      (globalThis as unknown as { window: Window }).window = prevWindow;
    } else {
      delete (globalThis as unknown as { window?: Window }).window;
    }
  });

  it('sets data-theme, visual, motion, and ambient on documentElement from settings', () => {
    const s: AppSettings = {
      ...defaultAppSettings,
      theme: 'light',
      visualMode: 'retroMagic',
      motionMode: 'off',
      ambientFxEnabled: true
    };
    applyDocumentThemeFromAppSettings(s);
    expect(attrs['data-theme']).toBe('light');
    expect(mockRoot.style.colorScheme).toBe('light');
    expect(attrs['data-visual-mode']).toBe('retroMagic');
    expect(attrs['data-motion-mode']).toBe('off');
    expect(attrs['data-ambient-fx']).toBe('on');
  });
});
