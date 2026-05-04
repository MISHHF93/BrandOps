import { BrandOpsData } from '../../types/domain';
import { defaultAppSettings, defaultBrandProfile } from '../../config/workspaceDefaults';
import { workspaceModules } from '../../shared/config/modules';

const now = new Date();
const plusHours = (hours: number) => new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
const minusHours = (hours: number) =>
  new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();

/** Rich sample workspace for QA and “Load sample data” in Settings — not used for new installs. */
export const demoSampleData: BrandOpsData = {
  brand: {
    ...defaultBrandProfile,
    operatorName: 'Alex Mercer',
    positioning: 'AI systems architect helping technical teams operationalize agentic workflows',
    primaryOffer: 'Fractional architecture + execution sprint for productized AI delivery',
    voiceGuide: 'Direct, precise, evidence-backed, and execution-oriented',
    focusMetric: 'Qualified discovery calls booked per month'
  },
  brandVault: {
    positioningStatement:
      'I help product and engineering teams design practical AI systems that move from prototype chaos to reliable production execution.',
    headlineOptions: [
      'AI Systems Architect for Delivery-Focused Teams',
      'I Build AI Operating Systems That Teams Actually Use',
      'From Prompt Experiments to Production-Grade AI Workflows'
    ],
    shortBio:
      'I partner with founders and product leaders to architect and implement agentic AI workflows that improve speed, quality, and decision clarity.',
    fullAboutSummary:
      'I design the system behind your AI outcomes: scoped use cases, orchestration patterns, guardrails, and team operating rhythms. My work blends technical architecture, workflow design, and enablement so teams can ship useful AI capabilities without creating governance debt. Typical engagements include architecture assessments, pilot-to-production delivery plans, and implementation sprints with measurable outcomes.',
    serviceOfferings: [
      'AI Architecture Audit: map current workflows, risk points, and fast-win opportunities',
      'Pilot-to-Production Sprint: convert one use case into a repeatable delivery blueprint',
      'Fractional AI Systems Lead: weekly operating cadence across product, engineering, and GTM'
    ],
    collaborationModes: [
      'Advisory retainers with weekly strategic reviews',
      'Hands-on implementation sprint (2-6 weeks)',
      'Embedded interim leadership for AI initiatives'
    ],
    outreachAngles: [
      'Cut time-to-value by standardizing AI workflow architecture',
      'Reduce failed pilots by defining governance before scale',
      'Turn delivery lessons into reusable operating playbooks'
    ],
    audienceSegments: [
      'B2B SaaS founders moving from experimentation to execution',
      'Product leaders responsible for AI roadmap delivery',
      'Engineering managers modernizing internal tooling with AI'
    ],
    expertiseAreas: [
      'Agentic workflow architecture',
      'RAG and retrieval pipeline strategy',
      'Human-in-the-loop quality controls',
      'AI delivery operations and governance'
    ],
    industries: [
      'B2B SaaS',
      'Fintech infrastructure',
      'Healthtech operations',
      'Developer tooling'
    ],
    proofPoints: [
      'Reduced proposal prep cycle from 5 days to 36 hours via AI-assisted workflow redesign',
      'Decreased support triage backlog by 41% with structured AI classification pipeline',
      'Helped teams ship first production AI feature in under 30 days with governance baseline'
    ],
    signatureThemes: [
      'Execution over inspiration',
      'Systems before scale',
      'Reliable AI > flashy demos',
      'Operational clarity compounds'
    ],
    preferredVoiceNotes: [
      'Confident but practical; avoid hype language',
      'Use concrete examples and measurable outcomes',
      'Teach frameworks teams can apply immediately'
    ],
    bannedPhrases: [
      '10x overnight',
      'set it and forget it AI',
      'fully autonomous with zero oversight'
    ],
    callsToAction: [
      'Reply "SYSTEM" for the weekly AI operating cadence template.',
      'Send me your current workflow and I will suggest two architecture upgrades.',
      'Book a 30-minute architecture fit call to map next-quarter priorities.'
    ],
    reusableSnippets: [
      'Most AI initiatives do not fail from model quality. They fail from workflow ambiguity.',
      'If your team cannot explain where human review happens, you do not have an AI system yet.',
      'A good pilot proves value once. A good operating system proves value every week.'
    ],
    personalNotes: [
      'Prioritize practical language over technical jargon in public-facing posts.',
      'Mention governance and adoption in every enterprise conversation.',
      'Keep examples tied to real delivery timelines.'
    ]
  },
  modules: workspaceModules,
  publishingQueue: [
    {
      id: 'pub-001',
      title: 'Execution beats inspiration in technical content systems',
      body: 'A reliable LinkedIn operating loop beats occasional brilliance. Capture ideas, schedule reminders, and publish before perfection anxiety takes over.',
      platforms: ['linkedin'],
      tags: ['workflow', 'founder-ops'],
      status: 'due-soon',
      contentLibraryItemId: 'cli-001',
      scheduledFor: plusHours(20),
      reminderAt: plusHours(18),
      reminderLeadMinutes: 120,
      checklist: 'Confirm hook in first line\nVerify CTA asks for one clear action',
      createdAt: minusHours(12),
      updatedAt: minusHours(1)
    },
    {
      id: 'pub-002',
      title: 'How to convert delivery lessons into authority posts',
      body: 'Every client sprint leaves repeatable lessons. Distill one mistake, one correction, and one operating principle. That becomes a post and a sales asset.',
      platforms: ['linkedin'],
      tags: ['consulting', 'systems'],
      status: 'queued',
      contentLibraryItemId: 'cli-002',
      scheduledFor: plusHours(46),
      reminderAt: plusHours(46),
      reminderLeadMinutes: 1440,
      checklist: 'Add one client-safe metric\nReplace generic opening with stronger hook',
      createdAt: minusHours(30),
      updatedAt: minusHours(3)
    }
  ],
  contentLibrary: [
    {
      id: 'cli-001',
      type: 'post-draft',
      title: 'Execution loops beat motivation spikes',
      body: `Most content calendars fail because they optimize for inspiration.

Here is the operator loop that holds up under client pressure:
1) Capture one delivery lesson immediately after a sprint block.
2) Convert it into a single teachable takeaway.
3) Publish before polishing turns into avoidance.

Discipline compounds authority faster than clever phrasing.`,
      tags: ['editorial-system', 'consistency', 'linkedin'],
      audience: 'Technical founders who publish inconsistently',
      goal: 'Build authority through consistent operator-style writing',
      status: 'drafting',
      publishChannel: 'linkedin',
      notes: 'Add one concrete metric from the March sprint before publishing.',
      createdAt: minusHours(40),
      updatedAt: minusHours(5)
    },
    {
      id: 'cli-002',
      type: 'post-idea',
      title: 'Why AI pilots stall at week 5',
      body: 'Angle: most pilots fail due to ownership gaps, not model quality. Outline ownership map + review cadence.',
      tags: ['ai-governance', 'pilot-to-production'],
      audience: 'Product leaders responsible for AI roadmap delivery',
      goal: 'Drive discovery call interest from enterprise product teams',
      status: 'idea',
      publishChannel: 'linkedin',
      notes: 'Pair with simple ownership matrix visual.',
      createdAt: minusHours(28),
      updatedAt: minusHours(28)
    },
    {
      id: 'cli-003',
      type: 'article-note',
      title: 'Newsletter research notes: workflow debt',
      body: `Thesis notes:
- Workflow debt accumulates when teams add AI steps without redefining handoffs.
- Quality issues appear as “model problems” but originate in ambiguous review ownership.
- Fast fix: define explicit draft->review->publish state transitions in every team.`,
      tags: ['newsletter', 'research', 'workflow-debt'],
      audience: 'Ops and product leaders building internal AI systems',
      goal: 'Prepare long-form newsletter edition',
      status: 'ready',
      publishChannel: 'newsletter',
      notes: 'Needs supporting example from Northstar proposal cycle.',
      createdAt: minusHours(72),
      updatedAt: minusHours(20)
    },
    {
      id: 'cli-004',
      type: 'carousel-outline',
      title: 'Carousel: 6 signals your AI workflow is fragile',
      body: `Slide 1: Cover
Slide 2: No clear reviewer ownership
Slide 3: Prompt edits happen in DMs
Slide 4: No quality acceptance checklist
Slide 5: No rollback process
Slide 6: No weekly retrospective
Slide 7: CTA to request audit checklist`,
      tags: ['carousel', 'audit', 'content-framework'],
      audience: 'B2B SaaS teams operationalizing AI features',
      goal: 'Increase saves and profile visits',
      status: 'scheduled',
      publishChannel: 'linkedin',
      notes: 'Design draft in Figma on Monday.',
      createdAt: minusHours(96),
      updatedAt: minusHours(10)
    },
    {
      id: 'cli-005',
      type: 'hook-bank-entry',
      title: 'Hook: workflow ambiguity',
      body: 'If your team cannot explain where human review happens, you do not have an AI system yet.',
      tags: ['hooks', 'governance'],
      audience: 'Engineering managers shipping AI-assisted workflows',
      goal: 'Improve opening-line retention',
      status: 'published',
      publishChannel: 'linkedin',
      notes: 'Strong performer in comments from March 14 post.',
      createdAt: minusHours(240),
      updatedAt: minusHours(120)
    },
    {
      id: 'cli-006',
      type: 'cta-snippet',
      title: 'CTA: architecture teardown invitation',
      body: 'Reply "SYSTEM" and I will send the one-page teardown template we use in architecture reviews.',
      tags: ['cta', 'lead-gen'],
      audience: 'Founders evaluating architecture support',
      goal: 'Generate qualified inbound replies',
      status: 'ready',
      publishChannel: 'linkedin',
      notes: 'Pair with post about review cadence.',
      createdAt: minusHours(180),
      updatedAt: minusHours(36)
    },
    {
      id: 'cli-007',
      type: 'reusable-paragraph',
      title: 'Reusable paragraph: systems positioning block',
      body: 'I help teams move from AI prototype chaos to repeatable delivery by defining ownership, orchestration, and quality controls that survive real deadlines.',
      tags: ['positioning', 'about-section'],
      audience: 'Prospective clients reading profile and proposals',
      goal: 'Keep messaging consistent across channels',
      status: 'ready',
      publishChannel: 'blog',
      notes: 'Use in proposal intro and About page refresh.',
      createdAt: minusHours(220),
      updatedAt: minusHours(48)
    }
  ],
  contacts: [
    {
      id: 'contact-001',
      name: 'Morgan Lee',
      company: 'Northstar Robotics',
      role: 'Head of Product',
      source: 'LinkedIn inbound',
      relationshipStage: 'building',
      status: 'active',
      nextAction: 'Send revised scope comparison and lock discovery call',
      followUpDate: plusHours(10),
      notes: 'Interested in low-risk phase one with a clear governance milestone.',
      links: ['https://www.linkedin.com/in/morgan-lee-northstar'],
      relatedOutreachDraftIds: ['out-001', 'out-002'],
      relatedContentTags: ['ai-governance', 'pilot-to-production'],
      lastContactAt: minusHours(48)
    },
    {
      id: 'contact-002',
      name: 'Samira Patel',
      company: 'SignalForge',
      role: 'Founder',
      source: 'Past client referral',
      relationshipStage: 'trusted',
      status: 'active',
      nextAction: 'Share sprint kickoff options and security checklist',
      followUpDate: plusHours(18),
      notes: 'Fast decision-maker; prefers concise weekly implementation updates.',
      links: ['https://www.linkedin.com/in/samira-patel-signalforge'],
      relatedOutreachDraftIds: [],
      relatedContentTags: ['workflow', 'consulting'],
      lastContactAt: minusHours(6)
    }
  ],
  companies: [
    {
      id: 'company-001',
      name: 'Northstar Robotics',
      source: 'LinkedIn',
      relationshipStage: 'building',
      status: 'active',
      nextAction: 'Finalize proposal options and timeline',
      followUpDate: plusHours(10),
      notes: 'Product team evaluating architecture partner for AI delivery expansion.',
      links: ['https://northstar-robotics.example.com'],
      relatedOutreachDraftIds: ['out-001', 'out-002'],
      relatedContentTags: ['ai-governance', 'technical partnership']
    },
    {
      id: 'company-002',
      name: 'SignalForge',
      source: 'Referral',
      relationshipStage: 'trusted',
      status: 'active',
      nextAction: 'Confirm kick-off date for hardening sprint',
      followUpDate: plusHours(18),
      notes: 'Existing client account with expansion potential into advisory support.',
      links: ['https://signalforge.example.com'],
      relatedOutreachDraftIds: [],
      relatedContentTags: ['automation', 'client delivery']
    }
  ],
  notes: [
    {
      id: 'note-001',
      entityType: 'opportunity',
      entityId: 'opp-001',
      title: 'Daily intent',
      detail:
        'Prioritize one authority post, three outreach touches, and proposal follow-up before noon.',
      nextAction: 'Review pipeline board before outreach block',
      createdAt: minusHours(2)
    },
    {
      id: 'note-002',
      entityType: 'opportunity',
      entityId: 'opp-001',
      title: 'Pipeline insight',
      detail:
        'Northstar asked for lean phase-1 scope; include optional governance add-on in proposal.',
      status: 'proposal',
      createdAt: minusHours(9)
    },
    {
      id: 'note-003',
      entityType: 'contact',
      entityId: 'contact-002',
      title: 'Content angle',
      detail:
        'Next post: show how sprint retros become sales assets with a 3-step conversion framework.',
      createdAt: minusHours(20)
    }
  ],
  outreachDrafts: [
    {
      id: 'out-001',
      category: 'technical build partnership',
      targetName: 'Morgan Lee',
      company: 'Northstar Robotics',
      role: 'Head of Product',
      messageBody:
        'Morgan — saw Northstar is expanding AI integration hiring. I put together a practical architecture brief for technical teams shipping agent-assisted workflows without lock-in. If useful, I can send a one-page teardown and implementation sequence.',
      outreachGoal: 'Book a scoped architecture call',
      tone: 'Operator-grade and technically credible',
      status: 'ready',
      linkedOpportunity: 'opp-001',
      notes: 'Include implementation timeline options in follow-up.',
      createdAt: minusHours(14),
      updatedAt: minusHours(3)
    },
    {
      id: 'out-002',
      category: 'follow-up',
      targetName: 'Morgan Lee',
      company: 'Northstar Robotics',
      role: 'Head of Product',
      messageBody:
        'Quick follow-up: I can share a practical teardown format covering baseline system map, orchestration logic, and governance controls.',
      outreachGoal: 'Trigger a response with concrete next step',
      tone: 'Concise and direct',
      status: 'scheduled follow-up',
      linkedOpportunity: 'opp-001',
      notes: 'Send Tuesday morning with revised proof point.',
      createdAt: minusHours(9),
      updatedAt: minusHours(2)
    }
  ],
  outreachTemplates: [
    {
      id: 'tpl-001',
      name: 'Technical Partnership Intro',
      category: 'technical build partnership',
      openerBlock: 'Noticed your team is scaling delivery around AI-assisted workflows.',
      valueBlock:
        'I help product and engineering teams install execution-safe AI operating systems with explicit ownership and QA handoffs.',
      proofBlock:
        'Recent implementations reduced sprint rework and accelerated launch readiness through architecture and process alignment.',
      callToActionBlock:
        'Open to a brief call this week to map one high-impact workflow and immediate fixes?',
      signoffBlock: 'Best,\nAlex',
      createdAt: minusHours(48),
      updatedAt: minusHours(8)
    }
  ],
  outreachHistory: [
    {
      id: 'outh-001',
      draftId: 'out-legacy-01',
      targetName: 'Samira Patel',
      company: 'SignalForge',
      status: 'sent',
      loggedAt: minusHours(18),
      summary: 'Sent consulting follow-up with implementation milestones and governance checklist.'
    },
    {
      id: 'outh-002',
      draftId: 'out-legacy-02',
      targetName: 'Samira Patel',
      company: 'SignalForge',
      status: 'replied',
      loggedAt: minusHours(5),
      summary: 'Received reply requesting kickoff options for next sprint.'
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
      name: 'Northstar AI Architecture Advisory',
      company: 'Northstar Robotics',
      role: 'Head of Product',
      source: 'LinkedIn inbound',
      relationshipStage: 'building',
      opportunityType: 'advisory',
      status: 'proposal',
      followUpDate: plusHours(10),
      notes: 'Need two scope options: lean pilot and full architecture operating system package.',
      links: ['https://docs.google.com/document/d/proposal-northstar'],
      relatedOutreachDraftIds: ['out-001', 'out-002'],
      relatedContentTags: ['ai-governance', 'architecture'],
      createdAt: minusHours(30),
      archivedAt: undefined,
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
      name: 'SignalForge Automation Hardening Sprint',
      company: 'SignalForge',
      role: 'Founder',
      source: 'Referral',
      relationshipStage: 'trusted',
      opportunityType: 'client delivery',
      status: 'negotiation',
      followUpDate: plusHours(18),
      notes: 'Finalize timeline and security controls before kickoff.',
      links: ['https://notion.so/signalforge-sprint-plan'],
      relatedOutreachDraftIds: [],
      relatedContentTags: ['automation', 'delivery'],
      createdAt: minusHours(36),
      archivedAt: undefined,
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
  scheduler: {
    tasks: [
      {
        id: 'sched-demo-1',
        sourceId: 'follow-up-demo-1',
        sourceType: 'follow-up',
        title: 'Review Northstar proposal draft',
        detail: 'Before Tuesday standup',
        dueAt: plusHours(4),
        remindAt: plusHours(3),
        status: 'due-soon',
        snoozeCount: 0,
        createdAt: minusHours(2),
        updatedAt: minusHours(1)
      },
      {
        id: 'sched-demo-2',
        sourceId: 'publishing-demo-1',
        sourceType: 'publishing',
        title: 'Publish weekly insight memo',
        detail: 'Queue checklist',
        dueAt: plusHours(26),
        remindAt: plusHours(25),
        status: 'scheduled',
        snoozeCount: 0,
        createdAt: minusHours(5),
        updatedAt: minusHours(4)
      }
    ],
    updatedAt: now.toISOString(),
    lastHydratedAt: now.toISOString()
  },
  settings: {
    ...defaultAppSettings,
    cockpitDensity: 'comfortable',
    notificationCenter: {
      ...defaultAppSettings.notificationCenter,
      preferredModel: 'gpt-5.4-mini',
      roleContext:
        'Solo AI operator balancing product shipping, client delivery, public presence, and personal sustainability.',
      promptTemplate:
        "You are my AI operating partner. Build today's plan for {{role_context}}. Use the managerial tasks, technical tasks, dataset hygiene tasks, integration status, and current workspace pressure to produce a calm, high-leverage day plan with sequencing, tradeoffs, one recovery checkpoint, and one end-of-day review question."
    }
  },
  externalSync: {
    links: [
      {
        id: 'sync-demo-1',
        provider: 'google-calendar',
        resourceType: 'calendar-event',
        sourceType: 'follow-up',
        sourceId: 'follow-up-demo-1',
        targetId: 'cal-evt-demo-1',
        remoteId: 'google-abc123',
        lastSyncedAt: minusHours(1)
      }
    ],
    updatedAt: now.toISOString()
  },
  integrationHub: {
    liveFeed: [
      {
        id: 'feed-001',
        source: 'BrandOps',
        title: 'Cockpit initialized',
        detail:
          'Seeded workspace loaded with local-first data, daily rhythm, and operator systems.',
        level: 'success',
        happenedAt: minusHours(1)
      },
      {
        id: 'feed-002',
        source: 'LinkedIn overlay',
        title: 'Overlay preferences ready',
        detail: 'Contact insights overlay is enabled and compact mode is on.',
        level: 'info',
        happenedAt: minusHours(2)
      }
    ],
    sshTargets: [],
    sources: [
      {
        id: 'source-001',
        name: 'Google Workspace',
        kind: 'google-workspace',
        status: 'planned',
        baseUrl: 'https://workspace.google.com/',
        artifactTypes: ['calendar events', 'tasks'],
        tags: ['ops', 'calendar', 'tasks'],
        notes: 'Register as a manual source; wire capture flows from Settings → Integration hub.',
        createdAt: minusHours(6)
      }
    ],
    artifacts: []
  },
  embeddingIndex: {
    entries: []
  },
  agentAudit: {
    entries: []
  },
  operatorTraces: {
    entries: []
  },
  seed: {
    seededAt: now.toISOString(),
    source: 'demo-sample',
    version: '1.2.0',
    onboardingVersion: '2'
  }
};
