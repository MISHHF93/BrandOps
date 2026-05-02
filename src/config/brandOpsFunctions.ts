import type { BrandOpsData } from '../types/domain';

export type BrandOpsFunctionId =
  | 'audit_positioning'
  | 'audit_offers'
  | 'define_offer_stack'
  | 'generate_brand_narrative'
  | 'review_brand_clarity'
  | 'generate_content_angles'
  | 'write_linkedIn_post'
  | 'repurpose_content'
  | 'create_service_page_copy'
  | 'generate_outreach_messages'
  | 'build_case_study'
  | 'generate_discovery_questions'
  | 'scope_project'
  | 'write_proposal_outline'
  | 'build_operating_sop'
  | 'daily_offer_check'
  | 'daily_brand_check'
  | 'daily_content_angle_check'
  | 'weekly_positioning_review'
  | 'weekly_pipeline_review'
  | 'weekly_authority_growth_review'
  | 'weekly_market_scan'
  | 'monthly_offer_repackaging_review'
  | 'monthly_service_page_review'
  | 'monthly_brand_consistency_review';

export type BrandOpsFunctionCategory =
  | 'positioning'
  | 'offers'
  | 'content'
  | 'outreach'
  | 'delivery'
  | 'operating-cadence';

export interface BrandOpsFunctionDefinition {
  id: BrandOpsFunctionId;
  label: string;
  category: BrandOpsFunctionCategory;
  objective: string;
  inputs: string[];
  outputs: string[];
  nextStep: string;
  aliases: string[];
}

export const BRANDOPS_PLATFORM_DOCTRINE = [
  'BrandOps is a strategic personal brand engine for authority, trust, visibility, premium positioning, and business leverage.',
  'Anchor outputs in principal-level AI engineering, generative AI architecture, enterprise LLM deployment, AI governance, AI strategy, technical diligence, GPT system design, model evaluation, and founder-level execution.',
  'Treat deep technical expertise, strategic judgment, governance awareness, and execution proof as core brand assets.',
  'Avoid generic marketing language, vague startup cliches, shallow AI hype, and broad creator-economy advice.',
  'Every output should improve clarity, authority, differentiation, proof, trust, and commercial relevance.'
] as const;

export const BRANDOPS_OUTPUT_PRIORITY = [
  'positioning',
  'proof',
  'offer logic',
  'content angle',
  'commercial relevance',
  'CTA direction',
  'next actions'
] as const;

