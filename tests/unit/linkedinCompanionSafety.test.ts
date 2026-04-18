import { describe, expect, it } from 'vitest';

import { cloneDemoSampleData } from '../helpers/fixtures';
import {
  applyCompanionCapture,
  defaultCompanionFormState,
  normalizeCompanionForm,
  validateCompanionCapture
} from '../../src/content/linkedinCompanionSafety';

describe('linkedinCompanionSafety', () => {
  it('rejects capture when there is no actionable payload', () => {
    const data = cloneDemoSampleData();
    const form = normalizeCompanionForm(defaultCompanionFormState());
    const error = validateCompanionCapture(
      {
        url: 'https://www.linkedin.com/in/test-user',
        name: '',
        role: '',
        company: ''
      },
      form
    );

    expect(error).toBeTruthy();

    const result = applyCompanionCapture(
      data,
      {
        url: 'https://www.linkedin.com/in/test-user',
        name: '',
        role: '',
        company: ''
      },
      defaultCompanionFormState()
    );
    expect('error' in result).toBe(true);
  });

  it('creates companion records for note, outreach, pipeline, and follow-up', () => {
    const data = cloneDemoSampleData();
    const result = applyCompanionCapture(
      data,
      {
        url: 'https://www.linkedin.com/in/new-profile',
        name: 'New Profile',
        role: 'CTO',
        company: 'Acme Labs'
      },
      {
        ...defaultCompanionFormState(),
        note: 'Great profile signal and technical depth.',
        outreachDraft: 'Sharing a short technical teardown and proposing a manual follow-up.',
        pipelineName: 'Acme Labs - advisory',
        followUpDate: '2026-04-20'
      },
      new Date('2026-04-12T12:00:00.000Z')
    );

    expect('error' in result).toBe(false);
    if ('error' in result) return;

    expect(result.summary).toContain('contact');
    expect(result.summary).toContain('outreach draft');
    expect(result.summary).toContain('opportunity');
    expect(result.summary).toContain('follow-up');
    expect(result.data.contacts[0].name).toBe('New Profile');
    expect(result.data.outreachDrafts[0].targetName).toBe('New Profile');
    expect(result.data.opportunities[0].name).toContain('Acme Labs');
    expect(result.data.followUps[0].reason).toContain('LinkedIn follow-up');
  });

  it('deduplicates contact by LinkedIn URL and updates existing contact', () => {
    const data = cloneDemoSampleData();
    data.contacts = [
      {
        ...data.contacts[0],
        id: 'contact-existing',
        name: 'Existing Person',
        company: 'Existing Co',
        role: 'Founder',
        links: ['https://www.linkedin.com/in/existing-profile']
      }
    ];

    const result = applyCompanionCapture(
      data,
      {
        url: 'https://www.linkedin.com/in/existing-profile',
        name: 'Existing Person Updated',
        role: 'Founder',
        company: 'Existing Co'
      },
      {
        ...defaultCompanionFormState(),
        note: 'Updated context only'
      },
      new Date('2026-04-12T12:00:00.000Z')
    );

    expect('error' in result).toBe(false);
    if ('error' in result) return;

    expect(result.data.contacts).toHaveLength(1);
    expect(result.data.contacts[0].id).toBe('contact-existing');
    expect(result.data.contacts[0].name).toBe('Existing Person Updated');
  });
});
