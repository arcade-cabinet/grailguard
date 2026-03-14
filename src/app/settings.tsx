/**
 * @module settings
 *
 * Settings screen for Grailguard. Provides toggle rows for auto-resume,
 * reduced FX, sound effects, and music. Persists changes via the meta-
 * progression database.
 */
import { useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
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
    <View className="rounded-2xl border border-[#8a6a44] bg-[#eadcc3] p-4">
      <View className="flex-row items-center justify-between gap-4">
        <View className="flex-1">
          <Text className="text-lg font-bold text-[#3e2723]">{label}</Text>
          <Text className="mt-1 text-sm text-[#6e4e31]">{description}</Text>
        </View>
        <TouchableOpacity
          onPress={onToggle}
          className={`rounded-xl border px-4 py-2 ${
            value ? 'border-[#3f6b3d] bg-[#355b31]' : 'border-[#7b5a39] bg-[#4a311f]'
          }`}
          accessibilityRole="switch"
          accessibilityLabel={label}
          accessibilityState={{ checked: value }}
        >
          <Text className="font-bold text-[#f7ebd0]">
            {value ? t('settings_on') : t('settings_off')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { settings } = useMetaProgress();

  return (
    <View className="flex-1 bg-[#140d09] px-5 pb-6 pt-14">
      <View className="rounded-[28px] border border-[#6b4a2f] bg-[#241711]/95 px-5 py-5">
        <Text className="text-xs font-bold uppercase tracking-[4px] text-[#b98b52]">
          {t('settings_header')}
        </Text>
        <Text className="mt-2 text-4xl font-bold text-[#f0dfbe]">{t('settings_title')}</Text>
      </View>

      <View className="mt-4 gap-3">
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
      </View>

      <TouchableOpacity
        onPress={() => router.back()}
        className="mt-auto self-center rounded-2xl border border-[#a88a44] bg-[#4a3b22] px-8 py-3"
        accessibilityRole="button"
        accessibilityLabel="Return to court"
      >
        <Text className="text-lg font-bold text-[#f7ebd0]">{t('btn_return_to_court')}</Text>
      </TouchableOpacity>
    </View>
  );
}
