import { browserLocalStorage } from '../../shared/storage/browserStorage';

/** Receiver-side trust anchor. It must match the proxy secret and never arrive inside a message. */
const BRANDOPS_AGENT_BRIDGE_SECRET_STORAGE_KEY = 'brandops_agent_bridge_shared_secret';
const BRANDOPS_AGENT_BRIDGE_ACTORS_STORAGE_KEY = 'brandops_agent_bridge_allowed_actors';

export type AgentBridgePlatform = 'telegram' | 'whatsapp';

export interface AgentBridgeAllowedActors {
  telegram: string[];
  whatsapp: string[];
}

const emptyAllowedActors = (): AgentBridgeAllowedActors => ({ telegram: [], whatsapp: [] });

const normalizeActorIds = (values: unknown): string[] => {
  if (!Array.isArray(values)) return [];
  return Array.from(
    new Set(
      values
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim().slice(0, 128))
        .filter(Boolean)
    )
  ).slice(0, 100);
};

export async function getAgentBridgeSharedSecret(): Promise<string | null> {
  try {
    const value = await browserLocalStorage.get<unknown>(BRANDOPS_AGENT_BRIDGE_SECRET_STORAGE_KEY);
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  } catch {
    return null;
  }
}

async function setAgentBridgeSharedSecret(secret: string): Promise<void> {
  const normalized = secret.trim();
  if (normalized.length < 24) {
    throw new Error('Bridge shared secret must contain at least 24 characters.');
  }
  await browserLocalStorage.set(BRANDOPS_AGENT_BRIDGE_SECRET_STORAGE_KEY, normalized);
}

export async function hasAgentBridgeSharedSecret(): Promise<boolean> {
  return Boolean(await getAgentBridgeSharedSecret());
}

export async function getAgentBridgeAllowedActors(): Promise<AgentBridgeAllowedActors> {
  try {
    const value = await browserLocalStorage.get<unknown>(BRANDOPS_AGENT_BRIDGE_ACTORS_STORAGE_KEY);
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return emptyAllowedActors();
    }
    const record = value as Record<string, unknown>;
    return {
      telegram: normalizeActorIds(record.telegram),
      whatsapp: normalizeActorIds(record.whatsapp)
    };
  } catch {
    return emptyAllowedActors();
  }
}

export async function getAgentBridgeAllowedActorIds(
  platform: AgentBridgePlatform
): Promise<string[]> {
  const actors = await getAgentBridgeAllowedActors();
  return actors[platform];
}

export async function configureAgentBridgeReceiver(input: {
  sharedSecret?: string;
  telegramActorIds: string[];
  whatsappActorIds: string[];
}): Promise<void> {
  const actors = {
    telegram: normalizeActorIds(input.telegramActorIds),
    whatsapp: normalizeActorIds(input.whatsappActorIds)
  } satisfies AgentBridgeAllowedActors;
  if (actors.telegram.length + actors.whatsapp.length === 0) {
    throw new Error('Allow at least one Telegram or WhatsApp actor ID.');
  }

  const suppliedSecret = input.sharedSecret?.trim() ?? '';
  if (suppliedSecret) {
    await setAgentBridgeSharedSecret(suppliedSecret);
  } else if (!(await hasAgentBridgeSharedSecret())) {
    throw new Error('Enter the bridge shared secret before enabling the receiver.');
  }
  await browserLocalStorage.set(BRANDOPS_AGENT_BRIDGE_ACTORS_STORAGE_KEY, actors);
}

async function clearAgentBridgeSharedSecret(): Promise<void> {
  await browserLocalStorage.remove(BRANDOPS_AGENT_BRIDGE_SECRET_STORAGE_KEY);
}

export async function clearAgentBridgeReceiver(): Promise<void> {
  await Promise.all([
    clearAgentBridgeSharedSecret(),
    browserLocalStorage.remove(BRANDOPS_AGENT_BRIDGE_ACTORS_STORAGE_KEY)
  ]);
}
