import { createRng, djb2Hash } from '../../../engine/systems/rng';

describe('djb2Hash', () => {
  it('returns a positive 32-bit integer for any string', () => {
    const hash = djb2Hash('test');
    expect(hash).toBeGreaterThanOrEqual(0);
    expect(hash).toBeLessThan(2 ** 32);
    expect(Number.isInteger(hash)).toBe(true);
  });

  it('returns different hashes for different strings', () => {
    expect(djb2Hash('alpha')).not.toBe(djb2Hash('beta'));
  });

  it('returns the same hash for the same string', () => {
    expect(djb2Hash('hello')).toBe(djb2Hash('hello'));
  });
});

describe('createRng', () => {
  it('produces deterministic sequences from the same numeric seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('produces deterministic sequences from the same string seed', () => {
    const a = createRng('my-seed');
    const b = createRng('my-seed');
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences from different seeds', () => {
    const a = createRng(1);
    const b = createRng(2);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  describe('next()', () => {
    it('returns values in [0, 1)', () => {
      const rng = createRng(123);
      for (let i = 0; i < 100; i++) {
        const val = rng.next();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });
  });

  describe('nextInt(min, max)', () => {
    it('returns integers within the inclusive range', () => {
      const rng = createRng(456);
      const results = new Set<number>();
      for (let i = 0; i < 200; i++) {
        const val = rng.nextInt(1, 6);
        expect(Number.isInteger(val)).toBe(true);
        expect(val).toBeGreaterThanOrEqual(1);
        expect(val).toBeLessThanOrEqual(6);
        results.add(val);
      }
      // With 200 rolls of a d6, we should hit all values
      expect(results.size).toBe(6);
    });

    it('returns min when min equals max', () => {
      const rng = createRng(789);
      expect(rng.nextInt(5, 5)).toBe(5);
    });
  });

  describe('nextFloat(min, max)', () => {
    it('returns floats within [min, max)', () => {
      const rng = createRng(999);
      for (let i = 0; i < 100; i++) {
        const val = rng.nextFloat(2.0, 5.0);
        expect(val).toBeGreaterThanOrEqual(2.0);
        expect(val).toBeLessThan(5.0);
      }
    });
  });

  describe('fork(label)', () => {
    it('produces a child RNG with a different sequence', () => {
      const parent = createRng(42);
      const child = parent.fork('wave-1');
      // Parent and child should diverge
      const parentSeq = Array.from({ length: 5 }, () => parent.next());
      const childSeq = Array.from({ length: 5 }, () => child.next());
      expect(parentSeq).not.toEqual(childSeq);
    });

    it('produces deterministic child sequences', () => {
      const a = createRng(42);
      const b = createRng(42);
      const childA = a.fork('wave-1');
      const childB = b.fork('wave-1');
      const seqA = Array.from({ length: 10 }, () => childA.next());
      const seqB = Array.from({ length: 10 }, () => childB.next());
      expect(seqA).toEqual(seqB);
    });

    it('different labels produce different sequences', () => {
      const rng = createRng(42);
      const a = rng.fork('wave-1');
      const rng2 = createRng(42);
      const b = rng2.fork('wave-2');
      const seqA = Array.from({ length: 5 }, () => a.next());
      const seqB = Array.from({ length: 5 }, () => b.next());
      expect(seqA).not.toEqual(seqB);
    });
  });
});
