import { ContentItemStatus, ContentItemType, PublishChannel } from '../../types/domain';

export const CONTENT_ITEM_TYPES: { value: ContentItemType; label: string }[] = [
  { value: 'post-draft', label: 'Post draft' },
  { value: 'post-idea', label: 'Post idea' },
  { value: 'article-note', label: 'Article note' },
  { value: 'carousel-outline', label: 'Carousel outline' },
  { value: 'hook-bank-entry', label: 'Hook bank entry' },
  { value: 'cta-snippet', label: 'CTA snippet' },
  { value: 'reusable-paragraph', label: 'Reusable paragraph' }
];

export const CONTENT_ITEM_STATUSES: ContentItemStatus[] = [
  'idea',
  'drafting',
  'ready',
  'scheduled',
  'published',
  'archived'
];

export const PUBLISH_CHANNELS: PublishChannel[] = [
  'linkedin',
  'newsletter',
  'x',
  'blog',
  'youtube',
  'podcast'
];

export const contentLibraryModule = {
  id: 'content-library',
  title: 'Content Library',
  description: 'Editorial workspace for draft management, content reuse, and publishing-ready assets.',
  version: '1.0.0'
} as const;
