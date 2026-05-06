# AI bridge: OpenAI-compatible providers

BrandOps calls **hosted** NLP over HTTPS using an **OpenAI-compatible** surface:

- Chat: `POST {inferenceBaseUrl}/chat/completions`
- Embeddings: `POST {embeddingBaseUrl}/embeddings` (or the same root as inference if `embeddingBaseUrl` is empty)

Configure **`settings.aiBridge`** (URLs + model IDs) in your workspace. Put the **API key** in extension storage key **`brandops_ai_openai_compat_key`** (`chrome.storage.local`) — never in exported workspace JSON.

Enable **`aiAdapterMode: external-opt-in`** so the client may call these endpoints (plus runtime policy `externalNlpHttpEnabled`).

## Base URL patterns

- **OpenAI**: `https://api.openai.com/v1`
- **Azure OpenAI**: `https://{resource}.openai.azure.com/openai/deployments/{deployment}` — your provider may require a path prefix; the client joins `chat/completions` and `embeddings` onto whatever you set as the base (ensure the deployed route matches).
- **LiteLLM / internal gateway**: root URL that proxies to `/v1/chat/completions` and `/v1/embeddings` shapes.

Trailing slashes on the base URL are fine.

## Assistant chat in the product

In **Assistant (mobile shell)**, prefix natural questions with **`ask:`** to route them through the hosted model. Plain lines without that prefix still use the deterministic workspace command engine.

## Chrome extension (`manifest.json`)

Extension HTML pages (`mobile.html`, `integrations.html`, …) send `fetch()` to your inference URLs. **`host_permissions`** in [`public/manifest.template.json`](../public/manifest.template.json) must include hosts you call; the template already allows **LinkedIn/GitHub/Google OAuth**, **OpenAI** (`api.openai.com`), and **Azure OpenAI** (`*.openai.azure.com`).

Using **LiteLLM**, **Groq**, **Together**, **OpenRouter**, etc.? Add matching `https://your-host/*` patterns to `host_permissions`, rebuild (`npm run build`), and reload the unpacked extension — otherwise Chrome can block requests before TLS (shown as **`net::ERR_BLOCKED_BY_CLIENT`** or **`TypeError: Failed to fetch`**), independent of HTTP 403.

## Hosted web (Vite/`mobile.html`)

The browser applies **normal CORS** rules. Calls from `localhost:5173` or your deploy origin straight to proprietary APIs often fail with CORS (not BrandOps routing). Prefer the **Chrome extension** shell for external NLP, or run a **same-origin proxy** (e.g. your own small backend) so the client only talks to your origin.

## HTTP 403 vs 401 (inference)

- **401**: invalid or missing Bearer key for that endpoint / org header.
- **403**: authenticated but **not allowed** (model not enabled for the key, org policy, IP allowlist, or regional restriction). The NLP gateway tries to paste the provider’s JSON `error.message` into the in-app banner when possible.

GitHub **`raw.githubusercontent.com`** for `VITE_INTELLIGENCE_RULES_URL` can respond **403** (rate limiting, referrer rules, private repo without token). Prefer a CDN URL or omit the env var so the app uses the bundled `brandops-intelligence-rules.json`.

## Intelligence rules bootstrap

On load, BrandOps tries `VITE_INTELLIGENCE_RULES_URL` then same-origin **`{BASE_URL}brandops-intelligence-rules.json`** (`import.meta.env.BASE_URL` supports GitHub Pages-style subpaths). In **dev**, a non-OK response logs a **`[BrandOps] …`** hint in the JavaScript console with the attempted URL.

## Limitations (current client)

- Bearer token only; no provider OAuth in-app.
- Non-streaming HTTP; no SSE.
- No built-in Anthropic/Gemini-native protocols — use a gateway that exposes OpenAI-compatible routes if you need those backends.
