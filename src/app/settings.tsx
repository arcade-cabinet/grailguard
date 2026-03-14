/**
 * @module settings
 *
 * Settings screen for Grailguard. Provides toggle rows for auto-resume,
 * reduced FX, sound effects, and music. Persists changes via the meta-
 * progression database.
 */
import { useNavigate } from 'react-router-dom';
import { updateSettings, useMetaProgress } from '../db/meta';
import { t } from '../i18n';

function SettingRow({
  description,
  label,
  onToggle,
  value,
}: {
  description: string;
  label: string;
  onToggle: () => void;
  value: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[#8a6a44] bg-[#eadcc3] p-4">
      <div className="flex flex-row items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-[#3e2723]">{label}</h3>
          <p className="mt-1 text-sm text-[#6e4e31]">{description}</p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={`rounded-xl border px-4 py-2 ${
            value ? 'border-[#3f6b3d] bg-[#355b31]' : 'border-[#7b5a39] bg-[#4a311f]'
          }`}
          role="switch"
          aria-checked={value}
          aria-label={label}
        >
          <span className="font-bold text-[#f7ebd0]">
            {value ? t('settings_on') : t('settings_off')}
          </span>
        </button>
      </div>
    </div>
  );
}

export function SettingsScreen() {
  const navigate = useNavigate();
  const { settings } = useMetaProgress();

  return (
    <div className="flex min-h-screen flex-col bg-[#140d09] px-5 pb-6 pt-14">
      <div className="rounded-[28px] border border-[#6b4a2f] bg-[#241711]/95 px-5 py-5">
        <p className="text-xs font-bold uppercase tracking-[4px] text-[#b98b52]">
          {t('settings_header')}
        </p>
        <h1 className="mt-2 text-4xl font-bold text-[#f0dfbe]">{t('settings_title')}</h1>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <SettingRow
          description={t('settings_auto_resume_desc')}
          label={t('settings_auto_resume_label')}
          onToggle={() => {
            const currentValue = settings?.autoResume ?? true;
            void updateSettings({ autoResume: !currentValue });
          }}
          value={settings?.autoResume ?? true}
        />
        <SettingRow
          description={t('settings_reduced_fx_desc')}
          label={t('settings_reduced_fx_label')}
          onToggle={() => {
            void updateSettings({ reducedFx: !settings?.reducedFx });
          }}
          value={settings?.reducedFx ?? false}
        />
        <SettingRow
          description={t('settings_sound_desc')}
          label={t('settings_sound_label')}
          onToggle={() => {
            const currentValue = settings?.soundEnabled ?? true;
            void updateSettings({ soundEnabled: !currentValue });
          }}
          value={settings?.soundEnabled ?? true}
        />
        <SettingRow
          description={t('settings_music_desc')}
          label={t('settings_music_label')}
          onToggle={() => {
            const currentValue = settings?.musicEnabled ?? true;
            void updateSettings({ musicEnabled: !currentValue });
          }}
          value={settings?.musicEnabled ?? true}
        />
        <SettingRow
          description={t('settings_high_contrast_desc')}
          label={t('settings_high_contrast_label')}
          onToggle={() => {
            void updateSettings({ highContrast: !(settings?.highContrast ?? false) });
          }}
          value={settings?.highContrast ?? false}
        />
      </div>

      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mx-auto mt-auto rounded-2xl border border-[#a88a44] bg-[#4a3b22] px-8 py-3"
        aria-label="Return to court"
      >
        <span className="text-lg font-bold text-[#f7ebd0]">{t('btn_return_to_court')}</span>
      </button>
    </div>
  );
}
