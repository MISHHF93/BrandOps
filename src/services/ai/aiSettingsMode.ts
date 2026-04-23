import { BrandOpsData } from '../../types/domain';

export type AiSettingsOperationKind =
  | 'set-visual-mode'
  | 'set-motion-mode'
  | 'set-ambient-fx'
  | 'set-debug-mode'
  | 'set-managerial-weight'
  | 'set-workday-window'
  | 'set-max-daily-tasks'
  | 'set-cadence-mode'
  | 'set-cadence-reminder-minutes'
  | 'update-brand-profile'
  | 'add-note';

export interface AiSettingsOperation {
  id: string;
  kind: AiSettingsOperationKind;
  payload: Record<string, unknown>;
}

export interface AiSettingsPlan {
  operations: AiSettingsOperation[];
  warnings: string[];
  unsupportedRequests: string[];
}

export interface AiSettingsApplyResult {
  data: BrandOpsData;
  applied: string[];
  skipped: string[];
  failed: string[];
}

const MAX_AI_SETTINGS_OPERATIONS = 20;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.round(value)));

const nextOperation = (
  operations: AiSettingsOperation[],
  kind: AiSettingsOperationKind,
  payload: Record<string, unknown>
) => {
  if (operations.length >= MAX_AI_SETTINGS_OPERATIONS) return;
  operations.push({
    id: `ai-op-${operations.length + 1}`,
    kind,
    payload
  });
};

