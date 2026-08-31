/**
 * Profession / Industry Packs — configuration-driven profession system.
 *
 * A ProfessionPack defines: identity, vocabulary, common objectives, common tasks,
 * knowledge domains, specialist roles, capabilities, skills, tools, connectors,
 * workflows, artifact types, evidence expectations, risk tiers, approval policies,
 * evaluation criteria, and recommended automations.
 *
 * All reference packs use the SAME underlying runtime — no custom parallel
 * orchestration per profession.
 */

// ---------------------------------------------------------------------------
// Profession pack type
// ---------------------------------------------------------------------------

export interface ProfessionPack {
  /** Unique pack identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Short description */
  description: string;
  /** Category: 'individual' | 'commercial' | 'research' | 'operational' */
  category: ProfessionPackCategory;
  /** Vocabulary terms commonly used in this profession */
  vocabulary: string[];
  /** Common objectives this profession tends to have */
  commonObjectives: string[];
  /** Common tasks this profession performs */
  commonTasks: string[];
  /** Knowledge domains relevant to this profession */
  knowledgeDomains: string[];
  /** Specialist roles within this profession */
  specialistRoles: string[];
  /** Capabilities that are particularly relevant */
  relevantCapabilities: string[];
  /** Skills commonly needed */
  commonSkills: string[];
  /** Tools commonly used */
  commonTools: string[];
  /** Connectors commonly used */
  commonConnectors: string[];
  /** Workflow presets */
  workflowPresets: string[];
  /** Artifact types commonly produced */
  artifactTypes: string[];
  /** Evidence expectations for this profession */
  evidenceExpectations: string[];
  /** Risk tier configuration */
  riskTiers: RiskTier[];
  /** Approval policies for consequential actions */
  approvalPolicies: ApprovalPolicy[];
  /** Evaluation criteria */
  evaluationCriteria: EvaluationCriterion[];
  /** Recommended automations */
  recommendedAutomations: AutomationSuggestion[];
}

export type ProfessionPackCategory =
  | 'individual'      // founder, consultant, creator, knowledge professional
  | 'commercial'      // sales, marketing, commercial operator
  | 'research';       // research, analytical, operational professional

export interface RiskTier {
  id: string;
  label: string;
  description: string;
  requiresApproval: boolean;
  approvalType: 'user' | 'admin' | 'none';
  autoExecuteLowRisk: boolean;
}

export interface ApprovalPolicy {
  action: string;
  trigger: string;
  approvalRequired: boolean;
  approverRole?: string;
  escalationPath?: string;
}

export interface EvaluationCriterion {
  id: string;
  name: string;
  description: string;
  weight: number; // 0-1
  metric?: string;
}

export interface AutomationSuggestion {
  id: string;
  name: string;
  description: string;
  trigger?: string;
  frequency?: string;
  actions: string[];
}

// ---------------------------------------------------------------------------
// Reference packs — three materially different professions
// ---------------------------------------------------------------------------

