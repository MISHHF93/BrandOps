export type RuntimeMessage =
  | { type: 'SYNC_SCHEDULER' }
  | {
      type: 'AGENT_CHANNEL_EVENT';
      payload: {
        platform: 'telegram' | 'whatsapp';
        text: string;
        actorId?: string;
        actorName?: string;
      };
    }
  | {
      type: 'AGENT_CHANNEL_WEBHOOK';
      payload: {
        platform: 'telegram' | 'whatsapp';
        raw: unknown;
      };
    }
  | {
      type: 'AGENT_BRIDGE_ENVELOPE';
      payload: {
        envelope: {
          version: 'v1';
          platform: 'telegram' | 'whatsapp';
          timestamp: string;
          nonce: string;
          payload: unknown;
          signature: string;
        };
        secret: string;
      };
    };
