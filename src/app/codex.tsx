/**
 * @module codex
 *
 * Codex screen that displays all discoverable entries (buildings, units,
 * biomes) the player has encountered across runs. Undiscovered entries
 * appear as locked placeholders. Discovery count is shown at the top.
 */
import { useNavigate } from 'react-router-dom';
import { useCodexEntries } from '../db/meta';
import { t } from '../i18n';

export function CodexScreen() {
  const navigate = useNavigate();
  const entries = useCodexEntries();
  const discoveredCount = entries.filter((entry) => entry.discovered).length;

  return (
    <div className="flex min-h-screen flex-col bg-[#140d09] px-5 pb-6 pt-14">
      <div className="rounded-[28px] border border-[#6b4a2f] bg-[#241711]/95 px-5 py-5">
        <p className="text-xs font-bold uppercase tracking-[4px] text-[#b98b52]">
          {t('codex_header')}
        </p>
        <h1 className="mt-2 text-4xl font-bold text-[#f0dfbe]">{t('codex_title')}</h1>
        <p className="mt-2 text-sm text-[#d8c3a2]">
          {t('codex_discovered_format', { discovered: discoveredCount, total: entries.length })}
        </p>
      </div>

      <div className="mt-4 flex flex-1 flex-col gap-3 overflow-auto pb-4">
        {entries.map((entry) => (
          <div
            key={entry.entryId}
            className={`rounded-2xl border p-4 ${
              entry.discovered ? 'border-[#8a6a44] bg-[#eadcc3]' : 'border-[#5a4936] bg-[#2b2018]'
            }`}
          >
            <p
              className={`text-lg font-bold ${
                entry.discovered ? 'text-[#3e2723]' : 'text-[#d7c6af]'
              }`}
            >
              {entry.discovered ? entry.entryId.replace(':', ' \u2022 ') : t('codex_unknown_entry')}
            </p>
            <p
              className={`mt-1 text-sm ${entry.discovered ? 'text-[#6e4e31]' : 'text-[#8e7b67]'}`}
            >
              {entry.discovered
                ? t('codex_category_label', { category: entry.category })
                : t('codex_locked_hint')}
            </p>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mx-auto rounded-2xl border border-[#a88a44] bg-[#4a3b22] px-8 py-3"
        aria-label="Return to court"
      >
        <span className="text-lg font-bold text-[#f7ebd0]">{t('btn_return_to_court')}</span>
      </button>
    </div>
  );
}
