import waveConfig from '../../../data/waveConfig.json';

describe('waveConfig', () => {
  it('has all required keys', () => {
    const requiredKeys = [
      'waveBudgetBase',
      'waveBudgetMultiplier',
      'waveBudgetQuadratic',
      'buildTimerBase',
      'buildTimerLogCoeff',
      'bossWaveInterval',
      'victoryWave',
      'spawnInterval',
      'affixStartWave',
      'affixChance',
      'earlyStartBonusRate',
      'waveCompletionBonusBase',
      'waveCompletionBonusPerWave',
      'interestRate',
      'grailDamageNormal',
      'grailDamageBoss',
    ];
    for (const key of requiredKeys) {
      expect(waveConfig).toHaveProperty(key);
    }
  });

  it('has correct wave budget formula values', () => {
    expect(waveConfig.waveBudgetBase).toBe(50);
    expect(waveConfig.waveBudgetMultiplier).toBe(1.15);
    expect(waveConfig.waveBudgetQuadratic).toBe(2);
  });

  it('has correct build timer values', () => {
    expect(waveConfig.buildTimerBase).toBe(30);
    expect(waveConfig.buildTimerLogCoeff).toBe(10);
  });

  it('boss wave every 5 waves and victory at wave 20', () => {
    expect(waveConfig.bossWaveInterval).toBe(5);
    expect(waveConfig.victoryWave).toBe(20);
  });

  it('affixes start at wave 6 with 20% chance', () => {
    expect(waveConfig.affixStartWave).toBe(6);
    expect(waveConfig.affixChance).toBe(0.2);
  });

  it('sanctuary damage is 1 for normal units and 5 for bosses', () => {
    expect(waveConfig.grailDamageNormal).toBe(1);
    expect(waveConfig.grailDamageBoss).toBe(5);
  });

  it('all values are numbers', () => {
    for (const value of Object.values(waveConfig)) {
      expect(typeof value).toBe('number');
    }
  });
});
