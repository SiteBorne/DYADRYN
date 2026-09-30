import { RULES } from "./rules.generated.js";
// Reference deterministic PRNG.
// Match seed itself should be generated cryptographically and committed/revealed.
// This small generator is only for stable, reproducible per-effect jitter.

export function fnv1a32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function xorshift32(seed: number): () => number {
  let x = seed || 0x9e3779b9;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    return x / 0x100000000;
  };
}

export function jitter(matchSeed: string, key: string): number {
  const rand = xorshift32(fnv1a32(`${matchSeed}|${key}`));
  return (
    RULES.rng.jitter_min +
    rand() * (RULES.rng.jitter_max - RULES.rng.jitter_min)
  );
}
