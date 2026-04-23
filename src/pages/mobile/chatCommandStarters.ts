/**
 * Curated chat starters (same catalog as the composer) — see {@link getExampleGroupCommands} in
 * `chatIntents.ts`.
 */
import { getExampleGroupCommands } from './chatIntents';

export const CHAT_QUICK_STARTER_GROUPS = getExampleGroupCommands() as {
  id: string;
  label: string;
  commands: string[];
}[];
