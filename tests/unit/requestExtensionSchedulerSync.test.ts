import { describe, expect, it } from 'vitest';

import { requestExtensionSchedulerSync } from '../../src/services/messaging/requestExtensionSchedulerSync';

describe('requestExtensionSchedulerSync', () => {
  it('does not throw when chrome.runtime is absent (web / Vitest)', () => {
    expect(() => requestExtensionSchedulerSync()).not.toThrow();
  });
});
