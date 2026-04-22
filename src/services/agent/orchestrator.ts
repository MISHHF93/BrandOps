import { AgentExecutionRequest, AgentExecutionResponse, AgentMode, ChannelConnector, ChannelPlatform } from './types';

const ALL_PRIMARY_CHANNELS: ChannelPlatform[] = ['whatsapp', 'telegram', 'linkedin'];

const detectRequestedPlatforms = (text: string): ChannelPlatform[] => {
  const lower = text.toLowerCase();
  const channels: ChannelPlatform[] = [];

  if (lower.includes('whatsapp') || lower.includes("what's up") || lower.includes('wa ')) {
    channels.push('whatsapp');
  }
  if (lower.includes('telegram')) {
    channels.push('telegram');
  }
  if (lower.includes('linkedin')) {
    channels.push('linkedin');
  }
  if (lower.includes('x ') || lower.includes('twitter')) {
    channels.push('x');
  }
  if (lower.includes('email')) {
    channels.push('email');
  }
  if (lower.includes('web chat') || lower.includes('webchat')) {
    channels.push('webchat');
  }

  return channels.length > 0 ? channels : ALL_PRIMARY_CHANNELS;
};

const chooseMode = (objective: string): AgentMode => {
  const lower = objective.toLowerCase();
  const automationSignals = ['integrat', 'workflow', 'update', 'sync', 'orchestr', 'multi-channel'];
  const matchedSignals = automationSignals.filter((token) => lower.includes(token)).length;
  return matchedSignals >= 1 ? 'agent' : 'chatbot';
};

const buildConnector = (platform: ChannelPlatform): ChannelConnector => {
  if (platform === 'whatsapp') {
    return {
      platform,
      status: 'planned',
      summary: 'Meta or BSP-managed WhatsApp connector with template policy controls.',
      io: {
        platform,
        inbound: {
          transport: 'webhook',
          eventShape: 'wa.message.inbound.v1'
        },
        outbound: {
          transport: 'api',
          payloadShape: 'wa.message.outbound.v1',
          requiresApproval: true
        },
        auth: {
          method: 'partner-gateway',
          notes: 'Use Meta Cloud API or BSP credentials with production template approvals.'
        },
        constraints: ['Policy-bound message templates', 'Rate limits vary by tier']
      }
    };
  }

  if (platform === 'telegram') {
    return {
      platform,
      status: 'planned',
      summary: 'Telegram bot connector for bi-directional agent commands and updates.',
      io: {
        platform,
        inbound: {
          transport: 'webhook',
          eventShape: 'telegram.message.inbound.v1'
        },
        outbound: {
          transport: 'api',
          payloadShape: 'telegram.message.outbound.v1',
          requiresApproval: false
        },
        auth: {
          method: 'token',
          notes: 'Use bot token and webhook signature validation.'
        },
        constraints: ['Bot capability restrictions per chat type']
      }
    };
  }

  if (platform === 'linkedin') {
    return {
      platform,
      status: 'ready',
      summary: 'LinkedIn identity-connected publishing and profile-aware outreach context.',
      io: {
        platform,
        inbound: {
          transport: 'api',
          eventShape: 'linkedin.sync.event.v1'
        },
        outbound: {
          transport: 'api',
          payloadShape: 'linkedin.publish.request.v1',
          requiresApproval: true
        },
        auth: {
          method: 'oauth2',
          notes: 'Reuse existing LinkedIn OAuth/OpenID integration in workspace settings.'
        },
        constraints: ['API and automation policy constraints']
      }
    };
  }

  if (platform === 'x') {
    return {
      platform,
      status: 'planned',
      summary: 'X connector for outbound posts and campaign sequence syndication.',
      io: {
        platform,
        inbound: {
          transport: 'api',
          eventShape: 'x.activity.event.v1'
        },
        outbound: {
          transport: 'api',
          payloadShape: 'x.post.request.v1',
          requiresApproval: true
        },
        auth: {
          method: 'oauth2',
          notes: 'App-level OAuth flow and posting scopes required.'
        },
        constraints: ['App permissions and posting limits']
      }
    };
  }

  if (platform === 'email') {
    return {
      platform,
      status: 'planned',
      summary: 'Email connector for nurture and campaign follow-up workflows.',
      io: {
        platform,
        inbound: {
          transport: 'api',
          eventShape: 'email.inbound.event.v1'
        },
        outbound: {
          transport: 'api',
          payloadShape: 'email.outbound.message.v1',
          requiresApproval: false
        },
        auth: {
          method: 'api-key',
          notes: 'SMTP/API provider credentials with domain verification.'
        },
        constraints: ['Deliverability, SPF/DKIM setup recommended']
      }
    };
  }

  return {
    platform: 'webchat',
    status: 'planned',
    summary: 'Embedded web chat surface for first-party inbound conversations.',
    io: {
      platform: 'webchat',
      inbound: {
        transport: 'webhook',
        eventShape: 'webchat.message.inbound.v1'
      },
      outbound: {
        transport: 'api',
        payloadShape: 'webchat.message.outbound.v1',
        requiresApproval: false
      },
      auth: {
        method: 'token',
        notes: 'Use short-lived visitor session token plus server-side verification.'
      },
      constraints: ['Session continuity and anti-spam protections']
    }
  };
};

const uniquePlatforms = (platforms: ChannelPlatform[]) => [...new Set(platforms)];

const renderResponseText = (response: Omit<AgentExecutionResponse, 'responseText'>): string => {
  const connectorSummary = response.connectors
    .map((connector) => `${connector.platform}:${connector.status}`)
    .join(', ');

  return [
    `Operating mode: ${response.mode.toUpperCase()} (recommended for growth-market execution).`,
    `Activated channels: ${response.platforms.join(', ')}.`,
    `Connector map: ${connectorSummary}.`,
    'Use the orchestrator as the single command plane: inbound message -> intent -> workflow action -> audited outbound.'
  ].join(' ');
};

class AgentOrchestrator {
  async execute(request: AgentExecutionRequest): Promise<AgentExecutionResponse> {
    const mode = chooseMode(request.objective);
    const platforms = uniquePlatforms(detectRequestedPlatforms(request.objective));
    const connectors = platforms.map((platform) => buildConnector(platform));
    const responseWithoutText = { mode, platforms, connectors };
    const responseText = renderResponseText(responseWithoutText);

    return {
      ...responseWithoutText,
      responseText
    };
  }
}

export const agentOrchestrator = new AgentOrchestrator();
