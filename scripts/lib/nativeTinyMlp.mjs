/**
 * Fully in-repo “native” toy MLP: hash embedding → segment self-attention pooling → ReLU MLP → softmax.
 * Context is pipe-separated tokens (profile, resume, pipeline, publish queue, traces, …).
 * No external ML runtime; weights live in scripts/data/native-mlp-weights.json after train.
 */

import { coerceArtifactBlob } from './nativeArtifactUtils.mjs';

export const LABELS = ['settings', 'pipeline', 'content', 'other', 'collaboration'];
export const INPUT_DIM = 32;
export const HIDDEN_DIM = 24;
/** Max `|` delimited segments attending into the utterance embedding (employee-AI context slots). */
export const MAX_CONTEXT_SEGMENTS = 96;

/** Deterministic text → normalized feature vector */
export function hashEmbed(text, dim = INPUT_DIM) {
  const v = new Float64Array(dim);
  const t = String(text).toLowerCase();
  for (let i = 0; i < t.length; i++) {
    const c = t.charCodeAt(i);
    const idx = (c * 31 + i * 17) % dim;
    v[idx] += Math.tanh(c / 255 + i * 0.01);
  }
  let norm = 0;
  for (let i = 0; i < dim; i++) norm += v[i] * v[i];
  norm = Math.sqrt(norm) + 1e-8;
  for (let i = 0; i < dim; i++) v[i] /= norm;
  return Array.from(v);
}

/** Legacy single-blob fusion (uniform context vector). Prefer {@link hashEmbedWithSegmentAttention}. */
export function hashEmbedWithProfile(text, profileBlob, dim = INPUT_DIM) {
  const base = hashEmbed(text, dim);
  const pb = coerceArtifactBlob(profileBlob);
  if (!pb) return base;
  const prof = hashEmbed(pb, dim);
  const alpha = 0.42;
  const fused = base.map((v, i) => Math.tanh(v + alpha * prof[i]));
  let norm = 0;
  for (let i = 0; i < fused.length; i++) norm += fused[i] * fused[i];
  norm = Math.sqrt(norm) + 1e-8;
  return fused.map((v) => v / norm);
}

function softmaxAttentionVec(logits) {
  const max = Math.max(...logits);
  const ex = logits.map((z) => Math.exp(Math.min(40, z - max)));
  const sum = ex.reduce((a, b) => a + b, 0) + 1e-12;
  return ex.map((e) => e / sum);
}

/**
 * Single-head scaled dot-product attention: query = utterance, keys/values = per-segment hashes.
 * Mimics a tiny transformer context block without learned QKV matrices (fully deterministic).
 */
export function hashEmbedWithSegmentAttention(text, profileBlob, dim = INPUT_DIM) {
  const pb = coerceArtifactBlob(profileBlob);
  if (!pb) return hashEmbed(text, dim);

  const segs = pb
    .split(/\s*\|\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_CONTEXT_SEGMENTS);

  const query = hashEmbed(text, dim);
  if (segs.length === 0) return query;

  const valueEmbeddings = segs.map((s) => hashEmbed(s, dim));
  const sqrtDim = Math.sqrt(dim);
  const dots = valueEmbeddings.map((v) => {
    let d = 0;
    for (let i = 0; i < dim; i++) d += query[i] * v[i];
    return d / sqrtDim;
  });
  const w = softmaxAttentionVec(dots);

  const ctx = new Float64Array(dim);
  for (let i = 0; i < segs.length; i++) {
    for (let j = 0; j < dim; j++) ctx[j] += w[i] * valueEmbeddings[i][j];
  }

  const alpha = 0.42;
  const fused = query.map((q, j) => Math.tanh(q + alpha * ctx[j]));
  let norm = 0;
  for (let j = 0; j < dim; j++) norm += fused[j] * fused[j];
  norm = Math.sqrt(norm) + 1e-8;
  return fused.map((x) => x / norm);
}

export function relu(x) {
  return x.map((v) => Math.max(0, v));
}

export function matVec(W, x, b) {
  const out = new Float64Array(W[0].length);
  for (let j = 0; j < W[0].length; j++) {
    let s = b[j];
    for (let i = 0; i < x.length; i++) s += W[i][j] * x[i];
    out[j] = s;
  }
  return Array.from(out);
}

export function softmax(logits) {
  const max = Math.max(...logits);
  const ex = logits.map((z) => Math.exp(Math.min(80, z - max)));
  const sum = ex.reduce((a, b) => a + b, 0) + 1e-12;
  return ex.map((e) => e / sum);
}

