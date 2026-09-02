/**
 * @vitest-environment jsdom
 *
 * The chat page stays about the conversation.
 *
 * It reads fine with two messages, which is how it was always looked at. With
 * twenty it did not: every message carried Copy, Save and Pin, and assistant
 * messages added Convert to Plan, all rendered at once.
 *
 * ```
 *   219 words of conversation        70 controls
 * ```
 *
 * Eleven words and three-and-a-half buttons per message — the actions outweighed
 * the thing they act on, and scrolling back through a conversation meant
 * scrolling through a grid of buttons.
 *
 * The newest message keeps its actions open, because that is what almost every
 * action is aimed at. Older messages fold theirs behind one quiet disclosure.
 * Nothing is removed; nothing is more than a tap away. Four visible controls
 * instead of seventy.
 *
 * The counts below are of *visible* controls. A closed `<details>` keeps its
 * children in the DOM, so counting `button` elements would show no improvement
 * at all — which is exactly what the first version of this measurement did.
 */
import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { MobileChatView } from '../../src/pages/mobile/MobileChatView';

const noop = () => {};

function chat(messageCount: number) {
  const messages = Array.from({ length: messageCount }, (_, index) => ({
    id: `m${index}`,
    role: index % 2 === 0 ? 'user' : 'assistant',
    text:
      index % 2 === 0
        ? 'What should I focus on this week?'
        : 'Three things stand out from your workspace this week, in order of impact.'
  }));

  const html = renderToString(
    React.createElement(MobileChatView, {
      messages,
      loading: false,
      onQuickCommand: noop,
      btnFocus: '',
      onConvertAskToPlan: noop
    } as never)
  );

  const doc = new JSDOM(`<body>${html}</body>`).window.document;
  const inClosedDetails = (el: Element) => {
    const details = el.closest('details');
    return Boolean(details) && !details!.hasAttribute('open');
  };
  const visibleButtons = Array.from(doc.querySelectorAll('button')).filter(
    (button) => !inClosedDetails(button)
  );
  return { doc, html, visibleButtons };
}

describe('controls do not outgrow the conversation', () => {
  it('shows a handful of actions however long the thread is', () => {
    const short = chat(2).visibleButtons.length;
    const long = chat(20).visibleButtons.length;

    // Was 70 at twenty messages. The point is that it no longer scales with
    // length: a long conversation is not a busier screen.
    expect(long, `${long} visible controls at 20 messages`).toBeLessThanOrEqual(short + 2);
    expect(long).toBeLessThan(10);
  });

  it('keeps the newest message actions open', () => {
    const { visibleButtons } = chat(20);
    const labels = visibleButtons.map((button) => (button.textContent ?? '').trim());
    // The most recent answer is what someone copies, saves or converts.
    expect(labels).toContain('Copy');
    expect(labels).toContain('Convert to Plan');
  });

  it('leaves every older message one tap from its actions', () => {
    const { doc } = chat(20);
    const folded = Array.from(doc.querySelectorAll('details')).filter(
      (details) => !details.hasAttribute('open')
    );

    // Folded, not removed. Nineteen older messages, each still reachable.
    expect(folded.length).toBeGreaterThan(10);
    for (const details of folded) {
      expect(details.querySelector('summary')?.textContent?.trim()).toBe('Actions');
      expect(details.querySelectorAll('button').length).toBeGreaterThan(0);
    }
  });

  it('still renders the whole conversation', () => {
    const { doc } = chat(20);
    const text = doc.body.textContent ?? '';
    // Folding actions must not fold content. Every message is still readable
    // without a single tap.
    expect(text).toContain('What should I focus on this week?');
    expect(text).toContain('Three things stand out');
    expect(doc.querySelectorAll('article').length).toBeGreaterThanOrEqual(20);
  });
});
