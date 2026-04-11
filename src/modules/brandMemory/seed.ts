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
    industries: ['B2B SaaS', 'Fintech infrastructure', 'Healthtech operations', 'Developer tooling'],
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
- Fast fix: define explicit draft->review->publish state transitions in every team.` ,
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
