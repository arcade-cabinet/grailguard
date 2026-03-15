/**
 * @module codexSystem.test
 *
 * TDD tests for codex discovery scanning using Set for O(1) lookups.
 */

import { discoverNewCodexEntries } from '../../../engine/systems/codexSystem';

describe('codexSystem', () => {
  describe('discoverNewCodexEntries', () => {
    it('returns newly discovered IDs', () => {
      const existing = ['militia', 'goblin'];
      const visible = ['militia', 'goblin', 'orc', 'troll'];
      const result = discoverNewCodexEntries(existing, visible);
      expect(result).toEqual(['orc', 'troll']);
    });

    it('returns empty array when all already discovered', () => {
      const existing = ['militia', 'goblin', 'orc'];
      const visible = ['militia', 'goblin', 'orc'];
      const result = discoverNewCodexEntries(existing, visible);
      expect(result).toHaveLength(0);
    });

    it('returns all visible IDs when none previously discovered', () => {
      const result = discoverNewCodexEntries([], ['boss', 'troll']);
      expect(result).toEqual(['boss', 'troll']);
    });

    it('handles empty visible array', () => {
      const result = discoverNewCodexEntries(['militia'], []);
      expect(result).toHaveLength(0);
    });

    it('handles duplicate visible IDs', () => {
      const result = discoverNewCodexEntries([], ['orc', 'orc', 'orc']);
      expect(result).toEqual(['orc']);
    });
  });
});
