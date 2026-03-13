/**
 * @module codex
 *
 * Codex screen that displays all discoverable entries (buildings, units,
 * biomes) the player has encountered across runs. Undiscovered entries
 * appear as locked placeholders. Discovery count is shown at the top.
 */
import { useRouter } from 'expo-router';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useCodexEntries } from '../db/meta';
import { t } from '../i18n';

export default function CodexScreen() {
  const router = useRouter();
  const entries = useCodexEntries();
  const discoveredCount = entries.filter((entry) => entry.discovered).length;

  return (
    <View className="flex-1 bg-[#140d09] px-5 pb-6 pt-14">
      <View className="rounded-[28px] border border-[#6b4a2f] bg-[#241711]/95 px-5 py-5">
        <Text className="text-xs font-bold uppercase tracking-[4px] text-[#b98b52]">
          {t('codex_header')}
        </Text>
        <Text className="mt-2 text-4xl font-bold text-[#f0dfbe]">{t('codex_title')}</Text>
        <Text className="mt-2 text-sm text-[#d8c3a2]">
          {t('codex_discovered_format', { discovered: discoveredCount, total: entries.length })}
        </Text>
      </View>

      <ScrollView className="mt-4" contentContainerClassName="gap-3 pb-4">
        {entries.map((entry) => (
          <View
            key={entry.entryId}
            className={`rounded-2xl border p-4 ${
              entry.discovered ? 'border-[#8a6a44] bg-[#eadcc3]' : 'border-[#5a4936] bg-[#2b2018]'
            }`}
          >
            <Text
              className={`text-lg font-bold ${
                entry.discovered ? 'text-[#3e2723]' : 'text-[#d7c6af]'
              }`}
            >
              {entry.discovered ? entry.entryId.replace(':', ' \u2022 ') : t('codex_unknown_entry')}
            </Text>
            <Text
              className={`mt-1 text-sm ${entry.discovered ? 'text-[#6e4e31]' : 'text-[#8e7b67]'}`}
            >
              {entry.discovered
                ? t('codex_category_label', { category: entry.category })
                : t('codex_locked_hint')}
            </Text>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity
        onPress={() => router.back()}
        className="self-center rounded-2xl border border-[#a88a44] bg-[#4a3b22] px-8 py-3"
      >
        <Text className="text-lg font-bold text-[#f7ebd0]">{t('btn_return_to_court')}</Text>
      </TouchableOpacity>
    </View>
  );
}
