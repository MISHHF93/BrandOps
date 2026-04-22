import { ChannelPlatform } from './types';
import { executeAgentWorkspaceCommand } from './agentWorkspaceEngine';

export interface ChannelEventPayload {
  platform: Extract<ChannelPlatform, 'telegram' | 'whatsapp'>;
  text: string;
  actorId?: string;
  actorName?: string;
}

export interface ChannelCommandResult {
  ok: boolean;
  summary: string;
  action:
    | 'add-note'
    | 'reschedule-publishing'
    | 'add-integration-source'
    | 'add-outreach-draft'
    | 'add-publishing-draft'
    | 'update-opportunity-stage'
    | 'update-opportunity'
    | 'archive-opportunity'
    | 'restore-opportunity'
    | 'create-follow-up'
    | 'complete-follow-up'
    | 'add-contact'
    | 'update-contact'
    | 'add-content-item'
    | 'update-content-item'
    | 'duplicate-content-item'
    | 'archive-content-item'
    | 'update-publishing-item'
    | 'configure-workspace'
    | 'unsupported';
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
