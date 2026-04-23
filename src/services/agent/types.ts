export type AgentMode = 'chatbot' | 'agent';

export type ChannelPlatform = 'whatsapp' | 'telegram' | 'linkedin' | 'x' | 'email' | 'webchat';

export type ConnectorStatus = 'planned' | 'ready' | 'blocked';

export interface ChannelIoConfig {
  platform: ChannelPlatform;
  inbound: {
    transport: 'webhook' | 'polling' | 'api';
    eventShape: string;
  };
  outbound: {
    transport: 'api';
    payloadShape: string;
    requiresApproval: boolean;
  };
  auth: {
    method: 'oauth2' | 'api-key' | 'token' | 'partner-gateway';
    notes: string;
  };
  constraints: string[];
}

export interface ChannelConnector {
  platform: ChannelPlatform;
  status: ConnectorStatus;
  summary: string;
  io: ChannelIoConfig;
}

export interface AgentExecutionRequest {
  objective: string;
  context?: Record<string, unknown>;
}

export interface AgentExecutionResponse {
  mode: AgentMode;
  platforms: ChannelPlatform[];
  connectors: ChannelConnector[];
  responseText: string;
}
