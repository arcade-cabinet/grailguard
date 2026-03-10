import { generateNoiseTexture, type TextureType } from '../../engine/textureUtils';

// The real THREE.DataTexture has `image.data`, `image.width`, etc. but our mock
// exposes them directly. We define a small helper interface to avoid `any`.
interface MockTexture {
  data: Uint8Array;
  width: number;
  height: number;
  needsUpdate: boolean;
}

function asMock(tex: unknown): MockTexture {
  return tex as MockTexture;
}

describe('textureUtils', () => {
  describe('generateNoiseTexture', () => {
    const allTypes: TextureType[] = [
      'grass_col',
      'grass_rgh',
      'grass_nrm',
      'dirt_col',
      'dirt_rgh',
      'stone_col',
      'stone_rgh',
      'wood_col',
      'wood_rgh',
    ];

    it.each(allTypes)('generates a valid texture for type "%s"', (type) => {
      const tex = asMock(generateNoiseTexture(type, 16, 16));
      expect(tex).toBeDefined();
      expect(tex.width).toBe(16);
      expect(tex.height).toBe(16);
      expect(tex.needsUpdate).toBe(true);
    });

    it('produces RGBA data of correct length', () => {
      const w = 32;
      const h = 32;
      const tex = asMock(generateNoiseTexture('grass_col', w, h));
      expect(tex.data.length).toBe(w * h * 4);
    });

    it('all pixel values are in 0..255 range', () => {
      const tex = asMock(generateNoiseTexture('dirt_col', 16, 16));
      for (let i = 0; i < tex.data.length; i++) {
        expect(tex.data[i]).toBeGreaterThanOrEqual(0);
        expect(tex.data[i]).toBeLessThanOrEqual(255);
      }
    });

    it('alpha channel is always 255', () => {
      const tex = asMock(generateNoiseTexture('stone_col', 16, 16));
      for (let i = 3; i < tex.data.length; i += 4) {
        expect(tex.data[i]).toBe(255);
      }
    });

    it('is deterministic (same input → same output)', () => {
      const a = asMock(generateNoiseTexture('grass_col', 16, 16));
      const b = asMock(generateNoiseTexture('grass_col', 16, 16));
      expect(Array.from(a.data)).toEqual(Array.from(b.data));
    });

    it('different types produce different textures', () => {
      const grass = asMock(generateNoiseTexture('grass_col', 16, 16));
      const stone = asMock(generateNoiseTexture('stone_col', 16, 16));
      expect(Array.from(grass.data)).not.toEqual(Array.from(stone.data));
    });

    it('uses default dimensions of 128x128', () => {
      const tex = asMock(generateNoiseTexture('wood_col'));
      expect(tex.width).toBe(128);
      expect(tex.height).toBe(128);
      expect(tex.data.length).toBe(128 * 128 * 4);
    });
  });
});
