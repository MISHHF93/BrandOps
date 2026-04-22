import { beforeEach, describe, expect, it, vi } from 'vitest';
import { navigateCrownFromExtensionSurface } from '../../src/shared/navigation/navigateCrownFromExtensionSurface';
import { openExtensionSurface } from '../../src/shared/navigation/openExtensionSurface';

vi.mock('../../src/shared/navigation/openExtensionSurface', () => ({
  openExtensionSurface: vi.fn()
}));

describe('navigateCrownFromExtensionSurface', () => {
  beforeEach(() => {
    vi.mocked(openExtensionSurface).mockClear();
  });

  it('sends section workstreams to dashboard surface with target section (mobile.html via openExtensionSurface)', () => {
    navigateCrownFromExtensionSurface({
      id: 'pipe',
      label: 'Pipeline',
      description: 'x',
      type: 'section',
      target: 'pipeline'
    });
    expect(openExtensionSurface).toHaveBeenCalledWith('dashboard', 'pipeline');
  });

  it('navigates surface items by target only', () => {
    navigateCrownFromExtensionSurface({
      id: 'h',
      label: 'Help',
      description: 'x',
      type: 'surface',
      target: 'help'
    });
    expect(openExtensionSurface).toHaveBeenCalledWith('help');
  });
});
