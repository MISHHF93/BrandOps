import { QueueStatus } from '../../types/domain';

export const PUBLISHING_QUEUE_STATUSES: { value: QueueStatus; label: string }[] = [
  { value: 'queued', label: 'Queued' },
  { value: 'due-soon', label: 'Due soon' },
  { value: 'ready-to-post', label: 'Ready to post' },
  { value: 'posted', label: 'Posted' },
  { value: 'skipped', label: 'Skipped' }
];

export const publishingQueueModule = {
  id: 'publishing-queue',
  title: 'Publishing Queue',
  description: 'Scheduling-oriented queue for drafts, statuses, and reminder windows.',
  version: '1.0.0'
} as const;
