/**
 * G14 — Resources: making `brandops://` provenance references resolvable.
 *
 * Every governed read already returns provenance. Evidence hits carry
 * `brandops://achievement/{id}`, context items carry `brandops://twin/{id}/…`,
 * the voice profile carries `brandops://twin/{id}/voice`, relationship context
 * carries `brandops://workspace/contact/{id}`. Fourteen distinct URI shapes,
 * handed to agents as the answer to "where did this come from" — and **nothing
 * resolved any of them.** Provenance you cannot follow is a citation to a book
 * with no library.
 *
 * Resources are that library. They are not a second data surface: each URI maps
 * to a capability that already exists, and reading one runs the same
 * `executeAgentToolCall` a tool call runs. Identity, policy, rate limit, audit —
 * all of it applies, because it is literally the same path. A resource is an
 * *address*, not an escape hatch.
 *
 * Two rules from the directive shape the surface:
 *
 * - **"Do not leak entire workspaces through broad resources."** So there is no
 *   `brandops://workspace/*` enumeration. `resources/list` returns only
 *   singletons — things there is exactly one of. Everything addressable by id is
 *   a *template*, which describes the shape without listing the contents.
 * - **Least privilege.** A session sees only the templates whose capability it
 *   holds, exactly as `tools/list` is scoped. The spec permits this explicitly:
 *   the resource set "MAY vary by the authorization presented on the request".
 */
import type { AgentCapabilityId } from '../../../types/agentInterop';
import type { BrandOpsData } from '../../../types/domain';
import { getActiveDigitalTwin } from '../../digitalTwin/digitalTwin';

/** What a `resources/read` resolves to: a capability call, never a raw lookup. */
export interface ResourceCall {
  toolName: string;
  args: Record<string, unknown>;
}

export interface BrandOpsResourceTemplate {
  uriTemplate: string;
  name: string;
  title: string;
  description: string;
  mimeType: string;
  capabilityId: AgentCapabilityId;
  /**
   * Parses a concrete URI into the call that answers it, or null.
   *
   * Each pattern is anchored and rejects `/`, so there is no path to join and
   * therefore no traversal to sanitize — the spec's "MUST sanitize file paths"
   * is satisfied by construction rather than by filtering.
   */
  match(uri: string): ResourceCall | null;
}

/** An id segment: no slashes, no dots-only, bounded. */
const ID = '([A-Za-z0-9._:@-]{1,200})';

const anchored = (pattern: string): RegExp => new RegExp(`^${pattern}$`);

export const RESOURCE_TEMPLATES: readonly BrandOpsResourceTemplate[] = [
  {
    uriTemplate: 'brandops://twin/{twinId}/voice',
    name: 'voice-profile',
    title: 'Brand voice profile',
    description:
      'The professional voice profile referenced by provenance on context items: tone, positioning, audience, the user’s own voice examples.',
    mimeType: 'application/json',
    capabilityId: 'voice.read',
    match(uri) {
      const m = anchored(`brandops://twin/${ID}/voice`).exec(uri);
      return m ? { toolName: 'brandops_get_voice', args: {} } : null;
    }
  },
  {
    uriTemplate: 'brandops://plan/{planId}',
    name: 'plan',
    title: 'Plan status',
    description: 'A saved plan: status, objective and steps.',
    mimeType: 'application/json',
    capabilityId: 'plans.read',
    match(uri) {
      const m = anchored(`brandops://plan/${ID}`).exec(uri);
      return m ? { toolName: 'brandops_get_plan_status', args: { planId: m[1] } } : null;
    }
  },
  {
    uriTemplate: 'brandops://receipt/{receiptId}',
    name: 'receipt',
    title: 'Execution receipt',
    description: 'What was requested, what happened, under whose approval, and the result.',
    mimeType: 'application/json',
    capabilityId: 'receipts.read',
    match(uri) {
      const m = anchored(`brandops://receipt/${ID}`).exec(uri);
      return m ? { toolName: 'brandops_get_receipt', args: { receiptId: m[1] } } : null;
    }
  },
  {
    uriTemplate: 'brandops://workspace/contact/{contactId}',
    name: 'relationship',
    title: 'Relationship context',
    description:
      'The working state of a professional relationship: stage, last contact, what is outstanding. Never the contact’s private notes.',
    mimeType: 'application/json',
    capabilityId: 'relationship.read',
    match(uri) {
      const m = anchored(`brandops://workspace/contact/${ID}`).exec(uri);
      return m
        ? { toolName: 'brandops_get_relationship_context', args: { contactId: m[1] } }
        : null;
    }
  },
  {
    /**
     * Deliberately last. `brandops://workspace/{id}` is the artifact provenance
     * shape, and it would also match `brandops://workspace/contact/x` if the
     * pattern allowed slashes — it does not, and the contact template is matched
     * first regardless.
     */
    uriTemplate: 'brandops://workspace/{artifactId}',
    name: 'artifact',
    title: 'Artifact',
    description: 'One artifact by the id that appears in search results and provenance references.',
    mimeType: 'application/json',
    capabilityId: 'artifact.read',
    match(uri) {
      const m = anchored(`brandops://workspace/${ID}`).exec(uri);
      return m ? { toolName: 'brandops_get_artifact', args: { artifactId: m[1] } } : null;
    }
  }
];