/** Pack 1: Founder / Consultant / Creator / Knowledge Professional */
export const FOUNDER_CONSULTANT_PACK: ProfessionPack = {
  id: 'founder-consultant',
  name: 'Founder / Consultant / Creator',
  description: 'Independent professionals who build, advise, and create — managing their own brand, content, and client relationships.',
  category: 'individual',
  vocabulary: [
    'personal brand', 'thought leadership', 'content strategy', 'audience building',
    'networking', 'client acquisition', 'positioning', 'niche', 'authority',
    'engagement', 'conversion', 'pipeline', 'social proof', 'case study',
    'testimonial', 'portfolio', 'thought piece', 'thread', 'newsletter'
  ],
  commonObjectives: [
    'Build public profile and authority',
    'Attract consulting/clients/opportunities',
    'Establish thought leadership in a niche',
    'Grow audience and engagement',
    'Create reusable content assets',
    'Convert audience into pipeline',
    'Demonstrate expertise through shipped work'
  ],
  commonTasks: [
    'Write positioning statement',
    'Create content calendar',
    'Draft social posts / articles',
    'Research audience and competitors',
    'Identify collaboration opportunities',
    'Follow up with leads',
    'Update portfolio with new work',
    'Generate outreach sequences'
  ],
  knowledgeDomains: [
    'Personal branding', 'Content strategy', 'Audience development',
    'Positioning and messaging', 'Social media strategy', 'Networking',
    'Client acquisition', 'Consultancy delivery', 'Public speaking',
    'Writing and storytelling'
  ],
  specialistRoles: [
    'Brand strategist', 'Content creator', 'Audience builder',
    'Client advisor', 'Positioning expert', 'Writer/editor'
  ],
  relevantCapabilities: [
    'brand-profile.read', 'context.read', 'artifact.create', 'plan.convert',
    'opportunity.create', 'twin.propose_update', 'content-ideation',
    'positioning-analysis', 'outreach-drafting', 'achievement.record'
  ],
  commonSkills: [
    'Writing and editing', 'Public speaking', 'Strategic thinking',
    'Content creation', 'Social media', 'Client communication',
    'Positioning', 'Storytelling', 'Research', 'Networking'
  ],
  commonTools: ['twitter', 'linkedin', 'medium', 'substack', 'notion', 'calendar'],
  commonConnectors: ['linkedin', 'google-calendar', 'notion', 'gmail'],
  workflowPresets: ['weekly-content-plan', 'positioning-refresh', 'outreach-campaign', 'portfolio-update'],
  artifactTypes: [
    'Positioning', 'Buyer Persona', 'ICP', 'Strategy', 'Content Concept',
    'Content Draft', 'Outreach Sequence', 'Professional Profile', 'Case Study'
  ],
  evidenceExpectations: [
    'Shipped work with links', 'Content performance metrics',
    'Client testimonials', 'Engagement metrics', 'Portfolio entries',
    'Published articles or posts', 'Speaking appearances', 'Community contributions'
  ],
  riskTiers: [
    { id: 'low', label: 'Low risk', description: 'Routine content and research actions', requiresApproval: false, approvalType: 'none', autoExecuteLowRisk: true },
    { id: 'medium', label: 'Medium risk', description: 'Publishing and outreach actions', requiresApproval: true, approvalType: 'user', autoExecuteLowRisk: false },
    { id: 'high', label: 'High risk', description: 'External commitments and public statements', requiresApproval: true, approvalType: 'user', autoExecuteLowRisk: false }
  ],
  approvalPolicies: [
    { action: 'publish-content', trigger: 'before-publish', approvalRequired: true, approverRole: 'user' },
    { action: 'send-outreach', trigger: 'before-send', approvalRequired: true, approverRole: 'user' },
    { action: 'create-commitment', trigger: 'before-create', approvalRequired: true, approverRole: 'user' }
  ],
  evaluationCriteria: [
    { id: 'profile-strength', name: 'Profile Strength', description: 'How well-positioned is the professional?', weight: 0.3, metric: 'twin-confidence' },
    { id: 'content-cadence', name: 'Content Cadence', description: 'How consistently is content being produced?', weight: 0.25, metric: 'artifact-frequency' },
    { id: 'engagement', name: 'Audience Engagement', description: 'How is the audience responding?', weight: 0.25, metric: 'engagement-rate' },
    { id: 'pipeline-health', name: 'Pipeline Health', description: 'How strong is the opportunity pipeline?', weight: 0.2, metric: 'active-opportunities' }
  ],
  recommendedAutomations: [
    { id: 'weekly-review', name: 'Weekly Review', description: 'Auto-generate weekly progress summary', trigger: 'weekly', frequency: '7d', actions: ['generate-brief', 'update-timeline'] },
    { id: 'content-reminders', name: 'Content Reminders', description: 'Remind about content planning cadence', frequency: '5d', actions: ['create-reminder', 'suggest-topics'] }
  ]
};

