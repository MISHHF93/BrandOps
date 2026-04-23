/**
 * **LLM / AI readability (no ML training step):** Brand facts are passed as **plain UTF-8 text** with
 * explicit `Label: value` lines and optional `{{brand_*}}` template tokens. Any chat/completions model
 * can use them; you do not need a separate embedding or fine-tuned “brand model” as long as the prompt
 * includes this block (see `getBrandTemplateReplacements` + daily notification prompt assembly).
 */
import type { BrandProfile } from '../../types/domain';

const notSet = (s: string) => s || '(not set)';

/** One-line: collapse whitespace for short fields. */
export function escBrandField(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Longer free text: trim each line, drop empty lines, keep intentional newlines (e.g. brand voice).
 */
export function escBrandMultiline(s: string): string {
  return s
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0)
    .join('\n')
    .trim();
}

/**
 * Renders `BrandProfile` as explicit, labeled lines so LLMs and templates can map values to meaning
 * (e.g. operator name vs offer vs voice) without inferring from bare strings.
 */
export function formatBrandProfileForAi(brand: BrandProfile): string {
  const op = escBrandField(brand.operatorName) || '(not set)';
  const pos = escBrandMultiline(brand.positioning) || '(not set)';
  const off = escBrandMultiline(brand.primaryOffer) || '(not set)';
  const voice = escBrandMultiline(brand.voiceGuide) || '(not set)';
  const metric = escBrandField(brand.focusMetric) || '(not set)';

  const lines: string[] = [
    `Operator name (how to address this person): ${op}`,
    `Positioning (who they help / how they work): ${pos}`,
    `Primary offer (main product, package, or wedge): ${off}`,
    `Brand voice (tone, style, vocabulary, avoid): ${voice}`,
    `Focus metric (north-star number or phrase): ${metric}`
  ];
  return lines.join('\n');
}

/**
 * `{{...}}` tokens allowed in `notificationCenter.promptTemplate` for brand fields.
 * Keep in sync with {@link getBrandTemplateReplacements} (single source: that function).
 */
export const LLM_BRAND_TEMPLATE_TOKENS = [
  '{{brand_context}}',
  '{{brand_operator_name}}',
  '{{brand_positioning}}',
  '{{brand_primary_offer}}',
  '{{brand_voice_guide}}',
  '{{brand_focus_metric}}'
] as const;

export type LlmBrandTemplateToken = (typeof LLM_BRAND_TEMPLATE_TOKENS)[number];

/**
 * Map of template token → replacement string. Use with `String.prototype.replaceAll` in prompt assembly.
 * Values are human-readable, fixed-prefix lines so models cannot confuse operator name with offer, etc.
 */
export function getBrandTemplateReplacements(brand: BrandProfile): Record<LlmBrandTemplateToken, string> {
  return {
    '{{brand_context}}': formatBrandProfileForAi(brand),
    '{{brand_operator_name}}': notSet(escBrandField(brand.operatorName)),
    '{{brand_positioning}}': notSet(escBrandMultiline(brand.positioning)),
    '{{brand_primary_offer}}': notSet(escBrandMultiline(brand.primaryOffer)),
    '{{brand_voice_guide}}': notSet(escBrandMultiline(brand.voiceGuide)),
    '{{brand_focus_metric}}': notSet(escBrandField(brand.focusMetric))
  };
}
