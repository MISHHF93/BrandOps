/**
 * Local-only bridge proxy launcher for full-stack verification.
 *
 * The production `bridge:proxy` script stays strict and still requires real
 * BRIDGE_* environment variables. This wrapper supplies harmless localhost
 * defaults so `GET /health` and webhook route wiring can be checked during
 * local demos without committing secrets.
 */
process.env.BRIDGE_SHARED_SECRET ||= 'local-dev-verification-secret';
process.env.BRIDGE_TARGET_URL ||= 'http://127.0.0.1:5173/agent-bridge';

await import('./bridge-proxy.mjs');
