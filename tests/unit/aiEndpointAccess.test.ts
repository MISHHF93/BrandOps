import { describe, expect, it } from 'vitest';
import {
  ensureAiEndpointAccess,
  toChromeOriginPattern
} from '../../src/services/ai/aiEndpointAccess';

describe('AI endpoint host access', () => {
  it('builds narrow MV3 origin patterns without carrying endpoint paths or ports', () => {
    expect(toChromeOriginPattern('https://api.example.com:8443/v1')).toBe(
      'https://api.example.com/*'
    );
    expect(toChromeOriginPattern('http://localhost:11434/v1')).toBe('http://localhost/*');
  });

  it('requires no permission prompt outside a Chrome extension runtime', async () => {
    await expect(ensureAiEndpointAccess(['https://api.example.com/v1'])).resolves.toEqual({
      granted: true,
      requestedOrigins: ['https://api.example.com/*']
    });
  });
});