export const BRANDOPS_FUNCTION_CATALOG: BrandOpsFunctionDefinition[] = [
  {
    id: 'audit_positioning',
    label: 'Audit positioning',
    category: 'positioning',
    objective:
      'Find whether the brand reads as specific, senior, credible, differentiated, and commercially relevant.',
    inputs: ['Current positioning line', 'Audience segment', 'Proof points', 'Offer context'],
    outputs: ['Diagnosis', 'Gaps', 'Sharper positioning options', 'Proof to add', 'Next action'],
    nextStep:
      'Rewrite the positioning line around buyer, problem, mechanism, proof, and premium outcome.',
    aliases: ['positioning audit', 'audit positioning', 'review positioning']
  },
  {
    id: 'audit_offers',
    label: 'Audit offers',
    category: 'offers',
    objective:
      'Evaluate whether offers are packaged around urgent buyer problems, proof, scope, and premium value.',
    inputs: ['Current offers', 'Target buyer', 'Delivery constraints', 'Proof assets'],
    outputs: ['Offer gaps', 'Risk flags', 'Packaging recommendations', 'Pricing logic prompts'],
    nextStep: 'Clarify the flagship offer, diagnostic wedge, and expansion path.',
    aliases: ['offer audit', 'audit offers', 'review offers']
  },
  {
    id: 'define_offer_stack',
    label: 'Define offer stack',
    category: 'offers',
    objective:
      'Turn expertise into a ladder of diagnostic, sprint, advisory, and implementation offers.',
    inputs: ['Expertise areas', 'Buyer pain', 'Proof points', 'Delivery capacity'],
    outputs: ['Offer ladder', 'Use case for each tier', 'Qualification logic', 'CTA direction'],
    nextStep: 'Create one flagship offer page and one discovery-call question set.',
    aliases: ['offer stack', 'define offer stack', 'package services']
  },
  {
    id: 'generate_brand_narrative',
    label: 'Generate brand narrative',
    category: 'positioning',
    objective:
      'Create a coherent narrative that connects experience, technical judgment, proof, and commercial outcomes.',
    inputs: ['Career arc', 'Technical specialties', 'Market belief', 'Proof points'],
    outputs: ['Narrative thesis', 'Short bio', 'About summary', 'Signature themes'],
    nextStep: 'Adapt the narrative into LinkedIn headline, service page hero, and proposal intro.',
    aliases: ['brand narrative', 'generate narrative', 'write brand narrative']
  },
  {
    id: 'review_brand_clarity',
    label: 'Review brand clarity',
    category: 'positioning',
    objective:
      'Check whether the brand can be understood quickly by a high-trust technical or executive buyer.',
    inputs: ['Profile copy', 'Service copy', 'Content samples', 'Audience assumptions'],
    outputs: ['Clarity score', 'Ambiguous phrases', 'Credibility gaps', 'Rewrite priorities'],
    nextStep: 'Remove vague language and replace it with buyer-specific outcomes and proof.',
    aliases: ['brand clarity', 'clarity review', 'review brand clarity']
  },
  {
    id: 'generate_content_angles',
    label: 'Generate content angles',
    category: 'content',
    objective:
      'Turn expertise and proof into authority-building angles for LinkedIn, articles, talks, and sales assets.',
    inputs: ['Topic', 'Audience', 'Proof point', 'Commercial objective'],
    outputs: ['Angles', 'Hooks', 'Proof tie-ins', 'CTA options'],
    nextStep: 'Select one angle and draft a post or case-study fragment.',
    aliases: ['content angles', 'generate content angles', 'angle ideas']
  },
  {
    id: 'write_linkedIn_post',
    label: 'Write LinkedIn post',
    category: 'content',
    objective:
      'Draft a high-credibility LinkedIn post that teaches, proves, and creates commercial pull.',
    inputs: ['Core idea', 'Audience', 'Proof point', 'CTA direction'],
    outputs: ['Hook', 'Post draft', 'Proof insertion point', 'CTA'],
    nextStep: 'Add a concrete delivery detail before publishing.',
    aliases: ['write linkedin post', 'draft linkedin post', 'linkedin post']
  },
  {
    id: 'repurpose_content',
    label: 'Repurpose content',
    category: 'content',
    objective:
      'Convert one idea into platform-specific assets without diluting the authority thesis.',
    inputs: ['Source asset', 'Target platform', 'Audience', 'Desired action'],
    outputs: ['Repurposing map', 'Platform variants', 'Proof reuse', 'CTA variants'],
    nextStep: 'Schedule the strongest variant and save the rest as reusable snippets.',
    aliases: ['repurpose content', 'content repurpose', 'reuse asset']
  },
  {
    id: 'create_service_page_copy',
    label: 'Create service page copy',
    category: 'offers',
    objective:
      'Write premium service-page copy around buyer pain, mechanism, proof, scope, and fit.',
    inputs: ['Offer', 'Buyer', 'Pain', 'Proof', 'Delivery model'],
    outputs: ['Hero copy', 'Problem section', 'Method section', 'Proof section', 'CTA'],
    nextStep: 'Validate against the offer stack and remove any generic benefit claims.',
    aliases: ['service page copy', 'create service page copy', 'write service page']
  },
  {
    id: 'generate_outreach_messages',
    label: 'Generate outreach messages',
    category: 'outreach',
    objective:
      'Create high-trust outreach that opens a relevant executive or founder conversation.',
    inputs: ['Target', 'Context', 'Relevance trigger', 'Offer angle', 'Proof'],
    outputs: ['Message variants', 'Follow-up logic', 'Personalization notes', 'CTA'],
    nextStep: 'Tie the message to a concrete proof point or operating insight.',
    aliases: ['outreach messages', 'generate outreach', 'draft outreach']
  },
  {
    id: 'build_case_study',
    label: 'Build case study',
    category: 'delivery',
    objective:
      'Turn delivery work into proof that supports authority, trust, and premium positioning.',
    inputs: ['Client context', 'Problem', 'Intervention', 'Measured result', 'Constraints'],
    outputs: ['Case-study arc', 'Before/after', 'Proof points', 'Reusable snippets'],
    nextStep:
      'Extract one LinkedIn post, one proposal proof block, and one service-page proof row.',
    aliases: ['case study', 'build case study', 'proof asset']
  },
  {
    id: 'generate_discovery_questions',
    label: 'Generate discovery questions',
    category: 'outreach',
    objective: 'Create buyer-specific questions that expose urgency, budget logic, risk, and fit.',
    inputs: ['Offer', 'Buyer', 'Known pain', 'Decision context'],
    outputs: ['Question set', 'Qualification signals', 'Red flags', 'Follow-up prompts'],
    nextStep: 'Use the questions to scope the smallest valuable diagnostic or sprint.',
    aliases: ['discovery questions', 'generate discovery questions', 'sales questions']
  },
  {
    id: 'scope_project',
    label: 'Scope project',
    category: 'delivery',
    objective:
      'Convert a vague opportunity into clear outcomes, boundaries, risks, and delivery phases.',
    inputs: ['Client goal', 'Constraints', 'Stakeholders', 'Available proof', 'Timeline'],
    outputs: ['Scope', 'Milestones', 'Risks', 'Assumptions', 'Next decision'],
    nextStep: 'Turn the scope into a proposal outline with explicit acceptance criteria.',
    aliases: ['scope project', 'project scope', 'scope engagement']
  },
  {
    id: 'write_proposal_outline',
    label: 'Write proposal outline',
    category: 'offers',
    objective:
      'Structure a premium proposal around business problem, technical approach, proof, risk controls, and terms.',
    inputs: ['Opportunity', 'Buyer pain', 'Offer', 'Proof', 'Timeline'],
    outputs: ['Proposal outline', 'Scope blocks', 'Proof block', 'Governance/risk section', 'CTA'],
    nextStep: 'Add pricing and delivery assumptions after buyer fit is confirmed.',
    aliases: ['proposal outline', 'write proposal outline', 'proposal']
  },
  {
    id: 'build_operating_sop',
    label: 'Build operating SOP',
    category: 'delivery',
    objective: 'Turn repeatable brand, sales, or delivery work into a clear operating process.',
    inputs: ['Workflow', 'Trigger', 'Owner', 'Artifacts', 'Quality bar'],
    outputs: ['SOP steps', 'Inputs/outputs', 'Quality checks', 'Review cadence'],
    nextStep: 'Attach the SOP to a weekly or monthly review function.',
    aliases: ['operating sop', 'build sop', 'write sop']
  },
  {
    id: 'daily_offer_check',
    label: 'Daily offer check',
    category: 'operating-cadence',
    objective: 'Check whether today’s work strengthens the flagship offer and commercial pipeline.',
    inputs: ['Current offer', 'Pipeline state', 'Today’s tasks'],
    outputs: ['Offer signal', 'Risk', 'One adjustment', 'Next action'],
    nextStep: 'Make one offer asset clearer or more proof-backed today.',
    aliases: ['daily offer check', 'offer check']
  },
  {
    id: 'daily_brand_check',
    label: 'Daily brand check',
    category: 'operating-cadence',
    objective: 'Keep daily execution aligned with the authority thesis and premium positioning.',
    inputs: ['Brand profile', 'Today’s activities', 'Recent proof'],
    outputs: ['Alignment readout', 'Clarity risk', 'Proof opportunity', 'Next action'],
    nextStep: 'Capture one proof point or sharpen one public-facing claim.',
    aliases: ['daily brand check', 'brand check']
  },
  {
    id: 'daily_content_angle_check',
    label: 'Daily content angle check',
    category: 'operating-cadence',
    objective: 'Identify the strongest content angle available from current work and proof.',
    inputs: ['Current ideas', 'Delivery notes', 'Audience', 'Publishing queue'],
    outputs: ['Recommended angle', 'Hook', 'Proof tie-in', 'CTA'],
    nextStep: 'Draft or schedule the angle while the context is fresh.',
    aliases: ['daily content angle check', 'content angle check']
  },
  {
    id: 'weekly_positioning_review',
    label: 'Weekly positioning review',
    category: 'operating-cadence',
    objective: 'Review whether recent work has changed the strongest market position.',
    inputs: ['Recent work', 'Buyer signals', 'Content performance', 'Pipeline feedback'],
    outputs: ['Positioning shift', 'Proof gained', 'Claims to retire', 'Rewrite queue'],
    nextStep: 'Update one headline, bio, or service-page section.',
    aliases: ['weekly positioning review', 'positioning review']
  },
  {
    id: 'weekly_pipeline_review',
    label: 'Weekly pipeline review',
    category: 'operating-cadence',
    objective:
      'Connect authority work to opportunity quality, next actions, and commercial leverage.',
    inputs: ['Opportunities', 'Outreach', 'Follow-ups', 'Offer stack'],
    outputs: ['Pipeline diagnosis', 'Stale deals', 'Trust gaps', 'Next actions'],
    nextStep: 'Send or draft the highest-trust next message.',
    aliases: ['weekly pipeline review', 'pipeline review']
  },
  {
    id: 'weekly_authority_growth_review',
    label: 'Weekly authority growth review',
    category: 'operating-cadence',
    objective: 'Assess whether content, proof, and relationships are increasing visible authority.',
    inputs: ['Published assets', 'Proof assets', 'Relationship activity', 'Audience response'],
    outputs: ['Authority scorecard', 'Compounding asset gaps', 'Recommended focus'],
    nextStep: 'Create one reusable proof or framework asset.',
    aliases: ['weekly authority growth review', 'authority review']
  },
  {
    id: 'weekly_market_scan',
    label: 'Weekly market scan',
    category: 'operating-cadence',
    objective: 'Translate market signals into positioning, content, and offer opportunities.',
    inputs: ['Market notes', 'Buyer conversations', 'Competitor language', 'Technical shifts'],
    outputs: ['Signal summary', 'Contrarian angle', 'Offer implication', 'Content ideas'],
    nextStep: 'Turn the strongest signal into a post or service-page update.',
    aliases: ['weekly market scan', 'market scan']
  },
  {
    id: 'monthly_offer_repackaging_review',
    label: 'Monthly offer repackaging review',
    category: 'operating-cadence',
    objective:
      'Repackage offers based on proof, buyer pull, delivery efficiency, and pricing leverage.',
    inputs: ['Won/lost deals', 'Delivery lessons', 'Proof assets', 'Capacity'],
    outputs: ['Repackaging decisions', 'Offer copy changes', 'Proof gaps', 'Pricing prompts'],
    nextStep: 'Update the flagship offer and proposal outline.',
    aliases: ['monthly offer repackaging review', 'offer repackaging']
  },
  {
    id: 'monthly_service_page_review',
    label: 'Monthly service page review',
    category: 'operating-cadence',
    objective: 'Ensure service pages reflect the strongest positioning, proof, and buyer urgency.',
    inputs: ['Service page copy', 'New proof', 'Pipeline objections', 'Market signals'],
    outputs: ['Copy audit', 'Sections to rewrite', 'Proof to add', 'CTA refinement'],
    nextStep: 'Rewrite the highest-impact service-page section first.',
    aliases: ['monthly service page review', 'service page review']
  },
  {
    id: 'monthly_brand_consistency_review',
    label: 'Monthly brand consistency review',
    category: 'operating-cadence',
    objective:
      'Check that LinkedIn, website, proposals, decks, and internal assets tell the same high-trust story.',
    inputs: ['Profile copy', 'Website copy', 'Proposal copy', 'Deck language', 'Content samples'],
    outputs: ['Consistency gaps', 'Conflicting claims', 'Reusable language', 'Update sequence'],
    nextStep: 'Normalize the most visible surface first, then cascade reusable copy blocks.',
    aliases: ['monthly brand consistency review', 'brand consistency']
  }
];

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const functionByAlias = new Map<string, BrandOpsFunctionDefinition>();

