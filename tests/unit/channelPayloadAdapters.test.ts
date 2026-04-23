import { describe, expect, it } from 'vitest';
import { normalizeChannelWebhookPayload } from '../../src/services/agent/channelPayloadAdapters';

describe('normalizeChannelWebhookPayload', () => {
  it('normalizes telegram webhook payload', () => {
    const normalized = normalizeChannelWebhookPayload({
      platform: 'telegram',
      payload: {
        message: {
          text: 'add note: follow up with lead',
          from: {
            id: 12345,
            first_name: 'Sara'
          }
        }
      }
    });

    expect(normalized).toEqual({
      platform: 'telegram',
      text: 'add note: follow up with lead',
      actorId: '12345',
      actorName: 'Sara'
    });
  });

  it('normalizes whatsapp webhook payload', () => {
    const normalized = normalizeChannelWebhookPayload({
      platform: 'whatsapp',
      payload: {
        entry: [
          {
            changes: [
              {
                value: {
                  contacts: [{ wa_id: '15551234567', profile: { name: 'Amina' } }],
                  messages: [
                    { from: '15551234567', text: { body: 'reschedule posts to friday 11am' } }
                  ]
                }
              }
            ]
          }
        ]
      }
    });

    expect(normalized).toEqual({
      platform: 'whatsapp',
      text: 'reschedule posts to friday 11am',
      actorId: '15551234567',
      actorName: 'Amina'
    });
  });

  it('returns null for malformed payload', () => {
    const normalized = normalizeChannelWebhookPayload({
      platform: 'telegram',
      payload: { update_id: 99 }
    });

    expect(normalized).toBeNull();
  });
});