/** Pack 2: Sales / Marketing / Commercial Operator */
export const SALES_MARKETING_PACK: ProfessionPack = {
  id: 'sales-marketing',
  name: 'Sales / Marketing / Commercial Operator',
  description: 'Commercial operators who drive revenue through outreach, campaigns, and pipeline management.',
  category: 'commercial',
  vocabulary: [
    'pipeline', 'lead', 'prospect', 'conversion', 'outreach', 'sequence',
    'campaign', 'MQL', 'SQL', 'CAC', 'LTV', 'funnel', 'touchpoint',
    'follow-up', 'cold outreach', 'warm lead', 'qualified prospect',
    'buyer journey', 'sales cycle', 'ROI', 'segmentation'
  ],
  commonObjectives: [
    'Generate qualified leads',
    'Increase conversion rates',
    'Shorten sales cycles',
    'Build pipeline coverage',
    'Improve outreach response rates',
    'Nurture existing relationships',
    'Identify upsell/cross-sell opportunities',
    'Track and report on pipeline health'
  ],
  commonTasks: [
    'Research prospect lists',
    'Draft personalized outreach sequences',
    'Follow up with prospects systematically',
    'Qualify leads against ICP criteria',
    'Log interactions in CRM',
    'Analyze campaign performance',
    'Segment audience for targeting',
    'Create sales enablement content'
  ],
  knowledgeDomains: [
    'Sales methodology', 'Lead generation', 'Outbound prospecting',
    'Inbound conversion', 'Email marketing', 'CRM management',
    'Sales analytics', 'Buyer behavior', 'Market segmentation',
    'Competitive intelligence', 'Value proposition design'
  ],
  specialistRoles: [
    'Sales development rep', 'Account executive', 'Marketing operator',
    'Demand gen specialist', 'Sales operations', 'Revenue operations',
    'Lead qualifier', 'Outreach specialist'
  ],
  relevantCapabilities: [
    'context.read', 'artifact.create', 'plan.convert', 'opportunity.create',
    'outreach-drafting', 'prospect-research', 'sequence-management',
    'integration-read', 'crm-sync', 'achievement.record'
  ],
  commonSkills: [
    'Prospecting', 'Cold outreach', 'Sales messaging', 'Relationship building',
    'Negotiation', 'CRM usage', 'Data analysis', 'Campaign management',
    'A/B testing', 'Follow-up discipline', 'Active listening'
  ],
  commonTools: ['linkedin-sales-nav', 'crm', 'email-platform', 'calendar', 'sales-automation'],
  commonConnectors: ['linkedin', 'gmail', 'crm-system', 'outreach-platform'],
  workflowPresets: ['outreach-campaign', 'lead-qualification', 'follow-up-sequence', 'pipeline-review'],
  artifactTypes: [
    'Outreach Sequence', 'Buyer Persona', 'ICP Profile', 'Prospect Research',
    'Campaign Brief', 'Sales Email Draft', 'Follow-up Plan', 'Pipeline Report'
  ],
  evidenceExpectations: [
    'Outreach sequences sent', 'Response rates', 'Meeting bookings',
    'Pipeline created', 'Deals progressed', 'Conversion metrics',
    'Campaign performance data', 'CRM activity logs'
  ],
  riskTiers: [
    { id: 'low', label: 'Low risk', description: 'Research and drafting actions', requiresApproval: false, approvalType: 'none', autoExecuteLowRisk: true },
    { id: 'medium', label: 'Medium risk', description: 'Outbound communication and CRM updates', requiresApproval: true, approvalType: 'user', autoExecuteLowRisk: false },
    { id: 'high', label: 'High risk', description: 'Commitments and contractual discussions', requiresApproval: true, approvalType: 'user', autoExecuteLowRisk: false }
  ],
  approvalPolicies: [
    { action: 'send-outreach', trigger: 'before-send', approvalRequired: true, approverRole: 'user' },
    { action: 'update-crm', trigger: 'batch-sync', approvalRequired: false, approverRole: 'none' },
    { action: 'commit-resource', trigger: 'before-commit', approvalRequired: true, approverRole: 'user' }
  ],
  evaluationCriteria: [
    { id: 'pipeline-coverage', name: 'Pipeline Coverage', description: 'Is there sufficient pipeline for targets?', weight: 0.3, metric: 'pipeline-value' },
    { id: 'activity-level', name: 'Activity Level', description: 'Are outreach and follow-up activities happening?', weight: 0.25, metric: 'activity-count' },
    { id: 'conversion-rate', name: 'Conversion Rate', description: 'Are leads converting at expected rates?', weight: 0.25, metric: 'conversion-rate' },
    { id: 'response-quality', name: 'Response Quality', description: 'Are outreach responses improving?', weight: 0.2, metric: 'response-rate' }
  ],
  recommendedAutomations: [
    { id: 'pipeline-review', name: 'Pipeline Review', description: 'Weekly pipeline health check', trigger: 'weekly', frequency: '7d', actions: ['analyze-pipeline', 'flag-stalled-deals', 'suggest-follow-ups'] },
    { id: 'follow-up-reminder', name: 'Follow-up Reminders', description: 'Remind about pending follow-ups', frequency: 'daily', actions: ['list-pending-follow-ups', 'escalate-stale-leads'] }
  ]
};