export const buildAiSettingsPlan = (prompt: string): AiSettingsPlan => {
  const normalized = prompt.trim();
  const lower = normalized.toLowerCase();
  const operations: AiSettingsOperation[] = [];
  const warnings: string[] = [];
  const unsupportedRequests: string[] = [];

  if (!normalized) {
    return {
      operations,
      warnings,
      unsupportedRequests: ['Prompt is empty.']
    };
  }

  if (lower.includes('retro')) {
    nextOperation(operations, 'set-visual-mode', { visualMode: 'retroMagic' });
  } else if (lower.includes('classic')) {
    nextOperation(operations, 'set-visual-mode', { visualMode: 'classic' });
  }

  if (lower.includes('motion off')) {
    nextOperation(operations, 'set-motion-mode', { motionMode: 'off' });
  } else if (lower.includes('motion wild')) {
    nextOperation(operations, 'set-motion-mode', { motionMode: 'wild' });
  } else if (lower.includes('motion balanced')) {
    nextOperation(operations, 'set-motion-mode', { motionMode: 'balanced' });
  }

  if (lower.includes('enable ambient') || lower.includes('ambient on')) {
    nextOperation(operations, 'set-ambient-fx', { ambientFxEnabled: true });
  } else if (lower.includes('disable ambient') || lower.includes('ambient off')) {
    nextOperation(operations, 'set-ambient-fx', { ambientFxEnabled: false });
  }

  if (lower.includes('enable debug')) {
    nextOperation(operations, 'set-debug-mode', { debugMode: true });
  } else if (lower.includes('disable debug')) {
    nextOperation(operations, 'set-debug-mode', { debugMode: false });
  }

  const weightMatch = lower.match(/(\d{1,2})\s*%\s*(business|managerial)/);
  if (weightMatch) {
    nextOperation(operations, 'set-managerial-weight', {
      managerialWeight: clamp(Number(weightMatch[1]), 10, 90)
    });
  }

  const maxTasksMatch = lower.match(/max(?:imum)?\s*(?:tasks|task)\s*(?:per lane)?\s*(\d{1,2})/);
  if (maxTasksMatch) {
    nextOperation(operations, 'set-max-daily-tasks', {
      maxDailyTasks: clamp(Number(maxTasksMatch[1]), 1, 8)
    });
  }

  const windowMatch = lower.match(/workday\s*(\d{1,2})\s*(?:to|-)\s*(\d{1,2})/);
  if (windowMatch) {
    nextOperation(operations, 'set-workday-window', {
      workdayStartHour: clamp(Number(windowMatch[1]), 0, 23),
      workdayEndHour: clamp(Number(windowMatch[2]), 1, 24)
    });
  }

  if (lower.includes('cadence launch-day') || lower.includes('cadence launch day')) {
    nextOperation(operations, 'set-cadence-mode', { mode: 'launch-day' });
  } else if (lower.includes('cadence maker-heavy') || lower.includes('cadence maker heavy')) {
    nextOperation(operations, 'set-cadence-mode', { mode: 'maker-heavy' });
  } else if (lower.includes('cadence client-heavy') || lower.includes('cadence client heavy')) {
    nextOperation(operations, 'set-cadence-mode', { mode: 'client-heavy' });
  } else if (lower.includes('cadence balanced')) {
    nextOperation(operations, 'set-cadence-mode', { mode: 'balanced' });
  }

  const reminderMatch = lower.match(/remind(?:er)?\s*(?:before)?\s*(\d{1,3})\s*min/);
  if (reminderMatch) {
    nextOperation(operations, 'set-cadence-reminder-minutes', {
      remindBeforeMinutes: clamp(Number(reminderMatch[1]), 5, 90)
    });
  }

  const operatorNameMatch = normalized.match(/operator name\s*(?:is|=)\s*["“]?([^"\n”]+)["”]?/i);
  const focusMetricMatch = normalized.match(/focus metric\s*(?:is|=)\s*["“]?([^"\n”]+)["”]?/i);
  const primaryOfferMatch = normalized.match(/primary offer\s*(?:is|=)\s*["“]?([^"\n”]+)["”]?/i);
  /** Quoted value may span lines; closing `"` must be followed by comma or end (no `"` inside value). */
  const positioningMatch = normalized.match(/positioning\s*(?:is|=)\s*"([\s\S]*?)"(?=\s*,|\s*$)/i);
  const brandVoiceMatch =
    normalized.match(/brand\s+voice\s*(?:is|=)\s*"([\s\S]*?)"(?=\s*,|\s*$)/i) ??
    normalized.match(/voice\s+guide\s*(?:is|=)\s*"([\s\S]*?)"(?=\s*,|\s*$)/i);
  const brandPayload: Record<string, unknown> = {};
  if (operatorNameMatch?.[1]) brandPayload.operatorName = operatorNameMatch[1].trim();
  if (focusMetricMatch?.[1]) brandPayload.focusMetric = focusMetricMatch[1].trim();
  if (primaryOfferMatch?.[1]) brandPayload.primaryOffer = primaryOfferMatch[1].trim();
  if (positioningMatch?.[1]?.trim()) brandPayload.positioning = positioningMatch[1].trim();
  if (brandVoiceMatch?.[1]?.trim()) brandPayload.voiceGuide = brandVoiceMatch[1].trim();
  if (Object.keys(brandPayload).length > 0) {
    nextOperation(operations, 'update-brand-profile', brandPayload);
  }

  const noteMatch = normalized.match(/add note\s*:\s*([\s\S]+)/i);
  if (noteMatch?.[1]) {
    const detail = noteMatch[1].trim();
    if (detail) {
      nextOperation(operations, 'add-note', {
        title: 'AI settings adjustment',
        detail
      });
    }
  }

  if (operations.length === 0) {
    unsupportedRequests.push(normalized);
  }
  if (operations.length >= MAX_AI_SETTINGS_OPERATIONS) {
    warnings.push('Operation limit reached. Some requested changes may have been ignored.');
  }

  return {
    operations,
    warnings,
    unsupportedRequests
  };
};

export const applyAiSettingsOperations = (
  source: BrandOpsData,
  operations: AiSettingsOperation[]
): AiSettingsApplyResult => {
  let data = structuredClone(source);
  const applied: string[] = [];
  const skipped: string[] = [];
  const failed: string[] = [];

  operations.forEach((operation) => {
    try {
      switch (operation.kind) {
        case 'set-visual-mode':
          if (
            operation.payload.visualMode === 'classic' ||
            operation.payload.visualMode === 'retroMagic'
          ) {
            data.settings.visualMode = operation.payload.visualMode;
            applied.push(`Visual mode set to ${operation.payload.visualMode}.`);
          } else {
            skipped.push('Visual mode request skipped.');
          }
          break;
        case 'set-motion-mode':
          if (
            operation.payload.motionMode === 'off' ||
            operation.payload.motionMode === 'balanced' ||
            operation.payload.motionMode === 'wild'
          ) {
            data.settings.motionMode = operation.payload.motionMode;
            applied.push(`Motion mode set to ${operation.payload.motionMode}.`);
          } else {
            skipped.push('Motion mode request skipped.');
          }
          break;
        case 'set-ambient-fx':
          data.settings.ambientFxEnabled = Boolean(operation.payload.ambientFxEnabled);
          applied.push(
            `Ambient FX ${data.settings.ambientFxEnabled ? 'enabled' : 'disabled'}.`
          );
          break;
        case 'set-debug-mode':
          data.settings.debugMode = Boolean(operation.payload.debugMode);
          applied.push(`Debug mode ${data.settings.debugMode ? 'enabled' : 'disabled'}.`);
          break;
        case 'set-managerial-weight':
          data.settings.notificationCenter.managerialWeight = clamp(
            Number(operation.payload.managerialWeight ?? 50),
            10,
            90
          );
          applied.push('Business focus weight updated.');
          break;
        case 'set-workday-window': {
          const start = clamp(Number(operation.payload.workdayStartHour ?? 8), 0, 23);
          const end = clamp(Number(operation.payload.workdayEndHour ?? 18), 1, 24);
          if (start >= end) {
            skipped.push('Workday window skipped because start hour must be before end hour.');
            break;
          }
          data.settings.notificationCenter.workdayStartHour = start;
          data.settings.notificationCenter.workdayEndHour = end;
          applied.push(`Workday window set to ${start}:00-${end}:00.`);
          break;
        }
        case 'set-max-daily-tasks':
          data.settings.notificationCenter.maxDailyTasks = clamp(
            Number(operation.payload.maxDailyTasks ?? 4),
            1,
            8
          );
          applied.push('Max daily tasks updated.');
          break;
        case 'set-cadence-mode':
          if (
            operation.payload.mode === 'balanced' ||
            operation.payload.mode === 'maker-heavy' ||
            operation.payload.mode === 'client-heavy' ||
            operation.payload.mode === 'launch-day'
          ) {
            data.settings.cadenceFlow.mode = operation.payload.mode;
            applied.push(`Cadence mode set to ${operation.payload.mode}.`);
          } else {
            skipped.push('Cadence mode request skipped.');
          }
          break;
        case 'set-cadence-reminder-minutes':
          data.settings.cadenceFlow.remindBeforeMinutes = clamp(
            Number(operation.payload.remindBeforeMinutes ?? 15),
            5,
            90
          );
          applied.push('Cadence reminder lead updated.');
          break;
        case 'update-brand-profile':
          data.brand = {
            ...data.brand,
            ...(typeof operation.payload.operatorName === 'string'
              ? { operatorName: operation.payload.operatorName.trim().slice(0, 90) }
              : {}),
            ...(typeof operation.payload.positioning === 'string'
              ? { positioning: operation.payload.positioning.trim().slice(0, 400) }
              : {}),
            ...(typeof operation.payload.primaryOffer === 'string'
              ? { primaryOffer: operation.payload.primaryOffer.trim().slice(0, 180) }
              : {}),
            ...(typeof operation.payload.voiceGuide === 'string'
              ? { voiceGuide: operation.payload.voiceGuide.trim().slice(0, 2000) }
              : {}),
            ...(typeof operation.payload.focusMetric === 'string'
              ? { focusMetric: operation.payload.focusMetric.trim().slice(0, 180) }
              : {})
          };
          applied.push('Brand profile fields updated.');
          break;
        case 'add-note': {
          const detail =
            typeof operation.payload.detail === 'string' ? operation.payload.detail.trim() : '';
          if (!detail) {
            skipped.push('Add note request skipped because note detail was empty.');
            break;
          }
          data.notes = [
            {
              id: `ai-note-${Math.random().toString(36).slice(2, 9)}`,
              entityType: 'company',
              entityId: 'ai-settings-mode',
              title:
                typeof operation.payload.title === 'string'
                  ? operation.payload.title.slice(0, 120)
                  : 'AI settings adjustment',
              detail: detail.slice(0, 800),
              createdAt: new Date().toISOString()
            },
            ...data.notes
          ];
          applied.push('Workspace note added.');
          break;
        }
        default:
          skipped.push(`Unsupported operation: ${operation.kind}`);
      }
    } catch (error) {
      failed.push(
        `Operation ${operation.kind} failed: ${
          error instanceof Error ? error.message : 'Unknown error.'
        }`
      );
    }
  });

  return {
    data,
    applied,
    skipped,
    failed
  };
};
