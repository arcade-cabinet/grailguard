/**
 * @module rng
 *
 * Deterministic seeded PRNG using the mulberry32 algorithm.
 * Produces repeatable random sequences from a numeric or string seed,
 * enabling reproducible wave generation, map layouts, and AI behavior.
 */

/**
 * Hashes a string into a 32-bit integer using the djb2 algorithm.
 *
 * @param str - The string to hash.
 * @returns A 32-bit unsigned integer hash.
 */
export function djb2Hash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

/** The public API of a seeded PRNG instance. */
export interface Rng {
  /** Returns a float in [0, 1). */
  next(): number;
  /** Returns an integer in [min, max] (inclusive). */
  nextInt(min: number, max: number): number;
  /** Returns a float in [min, max). */
  nextFloat(min: number, max: number): number;
  /** Creates a child PRNG with a deterministic sub-seed derived from the given label. */
  fork(label: string): Rng;
}

/**
 * Creates a seeded PRNG using the mulberry32 algorithm.
 *
 * Accepts either a numeric seed or a string seed (hashed via djb2).
 * The returned object provides methods for generating random numbers
 * and forking independent sub-generators.
 *
 * @param seed - A numeric seed or a string that will be hashed to a number.
 * @returns An {@link Rng} instance.
 *
 * @example
 * ```ts
 * const rng = createRng('my-run-seed');
 * const roll = rng.nextInt(1, 6);
 * const sub = rng.fork('wave-3');
 * ```
 */
export function createRng(seed: number | string): Rng {
  let state = typeof seed === 'string' ? djb2Hash(seed) : seed >>> 0;

  function mulberry32(): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function next(): number {
    return mulberry32();
  }

  function nextInt(min: number, max: number): number {
    return min + Math.floor(mulberry32() * (max - min + 1));
  }

  function nextFloat(min: number, max: number): number {
    return min + mulberry32() * (max - min);
  }

  function fork(label: string): Rng {
    // Derive a sub-seed from the current state and the label hash
    const subSeed = (state ^ djb2Hash(label)) >>> 0;
    return createRng(subSeed);
  }

  return { next, nextInt, nextFloat, fork };
}
