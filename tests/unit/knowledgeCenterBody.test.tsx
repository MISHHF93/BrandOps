import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { KnowledgeCenterBody, renderInlineBold } from '../../src/shared/help/KnowledgeCenterBody';
import {
  knowledgeCenterDailyPlaybook,
  knowledgeCenterTopics
} from '../../src/shared/help/knowledgeCenterTopics';

describe('renderInlineBold', () => {
  it('turns **term** markers into <strong> without leaking literal asterisks', () => {
    const html = renderToStaticMarkup(<p>{renderInlineBold('Open **Plan** on the dock.')}</p>);
    expect(html).toContain('<strong');
    expect(html).toContain('>Plan<');
    expect(html).not.toContain('*');
  });

  it('passes through text with no markers unchanged', () => {
    const html = renderToStaticMarkup(<p>{renderInlineBold('Plain text, no emphasis here.')}</p>);
    expect(html).toBe('<p>Plain text, no emphasis here.</p>');
  });

  it('renders multiple emphasized terms in one string', () => {
    const html = renderToStaticMarkup(<p>{renderInlineBold('**Ask** and **Plan** only.')}</p>);
    expect(html.match(/<strong/g)?.length).toBe(2);
    expect(html).not.toContain('*');
  });
});

describe('KnowledgeCenterBody', () => {
  /**
   * Regression guard: `knowledgeCenterTopics.ts` intentionally has no markdown
   * pipeline (per its own top-of-file comment) but its copy uses `**term**`
   * emphasis throughout. Plain `{text}` interpolation used to render the
   * literal asterisks to the user across every surface — the daily playbook
   * intro, step bodies, topic preview summaries, and "Show full guide"
   * paragraphs. This asserts none of those four render sites regress.
   */
  it('never leaks literal ** markers into the rendered Knowledge Center', () => {
    const html = renderToStaticMarkup(<KnowledgeCenterBody topicLinkMode="page-query" />);
    expect(html).not.toContain('**');
    expect(html).toContain(knowledgeCenterDailyPlaybook.title);
  });

  it('source content actually exercises the bold-emphasis path (test would be vacuous otherwise)', () => {
    expect(knowledgeCenterDailyPlaybook.intro).toContain('**');
    expect(
      knowledgeCenterTopics.some((topic) => topic.paragraphs.some((p) => p.includes('**')))
    ).toBe(true);
  });
});
