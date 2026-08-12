export type RuntimeMessage =
  | { type: 'SYNC_SCHEDULER' }
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
      };
    };
