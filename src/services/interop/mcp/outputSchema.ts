/**
 * G18 — structured tool output.
 *
 * The spec is blunt about the obligation: *"If an output schema is provided:
 * Servers MUST provide structured results that conform to this schema."* So a
 * declared `outputSchema` is a promise, not documentation, and this module
 * exists to keep the promise checkable rather than merely stated.
 *
 * Two decisions shape everything below.
 *
 * **1. The envelope is the contract.** Every BrandOps tool returns the same
 * `AgentToolResult` envelope — `ok`, `capabilityId`, `data`, `checkpointIds`,
 * `auditEntryId`, and on failure `errorCode`. That envelope, not the payload, is
 * what a client actually needs to reason about: did it happen, was it gated on
 * approval, and what audit record proves it. It is declared exactly, including
 * the branch (`if ok === false then errorCode is required`) that the gateway
 * genuinely guarantees.
 *
 * **2. `data` is declared only as deeply as the handler actually guarantees.**
 * Where a gateway handler constructs an object literal, the shape is written
 * out. Where it forwards a service's return value, the schema names the
 * top-level keys and stops. Declaring item-level shapes we do not construct
 * would turn every downstream refactor into a silent spec violation, and a
 * schema that over-promises is worse than one that says less — the client
 * validates against it.
 *
 * Supported JSON Schema keywords are listed on `validateAgainstSchema`. This is
 * a deliberate subset, not a full draft-2020-12 implementation, and the schemas
 * here use only what it supports.
 */
import type { AgentCapabilityDefinition, AgentCapabilityId } from '../../../types/agentInterop';

export type JsonSchema = Record<string, unknown>;

const DIALECT = 'https://json-schema.org/draft/2020-12/schema';

const STR: JsonSchema = { type: 'string' };
const NUM: JsonSchema = { type: 'number' };
const BOOL: JsonSchema = { type: 'boolean' };
const STR_ARRAY: JsonSchema = { type: 'array', items: { type: 'string' } };
const OBJ_ARRAY: JsonSchema = { type: 'array', items: { type: 'object' } };
const OBJ: JsonSchema = { type: 'object' };

const described = (schema: JsonSchema, description: string): JsonSchema => ({
  ...schema,
  description
});

/** The protocol task projection returned by execution tools (see `mcp/tasks.ts`). */
const TASK_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    taskId: STR,
    status: {
      type: 'string',
      enum: ['working', 'input_required', 'completed', 'failed', 'cancelled']
    },
    statusMessage: STR,
    createdAt: STR,
    lastUpdatedAt: STR,
    // Null means "no expiry", which the Tasks extension permits — so the schema
    // has to permit it too rather than describing a task BrandOps never emits.
    ttlMs: { type: ['number', 'null'] },
    pollIntervalMs: NUM,
    inputRequests: described(OBJ, 'Present when the task is waiting on someone.'),
    result: described(OBJ, 'Present once completed: plan status, step counts, receipt id.'),
    error: described(OBJ, 'Present once failed: code and message.')
  },
  required: ['taskId', 'status', 'createdAt', 'lastUpdatedAt']
};

/** Trust tier is never something an agent gets to assert; it is stamped by BrandOps. */
const TRUST_TIER: JsonSchema = {
  type: 'string',
  enum: [
    'USER_VERIFIED',
    'BRANDOPS_VERIFIED',
    'AGENT_REPORTED',
    'EXTERNAL_SOURCE',
    'MODEL_INFERRED',
    'UNKNOWN'
  ]
};

interface DataContract {
  properties: Record<string, JsonSchema>;
  /** Keys the handler sets on *every* successful call. Optional keys are omitted. */
  required?: string[];
}

/**
 * Per-capability `data` contracts. Keyed by capability id because the registry —
 * not the tool name — is the source of truth; tools are a 1:1 projection of it.
 * A capability absent from this map declares an open `data` object: honest about
 * the envelope, silent about a payload we have not pinned down.
 */
