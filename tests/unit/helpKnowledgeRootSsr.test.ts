import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HelpKnowledgeRoot } from '../../src/pages/help/HelpKnowledgeRoot';

describe('HelpKnowledgeRoot (SSR)', () => {
  it('renders Knowledge Center landmarks and manual sections', () => {
    const html = renderToString(React.createElement(HelpKnowledgeRoot));
    expect(html).toContain('Knowledge Center');
    expect(html).toContain('Shell tabs');
    expect(html).toContain('Pulse');
    expect(html).toContain('Chat');
    expect(html).toContain('Integrations (in app)');
    expect(html).toContain('Integrations hub');
    expect(html).toContain('Settings');
    expect(html).toContain('Today workstreams');
    expect(html).toContain('>Today</a>');
    expect(html).toContain('>Pipeline</a>');
    expect(html).toContain('Brand &amp; content');
    expect(html).toContain('>Connections</a>');
    expect(html).toContain('Reference');
    expect(html).toContain('Start here');
  });
});
