/**
 * @module history
 *
 * Run History screen displaying past runs from the runHistory table.
 * Shows date, waves survived, difficulty, coins earned, kills equivalent
 * (via wave count proxy), and duration. Sorted newest first.
 */
import { useRouter } from 'expo-router';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRunHistory } from '../db/meta';
import { soundManager } from '../engine/SoundManager';

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

export default function HistoryScreen() {
  const router = useRouter();
  const runs = useRunHistory();

  // Sort newest first by createdAt
  const sortedRuns = [...runs].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <View className="flex-1 bg-[#140d09] px-5 pb-6 pt-14">
      <View className="rounded-[28px] border border-[#6b4a2f] bg-[#241711]/95 px-5 py-5">
        <Text className="text-xs font-bold uppercase tracking-[4px] text-[#b98b52]">
          Chronicles
        </Text>
        <Text className="mt-2 text-4xl font-bold text-[#f0dfbe]">Run History</Text>
        <Text className="mt-2 text-sm text-[#d8c3a2]">
          {sortedRuns.length} {sortedRuns.length === 1 ? 'campaign' : 'campaigns'} recorded
        </Text>
      </View>

      <ScrollView className="mt-4" contentContainerClassName="gap-3 pb-4">
        {sortedRuns.length === 0 ? (
          <View className="rounded-2xl border border-[#8a6a44] bg-[#f3e8d5] p-6">
            <Text className="text-center text-lg text-[#6e4e31]">
              No campaigns yet. Embark on your first run!
            </Text>
          </View>
        ) : null}

        {sortedRuns.map((run) => (
          <View
            key={run.runId}
            className="rounded-2xl border border-[#8a6a44] bg-[#f3e8d5] p-4"
            accessibilityLabel={`Run: Wave ${run.waveReached}, ${run.result === 'defeat' ? 'Defeated' : 'Abandoned'}, ${run.coinsEarned} coins earned, ${run.biome} biome`}
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <Text className="text-lg font-bold text-[#3e2723]">
                  Wave {run.waveReached} — {run.result === 'defeat' ? 'Defeated' : 'Abandoned'}
                </Text>
                <Text className="mt-1 text-sm text-[#6e4e31]">
                  {formatDate(run.createdAt)}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-xl font-bold text-[#c38115]">
                  {run.coinsEarned} coins
                </Text>
              </View>
            </View>

            <View className="mt-3 flex-row justify-between">
              <View className="flex-row gap-4">
                <Text className="text-xs uppercase tracking-[2px] text-[#75512d]">
                  Biome: {run.biome}
                </Text>
                <Text className="text-xs uppercase tracking-[2px] text-[#75512d]">
                  Difficulty: {run.difficulty}
                </Text>
              </View>
              <Text className="text-xs uppercase tracking-[2px] text-[#75512d]">
                Duration: {formatDuration(run.durationMs)}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity
        onPress={() => {
          soundManager.playUiClick();
          router.back();
        }}
        className="mt-4 self-center rounded-xl border border-[#a88a44] bg-[#4a3b22] px-8 py-3"
        accessibilityRole="button"
        accessibilityLabel="Return to court"
      >
        <Text className="text-lg font-bold text-[#f7ebd0]">Return to Court</Text>
      </TouchableOpacity>
    </View>
  );
}
