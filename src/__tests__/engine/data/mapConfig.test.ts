import mapConfig from '../../../data/mapConfig.json';

describe('mapConfig', () => {
  it('has all required keys', () => {
    const requiredKeys = [
      'size',
      'roadSampleCount',
      'placementGridSize',
      'wallMaxRoadDistance',
      'spawnerMinRoadDistance',
      'roadSplinePointCount',
      'yukaPathPointCount',
    ];
    for (const key of requiredKeys) {
      expect(mapConfig).toHaveProperty(key);
    }
  });

  it('map size is 100', () => {
    expect(mapConfig.size).toBe(100);
  });

  it('road has 120 sample points and 50 spline points', () => {
    expect(mapConfig.roadSampleCount).toBe(120);
    expect(mapConfig.roadSplinePointCount).toBe(50);
  });

  it('placement grid is 5 units', () => {
    expect(mapConfig.placementGridSize).toBe(5);
  });

  it('walls must be within 4 units of road', () => {
    expect(mapConfig.wallMaxRoadDistance).toBe(4);
  });

  it('spawners must be at least 7 units from road', () => {
    expect(mapConfig.spawnerMinRoadDistance).toBe(7);
  });

  it('yuka path uses 50 points', () => {
    expect(mapConfig.yukaPathPointCount).toBe(50);
  });

  it('all values are positive numbers', () => {
    for (const value of Object.values(mapConfig)) {
      expect(typeof value).toBe('number');
      expect(value).toBeGreaterThan(0);
    }
  });
});
