/**
 * Plain-text résumé → compact artifact for hosted Ask "neural phasing".
 * Mirrors `scripts/lib/nativeResumeArtifacts.mjs` (`extractResumeArtifacts`) — keep both in sync when changing rules.
 */

const SECTION_HINT =
  /^(summary|objective|profile|experience|work history|employment|education|skills|technical skills|projects|certifications|languages|interests)\s*:?\s*$/i;

function asTrim(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/** Same trimming rules as `normalizeResumeText` in nativeResumeArtifacts.mjs — preserves internal newlines. */
export function normalizeResumeNeuralInput(raw: string): string {
  return (
    String(raw ?? '')
      .replace(/\r\n/g, '\n')
      // eslint-disable-next-line no-control-regex -- strip C0 controls except \t and \n
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
      .trim()
  );
}

function slimClause(s: string): string {
  return asTrim(s.replace(/[,;:]+$/, '')).slice(0, 160);
}

function looksLikeNoise(line: string): boolean {
  if (/^https?:\/\//i.test(line)) return true;
  if (/^[+]?[\d\s().-]{10,}$/.test(line)) return true;
  if (/^\S+@\S+\.\S+$/.test(line)) return true;
  return false;
}

function extractTechKeywords(text: string): string[] {
  const pool = text.toLowerCase();
  const catalog = [
    'typescript',
    'javascript',
    'python',
    'react',
    'node',
    'nlp',
    'natural language',
    'machine learning',
    'deep learning',
    'kubernetes',
    'docker',
    'aws',
    'gcp',
    'azure',
    'sql',
    'postgres',
    'graphql',
    'rust',
    'java',
    'c++',
    'swift',
    'kotlin',
    'tensorflow',
    'pytorch',
    'llm',
    'openai',
    'distributed systems',
    'systems design',
    'leadership',
    'product',
    'research'
  ];
  const found: string[] = [];
  for (const k of catalog) {
    if (pool.includes(k)) found.push(k);
  }
  return found;
}

function extractRoleHints(lines: string[]): string[] {
  const roles: string[] = [];
  const roleYear = /^(.{6,80}?)\s*[|,]\s*(19|20)\d{2}\s*[–-]\s*((19|20)\d{2}|present)/i;
  for (const line of lines) {
    const m = roleYear.exec(line);
    if (m?.[1]) roles.push(slimClause(m[1]));
  }
  return roles;
}

function uniq(arr: string[]): string[] {
  const s = new Set<string>();
  const out: string[] = [];
  for (const x of arr) {
    if (x == null) continue;
    const k = String(x).toLowerCase();
    if (!k || s.has(k)) continue;
    s.add(k);
    out.push(x);
  }
  return out;
}

function parseInternals(raw: string) {
  const text = normalizeResumeNeuralInput(raw);
  if (!text) {
    return {
      text: '',
      sections: [] as string[],
      bullets: [] as string[],
      techHits: [] as string[],
      datedRoles: [] as string[]
    };
  }

  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const bullets: string[] = [];
  const sections: string[] = [];

  for (const line of lines) {
    if (SECTION_HINT.test(line.replace(/\s+/g, ' '))) {
      const sec = line
        .replace(/[:：]\s*$/, '')
        .trim()
        .slice(0, 40);
      sections.push(sec.toLowerCase());
      continue;
    }
    const bullet = /^[-•*▪▸]\s+(.+)/.exec(line)?.[1] || /^\d+[.)]\s+(.+)/.exec(line)?.[1];
    if (bullet) {
      bullets.push(slimClause(bullet));
      continue;
    }
    if (line.length >= 12 && line.length <= 220 && !looksLikeNoise(line)) {
      bullets.push(slimClause(line));
    }
  }

  const techHits = extractTechKeywords(text);
  const datedRoles = extractRoleHints(lines);
  return { text, sections, bullets, techHits, datedRoles };
}

/** Same fused shape as native CLI resume artifact (pipe-separated facets). Default length matches `extractResumeArtifacts`. */
export function extractResumeNeuralPhaseArtifact(raw: string, maxLen = 1400): string {
  const p = parseInternals(raw);
  if (!p.text) return '';

  const merged = [
    p.sections.length ? `sections:${uniq(p.sections).slice(0, 8).join(';')}` : '',
    p.techHits.length ? `skills:${uniq(p.techHits).slice(0, 36).join(';')}` : '',
    p.datedRoles.length ? `roles:${uniq(p.datedRoles).slice(0, 10).join(';')}` : '',
    p.bullets.length ? `bullets:${uniq(p.bullets).slice(0, 24).join(' | ')}` : ''
  ]
    .filter(Boolean)
    .join(' | ');

  return merged.slice(0, maxLen).trim();
}