for (const fn of BRANDOPS_FUNCTION_CATALOG) {
  functionByAlias.set(normalize(fn.id), fn);
  functionByAlias.set(normalize(fn.label), fn);
  for (const alias of fn.aliases) functionByAlias.set(normalize(alias), fn);
}

export function resolveBrandOpsFunction(text: string): BrandOpsFunctionDefinition | null {
  const normalized = normalize(text.replace(/^run\s+/i, '').replace(/^function\s*:\s*/i, ''));
  if (functionByAlias.has(normalized)) return functionByAlias.get(normalized) ?? null;
  for (const [alias, fn] of functionByAlias) {
    if (normalized.includes(alias)) return fn;
  }
  return null;
}

export function buildBrandOpsFunctionBrief(fn: BrandOpsFunctionDefinition): string {
  return [
    `${fn.label} (${fn.id})`,
    `Objective: ${fn.objective}`,
    `Inputs: ${fn.inputs.join(', ')}`,
    `Outputs: ${fn.outputs.join(', ')}`,
    `Next step: ${fn.nextStep}`
  ].join('\n');
}

export function buildBrandOpsStrategicReadout(
  fn: BrandOpsFunctionDefinition,
  workspace: BrandOpsData
): string {
  const brand = workspace.brand;
  const vault = workspace.brandVault;
  const proofCount = vault.proofPoints.length;
  const offerCount = vault.serviceOfferings.length;
  const contentCount = workspace.contentLibrary.filter((item) => item.status !== 'archived').length;
  const pipelineCount = workspace.opportunities.filter((item) => !item.archivedAt).length;

  const missing: string[] = [];
  if (!brand.positioning || brand.positioning.includes('Add a one-line'))
    missing.push('specific positioning');
  if (!brand.primaryOffer || brand.primaryOffer.includes('Describe your'))
    missing.push('flagship offer');
  if (proofCount === 0) missing.push('proof points');
  if (offerCount === 0 && fn.category === 'offers') missing.push('service-offering list');
  if (contentCount === 0 && fn.category === 'content') missing.push('content examples');
  if (pipelineCount === 0 && ['outreach', 'offers', 'operating-cadence'].includes(fn.category)) {
    missing.push('active opportunity context');
  }

  const assumptions =
    missing.length > 0
      ? `Assumptions: Missing ${missing.join(', ')}; use brand defaults and available workspace signals.`
      : 'Assumptions: Workspace has enough brand, proof, and operating context for a first pass.';

  const diagnosis = [
    `Positioning: ${brand.positioning}`,
    `Offer: ${brand.primaryOffer}`,
    `Proof assets: ${proofCount}`,
    `Content assets: ${contentCount}`,
    `Open opportunities: ${pipelineCount}`
  ].join(' | ');

  return [
    `${fn.label} · Objective: ${fn.objective}`,
    assumptions,
    `Diagnosis: ${diagnosis}`,
    `Outputs to produce: ${fn.outputs.join(' / ')}`,
    `Recommendation: Prioritize ${BRANDOPS_OUTPUT_PRIORITY.join(' -> ')}.`,
    `Next action: ${fn.nextStep}`
  ].join('\n');
}
