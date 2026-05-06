/**
 * Shared coercion for native artifact strings — never null/undefined in outputs.
 */

/** @param {unknown} v */
export function asNonNullStr(v) {
  if (v == null) return '';
  const s = String(v).trim();
  return s;
}

/** Blob passed into segment attention — never null; non-strings yield ''. */
export function coerceArtifactBlob(profileBlob) {
  if (profileBlob == null) return '';
  if (typeof profileBlob !== 'string') return '';
  return profileBlob.trim();
}

/** @param {unknown[]} parts */
export function joinArtifactParts(parts) {
  return parts.map((p) => asNonNullStr(p)).filter(Boolean).join(' · ');
}
