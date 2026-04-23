/**
 * Deterministic v1 command routing. Maps user text to a route for {@link executeAgentWorkspaceCommand}.
 * Order matches precedence of the previous keyword chain (specific routes before general ones).
 */
export type CommandRoute =
  | 'add-note'
  | 'reschedule-publishing'
  | 'add-integration-source'
  | 'add-integration-artifact'
  | 'add-ssh-target'
  | 'add-outreach-draft'
  | 'add-publishing-draft'
  | 'archive-opportunity'
  | 'restore-opportunity'
  | 'complete-follow-up'
  | 'create-follow-up'
  | 'add-contact'
  | 'update-contact-relationship'
  | 'update-contact'
  | 'add-content'
  | 'update-content'
  | 'duplicate-content'
  | 'archive-content'
  | 'update-publishing'
  | 'configure-workspace'
  | 'pipeline-health'
  | 'update-opportunity'
  | 'unsupported';

export const parseCommandRoute = (text: string): CommandRoute => {
  const lower = text.toLowerCase();

  if (lower.includes('add note') || lower.startsWith('note:')) {
    return 'add-note';
  }
  if (lower.includes('reschedule') && (lower.includes('post') || lower.includes('publishing'))) {
    return 'reschedule-publishing';
  }
  if (lower.startsWith('add artifact:') || lower.includes('add integration artifact')) {
    return 'add-integration-artifact';
  }
  if (
    lower.includes('add ssh') ||
    lower.includes('ssh target:') ||
    lower.includes('add ssh target')
  ) {
    return 'add-ssh-target';
  }
  if (
    lower.includes('add source') ||
    (lower.includes('connect') && !lower.includes('add artifact'))
  ) {
    return 'add-integration-source';
  }
  if (lower.includes('draft outreach')) {
    return 'add-outreach-draft';
  }
  if (lower.includes('draft post') || lower.includes('create post')) {
    return 'add-publishing-draft';
  }
  if (lower.includes('archive opportunity')) {
    return 'archive-opportunity';
  }
  if (lower.includes('restore opportunity')) {
    return 'restore-opportunity';
  }
  if (lower.includes('complete follow up') || lower.includes('complete follow-up')) {
    return 'complete-follow-up';
  }
  if (
    lower.includes('create follow up') ||
    lower.includes('create follow-up') ||
    lower.includes('add follow up') ||
    lower.includes('add follow-up')
  ) {
    return 'create-follow-up';
  }
  if (lower.includes('add contact')) {
    return 'add-contact';
  }
  if (
    lower.includes('update contact relationship') ||
    lower.includes('set contact relationship stage')
  ) {
    return 'update-contact-relationship';
  }
  if (lower.includes('update contact')) {
    return 'update-contact';
  }
  if (lower.includes('add content') || lower.includes('create content')) {
    return 'add-content';
  }
  if (lower.includes('update content')) {
    return 'update-content';
  }
  if (lower.includes('duplicate content')) {
    return 'duplicate-content';
  }
  if (lower.includes('archive content')) {
    return 'archive-content';
  }
  if (lower.includes('update publishing') || lower.includes('set publishing')) {
    return 'update-publishing';
  }
  if (lower.includes('configure workspace') || lower.startsWith('configure:')) {
    return 'configure-workspace';
  }
  if (
    lower.includes('pipeline health') ||
    lower.includes('opportunity health') ||
    (lower.includes('rank') && lower.includes('opportunit'))
  ) {
    return 'pipeline-health';
  }
  if (lower.includes('update opportunity') || lower.includes('set opportunity')) {
    return 'update-opportunity';
  }

  return 'unsupported';
};
