/**
 * Builder capability ids, derived from the canonical registry.
 *
 * This module used to carry its **own** definitions for all 19 builder
 * capabilities — id, tool name, tier, access and description — alongside the
 * ones in `interop/capabilityRegistry.ts`. Two lists, one of which is what the
 * gateway actually enforces.
 *
 * They drifted, and not cosmetically:
 *
 * | capability | this list said | the registry enforced |
 * |---|---|---|
 * | `builder.achievements.verify` | `approval` | **`auto`** |
 * | `builder.twin-proposals.accept` | `approval` | **`auto`** |
 * | `builder.sessions.revoke` | `EXTERNAL_ACTION` | `SENSITIVE_ACTION` |
 *
 * The first two are promote operations — verifying an agent-reported achievement
 * into professional evidence, and writing an accepted proposal into the Digital
 * Twin. Running them as `auto` meant an external agent holding the grant could
 * **accept its own Twin proposal**, which is precisely what the directive's
 * fourth invariant forbids: *propose, never promote.* This file documented the
 * correct rule the whole time, in a place nothing consulted, while the file that
 * does the enforcing said otherwise.
 *
 * So there is one list now. Ids are derived from the registry, and a builder
 * capability that is not registered simply does not exist.
 */
import type { AgentCapabilityDefinition } from '../../types/agentInterop';
import {
  AGENT_CAPABILITY_DEFINITIONS,
  AGENT_CAPABILITY_REGISTRY
} from '../../services/interop/capabilityRegistry';
import type { AgentCapabilityId } from '../../types/agentInterop';

export type BuilderCapabilityId = Extract<AgentCapabilityId, `builder.${string}`>;

const isBuilder = (id: AgentCapabilityId): id is BuilderCapabilityId => id.startsWith('builder.');

/** The builder slice of the canonical registry. Not a second source of truth. */
export const BUILDER_AGENT_CAPABILITY_DEFINITIONS: readonly AgentCapabilityDefinition[] =
  AGENT_CAPABILITY_DEFINITIONS.filter((def) => isBuilder(def.id));

export function getBuilderCapability(id: BuilderCapabilityId): AgentCapabilityDefinition {
  return AGENT_CAPABILITY_REGISTRY[id];
}

export function isBuilderCapabilityId(value: string): value is BuilderCapabilityId {
  return (
    Object.prototype.hasOwnProperty.call(AGENT_CAPABILITY_REGISTRY, value) &&
    value.startsWith('builder.')
  );
}

export function builderToolNameToCapabilityId(toolName: string): BuilderCapabilityId | null {
  const match = BUILDER_AGENT_CAPABILITY_DEFINITIONS.find((def) => def.toolName === toolName);
  return match && isBuilder(match.id) ? match.id : null;
}
