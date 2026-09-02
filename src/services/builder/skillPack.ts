/**
 * Skill Pack — reusable, portable workflow definitions for common BrandOps workflows.
 * Business logic stays in BrandOps services; skills are the portable instruction layer.
 */

import type { SkillPack, SkillPackId } from '../../types/builder';

export const SKILL_PACKS: Record<SkillPackId, SkillPack> = {
  'capture-achievement': {
    id: 'capture-achievement',
    name: 'Capture Achievement',
    description: 'Capture a verified achievement from activity events or agent reports.',
    requiredCapabilities: ['achievement.record', 'context.read'],
    steps: [
      {
        order: 1,
        title: 'Identify achievement source',
        instruction:
          'Determine whether the achievement comes from an activity event, agent report, or user input.',
        mapsToTool: 'brandops_record_achievement',
        expectedInput: 'Source event or user description',
        outputHint: 'Achievement source identified'
      },
      {
        order: 2,
        title: 'Record the achievement',
        instruction:
          'Record the achievement with title, description, kind, evidence, and confidence.',
        mapsToTool: 'brandops_record_achievement',
        expectedInput: 'Achievement details',
        outputHint: 'Achievement recorded as UNVERIFIED'
      },
      {
        order: 3,
        title: 'Suggest verification',
        instruction:
          'If the achievement is from an agent or integration, suggest the user verify it.',
        mapsToTool: undefined,
        expectedInput: 'Achievement id',
        outputHint: 'Verification suggestion displayed'
      }
    ],
    invocationHint:
      'Use this skill when the user or an agent wants to capture a professional achievement. The skill guides the capture process but the actual recording happens through BrandOps APIs.'
  },
  'turn-build-into-content': {
    id: 'turn-build-into-content',
    name: 'Turn Build Into Content',
    description: 'Turn a verified build achievement into content opportunities.',
    requiredCapabilities: ['opportunity.create', 'context.read'],
    steps: [
      {
        order: 1,
        title: 'Identify the build achievement',
        instruction: 'Find the verified achievement to turn into content.',
        mapsToTool: 'brandops_search_artifacts',
        expectedInput: 'Achievement id or title',
        outputHint: 'Achievement identified'
      },
      {
        order: 2,
        title: 'Generate content angles',
        instruction: 'Brainstorm 3-5 content angles based on the achievement type and audience.',
        mapsToTool: undefined,
        expectedInput: 'Achievement details',
        outputHint: 'Content angles generated'
      },
      {
        order: 3,
        title: 'Create content opportunity',
        instruction: 'Create a content opportunity proposal for the best angle.',
        mapsToTool: 'brandops_create_content_opportunity',
        expectedInput: 'Opportunity title, detail, format, angle',
        outputHint: 'Content opportunity created'
      },
      {
        order: 4,
        title: 'Offer conversion to plan',
        instruction: 'Offer to convert the content opportunity into a content plan.',
        mapsToTool: 'brandops_convert_to_plan',
        expectedInput: 'Opportunity id',
        outputHint: 'Plan conversion offered'
      }
    ],
    invocationHint:
      'Use this skill when the user wants to turn a build or achievement into content. The skill suggests angles and creates the opportunity; the user decides which to pursue.'
  },
  'review-project-positioning': {
    id: 'review-project-positioning',
    name: 'Review Project Positioning',
    description: "Review a project's positioning in light of its verified achievements.",
    requiredCapabilities: ['context.read', 'twin.propose_update'],
    steps: [
      {
        order: 1,
        title: 'Gather project context',
        instruction:
          "Retrieve the project's verified achievements, goals, and current positioning.",
        mapsToTool: 'brandops_get_context',
        expectedInput: 'Project id or context query',
        outputHint: 'Project context retrieved'
      },
      {
        order: 2,
        title: 'Analyze positioning alignment',
        instruction:
          "Compare the project's actual achievements against the current positioning statement.",
        mapsToTool: undefined,
        expectedInput: 'Project achievements and positioning',
        outputHint: 'Alignment analysis complete'
      },
      {
        order: 3,
        title: 'Identify positioning gaps',
        instruction:
          'Identify gaps between what the project has achieved and what the positioning claims.',
        mapsToTool: undefined,
        expectedInput: 'Alignment analysis',
        outputHint: 'Gaps identified'
      },
      {
        order: 4,
        title: 'Propose positioning update',
        instruction: 'If gaps are significant, propose a positioning update via Twin proposal.',
        mapsToTool: 'brandops_propose_twin_update',
        expectedInput: 'Proposed positioning text',
        outputHint: 'Positioning proposal created'
      }
    ],
    invocationHint:
      "Use this skill when the user wants to review whether a project's positioning matches its achievements. The skill analyzes gaps and proposes updates."
  },
  'generate-builder-update': {
    id: 'generate-builder-update',
    name: 'Generate Builder Update',
    description: 'Generate a professional update summary from recent verified activity.',
    requiredCapabilities: ['context.read', 'achievement.record'],
    steps: [
      {
        order: 1,
        title: 'Retrieve recent verified activity',
        instruction: 'Get recent verified achievements, events, and projects.',
        mapsToTool: 'brandops_get_context',
        expectedInput: 'Time range or project filter',
        outputHint: 'Activity retrieved'
      },
      {
        order: 2,
        title: 'Summarize key achievements',
        instruction: 'Summarize the most significant verified achievements in plain language.',
        mapsToTool: undefined,
        expectedInput: 'Activity list',
        outputHint: 'Achievement summary generated'
      },
      {
        order: 3,
        title: 'Identify emerging signals',
        instruction: 'Identify any professional signals that emerge from the activity pattern.',
        mapsToTool: undefined,
        expectedInput: 'Achievement summary',
        outputHint: 'Signals identified'
      },
      {
        order: 4,
        title: 'Draft the update',
        instruction: 'Draft a concise professional update combining achievements and signals.',
        mapsToTool: undefined,
        expectedInput: 'Summary and signals',
        outputHint: 'Update draft complete'
      }
    ],
    invocationHint:
      'Use this skill when the user wants a summary of their recent professional activity. The skill retrieves context, summarizes achievements, and drafts the update.'
  },
  'prepare-launch-narrative': {
    id: 'prepare-launch-narrative',
    name: 'Prepare Launch Narrative',
    description: 'Prepare a launch narrative from a verified release or milestone.',
    requiredCapabilities: ['context.read', 'opportunity.create'],
    steps: [
      {
        order: 1,
        title: 'Retrieve launch details',
        instruction: 'Get the release or milestone achievement and its evidence.',
        mapsToTool: 'brandops_get_context',
        expectedInput: 'Launch achievement id',
        outputHint: 'Launch details retrieved'
      },
      {
        order: 2,
        title: 'Identify key narrative elements',
        instruction: 'Identify the problem solved, the solution, the impact, and the story arc.',
        mapsToTool: undefined,
        expectedInput: 'Launch details',
        outputHint: 'Narrative elements identified'
      },
      {
        order: 3,
        title: 'Draft launch narrative',
        instruction: 'Draft a compelling launch narrative combining elements into a story.',
        mapsToTool: undefined,
        expectedInput: 'Narrative elements',
        outputHint: 'Launch narrative drafted'
      },
      {
        order: 4,
        title: 'Create content opportunity',
        instruction: 'Create a content opportunity for the launch narrative.',
        mapsToTool: 'brandops_create_content_opportunity',
        expectedInput: 'Narrative title, detail, format',
        outputHint: 'Launch content opportunity created'
      }
    ],
    invocationHint:
      'Use this skill when the user wants to prepare a launch narrative for a release or milestone. The skill structures the story and creates a content opportunity.'
  },
  'convert-work-session-to-portfolio-evidence': {
    id: 'convert-work-session-to-portfolio-evidence',
    name: 'Convert Work Session to Portfolio Evidence',
    description: 'Convert a work session summary into portfolio-ready evidence.',
    requiredCapabilities: ['achievement.record', 'artifact.create'],
    steps: [
      {
        order: 1,
        title: 'Summarize the work session',
        instruction: 'Summarize what was built, the technologies used, and the outcome.',
        mapsToTool: undefined,
        expectedInput: 'Work session details',
        outputHint: 'Session summary complete'
      },
      {
        order: 2,
        title: 'Identify portfolio value',
        instruction:
          'Identify what makes this work portfolio-worthy: technologies, impact, complexity.',
        mapsToTool: undefined,
        expectedInput: 'Session summary',
        outputHint: 'Portfolio value identified'
      },
      {
        order: 3,
        title: 'Record as achievement',
        instruction: 'Record the achievement with portfolio-relevant details.',
        mapsToTool: 'brandops_record_achievement',
        expectedInput: 'Achievement title, detail, kind',
        outputHint: 'Achievement recorded'
      },
      {
        order: 4,
        title: 'Create portfolio artifact',
        instruction: 'Create an artifact proposal for the portfolio entry.',
        mapsToTool: 'brandops_create_artifact',
        expectedInput: 'Artifact title, type, summary',
        outputHint: 'Artifact proposal created'
      }
    ],
    invocationHint:
      'Use this skill when the user wants to turn a work session into portfolio evidence. The skill captures the achievement and creates an artifact proposal.'
  },
  'review-professional-profile': {
    id: 'review-professional-profile',
    name: 'Review Professional Profile',
    description: 'Review the professional profile against recent verified activity and signals.',
    requiredCapabilities: ['context.read', 'twin.propose_update'],
    steps: [
      {
        order: 1,
        title: 'Retrieve current profile',
        instruction: 'Get the current Twin profile, positioning, and skills.',
        mapsToTool: 'brandops_get_context',
        expectedInput: 'Profile context query',
        outputHint: 'Profile retrieved'
      },
      {
        order: 2,
        title: 'Gather recent activity',
        instruction: 'Retrieve recent verified achievements and professional signals.',
        mapsToTool: 'brandops_get_context',
        expectedInput: 'Recent activity query',
        outputHint: 'Activity retrieved'
      },
      {
        order: 3,
        title: 'Compare profile vs activity',
        instruction: 'Compare the current profile against what the activity shows.',
        mapsToTool: undefined,
        expectedInput: 'Profile and activity',
        outputHint: 'Comparison complete'
      },
      {
        order: 4,
        title: 'Identify profile updates',
        instruction: 'Identify profile elements that should be updated based on the comparison.',
        mapsToTool: undefined,
        expectedInput: 'Comparison results',
        outputHint: 'Updates identified'
      },
      {
        order: 5,
        title: 'Propose profile updates',
        instruction: 'Propose Twin updates for the identified profile changes.',
        mapsToTool: 'brandops_propose_twin_update',
        expectedInput: 'Proposed updates',
        outputHint: 'Profile update proposals created'
      }
    ],
    invocationHint:
      'Use this skill when the user wants to review their professional profile against recent activity. The skill identifies gaps and proposes updates.'
  },
  'create-weekly-builder-review': {
    id: 'create-weekly-builder-review',
    name: 'Create Weekly Builder Review',
    description: 'Create a weekly professional review from verified activity.',
    requiredCapabilities: ['context.read', 'achievement.record'],
    steps: [
      {
        order: 1,
        title: 'Retrieve weekly activity',
        instruction:
          'Get all verified activity, achievements, and opportunities from the past week.',
        mapsToTool: 'brandops_get_context',
        expectedInput: 'Week time range',
        outputHint: 'Weekly activity retrieved'
      },
      {
        order: 2,
        title: 'Summarize work completed',
        instruction: 'Summarize work completed, achievements accepted, and artifacts created.',
        mapsToTool: undefined,
        expectedInput: 'Weekly activity',
        outputHint: 'Work summary complete'
      },
      {
        order: 3,
        title: 'Identify learnings',
        instruction: "Derive learnings from the week's activity and achievements.",
        mapsToTool: undefined,
        expectedInput: 'Work summary',
        outputHint: 'Learnings derived'
      },
      {
        order: 4,
        title: 'Generate weekly review',
        instruction: 'Generate the weekly review artifact with all sections.',
        mapsToTool: undefined,
        expectedInput: 'Work summary and learnings',
        outputHint: 'Weekly review generated'
      },
      {
        order: 5,
        title: 'Offer learnings for memory',
        instruction:
          'Offer the user the chance to approve selected learnings into longer-term memory.',
        mapsToTool: 'brandops_propose_twin_update',
        expectedInput: 'Approved learnings',
        outputHint: 'Learnings offered for memory'
      }
    ],
    invocationHint:
      'Use this skill at the end of a week to generate a professional review. The skill summarizes activity, derives learnings, and offers them for memory.'
  }
};

export function getSkillPack(id: SkillPackId): SkillPack | null {
  return SKILL_PACKS[id] ?? null;
}

export function listSkillPacks(): SkillPack[] {
  return Object.values(SKILL_PACKS);
}

export function skillPackUsesCapability(skillPackId: SkillPackId, capability: string): boolean {
  const pack = SKILL_PACKS[skillPackId];
  if (!pack) return false;
  return pack.requiredCapabilities.includes(capability);
}
