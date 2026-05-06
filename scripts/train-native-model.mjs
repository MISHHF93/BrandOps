#!/usr/bin/env node
/**
 * Trains nativeTinyMlp on scripts/data/native-mlp-corpus.json and writes weights JSON.
 *
 * Optional: --resume path/to/resume.txt — replaces corpus profile preset `resume_user`
 * with `resume:…` text from extractResumeArtifacts (plain text only).
 *
 * Weights bundle type `brandops.native_mlp.v2`: utterance embedding uses segment-scaled-dot
 * attention over `|` delimited context tokens (profile + work-memory slots).
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import {
  LABELS,
  INPUT_DIM,
  HIDDEN_DIM,
  randomWeights,
  trainEpoch,
  evaluateAccuracy
} from './lib/nativeTinyMlp.mjs';
import { extractResumeArtifacts } from './lib/nativeResumeArtifacts.mjs';

const root = process.cwd();
const corpusPath = path.join(root, 'scripts', 'data', 'native-mlp-corpus.json');
const outPath = path.join(root, 'scripts', 'data', 'native-mlp-weights.json');

function parseTrainArgs(argv) {
  let resume = null;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--resume' && argv[i + 1]) {
      resume = argv[++i];
      continue;
    }
    if (a.startsWith('--resume=')) {
      resume = a.slice('--resume='.length);
      continue;
    }
  }
  return { resume };
}

const trainOpts = parseTrainArgs(process.argv);

const raw = JSON.parse(fs.readFileSync(corpusPath, 'utf8'));
const presets = {
  ...(raw.profilePresets && typeof raw.profilePresets === 'object' ? raw.profilePresets : {})
};
if (trainOpts.resume) {
  const abs = path.isAbsolute(trainOpts.resume)
    ? trainOpts.resume
    : path.join(root, trainOpts.resume);
  const extracted = extractResumeArtifacts(fs.readFileSync(abs, 'utf8'));
  if (extracted) presets.resume_user = `resume:${extracted}`;
}
const labelToIndex = Object.fromEntries(LABELS.map((l, i) => [l, i]));

const samples = raw.samples.map((s) => {
  const labelIndex = labelToIndex[s.label];
  if (labelIndex === undefined) throw new Error(`Unknown label: ${s.label}`);
  let profileBlob = '';
  if (typeof s.profileBlob === 'string') profileBlob = s.profileBlob;
  else if (typeof s.profileBlobPreset === 'string') {
    profileBlob = presets[s.profileBlobPreset] || '';
    if (!profileBlob) throw new Error(`Unknown profileBlobPreset: ${s.profileBlobPreset}`);
  }
  return { text: s.text, labelIndex, profileBlob };
});

const weights = randomWeights(0xbeef1234, INPUT_DIM, HIDDEN_DIM, LABELS.length);

let lr = 0.08;
for (let epoch = 0; epoch < 400; epoch++) {
  const loss = trainEpoch(weights, samples, lr);
  const acc = evaluateAccuracy(weights, samples);
  if (epoch % 80 === 0 || epoch === 399) {
    console.log(`epoch ${epoch} loss=${loss.toFixed(4)} acc=${acc.toFixed(3)}`);
  }
  lr *= 0.997;
}

const finalAcc = evaluateAccuracy(weights, samples);
console.log(`\nFinal train accuracy: ${finalAcc.toFixed(3)}`);

if (finalAcc < 0.75) {
  console.warn('Warning: accuracy below 0.75 — corpus may need tuning.');
}

const payload = {
  type: 'brandops.native_mlp.v2',
  trainedAt: new Date().toISOString(),
  corpusPath: 'scripts/data/native-mlp-corpus.json',
  labels: LABELS,
  accuracyTrain: finalAcc,
  weights
};

fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`Wrote ${path.relative(root, outPath)}`);
