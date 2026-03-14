import { eq } from 'drizzle-orm';
import { createTestDb, type TestDb } from '../testDb';

let testDb: TestDb;

vi.mock('../../../db/client', () => ({
  get db() {
    return testDb.db;
  },
}));

import { ensureSeedData } from '../../../db/repos/bootstrapRepo';
import {
  codexEntries,
  contentState,
  doctrineNodes,
  playerProfile,
  settings,
  unlocks,
} from '../../../db/schema';

describe('bootstrapRepo', () => {
  beforeEach(() => {
    testDb = createTestDb();
  });

  afterEach(() => {
    testDb.close();
  });

  describe('ensureSeedData', () => {
    it('seeds the player profile', async () => {
      await ensureSeedData();

      const profile = await testDb.db
        .select()
        .from(playerProfile)
        .where(eq(playerProfile.id, 1))
        .get();

      expect(profile).toBeDefined();
      expect(profile!.coins).toBe(0);
      expect(profile!.highestWave).toBe(0);
    });

    it('seeds the settings row', async () => {
      await ensureSeedData();

      const row = await testDb.db.select().from(settings).where(eq(settings.id, 1)).get();

      expect(row).toBeDefined();
      expect(row!.preferredSpeed).toBe(1);
      expect(row!.theme).toBe('holy-grail');
    });

    it('seeds building unlock rows', async () => {
      await ensureSeedData();

      const buildings = await testDb.db
        .select()
        .from(unlocks)
        .where(eq(unlocks.domain, 'building'))
        .all();

      expect(buildings.length).toBe(15); // 15 building types
    });

    it('seeds spell unlock rows', async () => {
      await ensureSeedData();

      const spells = await testDb.db
        .select()
        .from(unlocks)
        .where(eq(unlocks.domain, 'spell'))
        .all();

      expect(spells.length).toBe(7); // 7 spell types
    });

    it('seeds codex entries', async () => {
      await ensureSeedData();

      const entries = await testDb.db.select().from(codexEntries).all();

      expect(entries.length).toBe(5); // 5 default entries
      expect(entries.every((e) => e.discovered === false)).toBe(true);

      const ids = entries.map((e) => e.entryId).sort();
      expect(ids).toEqual([
        'biome:kings-road',
        'enemy:boss',
        'enemy:goblin',
        'enemy:orc',
        'enemy:troll',
      ]);
    });

    it('seeds doctrine nodes', async () => {
      await ensureSeedData();

      const nodes = await testDb.db.select().from(doctrineNodes).all();

      expect(nodes.length).toBe(5);
      expect(nodes.every((n) => n.level === 0)).toBe(true);
      expect(nodes.every((n) => n.unlocked === false)).toBe(true);

      const ids = nodes.map((n) => n.nodeId).sort();
      expect(ids).toEqual([
        'crown_tithe',
        'faithward',
        'iron_vanguard',
        'masonry',
        'tax_collection',
      ]);
    });

    it('seeds content state', async () => {
      await ensureSeedData();

      const state = await testDb.db.select().from(contentState).where(eq(contentState.id, 1)).get();

      expect(state).toBeDefined();
      expect(state!.schemaVersion).toBe(1);
      expect(state!.contentVersion).toBe('0.1.0');
    });

    it('is idempotent -- running twice does not duplicate data', async () => {
      await ensureSeedData();
      await ensureSeedData(); // second call

      const profiles = await testDb.db.select().from(playerProfile).all();
      expect(profiles.length).toBe(1);

      const settingsRows = await testDb.db.select().from(settings).all();
      expect(settingsRows.length).toBe(1);

      const buildings = await testDb.db
        .select()
        .from(unlocks)
        .where(eq(unlocks.domain, 'building'))
        .all();
      expect(buildings.length).toBe(15);

      const spells = await testDb.db
        .select()
        .from(unlocks)
        .where(eq(unlocks.domain, 'spell'))
        .all();
      expect(spells.length).toBe(7);

      const entries = await testDb.db.select().from(codexEntries).all();
      expect(entries.length).toBe(5);

      const nodes = await testDb.db.select().from(doctrineNodes).all();
      expect(nodes.length).toBe(5);

      const states = await testDb.db.select().from(contentState).all();
      expect(states.length).toBe(1);
    });

    it('does not overwrite existing profile data', async () => {
      await ensureSeedData();

      // Modify the profile
      await testDb.db
        .update(playerProfile)
        .set({ coins: 999, updatedAt: Date.now() })
        .where(eq(playerProfile.id, 1));

      await ensureSeedData(); // second call

      const profile = await testDb.db
        .select()
        .from(playerProfile)
        .where(eq(playerProfile.id, 1))
        .get();
      expect(profile!.coins).toBe(999); // preserved
    });

    it('does not overwrite existing unlock states', async () => {
      const { and } = await import('drizzle-orm');

      await ensureSeedData();

      // Manually unlock 'range'
      await testDb.db
        .update(unlocks)
        .set({ unlocked: true, unlockedAt: Date.now() })
        .where(and(eq(unlocks.domain, 'building'), eq(unlocks.itemId, 'range')));

      await ensureSeedData(); // second call

      const row = await testDb.db
        .select()
        .from(unlocks)
        .where(and(eq(unlocks.domain, 'building'), eq(unlocks.itemId, 'range')))
        .get();
      expect(row!.unlocked).toBe(true); // preserved
    });
  });
});
