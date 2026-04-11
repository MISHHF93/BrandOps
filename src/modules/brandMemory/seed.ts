import { BrandOpsData } from '../../types/domain';
import { workspaceModules } from '../../shared/config/modules';

const now = new Date();
const plusHours = (hours: number) => new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
const minusHours = (hours: number) =>
  new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();

export const seedData: BrandOpsData = {
  brand: {
    operatorName: 'Alex Mercer',
    positioning: 'AI systems architect helping technical teams operationalize agentic workflows',
    primaryOffer: 'Fractional architecture + execution sprint for productized AI delivery',
    voiceGuide: 'Direct, precise, evidence-backed, and execution-oriented',
    focusMetric: 'Qualified discovery calls booked per month'
  },
  modules: workspaceModules,
  publishingQueue: [
    {
      id: 'pub-001',
      title: 'Execution beats inspiration in technical content systems',
      body: 'A reliable LinkedIn operating loop beats occasional brilliance. Capture ideas, schedule reminders, and publish before perfection anxiety takes over.',
      platforms: ['linkedin'],
      tags: ['workflow', 'founder-ops'],
      status: 'ready',
      reminderAt: plusHours(18),
      createdAt: minusHours(12)
    },
    {
      id: 'pub-002',
      title: 'How to convert delivery lessons into authority posts',
      body: 'Every client sprint leaves repeatable lessons. Distill one mistake, one correction, and one operating principle. That becomes a post and a sales asset.',
      platforms: ['linkedin', 'newsletter'],
      tags: ['consulting', 'systems'],
      status: 'scheduled',
      reminderAt: plusHours(46),
      createdAt: minusHours(30)
    }
  ],
  contentLibrary: [
    {
      id: 'asset-001',
      label: 'Technical founder hook',
      category: 'hook',
      text: 'If your GTM depends on random motivation, it is not a strategy.'
    },
    {
      id: 'asset-002',
      label: 'Case study frame',
      category: 'proof-point',
      text: 'Reduced proposal turnaround from 5 days to 36 hours by standardizing discovery synthesis.',
      lastUsedAt: minusHours(72)
    },
    {
      id: 'asset-003',
      label: 'Closing CTA for discovery',
      category: 'cta',
      text: 'Reply with "SYSTEM" and I can share the exact weekly operating cadence I use.'
    }
  ],
  contacts: [
    {
      id: 'contact-001',
      fullName: 'Morgan Lee',
      title: 'Head of Product',
      company: 'Northstar Robotics',
      relationship: 'warm',
      lastContactAt: minusHours(48)
    },
    {
      id: 'contact-002',
      fullName: 'Samira Patel',
      title: 'Founder',
      company: 'SignalForge',
      relationship: 'active-client',
      lastContactAt: minusHours(6)
    }
  ],
  notes: [
    {
      id: 'note-001',
      title: 'Daily intent',
      detail: 'Prioritize one authority post, three outreach touches, and proposal follow-up before noon.',
      createdAt: minusHours(2)
    },
    {
      id: 'note-002',
      title: 'Pipeline insight',
      detail: 'Northstar asked for lean phase-1 scope; include optional governance add-on in proposal.',
      createdAt: minusHours(9)
    },
    {
      id: 'note-003',
      title: 'Content angle',
      detail: 'Next post: show how sprint retros become sales assets with a 3-step conversion framework.',
      createdAt: minusHours(20)
    }
  ],
  outreachDrafts: [
    {
      id: 'out-001',
      contactId: 'contact-001',
      subject: 'Noticed your hiring for AI integration engineering',
      message:
        'Morgan, I mapped a lightweight architecture playbook for teams shipping agent-assisted workflows without adding vendor lock-in. Happy to share if useful.',
      status: 'queued',
      touchpoint: 1,
      scheduledFor: plusHours(6)
    },
    {
      id: 'out-002',
      contactId: 'contact-001',
      subject: 'Quick follow-up with practical teardown',
      message:
        'Following up with a teardown pattern: baseline, orchestration, and governance checks in one page.',
      status: 'draft',
      touchpoint: 2
    }
  ],
  followUps: [
    {
      id: 'fu-001',
      contactId: 'contact-001',
      reason: 'Confirm whether discovery slot next week works',
      dueAt: plusHours(10),
      completed: false
    },
    {
      id: 'fu-002',
      contactId: 'contact-002',
      reason: 'Share retrospective summary after sprint wrap',
      dueAt: minusHours(4),
      completed: false
    }
  ],
  opportunities: [
    {
      id: 'opp-001',
      contactId: 'contact-001',
      account: 'Northstar Robotics',
      serviceLine: 'AI architecture advisory',
      stage: 'proposal',
      valueUsd: 28000,
      confidence: 62,
      nextAction: 'Deliver scope options + timeline by Tuesday',
      updatedAt: minusHours(5)
    },
    {
      id: 'opp-002',
      contactId: 'contact-002',
      account: 'SignalForge',
      serviceLine: 'Automation hardening sprint',
      stage: 'negotiation',
      valueUsd: 16000,
      confidence: 78,
      nextAction: 'Finalize security review and implementation kickoff',
      updatedAt: minusHours(2)
    }
  ],
  messagingVault: [
    {
      id: 'msg-001',
      category: 'positioning',
      title: 'Core positioning',
      content:
        'I help technical teams install repeatable AI operating systems that improve delivery speed without sacrificing reliability.'
    },
    {
      id: 'msg-002',
      category: 'faq',
      title: 'Do you use external AI APIs?',
      content:
        'Only when clients explicitly opt in. Core workflows stay usable in local-first mode with no dependency on model vendors.'
    }
  ],
  settings: {
    timezone: 'America/New_York',
    defaultReminderLeadHours: 24,
    weekStartsOn: 'monday',
    localModelEnabled: false,
    aiAdapterMode: 'disabled',
    overlay: {
      enabled: true,
      compactMode: true,
      showContactInsights: true
    },
    automationRules: [
      {
        id: 'rule-001',
        name: 'Highlight overdue follow-ups',
        trigger: 'follow-up-overdue',
        action: 'badge-highlight',
        enabled: true
      },
      {
        id: 'rule-002',
        name: 'Pin weekly review card',
        trigger: 'weekly-review',
        action: 'dashboard-pin',
        enabled: true
      }
    ]
  },
  seed: {
    seededAt: now.toISOString(),
    source: 'default-demo',
    version: '1.0.0'
  }
};
