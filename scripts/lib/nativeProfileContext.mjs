/**
 * Build a compact profile blob for native toy NL fusion (offline only).
 */
import { asNonNullStr } from './nativeArtifactUtils.mjs';
import { extractWorkContextSegments, summarizeNativeWorkArtifacts } from './nativeWorkContext.mjs';

/** Append fused `resume:…` chunk (matches buildNativeProfileBlob) without rebuilding full blob. */
export function appendResumeArtifactToProfileBlob(profileBlob, rawResumeArtifact) {
  const art = asNonNullStr(rawResumeArtifact).slice(0, 1200);
  if (!art) return asNonNullStr(profileBlob);
  const chunk = `resume:${art}`;
  const base = asNonNullStr(profileBlob);
  return base ? `${base} | ${chunk}` : chunk;
}

export function buildNativeProfileBlob(parts) {
  const chunks = [];
  const push = (prefix, v) => {
    const t = asNonNullStr(v).slice(0, 280);
    if (t) chunks.push(`${prefix}:${t}`);
  };
  push('operator', parts.operatorName);
  push('role', parts.roleContext);
  push('focus', parts.focusMetric);
  push('offer', parts.primaryOffer);
  push('voice', parts.voiceGuide);
  push('positioning', parts.positioning);
  const promptHint = asNonNullStr(parts.promptTemplateHint).slice(0, 160);
  if (promptHint) push('prompt', promptHint);
  const rt = asNonNullStr(parts.resumeArtifact).slice(0, 1200);
  if (rt) chunks.push(`resume:${rt}`);
  return chunks.join(' | ');
}

/** Coverage counts for CLI / tests — never returns null fields. */
export function buildNativeArtifactRunTrace(data, resumeArtifact, profileBlob) {
  const blob = asNonNullStr(profileBlob);
  const resume = asNonNullStr(resumeArtifact);
  const workStats =
    data && typeof data === 'object'
      ? summarizeNativeWorkArtifacts(data)
      : { segmentCount: 0, byPrefix: {} };
  const profileOnly =
    data && typeof data === 'object' ? extractNativeProfileFromWorkspaceExport(data, resume) : '';
  const profileSegments = profileOnly ? profileOnly.split(/\s*\|\s*/).filter(Boolean).length : 0;
  const totalPipeSegments = blob ? blob.split(/\s*\|\s*/).filter(Boolean).length : 0;
  return {
    resumeArtifactChars: resume.length,
    profileSegmentsFromExport: profileSegments,
    workMemory: workStats,
    totalPipeSegmentsInBlob: totalPipeSegments
  };
}

/** Pull profile fields from a BrandOps workspace JSON export (`storage.exportData`). */
export function extractNativeProfileFromWorkspaceExport(data, resumeArtifact = '') {
  if (!data || typeof data !== 'object') return '';
  const brand = data.brand && typeof data.brand === 'object' ? data.brand : {};
  const nc =
    data.settings?.notificationCenter && typeof data.settings.notificationCenter === 'object'
      ? data.settings.notificationCenter
      : {};
  const pt = asNonNullStr(nc.promptTemplate).slice(0, 160);
  /** Workspace Phase R (extension Settings); `--resume` file artifact wins when both exist. */
  const storedPhaseR = asNonNullStr(nc.resumeNeuralPhaseContext).slice(0, 1200);
  const ra = asNonNullStr(resumeArtifact).slice(0, 1200);
  const resumeMerged = ra || storedPhaseR;
  return buildNativeProfileBlob({
    operatorName: brand.operatorName,
    positioning: brand.positioning,
    primaryOffer: brand.primaryOffer,
    voiceGuide: brand.voiceGuide,
    focusMetric: brand.focusMetric,
    roleContext: nc.roleContext,
    promptTemplateHint: pt || undefined,
    resumeArtifact: resumeMerged || undefined
  });
}

/** Profile + resume + work-memory segments (`|` splits → segment-attention tokens in nativeTinyMlp). */
export function extractNativeEmployeeContextFromWorkspaceExport(data, resumeArtifact = '') {
  const profile = asNonNullStr(extractNativeProfileFromWorkspaceExport(data, resumeArtifact));
  const work = extractWorkContextSegments(data);
  if (!work.length) return profile;
  const workStr = work.join(' | ');
  return profile ? `${profile} | ${workStr}` : workStr;
}