export interface McpResource {
  uri: string;
  name: string;
  title: string;
  description: string;
  mimeType: string;
  annotations?: { audience?: string[]; priority?: number; lastModified?: string };
}

export interface ResourceScopeOptions {
  /** Capabilities granted to the calling session. Absent means unscoped (in-app). */
  grantedCapabilities?: readonly AgentCapabilityId[];
}

const permits = (
  granted: readonly AgentCapabilityId[] | undefined,
  capabilityId: AgentCapabilityId
): boolean => !granted || granted.includes(capabilityId);

/** Templates the caller may actually read. Advertising the rest invites refusals. */
export function listResourceTemplates(
  options?: ResourceScopeOptions
): Array<Omit<BrandOpsResourceTemplate, 'match' | 'capabilityId'>> {
  return RESOURCE_TEMPLATES.filter((template) =>
    permits(options?.grantedCapabilities, template.capabilityId)
  ).map(({ match: _match, capabilityId: _capabilityId, ...rest }) => rest);
}

/**
 * Concrete resources — **singletons only**.
 *
 * There is exactly one voice profile, so it can be listed. There are many plans,
 * receipts, artifacts and contacts, and enumerating them here would hand a
 * client the shape of the whole workspace in one unauthenticated-feeling call.
 * Those are reachable by template, from an id the caller already legitimately
 * holds — usually a provenance reference we gave them.
 */
export function listResources(
  workspace: BrandOpsData,
  options?: ResourceScopeOptions
): McpResource[] {
  const out: McpResource[] = [];
  const twin = getActiveDigitalTwin(workspace);
  if (twin && permits(options?.grantedCapabilities, 'voice.read')) {
    out.push({
      uri: `brandops://twin/${twin.id}/voice`,
      name: 'voice-profile',
      title: 'Brand voice profile',
      description: 'Tone, positioning, audience and the user’s own voice examples.',
      mimeType: 'application/json',
      annotations: { audience: ['assistant'], priority: 0.8, lastModified: twin.updatedAt }
    });
  }
  return out;
}

export interface ResolvedResource {
  capabilityId: AgentCapabilityId;
  mimeType: string;
  call: ResourceCall;
}

/**
 * Resolves a URI to the capability call that answers it, or null when no
 * template matches. Null means "not a resource this server serves", which the
 * transport reports as `-32602` per the spec — never an empty `contents` array,
 * which the spec forbids precisely because it is ambiguous.
 */
export function resolveResourceUri(uri: string): ResolvedResource | null {
  if (typeof uri !== 'string' || uri.length > 512) return null;
  for (const template of RESOURCE_TEMPLATES) {
    const call = template.match(uri);
    if (call) {
      return { capabilityId: template.capabilityId, mimeType: template.mimeType, call };
    }
  }
  return null;
}

/**
 * Provenance authorities that identify *where a context item came from* without
 * being addressable resources.
 *
 * A scan of the live read surface found 39 distinct `brandops://` shapes being
 * emitted and 3 that resolved. That number sounds like a 36-item backlog, and it
 * is not: most of those references point at a *fragment* — one line of the twin's
 * positioning, one entry in the workspace DNA — rather than at an entity. Turning
 * each into a resource would mean 36 templates addressing sentences, which is
 * exactly the "leak the whole workspace through broad resources" the directive
 * forbids, arrived at one template at a time.
 *
 * So there are two kinds of `brandops://` reference and they are now named:
 *
 * - **Resource** — an address. Matches a template, resolvable via `resources/read`.
 * - **Reference** — an identifier. Says which part of which record a claim came
 *   from, so a *person* can audit it. Not fetchable, and not pretending to be.
 *
 * A client tells them apart the MCP-idiomatic way: anything matching a published
 * template is fetchable, anything else is a citation. This list exists so the
 * distinction is *reviewed* rather than accidental — `classifyProvenanceRef`
 * returns `unclassified` for a shape nobody has decided about, and a test drives
 * the whole read surface and fails when one appears.
 */
export const REFERENCE_ONLY_PROVENANCE_PREFIXES: readonly string[] = [
  // Twin fragments: a single identity/resume/memory field behind a context item.
  'brandops://twin/',
  // Workspace intelligence fragments: DNA, brand, operating manual, profession pack.
  'brandops://workspace/dna/',
  'brandops://workspace/brand/',
  'brandops://workspace/twin/',
  'brandops://workspace/profession/',
  'brandops://workspace/operatingManual/',
  'brandops://workspace/decisionMemory/',
  'brandops://workspace/opportunityRadar/',
  // Evidence-surface records, reachable today through `brandops_search_evidence`
  // rather than by id. Addressable resources for these are a real future step;
  // claiming them now would advertise reads that do not exist.
  'brandops://achievement/',
  'brandops://agent-event/',
  'brandops://activity/'
];

export type ProvenanceKind = 'resource' | 'reference' | 'unclassified';

/**
 * Whether a provenance reference is an address, a citation, or something nobody
 * has classified yet. `unclassified` is the interesting answer: it means a read
 * started emitting a shape that was never reviewed.
 */
export function classifyProvenanceRef(uri: string): ProvenanceKind {
  if (resolveResourceUri(uri)) return 'resource';
  if (REFERENCE_ONLY_PROVENANCE_PREFIXES.some((prefix) => uri.startsWith(prefix))) {
    return 'reference';
  }
  return 'unclassified';
}
