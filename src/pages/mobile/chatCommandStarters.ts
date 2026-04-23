/**
 * Curated chat starters (same catalog as the composer) — see {@link getExampleGroupCommands} in
 * `chatIntents.ts`.
 */
import {
  getExampleGroupCommands,
  suggestIntents,
  getInputRouteHint,
  BRANDOPS_CHAT_INTENTS,
  getIntentByCommandLine
} from './chatIntents';

export { suggestIntents, getInputRouteHint, BRANDOPS_CHAT_INTENTS, getIntentByCommandLine };

export const CHAT_QUICK_STARTER_GROUPS = getExampleGroupCommands() as {
  id: string;
  label: string;
  commands: string[];
}[];

export const CHAT_QUICK_STARTERS_FLAT: readonly string[] = CHAT_QUICK_STARTER_GROUPS.flatMap(
  (g) => [...g.commands]
);
