import { createTestDb, type TestDb } from '../testDb';

let testDb: TestDb;

vi.mock('../../../db/client', () => ({
  get db() {
    return testDb.db;
  },
}));

import { ensureSettings, loadSettings, saveSettings } from '../../../db/repos/settingsRepo';

describe('settingsRepo', () => {
  beforeEach(() => {
    testDb = createTestDb();
  });

  afterEach(() => {
    testDb.close();
  });

  describe('ensureSettings', () => {
    it('creates default settings row', async () => {
      await ensureSettings();
      const row = await loadSettings();

      expect(row).toBeDefined();
      expect(row!.id).toBe(1);
      expect(row!.preferredSpeed).toBe(1);
      expect(row!.autoResume).toBe(true);
      expect(row!.reducedFx).toBe(false);
      expect(row!.soundEnabled).toBe(true);
      expect(row!.musicEnabled).toBe(true);
      expect(row!.hapticsEnabled).toBe(true);
      expect(row!.cameraIntensity).toBe(1);
      expect(row!.theme).toBe('holy-grail');
    });

    it('is idempotent -- second call does not reset to defaults', async () => {
      await ensureSettings();
      await saveSettings({ preferredSpeed: 2 });
      await ensureSettings(); // second call

      const row = await loadSettings();
      expect(row!.preferredSpeed).toBe(2);
    });
  });

  describe('loadSettings', () => {
    it('returns undefined when no settings exist', async () => {
      const row = await loadSettings();
      expect(row).toBeUndefined();
    });

    it('returns the settings row after seed', async () => {
      await ensureSettings();
      const row = await loadSettings();
      expect(row).toBeDefined();
    });
  });

  describe('saveSettings', () => {
    beforeEach(async () => {
      await ensureSettings();
    });

    it('updates preferredSpeed', async () => {
      await saveSettings({ preferredSpeed: 1.5 });
      const row = await loadSettings();
      expect(row!.preferredSpeed).toBe(1.5);
    });

    it('updates autoResume', async () => {
      await saveSettings({ autoResume: false });
      const row = await loadSettings();
      expect(row!.autoResume).toBe(false);
    });

    it('updates reducedFx', async () => {
      await saveSettings({ reducedFx: true });
      const row = await loadSettings();
      expect(row!.reducedFx).toBe(true);
    });

    it('updates soundEnabled', async () => {
      await saveSettings({ soundEnabled: false });
      const row = await loadSettings();
      expect(row!.soundEnabled).toBe(false);
    });

    it('updates musicEnabled', async () => {
      await saveSettings({ musicEnabled: false });
      const row = await loadSettings();
      expect(row!.musicEnabled).toBe(false);
    });

    it('updates hapticsEnabled', async () => {
      await saveSettings({ hapticsEnabled: false });
      const row = await loadSettings();
      expect(row!.hapticsEnabled).toBe(false);
    });

    it('updates cameraIntensity', async () => {
      await saveSettings({ cameraIntensity: 0.5 });
      const row = await loadSettings();
      expect(row!.cameraIntensity).toBe(0.5);
    });

    it('updates theme', async () => {
      await saveSettings({ theme: 'dark-castle' });
      const row = await loadSettings();
      expect(row!.theme).toBe('dark-castle');
    });

    it('updates only the specified field, leaving others unchanged', async () => {
      await saveSettings({ preferredSpeed: 2 });

      const row = await loadSettings();
      expect(row!.preferredSpeed).toBe(2);
      expect(row!.autoResume).toBe(true); // unchanged
      expect(row!.soundEnabled).toBe(true); // unchanged
      expect(row!.theme).toBe('holy-grail'); // unchanged
    });

    it('updates multiple fields at once', async () => {
      await saveSettings({
        preferredSpeed: 3,
        soundEnabled: false,
        musicEnabled: false,
        theme: 'minimalist',
      });

      const row = await loadSettings();
      expect(row!.preferredSpeed).toBe(3);
      expect(row!.soundEnabled).toBe(false);
      expect(row!.musicEnabled).toBe(false);
      expect(row!.theme).toBe('minimalist');
      expect(row!.autoResume).toBe(true); // unchanged
    });

    it('settings persist across multiple reads', async () => {
      await saveSettings({ preferredSpeed: 2.5 });

      const read1 = await loadSettings();
      const read2 = await loadSettings();
      const read3 = await loadSettings();

      expect(read1!.preferredSpeed).toBe(2.5);
      expect(read2!.preferredSpeed).toBe(2.5);
      expect(read3!.preferredSpeed).toBe(2.5);
    });

    it('later updates overwrite earlier ones', async () => {
      await saveSettings({ preferredSpeed: 1.5 });
      await saveSettings({ preferredSpeed: 2.0 });
      await saveSettings({ preferredSpeed: 3.0 });

      const row = await loadSettings();
      expect(row!.preferredSpeed).toBe(3.0);
    });
  });
});
