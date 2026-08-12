/**
 * Claude Code MCP server config snippet for the BrandOps gateway. Pure builder
 * so the panel and tests share one source of truth for the connect snippet.
 *
 * The gateway authenticates the bearer token against a workspace that contains
 * the matching session hash, so the snippet must also point `BRANDOPS_MCP_WORKSPACE`
 * at the workspace file exported from the Connected Agents panel.
 */
export function buildClaudeCodeMcpSnippet(
  token: string,
  options?: { workspacePath?: string }
): string {
  const envLines = [
    `      "BRANDOPS_MCP_TOKEN": "${token}"`,
    options?.workspacePath
      ? `      "BRANDOPS_MCP_WORKSPACE": "${options.workspacePath}"`
      : '      "BRANDOPS_MCP_WORKSPACE": "<path-to-exported-workspace.json>"'
  ];
  return `{
  "mcpServers": {
    "brandops": {
      "type": "stdio",
      "command": "npx",
      "args": ["tsx", "scripts/mcp-gateway.mjs"],
      "env": {
${envLines.join('\n')}
      }
    }
  }
}`;
}
