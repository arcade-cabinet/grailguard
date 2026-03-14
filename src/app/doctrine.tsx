/**
 * @module doctrine
 *
 * Doctrine skill-tree screen for meta-progression. Each doctrine node is a
 * permanent blessing (up to level 5) purchased with coins earned across runs.
 * Nodes affect starting gold, faith bonuses, unit stats, passive income,
 * and construction costs.
 */
import { useRouter } from 'expo-router';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { purchaseDoctrineNode, useDoctrineNodes, useMetaProgress } from '../db/meta';
import { t } from '../i18n';

const DOCTRINES = [
  {
    nodeId: 'crown_tithe',
    title: 'Crown Tithe',
    description: 'Begin each run with richer coffers from the royal levy.',
    baseCost: 100,
  },
  {
    nodeId: 'faithward',
    title: 'Faithward',
    description: 'The sanctum receives stronger blessings and steadier resolve.',
    baseCost: 150,
  },
  {
    nodeId: 'iron_vanguard',
    title: 'Iron Vanguard',
    description: 'Frontline companies muster with heavier martial discipline.',
    baseCost: 200,
  },
  {
    nodeId: 'tax_collection',
    title: 'Tax Collection',
    description: 'Generate additional gold passively after each wave.',
    baseCost: 100,
  },
  {
    nodeId: 'masonry',
    title: 'Masonry',
    description: 'Fortifications and barricades are cheaper to construct.',
    baseCost: 120,
  },
] as const;

export default function DoctrineScreen() {
  const router = useRouter();
  const { coins } = useMetaProgress();
  const nodes = useDoctrineNodes();
  const levelMap = new Map(nodes.map((node) => [node.nodeId, node.level]));

  return (
    <View className="flex-1 bg-[#140d09] px-5 pb-6 pt-14">
      <View className="rounded-[28px] border border-[#6b4a2f] bg-[#241711]/95 px-5 py-5">
        <Text className="text-xs font-bold uppercase tracking-[4px] text-[#b98b52]">
          {t('doctrine_header')}
        </Text>
        <Text className="mt-2 text-4xl font-bold text-[#f0dfbe]">{t('doctrine_title')}</Text>
        <Text className="mt-2 text-sm text-[#d8c3a2]">
          {t('doctrine_treasury_label')} {coins} 🪙
        </Text>
      </View>

      <ScrollView className="mt-4" contentContainerClassName="gap-3 pb-4">
        {DOCTRINES.map((node) => {
          const level = levelMap.get(node.nodeId) ?? 0;
          const cost = node.baseCost * (level + 1);
          const isMaxed = level >= 5;
          const canAfford = coins >= cost;

          return (
            <View
              key={node.nodeId}
              className="rounded-2xl border border-[#8a6a44] bg-[#eadcc3] p-4"
            >
              <Text className="text-xl font-bold text-[#3e2723]">
                {node.title} (Lv. {level}/5)
              </Text>
              <Text className="mt-1 text-sm text-[#6e4e31]">{node.description}</Text>
              <View className="mt-3 flex-row items-center justify-between">
                <Text className="text-sm font-semibold text-[#75512d]">
                  {isMaxed ? t('doctrine_max_level') : `${cost} 🪙`}
                </Text>
                <TouchableOpacity
                  disabled={isMaxed || !canAfford}
                  onPress={() => {
                    void purchaseDoctrineNode(node.nodeId, cost);
                  }}
                  className={`rounded-xl border px-4 py-2 ${
                    isMaxed
                      ? 'border-[#7b6b56] bg-[#d1c1aa]'
                      : canAfford
                        ? 'border-[#a88a44] bg-[#4a3b22]'
                        : 'border-[#8a7c6c] bg-[#8a7c6c]'
                  }`}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isMaxed
                      ? `${node.title} maxed`
                      : `${level > 0 ? 'Upgrade' : 'Consecrate'} ${node.title} for ${cost} coins`
                  }
                  accessibilityState={{ disabled: isMaxed || !canAfford }}
                >
                  <Text className="font-bold text-[#f7ebd0]">
                    {isMaxed
                      ? t('doctrine_maxed')
                      : level > 0
                        ? t('doctrine_upgrade')
                        : t('doctrine_consecrate')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <TouchableOpacity
        onPress={() => router.back()}
        className="self-center rounded-2xl border border-[#a88a44] bg-[#4a3b22] px-8 py-3"
        accessibilityRole="button"
        accessibilityLabel="Return to court"
      >
        <Text className="text-lg font-bold text-[#f7ebd0]">{t('btn_return_to_court')}</Text>
      </TouchableOpacity>
    </View>
  );
}