/** Pack 3: Research / Analytical / Operational Professional */
export const RESEARCH_ANALYTICAL_PACK: ProfessionPack = {
  id: 'research-analytical',
  name: 'Research / Analytical / Operational Professional',
  description: 'Professionals whose work centers on analysis, research, documentation, and operational rigor.',
  category: 'research',
  vocabulary: [
    'research', 'analysis', 'findings', 'data', 'evidence', 'methodology',
    'framework', 'insight', 'report', 'brief', 'assessment', 'audit',
    'benchmark', 'comparative', 'synthesis', 'hypothesis', 'validation',
    'documentation', 'process', 'workflow', 'efficiency', 'gap analysis'
  ],
  commonObjectives: [
    'Produce rigorous analysis and research',
    'Document findings for future reference',
    'Identify gaps and improvement opportunities',
    'Build and maintain operational frameworks',
    'Ensure accuracy and completeness of work',
    'Communicate complex findings clearly',
    'Track and verify claims with evidence',
    'Improve processes and workflows'
  ],
  commonTasks: [
    'Conduct research on specific topics',
    'Analyze data and identify patterns',
    'Document findings in structured reports',
    'Evaluate evidence quality and sources',
    'Identify gaps in current knowledge/process',
    'Build frameworks for recurring analysis',
    'Verify claims against source evidence',
    'Create briefing documents for stakeholders'
  ],
  knowledgeDomains: [
    'Research methodology', 'Data analysis', 'Critical thinking',
    'Documentation practices', 'Process design', 'Quality assurance',
    'Evidence evaluation', 'Source verification', 'Synthesis',
    'Technical writing', 'Framework development'
  ],
  specialistRoles: [
    'Research analyst', 'Data analyst', 'Operations analyst',
    'Technical writer', 'Quality researcher', 'Process analyst',
    'Evidence reviewer', 'Framework designer'
  ],
  relevantCapabilities: [
    'context.read', 'artifact.create', 'plan.convert', 'research-assistance',
    'evidence-evaluation', 'documentation-drafting', 'analysis-assistance',
    'twin.propose_update', 'achievement.record'
  ],
  commonSkills: [
    'Research design', 'Data analysis', 'Statistical reasoning',
    'Technical writing', 'Source evaluation', 'Critical analysis',
    'Documentation', 'Framework design', 'Process mapping',
    'Attention to detail', 'Synthesizing complex information'
  ],
  commonTools: ['research-database', 'analysis-tools', 'documentation-platform', 'data-visualization', 'reference-manager'],
  commonConnectors: ['notion', 'google-docs', 'github', 'research-databases'],
  workflowPresets: ['research-brief', 'analysis-project', 'documentation-review', 'gap-analysis'],
  artifactTypes: [
    'Research Brief', 'Analysis Report', 'Documentation', 'Framework',
    'Gap Analysis', 'Findings Summary', 'Evidence Map', 'Process Document',
    'Evaluation Report', 'Comparative Analysis'
  ],
  evidenceExpectations: [
    'Source citations with provenance', 'Methodology documentation',
    'Data and analysis supporting findings', 'Peer or expert review',
    'Reproducible analysis steps', 'Version-controlled documentation',
    'Evidence quality assessment', 'Gap identification with specificity'
  ],
  riskTiers: [
    { id: 'low', label: 'Low risk', description: 'Research and analysis actions', requiresApproval: false, approvalType: 'none', autoExecuteLowRisk: true },
    { id: 'medium', label: 'Medium risk', description: 'Published findings and external documentation', requiresApproval: true, approvalType: 'user', autoExecuteLowRisk: false },
    { id: 'high', label: 'High risk', description: 'Conclusive claims and external recommendations', requiresApproval: true, approvalType: 'user', autoExecuteLowRisk: false }
  ],
  approvalPolicies: [
    { action: 'publish-finding', trigger: 'before-publish', approvalRequired: true, approverRole: 'user' },
    { action: 'make-claim', trigger: 'before-external-claim', approvalRequired: true, approverRole: 'user' },
    { action: 'update-framework', trigger: 'before-update', approvalRequired: true, approverRole: 'user' }
  ],
  evaluationCriteria: [
    { id: 'research-quality', name: 'Research Quality', description: 'How thorough and well-documented is the research?', weight: 0.35, metric: 'evidence-completeness' },
    { id: 'documentation-completeness', name: 'Documentation Completeness', description: 'Are findings properly documented and findable?', weight: 0.25, metric: 'artifact-count' },
    { id: 'accuracy', name: 'Accuracy / Verification', description: 'How well are claims verified against evidence?', weight: 0.25, metric: 'verification-rate' },
    { id: 'impact', name: 'Impact', description: 'Do findings lead to actions or improvements?', weight: 0.15, metric: 'action-conversion' }
  ],
  recommendedAutomations: [
    { id: 'research-review', name: 'Research Review', description: 'Periodic review of research backlog', trigger: 'biweekly', frequency: '14d', actions: ['list-open-research', 'flag-stale-items', 'suggest-priorities'] },
    { id: 'documentation-check', name: 'Documentation Health Check', description: 'Check for documentation gaps and staleness', frequency: '30d', actions: ['audit-docs', 'flag-missing-docs', 'suggest-updates'] }
  ]
};

