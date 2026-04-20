import { getIntelligenceRules } from '../../rules/intelligenceRulesRuntime';
import { BrandOpsData } from '../../types/domain';
import { localIntelligence } from './localIntelligence';

export interface DailyNotificationAction {
  id: string;
  stream: 'managerial' | 'technical' | 'dataset';
  title: string;
  detail: string;
  sectionId: string;
  severity: 'critical' | 'focus' | 'routine';
}

export interface DailyTimeBlock {
  id: string;
  title: string;
  stream: 'managerial' | 'technical';
  startHour: number;
  endHour: number;
  objective: string;
}

export interface DailyNotificationDigest {
  managerialWeight: number;
  technicalWeight: number;
  managerialActions: DailyNotificationAction[];
  technicalActions: DailyNotificationAction[];
  datasetActions: DailyNotificationAction[];
  schedule: DailyTimeBlock[];
  headline: string;
  promptPreview: string;
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.round(value)));

const hoursUntil = (iso?: string) => {
  if (!iso) return Number.POSITIVE_INFINITY;
  return (new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60);
};

const serializeActions = (actions: DailyNotificationAction[]) =>
  actions.map((action, index) => `${index + 1}. ${action.title} - ${action.detail}`).join('\n');

const applyPromptTemplate = (
  template: string,
  digest: Omit<DailyNotificationDigest, 'promptPreview'>,
  data: BrandOpsData
) =>
  template
    .replaceAll('{{role_context}}', data.settings.notificationCenter.roleContext)
    .replaceAll('{{preferred_model}}', data.settings.notificationCenter.preferredModel || 'not specified')
    .replaceAll('{{managerial_focus_percent}}', String(digest.managerialWeight))
    .replaceAll('{{technical_focus_percent}}', String(digest.technicalWeight))
    .replaceAll('{{managerial_tasks}}', serializeActions(digest.managerialActions))
    .replaceAll('{{technical_tasks}}', serializeActions(digest.technicalActions))
    .replaceAll('{{dataset_tasks}}', serializeActions(digest.datasetActions));

const scheduleBlocks = (
  startHour: number,
  endHour: number,
  managerialWeight: number
): DailyTimeBlock[] => {
  const totalHours = Math.max(1, endHour - startHour);
  const managerialHours = clamp((totalHours * managerialWeight) / 100, 1, totalHours - 1);
  const technicalHours = Math.max(1, totalHours - managerialHours);
  const openingManagerialHours = Math.max(1, Math.floor(managerialHours * 0.5));
  const closingManagerialHours = Math.max(0, managerialHours - openingManagerialHours);
  const blocks: DailyTimeBlock[] = [];

  let cursor = startHour;

  if (openingManagerialHours > 0) {
    blocks.push({
      id: 'managerial-open',
      title: 'Business control block',
      stream: 'managerial',
      startHour: cursor,
      endHour: cursor + openingManagerialHours,
      objective: 'Clear urgent follow-ups, protect revenue momentum, and set today’s constraints.'
    });
    cursor += openingManagerialHours;
  }

  if (technicalHours > 0) {
    blocks.push({
      id: 'technical-core',
      title: 'Deep build block',
      stream: 'technical',
      startHour: cursor,
      endHour: cursor + technicalHours,
      objective: 'Ship product, systems, automation, and reusable assets with minimal context switching.'
    });
    cursor += technicalHours;
  }

  if (closingManagerialHours > 0) {
    blocks.push({
      id: 'managerial-close',
      title: 'Shutdown and reset',
      stream: 'managerial',
      startHour: cursor,
      endHour: Math.min(endHour, cursor + closingManagerialHours),
      objective: 'Review outcomes, clear loose ends, and protect tomorrow’s energy.'
    });
  }

  return blocks;
};