const DATA_CONTRACTS: Partial<Record<AgentCapabilityId, DataContract>> = {
  'context.read': {
    properties: {
      bundles: described(
        OBJ_ARRAY,
        'One entry per granted context bundle, each carrying its items and provenance.'
      )
    },
    required: ['bundles']
  },
  'goals.read': {
    properties: {
      goals: {
        type: 'array',
        items: {
          type: 'object',
          properties: { id: STR, title: STR, status: STR, reason: STR },
          required: ['id', 'title', 'status', 'reason']
        }
      }
    },
    required: ['goals']
  },
  'artifacts.read': {
    properties: { artifacts: OBJ_ARRAY },
    required: ['artifacts']
  },
  'plans.read': {
    properties: {
      plan: {
        type: 'object',
        properties: {
          id: STR,
          title: STR,
          summary: STR,
          status: STR,
          planType: STR,
          objective: STR,
          steps: {
            type: 'array',
            items: { type: 'object', properties: { title: STR, status: STR } }
          },
          savedAt: STR
        },
        required: ['id', 'title', 'status', 'steps']
      }
    },
    required: ['plan']
  },
  'evidence.read': {
    properties: {
      claim: described(STR, 'The claim the search was run against.'),
      hits: described(OBJ_ARRAY, 'Evidence hits, each carrying its own provenance and trust tier.'),
      verifiedCount: NUM,
      agentReportedCount: described(
        NUM,
        'Hits that an agent asserted. Never counted as verified support.'
      ),
      limitations: described(STR_ARRAY, 'What this search could not see. Always populated.'),
      searchedSources: STR_ARRAY,
      generatedAt: STR
    },
    required: [
      'claim',
      'hits',
      'verifiedCount',
      'agentReportedCount',
      'limitations',
      'searchedSources',
      'generatedAt'
    ]
  },
  'authority.read': {
    properties: {
      topics: OBJ_ARRAY,
      gaps: OBJ_ARRAY,
      headline: STR,
      limitations: described(
        STR_ARRAY,
        'Always populated: this measures substantiation from owned evidence, not public reputation.'
      ),
      generatedAt: STR
    },
    required: ['topics', 'gaps', 'headline', 'limitations', 'generatedAt']
  },
  'next-best-actions.read': {
    properties: {
      actions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: STR,
            title: STR,
            detail: STR,
            urgency: STR,
            confidence: NUM,
            reason: STR,
            signals: STR_ARRAY,
            command: STR
          },
          required: ['id', 'title']
        }
      },
      headline: STR,
      stateLine: STR,
      urgentCount: NUM,
      approvalCount: NUM,
      generatedAt: STR
    },
    required: ['actions', 'headline', 'stateLine', 'urgentCount', 'approvalCount', 'generatedAt']
  },
  'voice.read': {
    properties: {
      toneOfVoice: STR,
      positioning: STR,
      targetAudience: STR,
      voiceExamples: described(
        STR_ARRAY,
        'The user’s own writing. Demonstration, not description.'
      ),
      highConfidenceClaims: STR_ARRAY,
      channel: STR,
      trustTier: TRUST_TIER,
      provenanceRef: STR,
      limitations: described(STR_ARRAY, 'Always present. Says what the profile cannot support.')
    },
    required: ['toneOfVoice', 'voiceExamples', 'highConfidenceClaims', 'trustTier', 'limitations']
  },
  'relationship.read': {
    properties: {
      name: STR,
      company: STR,
      role: STR,
      relationshipStage: { type: 'string', enum: ['new', 'building', 'trusted', 'partner'] },
      status: { type: 'string', enum: ['active', 'dormant', 'archived'] },
      lastContactAt: STR,
      outstanding: described(
        { type: ['string', 'null'] },
        'What the user still owes this contact, if anything.'
      ),
      followUpDate: { type: ['string', 'null'] },
      recentInteractions: {
        type: 'array',
        items: {
          type: 'object',
          properties: { title: STR, detail: STR, nextAction: STR, at: STR }
        }
      },
      provenanceRef: STR,
      limitations: STR_ARRAY
    },
    required: ['name', 'relationshipStage', 'recentInteractions', 'limitations']
  },
  'artifact.read': {
    properties: {
      artifact: {
        type: 'object',
        properties: {
          id: STR,
          kind: STR,
          title: STR,
          summary: STR,
          updatedAt: STR,
          provenanceRef: STR
        },
        required: ['id', 'kind', 'title', 'provenanceRef']
      }
    },
    required: ['artifact']
  },
  'receipts.read': {
    properties: {
      receipt: {
        type: 'object',
        properties: {
          id: STR,
          planId: STR,
          planType: STR,
          convertedFrom: STR,
          sourceMessageId: STR,
          generatedSteps: described(STR_ARRAY, 'Titles of the steps the conversion produced.'),
          userAction: {
            type: 'string',
            enum: ['save-plan', 'regenerate-preview', 'cancel-preview']
          },
          summary: STR,
          timestamp: STR
        },
        required: ['id', 'timestamp']
      }
    },
    required: ['receipt']
  },
  'execution.request': {
    properties: {
      proposalId: STR,
      taskId: described(STR, 'Durable task handle. Poll it with tasks/get or execution.read.'),
      task: TASK_SCHEMA,
      status: described(STR, 'First observable state is the approval boundary, not a running job.'),
      note: STR
    },
    required: ['taskId', 'status', 'note']
  },
  'execution.read': {
    properties: { task: TASK_SCHEMA },
    required: ['task']
  },
  'execution.cancel': {
    properties: { taskId: STR, task: TASK_SCHEMA, status: STR },
    required: ['taskId', 'status']
  },
  'outcome.report': {
    properties: {
      outcomeId: STR,
      dimension: STR,
      score: NUM,
      trustTier: described({ const: 'AGENT_REPORTED' }, 'Fixed. An agent cannot report verified.'),
      intent: STR,
      note: STR
    },
    required: ['dimension', 'trustTier', 'note']
  },
  'achievement.record': {
    properties: {
      eventId: STR,
      status: STR,
      trustTier: TRUST_TIER,
      deduplicated: BOOL,
      note: STR
    },
    required: ['eventId', 'status', 'trustTier', 'note']
  },
  'artifact.create': {
    properties: { proposalId: STR, status: { const: 'pending' } },
    required: ['status']
  },
  'twin.propose_update': {
    properties: { proposalId: STR, status: { const: 'pending' } },
    required: ['status']
  },
  'opportunity.create': {
    properties: { proposalId: STR, status: { const: 'pending' } },
    required: ['status']
  },
  'plan.convert': {
    properties: { planId: STR, title: STR, status: STR },
    required: ['planId', 'title', 'status']
  },
  'action.request': {
    properties: {
      proposalId: STR,
      status: { const: 'pending' },
      note: described(STR, 'Approval-gated. Nothing executes from this call.')
    },
    required: ['status', 'note']
  }
};