/** Xavier-ish init */
export function randomWeights(seed, inputDim, hidden, classes) {
  const rng = mulberry32(seed);
  const rand = () => rng() * 2 - 1;
  const scale1 = Math.sqrt(2 / (inputDim + hidden));
  const scale2 = Math.sqrt(2 / (hidden + classes));
  const W1 = Array.from({ length: inputDim }, () =>
    Array.from({ length: hidden }, () => rand() * scale1)
  );
  const b1 = Array.from({ length: hidden }, () => rand() * scale1 * 0.1);
  const W2 = Array.from({ length: hidden }, () =>
    Array.from({ length: classes }, () => rand() * scale2)
  );
  const b2 = Array.from({ length: classes }, () => rand() * scale2 * 0.1);
  return { W1, b1, W2, b2, meta: { inputDim, hidden, labels: LABELS } };
}

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function forward(weights, text, profileBlob = '') {
  const x = hashEmbedWithSegmentAttention(text, profileBlob, weights.meta.inputDim);
  const z1 = matVec(weights.W1, x, weights.b1);
  const h = relu(z1);
  const logits = matVec(weights.W2, h, weights.b2);
  const probs = softmax(logits);
  let best = 0;
  for (let i = 1; i < probs.length; i++) if (probs[i] > probs[best]) best = i;
  return {
    embeddingPreview: x.slice(0, 4).map((n) => Number(n.toFixed(4))),
    logits: logits.map((n) => Number(n.toFixed(4))),
    probs: probs.map((n) => Number(n.toFixed(6))),
    labelIndex: best,
    label: weights.meta.labels[best]
  };
}

/** One step backprop for CE + softmax; returns grads */
export function trainStep(weights, text, labelIndex, lr, profileBlob = '') {
  const x = hashEmbedWithSegmentAttention(text, profileBlob, weights.meta.inputDim);
  const z1 = matVec(weights.W1, x, weights.b1);
  const h = relu(z1);
  const logits = matVec(weights.W2, h, weights.b2);
  const probs = softmax(logits);

  const dLogits = probs.slice();
  dLogits[labelIndex] -= 1;

  const dW2 = Array.from({ length: h.length }, () => new Float64Array(weights.meta.labels.length));
  const db2 = new Float64Array(weights.meta.labels.length);
  for (let j = 0; j < h.length; j++) {
    for (let k = 0; k < dLogits.length; k++) {
      dW2[j][k] = h[j] * dLogits[k];
    }
  }
  for (let k = 0; k < dLogits.length; k++) db2[k] = dLogits[k];

  const dh = new Float64Array(h.length);
  for (let j = 0; j < h.length; j++) {
    let s = 0;
    for (let k = 0; k < weights.W2[j].length; k++) s += weights.W2[j][k] * dLogits[k];
    dh[j] = z1[j] > 0 ? s : 0;
  }

  const dW1 = Array.from({ length: x.length }, () => new Float64Array(weights.W1[0].length));
  const db1 = new Float64Array(weights.W1[0].length);
  for (let i = 0; i < x.length; i++) {
    for (let j = 0; j < dh.length; j++) {
      dW1[i][j] = x[i] * dh[j];
    }
  }
  for (let j = 0; j < dh.length; j++) db1[j] = dh[j];

  for (let i = 0; i < weights.W1.length; i++) {
    for (let j = 0; j < weights.W1[0].length; j++) {
      weights.W1[i][j] -= lr * dW1[i][j];
    }
  }
  for (let j = 0; j < weights.b1.length; j++) weights.b1[j] -= lr * db1[j];
  for (let j = 0; j < weights.W2.length; j++) {
    for (let k = 0; k < weights.W2[0].length; k++) {
      weights.W2[j][k] -= lr * dW2[j][k];
    }
  }
  for (let k = 0; k < weights.b2.length; k++) weights.b2[k] -= lr * db2[k];

  let loss = 0;
  for (let k = 0; k < probs.length; k++) {
    loss -= k === labelIndex ? Math.log(probs[k] + 1e-12) : 0;
  }
  return loss;
}

export function trainEpoch(weights, samples, lr) {
  let total = 0;
  for (const s of samples) {
    const pb = typeof s.profileBlob === 'string' ? s.profileBlob : '';
    total += trainStep(weights, s.text, s.labelIndex, lr, pb);
  }
  return total / samples.length;
}

export function evaluateAccuracy(weights, samples) {
  let ok = 0;
  for (const s of samples) {
    const pb = typeof s.profileBlob === 'string' ? s.profileBlob : '';
    const { labelIndex: pred } = forward(weights, s.text, pb);
    if (pred === s.labelIndex) ok++;
  }
  return ok / samples.length;
}
