import renderConfig from '../../../data/renderConfig.json';

describe('renderConfig', () => {
  it('has camera, particles, and floatingText sections', () => {
    expect(renderConfig).toHaveProperty('camera');
    expect(renderConfig).toHaveProperty('particles');
    expect(renderConfig).toHaveProperty('floatingText');
  });

  describe('camera', () => {
    it('position is [0, 100, 70]', () => {
      expect(renderConfig.camera.position).toEqual([0, 100, 70]);
    });

    it('zoom range is 22 to 80', () => {
      expect(renderConfig.camera.zoomMin).toBe(22);
      expect(renderConfig.camera.zoomMax).toBe(80);
    });

    it('shake damping is 0.9 and lerp is 0.1', () => {
      expect(renderConfig.camera.shakeDamping).toBe(0.9);
      expect(renderConfig.camera.shakeLerp).toBe(0.1);
    });

    it('shake max offset is 5', () => {
      expect(renderConfig.camera.shakeMaxOffset).toBe(5);
    });
  });

  describe('particles', () => {
    it('has correct default values', () => {
      expect(renderConfig.particles.size).toBe(0.3);
      expect(renderConfig.particles.gravity).toBe(30);
      expect(renderConfig.particles.drag).toBe(0.96);
    });
  });

  describe('floatingText', () => {
    it('has correct default values', () => {
      expect(renderConfig.floatingText.riseSpeed).toBe(5);
      expect(renderConfig.floatingText.lifetime).toBe(1);
    });
  });
});