/**
 * The result envelope for one capability.
 *
 * `capabilityId` is a `const` rather than a `string`: a client that gets a
 * result back can tell from the schema alone whether it is looking at the
 * answer to the call it made.
 */
export function buildToolOutputSchema(
  def: AgentCapabilityDefinition & { toolName: string }
): JsonSchema {
  const contract = DATA_CONTRACTS[def.id];
  const dataSchema: JsonSchema = contract
    ? {
        type: 'object',
        properties: {
          ...contract.properties,
          sessionId: described(STR, 'Session the call was authorized against.')
        }
      }
    : described(OBJ, 'Capability payload. Shape is not pinned for this capability.');

  return {
    $schema: DIALECT,
    type: 'object',
    description: `Result envelope for ${def.toolName}. Every BrandOps tool returns this shape.`,
    properties: {
      ok: described(BOOL, 'Whether the capability ran. False for refusals and handler failures.'),
      capabilityId: { const: def.id },
      data: dataSchema,
      errorCode: described(
        STR,
        'Machine-readable refusal or failure reason. Present iff ok=false.'
      ),
      error: STR,
      approvalRequired: described(
        BOOL,
        'True when this capability may only ever produce an approval-gated request.'
      ),
      deduplicated: described(
        BOOL,
        'True when a replayed idempotency key returned a stored result.'
      ),
      checkpointIds: described(
        STR_ARRAY,
        'Checkpoints recorded for this call — the audit linkage.'
      ),
      auditEntryId: described(STR, 'Audit entry written for this call. Always recorded.')
    },
    required: ['ok', 'capabilityId', 'data', 'checkpointIds', 'auditEntryId'],
    /**
     * The one conditional worth declaring: a refusal always names itself. The
     * gateway has no path that returns `ok: false` without an `errorCode`, and a
     * client should be able to rely on that rather than string-matching `error`.
     */
    allOf: [
      {
        if: { properties: { ok: { const: false } }, required: ['ok'] },
        then: { required: ['errorCode'] }
      },
      {
        if: { properties: { ok: { const: true } }, required: ['ok'] },
        then: contract?.required?.length
          ? { properties: { data: { required: contract.required } } }
          : {}
      }
    ]
  };
}

