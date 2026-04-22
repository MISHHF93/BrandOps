import { ChannelPlatform } from './types';
import { AgentAction, executeAgentWorkspaceCommand } from './agentWorkspaceEngine';

export interface ChannelEventPayload {
  platform: Extract<ChannelPlatform, 'telegram' | 'whatsapp'>;
  text: string;
  actorId?: string;
  actorName?: string;
}

export interface ChannelCommandResult {
  ok: boolean;
  summary: string;
  action: AgentAction;
}

export const executeChannelCommand = async (
  payload: ChannelEventPayload
): Promise<ChannelCommandResult> => {
  return executeAgentWorkspaceCommand({
    text: payload.text,
    actorName: payload.actorName ?? payload.actorId,
    source: payload.platform
  });
};
