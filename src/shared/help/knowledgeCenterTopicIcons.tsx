import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  CalendarRange,
  Eye,
  Keyboard,
  LayoutGrid,
  Plug2,
  SlidersHorizontal,
  UserCircle
} from 'lucide-react';

/** Topic `id` from `knowledgeCenterTopics.ts` → icon for Help / Knowledge Center UI. */
const TOPIC_ICONS: Record<string, LucideIcon> = {
  surfaces: LayoutGrid,
  'first-run': UserCircle,
  'today-execution': CalendarRange,
  connections: Plug2,
  shortcuts: Keyboard,
  'visual-wayfinding': Eye,
  'intelligence-tuning': SlidersHorizontal
};

export function KnowledgeTopicIcon({ topicId, size = 15 }: { topicId: string; size?: number }) {
  const Icon = TOPIC_ICONS[topicId] ?? BookOpen;
  return <Icon size={size} strokeWidth={2} className="shrink-0 text-primary/90" aria-hidden />;
}
