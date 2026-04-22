/**
 * Curated Chat starters — each phrase must route via {@link parseCommandRoute} in
 * `src/services/agent/intent/commandIntent.ts`. Grouped for the Chat tab UI only.
 */
export const CHAT_QUICK_STARTER_GROUPS = [
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
      'update opportunity to proposal'
    ]
  },
  {
    id: 'brand',
    label: 'Brand & publishing',
    commands: [
      'add content: weekly insight memo',
      'draft post: three lessons from building an AI growth system',
      'reschedule posts to friday 11am'
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