const createManagerialActions = (data: BrandOpsData): DailyNotificationAction[] => {
  const d = getIntelligenceRules().digest;
  const overdueFollowUps = data.followUps.filter(
    (item) => !item.completed && new Date(item.dueAt).getTime() < Date.now()
  );
  const dueOpportunities = data.opportunities.filter(
    (item) =>
      item.status !== 'won' &&
      item.status !== 'lost' &&
      hoursUntil(item.followUpDate) <= d.opportunityFollowUpWithinHours
  );
  const readyOutreach = data.outreachDrafts.filter(
    (item) => item.status === 'ready' || item.status === 'scheduled follow-up'
  );
  const duePublishing = data.publishingQueue.filter(
    (item) =>
      item.status !== 'posted' &&
      item.status !== 'skipped' &&
      hoursUntil(item.scheduledFor) <= d.publishingDueWithinHours
  );

  const actions: DailyNotificationAction[] = [];

  if (overdueFollowUps.length > 0) {
    actions.push({
      id: 'mgr-followups',
      stream: 'managerial',
      title: `Clear ${overdueFollowUps.length} overdue follow-up${overdueFollowUps.length > 1 ? 's' : ''}`,
      detail: 'Start the day by closing overdue relationship debt before it compounds into pipeline slippage.',
      sectionId: 'today',
      severity: 'critical'
    });
  }

  if (dueOpportunities.length > 0) {
    actions.push({
      id: 'mgr-pipeline',
      stream: 'managerial',
      title: `Review ${dueOpportunities.length} active opportunit${dueOpportunities.length > 1 ? 'ies' : 'y'} due soon`,
      detail: 'Update next actions, confidence, and blockers so the pipeline view stays decision-ready.',
      sectionId: 'pipeline',
      severity: overdueFollowUps.length > 0 ? 'focus' : 'critical'
    });
  }

  if (readyOutreach.length > 0) {
    actions.push({
      id: 'mgr-outreach',
      stream: 'managerial',
      title: `Ship ${readyOutreach.length} outreach touchpoint${readyOutreach.length > 1 ? 's' : ''}`,
      detail: 'Use the outreach workspace to convert ready drafts into sent messages or scheduled follow-ups.',
      sectionId: 'pipeline',
      severity: 'focus'
    });
  }

  if (duePublishing.length > 0) {
    actions.push({
      id: 'mgr-publishing',
      stream: 'managerial',
      title: `Confirm ${duePublishing.length} publish window${duePublishing.length > 1 ? 's' : ''}`,
      detail: 'Check hooks, CTA, and timing so today’s content commitments do not slip silently.',
      sectionId: 'brand-content',
      severity: 'focus'
    });
  }

  if (actions.length === 0) {
    actions.push({
      id: 'mgr-routine',
      stream: 'managerial',
      title: 'Run the daily business review',
      detail: 'Scan revenue, reminders, and public commitments, then choose the one promise that must not slip today.',
      sectionId: 'pipeline',
      severity: 'routine'
    });
  }

  return actions;
};

const createTechnicalActions = (data: BrandOpsData): DailyNotificationAction[] => {
  const top = getIntelligenceRules().digest.technicalContentPriorityTop;
  const contentPriority = localIntelligence.contentPriority(data.contentLibrary).slice(0, top);
  const plannedSources = data.integrationHub.sources.filter((item) => item.status === 'planned');
  const sourcesWithoutArtifacts = data.integrationHub.sources.filter(
    (source) => !data.integrationHub.artifacts.some((artifact) => artifact.sourceId === source.id)
  );
  const sshTargets = data.integrationHub.sshTargets;

  const actions: DailyNotificationAction[] = [];

  if (contentPriority.length > 0) {
    actions.push({
      id: 'tech-asset',
      stream: 'technical',
      title: `Build the next reusable asset: ${contentPriority[0].label}`,
      detail: 'Move one high-value draft or idea into a clearer reusable system component today.',
      sectionId: 'brand-content',
      severity: 'focus'
    });
  }

  if (plannedSources.length > 0) {
    actions.push({
      id: 'tech-connectors',
      stream: 'technical',
      title: `Design ${plannedSources.length} pending integration connector${plannedSources.length > 1 ? 's' : ''}`,
      detail: 'Turn planned sources into real capture flows or document the manual ingest pattern you will use.',
      sectionId: 'connections',
      severity: 'focus'
    });
  }

  if (sourcesWithoutArtifacts.length > 0) {
    actions.push({
      id: 'tech-artifacts',
      stream: 'technical',
      title: `Capture first artifacts from ${sourcesWithoutArtifacts.length} source${sourcesWithoutArtifacts.length > 1 ? 's' : ''}`,
      detail: 'Connected systems are most useful once they emit artifacts back into the hub for reuse.',
      sectionId: 'connections',
      severity: 'routine'
    });
  }

  if (sshTargets.length > 0) {
    actions.push({
      id: 'tech-ssh',
      stream: 'technical',
      title: `Review ${sshTargets.length} operational SSH target${sshTargets.length > 1 ? 's' : ''}`,
      detail: 'Validate command hints, access assumptions, and which systems still need automation coverage.',
      sectionId: 'connections',
      severity: 'routine'
    });
  }

  if (actions.length === 0) {
    actions.push({
      id: 'tech-routine',
      stream: 'technical',
      title: 'Stabilize the operator stack',
      detail: 'Use today’s build block to remove friction from the product, systems, or reusable leverage assets.',
      sectionId: 'connections',
      severity: 'routine'
    });
  }

  return actions;
};

