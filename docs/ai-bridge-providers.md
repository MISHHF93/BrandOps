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

## Limitations (current client)

- Bearer token only; no provider OAuth in-app.
- Non-streaming HTTP; no SSE.
- No built-in Anthropic/Gemini-native protocols — use a gateway that exposes OpenAI-compatible routes if you need those backends.
