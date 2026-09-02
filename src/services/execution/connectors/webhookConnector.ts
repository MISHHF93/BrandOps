/**
 * The first connector that actually does something.
 *
 * An outbound webhook: BrandOps POSTs the approved action to a URL the operator
 * configured. Deliberately the first one, for a reason worth stating — it is the
 * only external action that can be implemented *truthfully* here. Gmail, Slack
 * and CRM connectors need vendor credentials and a live account; writing them
 * without either would produce code that looks like a connector and has never
 * sent anything, which is the failure this whole cycle exists to correct.
 *
 * It is also genuinely useful rather than a placeholder: an incoming-webhook URL
 * is how Slack, Discord, Zapier, Make and most internal endpoints accept
 * automation. One working generic connector beats ten modelled specific ones.
 *
 * `fetchImpl` is injected so this module holds no ambient network dependency —
 * the same reason `mcp/client.ts` takes a transport. It keeps the connector
 * testable and keeps `fetch` out of code paths that should not reach the network.
 */
import type {
  ExternalActionConnector,
  ExternalActionRequest,
  ExternalActionResult
} from '../externalActionDispatch';

export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string }
) => Promise<{ ok: boolean; status: number; text: () => Promise<string> }>;

export interface WebhookConnectorOptions {
  /** Where approved actions are POSTed. Operator-configured, never agent-supplied. */
  url: string;
  fetchImpl: FetchLike;
  /** Actions this webhook is authorized to receive. */
  actions?: readonly string[];
  label?: string;
}

/** Only http(s), and never a credential in the URL. */
function validateUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return 'Webhook URL is not a valid URL.';
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return `Webhook URL must be http or https, not "${parsed.protocol}".`;
  }
  if (parsed.username || parsed.password) {
    return 'Webhook URL must not embed credentials.';
  }
  return null;
}

export function createWebhookConnector(options: WebhookConnectorOptions): ExternalActionConnector {
  const actions = options.actions ?? ['webhook-post', 'notify'];

  return {
    id: 'webhook',
    label: options.label ?? 'Outbound webhook',
    actions,
    async execute(request: ExternalActionRequest): Promise<ExternalActionResult> {
      /**
       * The connector enforces its own allowlist rather than trusting the
       * dispatcher to have matched first.
       *
       * `dispatchExternalAction` does match on `actions` before calling this, so
       * today nothing unauthorised arrives. That is the same reasoning that left
       * `approveAndDispatchExternalAction` dispatching without checking whether
       * the approval had been granted, and left one feed item of eight without
       * its lock: a guard that lives only in the caller is one the next caller
       * will not have. `execute` is reachable by anyone holding the connector,
       * and it is the last thing standing between a request and the network.
       */
      if (!actions.includes(request.action)) {
        return {
          ok: false,
          error: `This webhook is not registered to perform "${request.action}".`
        };
      }

      const invalid = validateUrl(options.url);
      if (invalid) return { ok: false, error: invalid };

      let response: Awaited<ReturnType<FetchLike>>;
      try {
        response = await options.fetchImpl(options.url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: request.action,
            target: request.target,
            summary: request.summary,
            proposalId: request.proposalId,
            source: 'brandops'
          })
        });
      } catch (error) {
        return {
          ok: false,
          error: `Webhook request failed: ${error instanceof Error ? error.message : String(error)}`
        };
      }

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        return {
          ok: false,
          error: `Webhook responded ${response.status}${body ? `: ${body.slice(0, 200)}` : ''}`
        };
      }

      /**
       * A 2xx is what the endpoint told us, and that is exactly how it is
       * recorded. It is delivery evidence, not proof the far side acted — the
       * dispatcher renders the difference rather than flattening both into
       * "verified".
       */
      return {
        ok: true,
        verification: `HTTP ${response.status} from ${new URL(options.url).host}`
      };
    }
  };
}
