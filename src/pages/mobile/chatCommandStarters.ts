/**
 * Curated Chat starters — each phrase must route via {@link parseCommandRoute} in
 * `src/services/agent/intent/commandIntent.ts`. Keep this list small; full lists live on Today / docs.
 */
export const CHAT_QUICK_STARTER_GROUPS = [
  {
    id: 'essentials',
    label: 'Quick checks & capture',
    commands: [
      'pipeline health',
      'add note: prep for Monday standup',
      'create follow up: check warm lead status'
    ]
  },
  {
    id: 'pipeline',
    label: 'Pipeline & people',
    commands: [
      'draft outreach: follow up on warm lead from demo',
      'add contact: Alex Rivera, Northwind Labs, Founder',
      'update opportunity to proposal'
    ]
  },
  {
    id: 'content',
    label: 'Content & connections',
    commands: [
      'draft post: weekly insight from the workspace',
      'add content: weekly insight memo',
      'connect notion source: Growth workspace'
    ]
  }
] as const;

export const CHAT_QUICK_STARTERS_FLAT: readonly string[] = CHAT_QUICK_STARTER_GROUPS.flatMap((g) => [...g.commands]);
