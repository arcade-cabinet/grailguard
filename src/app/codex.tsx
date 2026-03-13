import { useRouter } from 'expo-router';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useCodexEntries } from '../db/meta';

export default function CodexScreen() {
  const router = useRouter();
  const entries = useCodexEntries();
  const discoveredCount = entries.filter((entry) => entry.discovered).length;

  return (
    <View className="flex-1 bg-[#140d09] px-5 pb-6 pt-14">
      <View className="rounded-[28px] border border-[#6b4a2f] bg-[#241711]/95 px-5 py-5">
        <Text className="text-xs font-bold uppercase tracking-[4px] text-[#b98b52]">
          Court Archives
        </Text>
        <Text className="mt-2 text-4xl font-bold text-[#f0dfbe]">Codex</Text>
        <Text className="mt-2 text-sm text-[#d8c3a2]">
          Discovered {discoveredCount} of {entries.length} entries.
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
              {entry.discovered ? entry.entryId.replace(':', ' • ') : 'Unknown Entry'}
            </Text>
            <Text
              className={`mt-1 text-sm ${entry.discovered ? 'text-[#6e4e31]' : 'text-[#8e7b67]'}`}
            >
              {entry.discovered
                ? `Category: ${entry.category}`
                : 'Encounter this relic, foe, or realm to reveal its record.'}
            </Text>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity
        onPress={() => router.back()}
        className="self-center rounded-2xl border border-[#a88a44] bg-[#4a3b22] px-8 py-3"
      >
        <Text className="text-lg font-bold text-[#f7ebd0]">Return to Court</Text>
      </TouchableOpacity>
    </View>
  );
}
