export interface ChannelEventPayload {
  platform: 'telegram' | 'whatsapp';
  text: string;
  actorId?: string;
  actorName?: string;
}

interface TelegramWebhookPayload {
  message?: {
    text?: string;
    from?: {
      id?: number;
      first_name?: string;
      username?: string;
    };
  };
}

interface WhatsAppWebhookPayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          text?: { body?: string };
          from?: string;
          profile?: { name?: string };
        }>;
        contacts?: Array<{
          profile?: { name?: string };
          wa_id?: string;
        }>;
      };
    }>;
  }>;
}

const trimText = (value: string | undefined, maxLength = 4000) => {
  if (!value) return '';
  return value.trim().slice(0, maxLength);
};

const toTelegramEvent = (payload: unknown): ChannelEventPayload | null => {
  if (!payload || typeof payload !== 'object') return null;
  const candidate = payload as TelegramWebhookPayload;
  const message = candidate.message;
  if (!message?.text) return null;

  const actorId =
    typeof message.from?.id === 'number' ? String(message.from.id) : undefined;
  const actorName = trimText(
    message.from?.first_name || message.from?.username || undefined,
    90
  );

  const text = trimText(message.text);
  if (!text) return null;
  return {
    platform: 'telegram',
    text,
    actorId,
    actorName: actorName || undefined
  };
};

const toWhatsAppEvent = (payload: unknown): ChannelEventPayload | null => {
  if (!payload || typeof payload !== 'object') return null;
  const candidate = payload as WhatsAppWebhookPayload;
  const firstEntry = candidate.entry?.[0];
  const firstChange = firstEntry?.changes?.[0];
  const value = firstChange?.value;
  const message = value?.messages?.[0];
  if (!message) return null;

  const text = trimText(message.text?.body);
  if (!text) return null;

  const contact = value?.contacts?.[0];
  const actorName = trimText(
    contact?.profile?.name || message.profile?.name || undefined,
    90
  );

  return {
    platform: 'whatsapp',
    text,
    actorId: trimText(contact?.wa_id || message.from, 40) || undefined,
    actorName: actorName || undefined
  };
};

export const normalizeChannelWebhookPayload = (input: {
  platform: 'telegram' | 'whatsapp';
  payload: unknown;
}): ChannelEventPayload | null => {
  if (input.platform === 'telegram') {
    return toTelegramEvent(input.payload);
  }
  return toWhatsAppEvent(input.payload);
};
