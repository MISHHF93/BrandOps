#!/usr/bin/env node
/**
 * Run forward pass:
 *   node scripts/run-native-model.mjs [opts] <text...>
 *
 *   --workspace path/to/brandops-export.json   load operator + roleContext from export
 *   --profile "operator:..."                   explicit blob (overrides workspace profile)
 *   --resume path/to/resume.txt               plain-text resume → fused resume:… artifact
 *
 * Workspace loads profile + live work memory (pipeline, queue, drafts, traces, …) into
 * pipe-separated tokens for segment attention — “employee AI” context from the export.
 *
 * Optional: --trace-artifacts — print artifactCoverage alongside logits (counts / prefixes).
 * Optional: --structured-json — attach JSON artifact package (parallel graphs + fusion mirrors).
 *
 * With `--workspace` only (no `--resume`), fused résumé text comes from
 * `settings.operatorTwin.resumeArtifact` when set (same blob as hosted Ask operator twin block).
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { asNonNullStr, coerceArtifactBlob } from './lib/nativeArtifactUtils.mjs';
import {
  appendResumeArtifactToProfileBlob,
  buildNativeArtifactRunTrace,
  extractNativeEmployeeContextFromWorkspaceExport
} from './lib/nativeProfileContext.mjs';
import { extractResumeArtifacts } from './lib/nativeResumeArtifacts.mjs';
import { buildNativeStructuredArtifactPackage } from './lib/nativeStructuredArtifacts.mjs';
import { forward } from './lib/nativeTinyMlp.mjs';

const root = process.cwd();
const weightsPath = path.join(root, 'scripts', 'data', 'native-mlp-weights.json');

function parseArgs(argv) {
  const textParts = [];
  let workspace = null;
  let profile = null;
  let resume = null;
  let traceArtifacts = false;
  let structuredJson = false;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--trace-artifacts') {
      traceArtifacts = true;
      continue;
    }
    if (a === '--structured-json') {
      structuredJson = true;
      continue;
    }
    if (a === '--workspace' && argv[i + 1]) {
      workspace = argv[++i];
      continue;
    }
    if (a.startsWith('--workspace=')) {
      workspace = a.slice('--workspace='.length);
      continue;
    }
    if (a === '--profile' && argv[i + 1]) {
      profile = argv[++i];
      continue;
    }
    if (a.startsWith('--profile=')) {
      profile = a.slice('--profile='.length);
      continue;
    }
    if (a === '--resume' && argv[i + 1]) {
      resume = argv[++i];
      continue;
    }
    if (a.startsWith('--resume=')) {
      resume = a.slice('--resume='.length);
      continue;
    }
    textParts.push(a);
  }
  return {
    text: textParts.join(' ').trim(),
    workspace,
    profile,
    resume,
    traceArtifacts,
    structuredJson
  };
}

const { text, workspace, profile, resume, traceArtifacts, structuredJson } = parseArgs(
  process.argv
);
if (!text) {
  console.error(
    'Usage: node scripts/run-native-model.mjs [--workspace export.json] [--profile blob] [--resume resume.txt] [--trace-artifacts] [--structured-json] <text...>'
  );
  process.exit(1);
}

let resumeRawForStruct = '';
let resumeArtifact = '';
if (resume) {
  const abs = path.isAbsolute(resume) ? resume : path.join(root, resume);
  resumeRawForStruct = fs.readFileSync(abs, 'utf8');
  resumeArtifact = asNonNullStr(extractResumeArtifacts(resumeRawForStruct));
}

let workspaceData = null;
let profileBlob = '';
if (profile)
  profileBlob = resumeArtifact
    ? appendResumeArtifactToProfileBlob(coerceArtifactBlob(profile), resumeArtifact)
    : coerceArtifactBlob(profile);
else if (workspace) {
  const abs = path.isAbsolute(workspace) ? workspace : path.join(root, workspace);
  workspaceData = JSON.parse(fs.readFileSync(abs, 'utf8'));
  profileBlob = extractNativeEmployeeContextFromWorkspaceExport(workspaceData, resumeArtifact);
} else if (resumeArtifact) {
  profileBlob = appendResumeArtifactToProfileBlob('', resumeArtifact);
}

profileBlob = coerceArtifactBlob(profileBlob);

const twinResumeArtifact = workspaceData?.settings?.operatorTwin?.resumeArtifact;
const resumeFusedForTrace = resumeArtifact
  ? resumeArtifact
  : asNonNullStr(twinResumeArtifact ?? '')
      .trim()
      .slice(0, 1400);

const bundle = JSON.parse(fs.readFileSync(weightsPath, 'utf8'));
if (!bundle.weights) {
  console.error('Invalid weights file — run: npm run native:model:train');
  process.exit(1);
}

const out = forward(bundle.weights, text, profileBlob);

const payload = {
  input: text,
  profileBlobUsed: profileBlob,
  ...out,
  artifact: bundle.type
};
if (traceArtifacts) {
  payload.artifactCoverage = buildNativeArtifactRunTrace(
    workspaceData,
    resumeFusedForTrace,
    profileBlob
  );
}
if (structuredJson) {
  payload.structuredArtifacts = buildNativeStructuredArtifactPackage(workspaceData ?? {}, {
    resumeRaw: resumeRawForStruct,
    resumeFusedText: resumeFusedForTrace
  });
}

console.log(JSON.stringify(payload, null, 2));
