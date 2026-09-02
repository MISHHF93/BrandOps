/**
 * One tokenizer and one stopword list for relevance scoring.
 *
 * There were two. `contextRetrieval.ts` filtered stopwords; `evidenceSearch.ts`
 * did not, and only rejected a hit when its score was exactly zero. So the claim
 * *"flew to the moon last tuesday"* matched a shipped-gateway achievement on the
 * token **"the"** — score 0.2 — and the evidence tool returned it as support.
 *
 * That is the failure the evidence surface exists to prevent. An agent asking
 * "what evidence supports this claim?" was being handed unrelated records with
 * provenance attached, which is more dangerous than returning nothing: it looks
 * like grounding.
 *
 * Lexical and explainable on purpose. An agent citing evidence should be able to
 * see *why* a hit matched, and a lexical score never invents a semantic
 * relationship it cannot show.
 */

/**
 * Words that carry no claim-specific meaning. A match on one of these is a
 * coincidence of English, not a relationship between a claim and a record.
 */
const STOPWORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'this',
  'that',
  'from',
  'your',
  'you',
  'are',
  'was',
  'were',
  'been',
  'have',
  'has',
  'had',
  'not',
  'but',
  'its',
  'about',
  'into',
  'what',
  'when',
  'where',
  'how',
  'which',
  'will',
  'would',
  'can',
  'could',
  'should',
  'our',
  'their',
  'them',
  'they',
  'there',
  'last',
  'next',
  'any',
  'all',
  'some',
  'more',
  'most',
  'than',
  'then',
  'over',
  'under',
  'each',
  'also',
  'just',
  'only',
  'very',
  'been',
  'does',
  'did',
  'doing',
  'done'
]);

/** Tokens worth scoring: three or more characters, not a stopword. */
export function relevanceTokens(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

/**
 * Fraction of meaningful claim tokens present in the text.
 *
 * An empty query scores a flat 0.25 — "show me anything" is a browse, not a
 * claim, and browsing should return recent records rather than nothing.
 */
export function relevanceOverlap(tokens: readonly string[], haystack: string): number {
  if (!tokens.length) return 0.25;
  const text = haystack.toLowerCase();
  let matched = 0;
  for (const token of tokens) {
    if (text.includes(token)) matched += 1;
  }
  return matched / tokens.length;
}

/**
 * Minimum overlap for a record to be offered as *evidence for a claim*.
 *
 * A single incidental token out of many is not support. The threshold is
 * deliberately modest — evidence search should still surface partial matches a
 * person can judge — but it has to exclude the case where one common word does
 * all the work.
 */
export const EVIDENCE_RELEVANCE_FLOOR = 0.34;
