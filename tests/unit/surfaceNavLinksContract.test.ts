import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SurfaceNavLinks } from '../../src/shared/navigation/SurfaceNavLinks';

/**
 * Asserts link intent (destinations/labels) without brittle long prose.
 */
describe('SurfaceNavLinks (contract)', () => {
  it('exposes one Help link and distinct Integrations tab vs page labels', () => {
    const html = renderToString(React.createElement(SurfaceNavLinks));
    expect(html).toContain('>Help</a>');
    expect(html).toContain('>Integrations tab</a>');
    expect(html).toContain('>Integrations page</a>');
    expect((html.match(/>Help</g) ?? []).length).toBe(1);
  });

  it('includes core shell tab labels', () => {
    const html = renderToString(React.createElement(SurfaceNavLinks));
    for (const label of ['Pulse', 'Chat', 'Today', 'Settings']) {
      expect(html).toContain(`>${label}</a>`);
    }
  });
});
