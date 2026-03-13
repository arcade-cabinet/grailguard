import { useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
import { updateSettings, useMetaProgress } from '../db/meta';

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
        >
          <Text className="font-bold text-[#f7ebd0]">{value ? 'On' : 'Off'}</Text>
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
          Sanctum Preferences
        </Text>
        <Text className="mt-2 text-4xl font-bold text-[#f0dfbe]">Settings</Text>
      </View>

      <View className="mt-4 gap-3">
        <SettingRow
          description="Continue the last active defense when returning to the battlefield."
          label="Auto Resume"
          onToggle={() => {
            const currentValue = settings?.autoResume ?? true;
            void updateSettings({ autoResume: !currentValue });
          }}
          value={settings?.autoResume ?? true}
        />
        <SettingRow
          description="Reduce particles and flashes for longer sessions and lower-end devices."
          label="Reduced FX"
          onToggle={() => {
            void updateSettings({ reducedFx: !settings?.reducedFx });
          }}
          value={settings?.reducedFx ?? false}
        />
        <SettingRow
          description="Master toggle for battlefield sound cues."
          label="Sound"
          onToggle={() => {
            const currentValue = settings?.soundEnabled ?? true;
            void updateSettings({ soundEnabled: !currentValue });
          }}
          value={settings?.soundEnabled ?? true}
        />
        <SettingRow
          description="Master toggle for music themes."
          label="Music"
          onToggle={() => {
            const currentValue = settings?.musicEnabled ?? true;
            void updateSettings({ musicEnabled: !currentValue });
          }}
          value={settings?.musicEnabled ?? true}
        />
      </View>

      <TouchableOpacity
        onPress={() => router.back()}
        className="mt-auto self-center rounded-2xl border border-[#a88a44] bg-[#4a3b22] px-8 py-3"
      >
        <Text className="text-lg font-bold text-[#f7ebd0]">Return to Court</Text>
      </TouchableOpacity>
    </View>
  );
}