export interface SchemaValidation {
  valid: boolean;
  errors: string[];
}

/**
 * Validates a value against the JSON Schema subset used by this module:
 * `type`, `const`, `enum`, `properties`, `required`, `additionalProperties`,
 * `items`, `anyOf`, `allOf`, and `if`/`then`/`else`.
 *
 * Unknown keywords are ignored rather than treated as failures — an unrecognized
 * constraint must not manufacture a violation that isn't there. This is not a
 * general-purpose validator and is not offered as one; it exists so that a
 * declared `outputSchema` is enforced at the point of emission instead of being
 * taken on trust.
 */
export function validateAgainstSchema(
  value: unknown,
  schema: JsonSchema,
  path = '$'
): SchemaValidation {
  const errors: string[] = [];

  const typeOf = (v: unknown): string => {
    if (v === null) return 'null';
    if (Array.isArray(v)) return 'array';
    if (Number.isInteger(v)) return 'integer';
    return typeof v;
  };

  const matchesType = (v: unknown, expected: string): boolean => {
    const actual = typeOf(v);
    if (expected === 'number') return actual === 'number' || actual === 'integer';
    if (expected === 'integer') return actual === 'integer';
    return actual === expected;
  };

  if (typeof schema.type === 'string' && !matchesType(value, schema.type)) {
    errors.push(`${path}: expected ${schema.type}, got ${typeOf(value)}`);
    return { valid: false, errors };
  }
  if (Array.isArray(schema.type) && !schema.type.some((t) => matchesType(value, String(t)))) {
    errors.push(`${path}: expected one of ${schema.type.join('|')}, got ${typeOf(value)}`);
    return { valid: false, errors };
  }

  if ('const' in schema && JSON.stringify(value) !== JSON.stringify(schema.const)) {
    errors.push(`${path}: expected const ${JSON.stringify(schema.const)}`);
  }

  if (
    Array.isArray(schema.enum) &&
    !schema.enum.some((candidate) => JSON.stringify(candidate) === JSON.stringify(value))
  ) {
    errors.push(`${path}: ${JSON.stringify(value)} is not one of ${JSON.stringify(schema.enum)}`);
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const object = value as Record<string, unknown>;
    const properties = (schema.properties as Record<string, JsonSchema> | undefined) ?? {};

    for (const key of (schema.required as string[] | undefined) ?? []) {
      if (!(key in object) || object[key] === undefined) {
        errors.push(`${path}.${key}: required property missing`);
      }
    }
    for (const [key, sub] of Object.entries(properties)) {
      if (key in object && object[key] !== undefined) {
        errors.push(...validateAgainstSchema(object[key], sub, `${path}.${key}`).errors);
      }
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(object)) {
        if (!(key in properties)) errors.push(`${path}.${key}: additional property not permitted`);
      }
    }
  }

  if (Array.isArray(value) && schema.items && typeof schema.items === 'object') {
    value.forEach((entry, index) => {
      errors.push(
        ...validateAgainstSchema(entry, schema.items as JsonSchema, `${path}[${index}]`).errors
      );
    });
  }

  if (Array.isArray(schema.anyOf)) {
    const branches = schema.anyOf as JsonSchema[];
    if (!branches.some((branch) => validateAgainstSchema(value, branch, path).valid)) {
      errors.push(`${path}: matched none of the anyOf branches`);
    }
  }

  for (const branch of (schema.allOf as JsonSchema[] | undefined) ?? []) {
    errors.push(...validateAgainstSchema(value, branch, path).errors);
  }

  if (schema.if && typeof schema.if === 'object') {
    const conditionMet = validateAgainstSchema(value, schema.if as JsonSchema, path).valid;
    const branch = conditionMet ? schema.then : schema.else;
    if (branch && typeof branch === 'object') {
      errors.push(...validateAgainstSchema(value, branch as JsonSchema, path).errors);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Strips `undefined` so what is validated is byte-identical to what serializes
 * onto the wire. Without this the validator would judge an object the client
 * will never see — `{ proposalId: undefined }` validates differently from the
 * `{}` that JSON.stringify actually produces.
 */
export function toWireValue<T>(value: T): unknown {
  return JSON.parse(JSON.stringify(value ?? null));
}
