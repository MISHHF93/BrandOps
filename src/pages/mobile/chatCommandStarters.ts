/**
 * Curated Chat starters — each phrase must route via {@link parseCommandRoute} in
 * `src/services/agent/intent/commandIntent.ts`. Grouped for the Chat tab UI only.
 */
export const CHAT_QUICK_STARTER_GROUPS = [
  {
    id: 'sales-managers',
    label: 'Sales managers (pipeline & outreach)',
    commands: [
      'pipeline health',
      'draft outreach: quick follow-up with warm lead from demo',
      'update opportunity to proposal',
      'add contact: Alex Rivera, Northwind Labs, Founder'
    ]
  },
  {
    id: 'growth-brand',
    label: 'Growth & brand (content & publishing)',
    commands: [
      'draft post: three lessons from building an AI growth system',
      'add content: weekly insight memo',
      'reschedule posts to friday 11am',
      'add note: prep growth sprint summary for Monday'
    ]
  },
  {
    id: 'today',
    label: 'Today & capture',
    commands: [
      'add note: prep growth sprint summary for Monday',
      'create follow up: check warm lead status',
      'complete follow up: done with intro call follow-up'
    ]
  },
  {
    id: 'pipeline',
    label: 'Pipeline & outreach',
    commands: [
      'add contact: Alex Rivera, Northwind Labs, Founder',
      'draft outreach: quick follow-up with warm lead from demo',
      'pipeline health',
      'update opportunity to proposal',
      'archive opportunity',
      'restore opportunity'
    ]
  },
  {
    id: 'brand',
    label: 'Brand & publishing',
    commands: [
      'add content: weekly insight memo',
      'draft post: three lessons from building an AI growth system',
      'reschedule posts to friday 11am',
      'duplicate content: Execution beats inspiration in technical content systems',
      'archive content: Hook: workflow ambiguity'
    ]
  },
  {
    id: 'connections',
    label: 'Connections & workspace',
    commands: [
      'connect notion source: Growth workspace',
      'add source: webhook pipeline',
      'configure: cadence balanced, remind before 20 min'
    ]
  }
] as const;

export const CHAT_QUICK_STARTERS_FLAT: readonly string[] = CHAT_QUICK_STARTER_GROUPS.flatMap((g) => [
  ...g.commands
]);
