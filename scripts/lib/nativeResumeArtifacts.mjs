/**
 * Deterministic resume → compact artifact string for native toy NL fusion.
 * Not OCR/PDF parsing — feed plain text (.txt / pasted export). No vendor ML.
 */

import { asNonNullStr } from './nativeArtifactUtils.mjs';

const SECTION_HINT =
  /^(summary|objective|profile|experience|work history|employment|education|skills|technical skills|projects|certifications|languages|interests)\s*:?\s*$/i;

export function normalizeResumeText(raw) {
  return asNonNullStr(
    String(raw ?? '')
      .replace(/\r\n/g, '\n')
      // eslint-disable-next-line no-control-regex -- strip C0 controls except \t and \n
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
  );
}

/** Structured resume fields for JSON artifact packages (parallel to fused text). */
export function extractResumeArtifactRecord(raw) {
  const p = parseResumeArtifactInternals(raw);
  if (!p.text) {
    return {
      sections: [],
      skills: [],
      roles: [],
      bullets: [],
      fusedText: '',
      normalizedCharCount: 0
    };
  }
  return {
    sections: uniq(p.sections).slice(0, 8),
    skills: uniq(p.techHits).slice(0, 36),
    roles: uniq(p.datedRoles).slice(0, 10),
    bullets: uniq(p.bullets).slice(0, 24),
    fusedText: extractResumeArtifacts(raw),
    normalizedCharCount: p.text.length
  };
}

/** @returns {{ text: string, sections: string[], bullets: string[], techHits: string[], datedRoles: string[] }} */
function parseResumeArtifactInternals(raw) {
  const text = normalizeResumeText(raw);
  if (!text) {
    return { text: '', sections: [], bullets: [], techHits: [], datedRoles: [] };
  }

  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const bullets = [];
  const sections = [];

  for (const line of lines) {
    if (SECTION_HINT.test(line.replace(/\s+/g, ' '))) {
      const sec = line.replace(/[:：]\s*$/, '').trim().slice(0, 40);
      sections.push(sec.toLowerCase());
      continue;
    }
    const bullet =
      /^[-•*▪▸]\s+(.+)/.exec(line)?.[1] ||
      /^\d+[.)]\s+(.+)/.exec(line)?.[1];
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

/** Pull keyword-ish tokens (skills, tools, roles) from messy resume text. */
export function extractResumeArtifacts(raw, opts = {}) {
  const maxLen = opts.maxLen ?? 1400;
  const p = parseResumeArtifactInternals(raw);
  if (!p.text) return '';

  const merged = [
    p.sections.length ? `sections:${uniq(p.sections).slice(0, 8).join(';')}` : '',
    p.techHits.length ? `skills:${uniq(p.techHits).slice(0, 36).join(';')}` : '',
    p.datedRoles.length ? `roles:${uniq(p.datedRoles).slice(0, 10).join(';')}` : '',
    p.bullets.length ? `bullets:${uniq(p.bullets).slice(0, 24).join(' | ')}` : ''
  ]
    .filter(Boolean)
    .join(' | ');

  return asNonNullStr(merged.slice(0, maxLen));
}

function slimClause(s) {
  return asNonNullStr(s)
    .replace(/\s+/g, ' ')
    .replace(/[,;:]+$/, '')
    .trim()
    .slice(0, 160);
}

function looksLikeNoise(line) {
  if (/^https?:\/\//i.test(line)) return true;
  if (/^[+]?[\d\s().-]{10,}$/.test(line)) return true;
  if (/^\S+@\S+\.\S+$/.test(line)) return true;
  return false;
}

/** Conservative keyword scan — bullets still carry arbitrary vocabulary. */
function extractTechKeywords(text) {
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
  const found = [];
  for (const k of catalog) {
    if (pool.includes(k.trim())) found.push(k.trim());
  }
  return found;
}

/** Lines that look like title | years (very fuzzy). */
function extractRoleHints(lines) {
  const roles = [];
  const roleYear = /^(.{6,80}?)\s*[|,]\s*(19|20)\d{2}\s*[–-]\s*((19|20)\d{2}|present)/i;
  for (const line of lines) {
    const m = roleYear.exec(line);
    if (m && m[1]) roles.push(slimClause(m[1]));
  }
  return roles;
}

function uniq(arr) {
  const s = new Set();
  const out = [];
  for (const x of arr) {
    if (x == null) continue;
    const k = String(x).toLowerCase();
    if (!k || s.has(k)) continue;
    s.add(k);
    out.push(x);
  }
  return out;
}
