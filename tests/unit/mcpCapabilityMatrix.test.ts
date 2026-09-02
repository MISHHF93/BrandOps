/**
 * `BRANDOPS_MCP_CAPABILITY_MATRIX.md` is a directive deliverable: it documents
 * every exposed capability's authorization, tier, approval behavior and
 * arguments. It is also hand-maintained, which means it is a *claim about the
 * code* that nothing was checking.
 *
 * That is the same shape as the defects this suite keeps finding — a schema that
 * disagreed with its handler, a provenance reference nothing resolved, a gate
 * that compiled zero files. A document nobody verifies is documentation only
 * until the first time it is wrong, and then it is worse than nothing, because
 * it is trusted.
 *
 * So the matrix is now derived-checked rather than believed. It was accurate
 * when this test was written; the point is that it cannot quietly stop being.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { AGENT_CAPABILITY_DEFINITIONS } from '../../src/services/interop/capabilityRegistry';
import { listMcpTools } from '../../src/services/interop/mcp/server';

const MATRIX = readFileSync('BRANDOPS_MCP_CAPABILITY_MATRIX.md', 'utf8');

const TOOL_CAPABILITIES = AGENT_CAPABILITY_DEFINITIONS.filter(
  (def): def is typeof def & { toolName: string } => Boolean(def.toolName)
);

interface MatrixRow {
  capabilityId: string;
  toolName: string;
  tier: string;
  approval: string;
  access: string;
  /** Every backticked identifier in the "Required args" cell. */
  requiredArgs: Set<string>;
}

/** Parses the capability table. A row is a line whose first cell is a known id. */
function parseRows(): Map<string, MatrixRow> {
  const rows = new Map<string, MatrixRow>();
  for (const line of MATRIX.split('\n')) {
    const cells = line.split('|').map((cell) => cell.trim());
    if (cells.length < 10) continue;
    const capabilityId = /^`(.+)`$/.exec(cells[1])?.[1];
    if (!capabilityId || !TOOL_CAPABILITIES.some((def) => def.id === capabilityId)) continue;
    rows.set(capabilityId, {
      capabilityId,
      toolName: /^`(.+)`$/.exec(cells[2])?.[1] ?? '',
      tier: cells[3],
      approval: cells[4],
      access: cells[5],
      requiredArgs: new Set([...cells[7].matchAll(/`([^`]+)`/g)].map((m) => m[1]))
    });
  }
  return rows;
}

describe('capability matrix is derived, not believed', () => {
  const rows = parseRows();

  it('documents every capability the registry exposes, and nothing it does not', () => {
    const documented = [...rows.keys()].sort();
    const exposed = TOOL_CAPABILITIES.map((def) => def.id).sort();
    // A missing row is an undocumented capability; an orphan row is a tool the
    // matrix promises and the server does not serve. Both mislead a reader.
    expect(documented).toEqual(exposed);
  });

  it('states the same tool name, tier, approval mode and access as the registry', () => {
    const drift: string[] = [];
    for (const def of TOOL_CAPABILITIES) {
      const row = rows.get(def.id);
      if (!row) continue;
      if (row.toolName !== def.toolName) {
        drift.push(`${def.id}: tool "${row.toolName}" ≠ "${def.toolName}"`);
      }
      if (row.tier !== def.tier) drift.push(`${def.id}: tier "${row.tier}" ≠ "${def.tier}"`);
      const approval = def.access === 'approval' ? 'approval-gated' : 'auto';
      if (row.approval !== approval) {
        drift.push(`${def.id}: approval "${row.approval}" ≠ "${approval}"`);
      }
      const access = def.readOnly ? 'read' : 'write';
      if (row.access !== access) {
        drift.push(`${def.id}: access "${row.access}" ≠ readOnly=${def.readOnly}`);
      }
    }
    expect(drift, `Matrix drifted from the registry:\n  ${drift.join('\n  ')}`).toEqual([]);
  });

  it('lists exactly the arguments each tool actually requires', () => {
    const tools = new Map(listMcpTools().map((tool) => [tool.name, tool]));
    const drift: string[] = [];
    for (const def of TOOL_CAPABILITIES) {
      const row = rows.get(def.id);
      const tool = tools.get(def.toolName);
      if (!row || !tool) continue;
      // `required`, plus every `anyOf` alternative — a "one of these two ids"
      // rule is part of what a caller must supply.
      const actual = new Set([
        ...tool.inputSchema.required,
        ...(tool.inputSchema.anyOf ?? []).flatMap((branch) => branch.required)
      ]);
      const missing = [...actual].filter((name) => !row.requiredArgs.has(name));
      const extra = [...row.requiredArgs].filter((name) => !actual.has(name));
      if (missing.length || extra.length) {
        drift.push(`${def.id}: documented [${[...row.requiredArgs]}] vs schema [${[...actual]}]`);
      }
    }
    expect(drift, `Required-args column drifted:\n  ${drift.join('\n  ')}`).toEqual([]);
  });

  it('states a capability count that matches the registry', () => {
    const stated = /(\d+) capabilities, (\d+) MCP tools/.exec(MATRIX);
    expect(stated, 'the matrix header should state its own baseline').toBeTruthy();
    // Swept by hand every time the surface grows, which is exactly why it is
    // worth checking rather than trusting.
    expect(Number(stated![1])).toBe(TOOL_CAPABILITIES.length);
    expect(Number(stated![2])).toBe(listMcpTools().length);
  });
});
