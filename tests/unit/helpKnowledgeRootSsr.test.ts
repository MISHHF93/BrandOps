import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HelpKnowledgeRoot } from '../../src/pages/help/HelpKnowledgeRoot';

describe('HelpKnowledgeRoot (SSR)', () => {
  it('renders Knowledge Center landmarks and manual sections', () => {
    const html = renderToString(React.createElement(HelpKnowledgeRoot));
    expect(html).toContain('Knowledge Center');
    expect(html).toContain('Today (cockpit)');
    expect(html).toContain('Chat');
    expect(html).toContain('Integrations');
    expect(html).toContain('Reference');
    expect(html).toContain('Start here');
  });
});