// ---------------------------------------------------------------------------
// Pack registry
// ---------------------------------------------------------------------------

export const PROFESSION_PACKS: ProfessionPack[] = [
  FOUNDER_CONSULTANT_PACK,
  SALES_MARKETING_PACK,
  RESEARCH_ANALYTICAL_PACK
];

/** Look up a pack by ID */
export function getProfessionPack(id: string): ProfessionPack | undefined {
  return PROFESSION_PACKS.find((p) => p.id === id);
}

/** All available pack IDs */
export function listProfessionPackIds(): string[] {
  return PROFESSION_PACKS.map((p) => p.id);
}

// ---------------------------------------------------------------------------
// Profession-aware context enrichment
// ---------------------------------------------------------------------------

/** Get vocabulary that should be prioritized in context for a profession */
export function getProfessionVocabulary(packId: string): string[] {
  const pack = getProfessionPack(packId);
  return pack?.vocabulary ?? [];
}

/** Get common objectives for a profession (useful for goal suggestions) */
export function getProfessionCommonObjectives(packId: string): string[] {
  const pack = getProfessionPack(packId);
  return pack?.commonObjectives ?? [];
}

/** Get relevant capabilities for a profession */
export function getProfessionRelevantCapabilities(packId: string): string[] {
  const pack = getProfessionPack(packId);
  return pack?.relevantCapabilities ?? [];
}

/** Get common artifact types for a profession */
export function getProfessionArtifactTypes(packId: string): string[] {
  const pack = getProfessionPack(packId);
  return pack?.artifactTypes ?? [];
}

/** Get evaluation criteria for a profession */
export function getProfessionEvaluationCriteria(packId: string): EvaluationCriterion[] {
  const pack = getProfessionPack(packId);
  return pack?.evaluationCriteria ?? [];
}

// ---------------------------------------------------------------------------
// Workspace → pack resolution
// ---------------------------------------------------------------------------

/**
 * Resolve the reference profession pack whose identity best matches the
 * workspace's configured profession label, falling back through a keyword
 * heuristic to the closest pack. Returns undefined when no pack matches —
 * the workspace then uses the profession-agnostic generic runtime.
 *
 * This is heuristic, BRANDOPS_VERIFIED (config-derived) context, never a
 * user-verified fact; it does not claim the user IS a given profession.
 */
export function getProfessionPackForWorkspace(
  workspace: BrandOpsDataLike
): ProfessionPack | undefined {
  const label =
    workspace.workspaceIntelligence?.dna?.profession?.trim() ||
    workspace.settings?.notificationCenter?.roleContext?.trim() ||
    '';
  if (!label) {
    return workspace.settings?.professionPackId
      ? getProfessionPack(workspace.settings.professionPackId)
      : undefined;
  }

  // An explicit pack id wins if the workspace declares one.
  const explicitId = workspace.settings?.professionPackId;
  if (explicitId) {
    const explicit = getProfessionPack(explicitId);
    if (explicit) return explicit;
  }

  const haystack = label.toLowerCase();
  const SCOPED = [
    {
      pack: FOUNDER_CONSULTANT_PACK,
      keywords: ['founder', 'consult', 'creator', 'independent', 'advisor', 'coach', 'freelance', 'personal brand', 'thought leader', 'influencer', 'writer', 'author']
    },
    {
      pack: SALES_MARKETING_PACK,
      keywords: ['sales', 'marketing', 'commercial', 'revenue', 'growth', 'account', 'business development', 'bd', 'demand', 'customer success', 'sdr', 'ae']
    },
    {
      pack: RESEARCH_ANALYTICAL_PACK,
      keywords: ['research', 'analyst', 'analytical', 'scientist', 'data', 'operations', 'operational', 'documentation', 'quality', 'audit', 'analysis']
    }
  ] as const;

  let best: { pack: ProfessionPack; count: number } | undefined;
  for (const entry of SCOPED) {
    const count = entry.keywords.filter((kw) => haystack.includes(kw)).length;
    if (count > 0 && (!best || count > best.count)) {
      best = { pack: entry.pack, count };
    }
  }
  return best?.pack;
}

/** Minimal structural shape BrandOpsData exposes to pack resolution (used to keep this module import-lean). */
export interface BrandOpsDataLike {
  workspaceIntelligence?: {
    dna?: { profession?: string };
  };
  settings?: {
    professionPackId?: string;
    notificationCenter?: { roleContext?: string };
  };
}

