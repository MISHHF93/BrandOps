import { describe, expect, it } from 'vitest';
import { buildClaudeCodeMcpSnippet } from '../../src/services/interop/mcp/claudeConfig';

describe('buildClaudeCodeMcpSnippet', () => {
  it('embeds the token in the gateway env', () => {
    const snippet = buildClaudeCodeMcpSnippet('tok-abc123');
    expect(snippet).toContain('"BRANDOPS_MCP_TOKEN": "tok-abc123"');
    expect(snippet).toContain('"type": "stdio"');
    expect(snippet).toContain('"command": "npx"');
  });

  it('points BRANDOPS_MCP_WORKSPACE at the exported file when provided', () => {
    const snippet = buildClaudeCodeMcpSnippet('tok', {
      workspacePath: 'C:/workspace/brandops-export.json'
    });
    expect(snippet).toContain('"BRANDOPS_MCP_WORKSPACE": "C:/workspace/brandops-export.json"');
    expect(snippet).not.toContain('<path-to-exported-workspace.json>');
  });

  it('emits a placeholder workspace path when omitted', () => {
    const snippet = buildClaudeCodeMcpSnippet('tok');
    expect(snippet).toContain('"BRANDOPS_MCP_WORKSPACE": "<path-to-exported-workspace.json>"');
  });
});
