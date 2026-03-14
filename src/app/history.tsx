/**
 * @module history
 *
 * Run History screen displaying past runs from the runHistory table.
 * Shows date, waves survived, difficulty, coins earned, kills equivalent
 * (via wave count proxy), and duration. Sorted newest first.
 */
import { useNavigate } from 'react-router-dom';
import { useRunHistory } from '../db/meta';
import { soundManager } from '../engine/SoundManager';
import { t } from '../i18n';

/**
 * Formats a duration in milliseconds to a human-readable "Xm Ys" string.
 *
 * @param ms - Duration in milliseconds.
 * @returns Formatted duration string.
 */
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

/**
 * Formats a Unix timestamp (ms) to a locale date string.
 *
 * @param timestamp - Unix timestamp in milliseconds.
 * @returns Formatted date string.
 */
function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function HistoryScreen() {
  const navigate = useNavigate();
  const runs = useRunHistory();

  // Sort newest first by createdAt
  const sortedRuns = [...runs].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="flex min-h-screen flex-col bg-[#140d09] px-5 pb-6 pt-14">
      <div className="rounded-[28px] border border-[#6b4a2f] bg-[#241711]/95 px-5 py-5">
        <p className="text-xs font-bold uppercase tracking-[4px] text-[#b98b52]">
          {t('history_header')}
        </p>
        <h1 className="mt-2 text-4xl font-bold text-[#f0dfbe]">{t('history_title')}</h1>
        <p className="mt-2 text-sm text-[#d8c3a2]">
          {t('history_count', { count: sortedRuns.length })}
        </p>
      </div>

      <div className="mt-4 flex flex-1 flex-col gap-3 overflow-auto pb-4">
        {sortedRuns.length === 0 ? (
          <div className="rounded-2xl border border-[#8a6a44] bg-[#f3e8d5] p-6">
            <p className="text-center text-lg text-[#6e4e31]">
              {t('history_empty')}
            </p>
          </div>
        ) : null}

        {sortedRuns.map((run) => (
          <div
            key={run.runId}
            className="rounded-2xl border border-[#8a6a44] bg-[#f3e8d5] p-4"
            aria-label={`Run: Wave ${run.waveReached}, ${run.result === 'defeat' ? 'Defeated' : 'Abandoned'}, ${run.coinsEarned} coins earned, ${run.biome} biome`}
          >
            <div className="flex flex-row items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-[#3e2723]">
                  {t('history_wave_label', { wave: run.waveReached })} — {run.result === 'defeat' ? t('history_result_defeat') : t('history_result_abandoned')}
                </h3>
                <p className="mt-1 text-sm text-[#6e4e31]">{formatDate(run.createdAt)}</p>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold text-[#c38115]">{t('history_coins', { coins: run.coinsEarned })}</span>
              </div>
            </div>

            <div className="mt-3 flex flex-row justify-between">
              <div className="flex flex-row gap-4">
                <span className="text-xs uppercase tracking-[2px] text-[#75512d]">
                  {t('history_biome', { biome: run.biome })}
                </span>
                <span className="text-xs uppercase tracking-[2px] text-[#75512d]">
                  {t('history_difficulty', { difficulty: run.difficulty })}
                </span>
              </div>
              <span className="text-xs uppercase tracking-[2px] text-[#75512d]">
                {t('history_duration', { duration: formatDuration(run.durationMs) })}
              </span>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => {
          soundManager.playUiClick();
          navigate(-1);
        }}
        className="mx-auto mt-4 rounded-xl border border-[#a88a44] bg-[#4a3b22] px-8 py-3"
        aria-label={t('btn_return_to_court')}
      >
        <span className="text-lg font-bold text-[#f7ebd0]">{t('btn_return_to_court')}</span>
      </button>
    </div>
  );
}