const createDatasetActions = (data: BrandOpsData): DailyNotificationAction[] => {
  const d = getIntelligenceRules().digest;
  const untaggedContent = data.contentLibrary.filter((item) => item.tags.length === 0);
  const thinArtifacts = data.integrationHub.artifacts.filter(
    (item) =>
      item.tags.length === 0 || item.summary.trim().length < d.artifactThinSummaryMaxLen
  );
  const thinSources = data.integrationHub.sources.filter(
    (item) =>
      item.notes.trim().length < d.sourceThinNotesMaxLen ||
      item.artifactTypes.length < d.sourceThinArtifactTypesMin
  );
  const notesToCodify = data.notes
    .filter((item) => item.detail.trim().length > 0)
    .slice(0, d.notesRecentSlice);

  const actions: DailyNotificationAction[] = [];

  if (untaggedContent.length > 0) {
    actions.push({
      id: 'data-content',
      stream: 'dataset',
      title: `Tag ${untaggedContent.length} content item${untaggedContent.length > 1 ? 's' : ''}`,
      detail: 'Add tags and goals so your content library becomes queryable and reusable instead of a passive pile.',
      sectionId: 'brand-content',
      severity: 'focus'
    });
  }

  if (thinArtifacts.length > 0) {
    actions.push({
      id: 'data-artifacts',
      stream: 'dataset',
      title: `Enrich ${thinArtifacts.length} artifact record${thinArtifacts.length > 1 ? 's' : ''}`,
      detail: 'Fill in summaries and tags so external system artifacts are actually useful during planning.',
      sectionId: 'connections',
      severity: 'routine'
    });
  }

  if (thinSources.length > 0) {
    actions.push({
      id: 'data-sources',
      stream: 'dataset',
      title: `Clarify ${thinSources.length} integration source${thinSources.length > 1 ? 's' : ''}`,
      detail: 'Document artifact types and notes so every source has a clear operating purpose.',
      sectionId: 'connections',
      severity: 'routine'
    });
  }

  if (notesToCodify.length > 0) {
    actions.push({
      id: 'data-notes',
      stream: 'dataset',
      title: `Promote ${notesToCodify.length} recent note${notesToCodify.length > 1 ? 's' : ''} into reusable data`,
      detail: 'Convert ad hoc notes into snippets, artifacts, or structured follow-up context while they are still fresh.',
      sectionId: 'brand-content',
      severity: 'routine'
    });
  }

  if (actions.length === 0) {
    actions.push({
      id: 'data-routine',
      stream: 'dataset',
      title: 'Run a lightweight system hygiene pass',
      detail: 'Check tags, summaries, and artifacts so the cockpit stays searchable and model-ready.',
      sectionId: 'connections',
      severity: 'routine'
    });
  }

  return actions;
};

export const dailyNotificationCenter = {
  build(data: BrandOpsData): DailyNotificationDigest {
    const settings = data.settings.notificationCenter;
    const managerialWeight = clamp(settings.managerialWeight, 10, 90);
    const technicalWeight = 100 - managerialWeight;

    if (!settings.enabled) {
      const baseDigest = {
        managerialWeight,
        technicalWeight,
        managerialActions: [],
        technicalActions: [],
        datasetActions: [],
        schedule: [],
        headline: 'Execution Center is disabled in settings'
      };

      return {
        ...baseDigest,
        promptPreview: 'Execution Center is disabled. Enable it in settings to generate an operator plan.'
      };
    }

    const managerialActions = createManagerialActions(data).slice(0, settings.maxDailyTasks);
    const technicalActions = createTechnicalActions(data).slice(0, settings.maxDailyTasks);
    const datasetActions = settings.datasetReviewEnabled
      ? createDatasetActions(data).slice(
          0,
          Math.max(getIntelligenceRules().digest.datasetActionsMinSlice, settings.maxDailyTasks - 1)
        )
      : [];

    const baseDigest = {
      managerialWeight,
      technicalWeight,
      managerialActions,
      technicalActions,
      datasetActions,
      schedule: scheduleBlocks(
        settings.workdayStartHour,
        settings.workdayEndHour,
        managerialWeight
      ),
      headline:
        managerialActions[0]?.severity === 'critical'
          ? managerialActions[0].title
          : technicalActions[0]?.title ?? 'Run the daily operator loop'
    };

    return {
      ...baseDigest,
      promptPreview: applyPromptTemplate(settings.promptTemplate, baseDigest, data)
    };
  }
};
