import { beforeEach, describe, expect, it, vi } from 'vitest';

const memoryStorage = new Map<string, unknown>();

vi.mock('../../src/shared/storage/browserStorage', () => ({
  browserLocalStorage: {
    get: vi.fn(async (key: string) => memoryStorage.get(key)),
    set: vi.fn(async (key: string, value: unknown) => {
      memoryStorage.set(key, value);
    }),
    remove: vi.fn(async (key: string) => {
      memoryStorage.delete(key);
    }),
    getAll: vi.fn(async () => Object.fromEntries(memoryStorage.entries())),
    clear: vi.fn(async () => {
      memoryStorage.clear();
    })
  }
}));

import { executeChannelCommand } from '../../src/services/agent/channelCommandExecutor';
import { storageService } from '../../src/services/storage/storage';

describe('channelCommandExecutor', () => {
  beforeEach(async () => {
    memoryStorage.clear();
    await storageService.getData();
  });

  it('adds note from telegram command', async () => {
    const before = await storageService.getData();
    const result = await executeChannelCommand({
      platform: 'telegram',
      text: 'add note: validate conversion campaign handoff',
      actorName: 'Ops Lead'
    });
    const after = await storageService.getData();

    expect(result.ok).toBe(true);
    expect(result.action).toBe('add-note');
    expect(after.notes.length).toBe(before.notes.length + 1);
    expect(after.notes[0].title).toContain('Agent note');
    expect(after.notes[0].detail).toContain('validate conversion campaign handoff');
  });

  it('reschedules publishing queue from whatsapp command', async () => {
    const seeded = await storageService.getData();
    const now = new Date().toISOString();
    await storageService.setData({
      ...seeded,
      publishingQueue: [
        {
          id: 'pub-test-1',
          title: 'Test publish item',
          body: 'body',
          platforms: ['linkedin'],
          tags: [],
          status: 'ready-to-post',
          scheduledFor: now,
          reminderAt: now,
          createdAt: now,
          updatedAt: now
        }
      ]
    });

    const result = await executeChannelCommand({
      platform: 'whatsapp',
      text: 'reschedule posts to friday 11am',
      actorName: 'Founder'
    });
    const after = await storageService.getData();

    expect(result.ok).toBe(true);
    expect(result.action).toBe('reschedule-publishing');
    const eligible = after.publishingQueue.filter(
      (item) => item.status !== 'posted' && item.status !== 'skipped'
    );
    expect(eligible.length).toBeGreaterThan(0);
    expect(eligible.every((item) => item.scheduledFor && item.reminderAt)).toBe(true);
  });

  it('adds integration source from connect command', async () => {
    const before = await storageService.getData();
    const result = await executeChannelCommand({
      platform: 'telegram',
      text: 'connect notion source: Growth OS'
    });
    const after = await storageService.getData();

    expect(result.ok).toBe(true);
    expect(result.action).toBe('add-integration-source');
    expect(after.integrationHub.sources.length).toBe(before.integrationHub.sources.length + 1);
    expect(after.integrationHub.sources[0].kind).toBe('notion');
  });

  it('creates outreach draft from channel command', async () => {
    const before = await storageService.getData();
    const result = await executeChannelCommand({
      platform: 'telegram',
      text: 'draft outreach: quick intro message for ACME founder'
    });
    const after = await storageService.getData();

    expect(result.ok).toBe(true);
    expect(result.action).toBe('add-outreach-draft');
    expect(after.outreachDrafts.length).toBe(before.outreachDrafts.length + 1);
  });

  it('creates publishing draft from channel command', async () => {
    const before = await storageService.getData();
    const result = await executeChannelCommand({
      platform: 'whatsapp',
      text: 'draft post: today we launched our new growth sprint'
    });
    const after = await storageService.getData();

    expect(result.ok).toBe(true);
    expect(result.action).toBe('add-publishing-draft');
    expect(after.publishingQueue.length).toBe(before.publishingQueue.length + 1);
  });

  it('creates and completes follow-up tasks from commands', async () => {
    const seeded = await storageService.getData();
    const now = new Date().toISOString();
    await storageService.setData({
      ...seeded,
      contacts: [
        {
          id: 'contact-test-1',
          name: 'Test Contact',
          company: 'Acme',
          role: 'Founder',
          source: 'manual',
          relationshipStage: 'new',
          status: 'active',
          nextAction: 'Follow up',
          followUpDate: now,
          notes: '',
          links: [],
          relatedOutreachDraftIds: [],
          relatedContentTags: [],
          lastContactAt: now
        }
      ]
    });
    const before = await storageService.getData();
    const createResult = await executeChannelCommand({
      platform: 'telegram',
      text: 'create follow up: check proposal status'
    });
    const afterCreate = await storageService.getData();
    expect(createResult.ok).toBe(true);
    expect(createResult.action).toBe('create-follow-up');
    expect(afterCreate.followUps.length).toBe(before.followUps.length + 1);

    const completeResult = await executeChannelCommand({
      platform: 'telegram',
      text: 'complete follow up'
    });
    const afterComplete = await storageService.getData();
    expect(completeResult.ok).toBe(true);
    expect(completeResult.action).toBe('complete-follow-up');
    expect(afterComplete.followUps.some((item) => item.completed)).toBe(true);
  });

  it('updates opportunity value and confidence via command', async () => {
    const seeded = await storageService.getData();
    const now = new Date().toISOString();
    await storageService.setData({
      ...seeded,
      opportunities: [
        {
          id: 'opp-test-1',
          name: 'Opportunity Test',
          company: 'Acme',
          role: 'Founder',
          source: 'manual',
          relationshipStage: 'new',
          opportunityType: 'consulting',
          status: 'prospect',
          nextAction: 'Send proposal',
          followUpDate: now,
          notes: '',
          links: [],
          relatedOutreachDraftIds: [],
          relatedContentTags: [],
          createdAt: now,
          updatedAt: now,
          valueUsd: 1000,
          confidence: 25
        }
      ]
    });

    const result = await executeChannelCommand({
      platform: 'whatsapp',
      text: 'update opportunity value 50000 confidence 72'
    });
    const after = await storageService.getData();
    const first = after.opportunities.find((item) => !item.archivedAt) ?? after.opportunities[0];

    expect(result.ok).toBe(true);
    expect(result.action).toBe('update-opportunity');
    expect(first?.valueUsd).toBeGreaterThanOrEqual(50000);
    expect(first?.confidence).toBe(72);
  });

  it('archives and restores opportunity from commands', async () => {
    const seeded = await storageService.getData();
    const now = new Date().toISOString();
    await storageService.setData({
      ...seeded,
      opportunities: [
        {
          id: 'opp-test-2',
          name: 'Opportunity Archive Test',
          company: 'Beta',
          role: 'Head of Marketing',
          source: 'manual',
          relationshipStage: 'building',
          opportunityType: 'consulting',
          status: 'prospect',
          nextAction: 'Follow up',
          followUpDate: now,
          notes: '',
          links: [],
          relatedOutreachDraftIds: [],
          relatedContentTags: [],
          createdAt: now,
          updatedAt: now,
          valueUsd: 3000,
          confidence: 40
        }
      ]
    });

    const archive = await executeChannelCommand({
      platform: 'telegram',
      text: 'archive opportunity'
    });
    expect(archive.ok).toBe(true);
    expect(archive.action).toBe('archive-opportunity');

    const restore = await executeChannelCommand({
      platform: 'telegram',
      text: 'restore opportunity'
    });
    expect(restore.ok).toBe(true);
    expect(restore.action).toBe('restore-opportunity');
  });

  it('adds contact from command', async () => {
    const before = await storageService.getData();
    const result = await executeChannelCommand({
      platform: 'telegram',
      text: 'add contact: Jane Doe, Acme, Founder'
    });
    const after = await storageService.getData();
    expect(result.ok).toBe(true);
    expect(result.action).toBe('add-contact');
    expect(after.contacts.length).toBe(before.contacts.length + 1);
  });

  it('adds and archives content item from commands', async () => {
    const before = await storageService.getData();
    const addResult = await executeChannelCommand({
      platform: 'whatsapp',
      text: 'add content: Growth systems memo draft'
    });
    const afterAdd = await storageService.getData();
    expect(addResult.ok).toBe(true);
    expect(addResult.action).toBe('add-content-item');
    expect(afterAdd.contentLibrary.length).toBe(before.contentLibrary.length + 1);

    const archiveResult = await executeChannelCommand({
      platform: 'whatsapp',
      text: 'archive content'
    });
    const afterArchive = await storageService.getData();
    expect(archiveResult.ok).toBe(true);
    expect(archiveResult.action).toBe('archive-content-item');
    expect(afterArchive.contentLibrary.some((item) => item.status === 'archived')).toBe(true);
  });

  it('applies workspace configuration command', async () => {
    const result = await executeChannelCommand({
      platform: 'telegram',
      text: 'configure: cadence balanced, remind before 25 min'
    });
    const after = await storageService.getData();
    expect(result.ok).toBe(true);
    expect(result.action).toBe('configure-workspace');
    expect(after.settings.cadenceFlow.remindBeforeMinutes).toBe(25);
  });

  it('updates contact from command', async () => {
    const seeded = await storageService.getData();
    const now = new Date().toISOString();
    await storageService.setData({
      ...seeded,
      contacts: [
        {
          id: 'contact-update-1',
          name: 'Old Name',
          company: 'Old Co',
          role: 'Old Role',
          source: 'manual',
          relationshipStage: 'new',
          status: 'active',
          nextAction: 'Follow up',
          followUpDate: now,
          notes: '',
          links: [],
          relatedOutreachDraftIds: [],
          relatedContentTags: [],
          lastContactAt: now
        }
      ]
    });

    const result = await executeChannelCommand({
      platform: 'telegram',
      text: 'update contact: Jane Roe, New Labs, CTO'
    });
    const after = await storageService.getData();
    expect(result.ok).toBe(true);
    expect(result.action).toBe('update-contact');
    expect(after.contacts[0].name).toBe('Jane Roe');
    expect(after.contacts[0].company).toBe('New Labs');
    expect(after.contacts[0].role).toBe('CTO');
  });

  it('updates and duplicates content from commands', async () => {
    const seeded = await storageService.getData();
    const now = new Date().toISOString();
    await storageService.setData({
      ...seeded,
      contentLibrary: [
        {
          id: 'content-update-1',
          type: 'post-draft',
          title: 'Original title',
          body: 'Original body',
          tags: [],
          audience: 'General audience',
          goal: 'Capture and refine reusable content',
          status: 'drafting',
          publishChannel: 'linkedin',
          notes: '',
          createdAt: now,
          updatedAt: now
        }
      ]
    });

    const update = await executeChannelCommand({
      platform: 'telegram',
      text: 'update content: New growth memo body'
    });
    expect(update.ok).toBe(true);
    expect(update.action).toBe('update-content-item');

    const duplicate = await executeChannelCommand({
      platform: 'telegram',
      text: 'duplicate content'
    });
    const after = await storageService.getData();
    expect(duplicate.ok).toBe(true);
    expect(duplicate.action).toBe('duplicate-content-item');
    expect(after.contentLibrary.length).toBeGreaterThan(1);
  });

  it('updates publishing item status and checklist from command', async () => {
    const seeded = await storageService.getData();
    const now = new Date().toISOString();
    await storageService.setData({
      ...seeded,
      publishingQueue: [
        {
          id: 'publishing-update-1',
          title: 'Publishing Item',
          body: 'Body',
          platforms: ['linkedin'],
          tags: [],
          status: 'queued',
          scheduledFor: now,
          reminderAt: now,
          createdAt: now,
          updatedAt: now
        }
      ]
    });

    const result = await executeChannelCommand({
      platform: 'whatsapp',
      text: 'update publishing ready: checklist finalize creative and publish'
    });
    const after = await storageService.getData();
    expect(result.ok).toBe(true);
    expect(result.action).toBe('update-publishing-item');
    expect(after.publishingQueue[0].status).toBe('ready-to-post');
    expect(after.publishingQueue[0].checklist).toContain('checklist');
  });
});
