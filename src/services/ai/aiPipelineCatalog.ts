import type { AIPipeline } from '../../types/aiIntegrationSuite';

/** Declarative pipeline catalogue — runner executes steps progressively with persistence hooks. */
const AI_PIPELINE_LIBRARY: readonly AIPipeline[] = [
  {
    pipeline_id: 'linkedin_content_generation',
    label: 'LinkedIn content generation',
    description: 'Outline → grounded polish → optional governance checkpoint.',
    task_family: 'linkedin_content',
    steps: [
      { step_id: 'v', kind: 'validate_inputs', label: 'Validate workspace/content anchors' },
      { step_id: 'd', kind: 'deterministic_digest', label: 'Deterministic workspace digest' },
      {
        step_id: 'h',
        kind: 'hosted_completion',
        label: 'Draft post via hosted completion',
        task_hint: 'drafting'
      },
      {
        step_id: 'g',
        kind: 'governance_checkpoint',
        label: 'Hallucination & disclosure sanity screen',
        task_hint: 'governance_review',
        requires_human_ok: false
      }
    ]
  },
  {
    pipeline_id: 'source_grounded_answer',
    label: 'Source-grounded answer',
    description: 'Deterministic digest plus citation-ready hosted completion.',
    task_family: 'source_grounded_answer',
    steps: [
      { step_id: 'v', kind: 'validate_inputs', label: 'Validate workspace pointers' },
      { step_id: 'd', kind: 'deterministic_digest', label: 'Pulse digest' },
      {
        step_id: 'h',
        kind: 'hosted_completion',
        label: 'Hosted reasoning turn',
        task_hint: 'reasoning'
      },
      {
        step_id: 'c',
        kind: 'export_audit_metadata',
        label: 'Attach routing audit tags'
      }
    ]
  },
  {
    pipeline_id: 'document_summarization',
    label: 'Document summarization',
    description: 'Summarize bounded excerpts — deterministic scaffolding plus hosted compression.',
    task_family: 'document_summary',
    steps: [
      { step_id: 'v', kind: 'validate_inputs', label: 'Validate excerpt boundaries' },
      {
        step_id: 'h',
        kind: 'hosted_completion',
        label: 'Summarize via hosted completion',
        task_hint: 'summarization'
      }
    ]
  },
  {
    pipeline_id: 'workspace_audit_report',
    label: 'Workspace audit report',
    description: 'Deterministic audit rollup suitable for exports.',
    task_family: 'workspace_audit_report',
    steps: [
      { step_id: 'v', kind: 'validate_inputs', label: 'Validate workspace payload' },
      {
        step_id: 'd',
        kind: 'deterministic_digest',
        label: 'Operator-facing workload audit digest'
      },
      {
        step_id: 'e',
        kind: 'export_audit_metadata',
        label: 'Prepare audit tags'
      }
    ]
  },
  {
    pipeline_id: 'integration_sync_analysis',
    label: 'Integration sync analysis',
    description: 'Snapshot integrations hub signals.',
    task_family: 'integration_sync_analysis',
    steps: [
      { step_id: 'v', kind: 'validate_inputs', label: 'Validate integrations hub' },
      { step_id: 'd', kind: 'deterministic_digest', label: 'Integrations digest' },
      {
        step_id: 'h',
        kind: 'hosted_completion',
        label: 'Narrate deltas via hosted completion',
        task_hint: 'classification'
      }
    ]
  },
  {
    pipeline_id: 'governance_review',
    label: 'Governance review',
    description: 'High-risk governance wording checkpoint.',
    task_family: 'governance_review',
    steps: [
      {
        step_id: 'review',
        kind: 'human_review_gate',
        label: 'Operator acknowledgement gate',
        requires_human_ok: true
      },
      {
        step_id: 'h',
        kind: 'hosted_completion',
        label: 'Structured governance verdict',
        task_hint: 'governance_review'
      }
    ]
  },
  {
    pipeline_id: 'citation_validation',
    label: 'Citation validation',
    description: 'Check citation envelopes independent from Assistant transcript rendering.',
    task_family: 'citation_validation',
    steps: [
      { step_id: 'v', kind: 'validate_inputs', label: 'Validate citation JSON envelope' },
      {
        step_id: 'h',
        kind: 'hosted_completion',
        label: 'Model-assisted citation QA',
        task_hint: 'hallucination_check'
      }
    ]
  },
  {
    pipeline_id: 'multimodal_artifact_processing',
    label: 'Multimodal artifact processing',
    description: 'Future multimodal enrichment hook — deterministic scaffolding now.',
    task_family: 'multimodal_artifact',
    steps: [
      { step_id: 'v', kind: 'validate_inputs', label: 'Validate artifact refs' },
      { step_id: 'd', kind: 'deterministic_digest', label: 'Describe placeholders locally' }
    ]
  }
];

export const AI_PIPELINE_PALETTE_COMMANDS: readonly {
  /** Full command line for agent / palette */
  command: string;
  label: string;
  id: string;
  keywords: string[];
}[] = AI_PIPELINE_LIBRARY.map((p) => ({
  command: `run ai pipeline ${p.pipeline_id}`,
  label: p.label,
  id: p.pipeline_id,
  keywords: [
    p.pipeline_id,
    p.task_family,
    'pipeline',
    'ai',
    'suite',
    ...p.label.toLowerCase().split(/\s+/)
  ]
}));

export function getAiPipelineDefinition(id: string): AIPipeline | undefined {
  return AI_PIPELINE_LIBRARY.find((p) => p.pipeline_id === id);
}
