# Cockpit (Today tab) vs agent command routes

Maps [`CommandRoute`](src/services/agent/intent/commandIntent.ts) / example phrases to the **primary Cockpit workstream** and where users can trigger them today. Mutations run through [`executeAgentWorkspaceCommand`](src/services/agent/agentWorkspaceEngine.ts) (Chat or `runCommand` from the shell).

**Legend — UI column:** `strip` = [`CockpitWorkstreamCommandStrip`](../src/pages/mobile/CockpitWorkstreamCommandStrip.tsx); `chip` = inline row or footer chip; `Chat` = [Chat starters](../src/pages/mobile/chatCommandStarters.ts) only.

| CommandRoute | Example phrase | Primary workstream | Today UI |
|----------------|----------------|--------------------|----------|
| `create-follow-up` | `create follow up: …` | Today | strip, chip |
| `complete-follow-up` | `complete follow up: …` | Today | strip (first incomplete task in engine) |
| `configure-workspace` | `configure: cadence balanced, …` | Today / Settings | strip, chip |
| `add-note` | `add note: …` | Any | chip (rows) |
| `add-contact` | `add contact: …` | Pipeline / Today | strip |
| `update-contact` | `update contact: …` | Today | chip (contacts) |
| `pipeline-health` | `pipeline health` | Pipeline | strip, chip |
| `update-opportunity` | `update opportunity to proposal` | Pipeline | strip, chip |
| `archive-opportunity` | `archive opportunity` | Pipeline | strip (first active opportunity) |
| `restore-opportunity` | `restore opportunity` | Pipeline | strip (first archived) |
| `add-outreach-draft` | `draft outreach: …` | Pipeline | strip, chip |
| `add-content` | `add content: …` | Brand | strip |
| `update-content` | `update content: …` | Brand | Chat (first active item in engine) |
| `duplicate-content` | `duplicate content` | Brand | strip (first active item) |
| `archive-content` | `archive content` | Brand | strip (first active item) |
| `add-publishing-draft` | `draft post: …` | Brand | strip, chip |
| `update-publishing` | `update publishing: …` | Brand | chip (rows) |
| `reschedule-publishing` | `reschedule posts to …` | Brand | strip, chip |
| `add-integration-source` | `add source: …` / `connect notion source: …` | Connections | strip, prime |
| `add-integration-artifact` | `add artifact: …` | Connections | strip, prime |
| `add-ssh-target` | `add ssh target: …` | Connections | strip, prime |

**Note:** Several handlers (duplicate/archive content, archive/restore opportunity, complete follow-up) operate on the **first matching workspace item** in engine order, not on arbitrary row ids. Row chips that **prime** Chat use row labels for composer context; **run** actions from the strip match the engine contract.
