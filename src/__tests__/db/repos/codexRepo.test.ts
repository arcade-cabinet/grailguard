import { eq } from 'drizzle-orm';
import { createTestDb, type TestDb } from '../testDb';

let testDb: TestDb;

vi.mock('../../../db/client', () => ({
  get db() {
    return testDb.db;
  },
}));

import { discoverCodexEntry } from '../../../db/repos/codexRepo';
import { codexEntries } from '../../../db/schema';

describe('codexRepo', () => {
  beforeEach(() => {
    testDb = createTestDb();
  });

  afterEach(() => {
    testDb.close();
  });

  describe('discoverCodexEntry', () => {
    it('records a new discovery', async () => {
      await discoverCodexEntry('enemy:goblin', 'enemy');

      const row = await testDb.db
        .select()
        .from(codexEntries)
        .where(eq(codexEntries.entryId, 'enemy:goblin'))
        .get();

      expect(row).toBeDefined();
      expect(row!.entryId).toBe('enemy:goblin');
      expect(row!.category).toBe('enemy');
      expect(row!.discovered).toBe(true);
      expect(row!.discoveredAt).toBeDefined();
    });

    it('sets discoveredAt to a recent timestamp', async () => {
      const before = Date.now();
      await discoverCodexEntry('enemy:orc', 'enemy');

      const row = await testDb.db
        .select()
        .from(codexEntries)
        .where(eq(codexEntries.entryId, 'enemy:orc'))
        .get();

      expect(row!.discoveredAt).toBeGreaterThanOrEqual(before);
    });

    it('handles duplicate discovery via upsert (no error)', async () => {
      await discoverCodexEntry('enemy:goblin', 'enemy');
      // Second call should not throw
      await discoverCodexEntry('enemy:goblin', 'enemy');

      const rows = await testDb.db
        .select()
        .from(codexEntries)
        .where(eq(codexEntries.entryId, 'enemy:goblin'))
        .all();

      expect(rows.length).toBe(1);
      expect(rows[0].discovered).toBe(true);
    });

    it('updates timestamp on re-discovery', async () => {
      await discoverCodexEntry('enemy:goblin', 'enemy');
      const first = await testDb.db
        .select()
        .from(codexEntries)
        .where(eq(codexEntries.entryId, 'enemy:goblin'))
        .get();

      await new Promise((r) => setTimeout(r, 5));
      await discoverCodexEntry('enemy:goblin', 'enemy');
      const second = await testDb.db
        .select()
        .from(codexEntries)
        .where(eq(codexEntries.entryId, 'enemy:goblin'))
        .get();

      expect(second!.discoveredAt).toBeGreaterThanOrEqual(first!.discoveredAt!);
    });

    it('can update a pre-seeded undiscovered entry', async () => {
      // Seed an undiscovered entry
      await testDb.db.insert(codexEntries).values({
        entryId: 'enemy:troll',
        category: 'enemy',
        discovered: false,
        discoveredAt: null,
      });

      await discoverCodexEntry('enemy:troll', 'enemy');

      const row = await testDb.db
        .select()
        .from(codexEntries)
        .where(eq(codexEntries.entryId, 'enemy:troll'))
        .get();

      expect(row!.discovered).toBe(true);
      expect(row!.discoveredAt).toBeDefined();
    });

    it('records discoveries across multiple categories', async () => {
      await discoverCodexEntry('enemy:goblin', 'enemy');
      await discoverCodexEntry('biome:kings-road', 'biome');

      const all = await testDb.db.select().from(codexEntries).all();
      expect(all.length).toBe(2);

      const categories = all.map((r) => r.category).sort();
      expect(categories).toEqual(['biome', 'enemy']);
    });

    it('lists all discoveries', async () => {
      await discoverCodexEntry('enemy:goblin', 'enemy');
      await discoverCodexEntry('enemy:orc', 'enemy');
      await discoverCodexEntry('enemy:troll', 'enemy');

      const all = await testDb.db.select().from(codexEntries).all();
      expect(all.length).toBe(3);
      expect(all.every((r) => r.discovered)).toBe(true);
    });

    it('can update category on re-discovery', async () => {
      await discoverCodexEntry('misc:artifact', 'misc');
      await discoverCodexEntry('misc:artifact', 'relic');

      const row = await testDb.db
        .select()
        .from(codexEntries)
        .where(eq(codexEntries.entryId, 'misc:artifact'))
        .get();

      // The onConflictDoUpdate sets category from the new value
      expect(row!.category).toBe('relic');
    });
  });
});
