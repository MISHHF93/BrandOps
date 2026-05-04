import { describe, expect, it } from 'vitest';
import { maskAiBridgeEndpointPreview } from '../../src/pages/mobile/mobileSettingsReadout';

describe('maskAiBridgeEndpointPreview', () => {
  it('returns an em dash for empty input', () => {
    expect(maskAiBridgeEndpointPreview('')).toBe('—');
    expect(maskAiBridgeEndpointPreview('   ')).toBe('—');
  });

  it('parses bare hosts with implied https', () => {
    expect(maskAiBridgeEndpointPreview('api.openai.com/v1')).toContain('api.openai.com');
  });

  it('returns marker for invalid URLs', () => {
    expect(maskAiBridgeEndpointPreview(':::broken')).toBe('(unparsable URL)');
  });
});
