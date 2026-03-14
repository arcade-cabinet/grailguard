/**
 * @module index
 *
 * Main menu screen for Grailguard. Presents the title card, treasury
 * balance, and navigation to Embark (new run), Continue Run, Royal Market
 * (meta-progression unlocks), Codex, Doctrine, and Settings. Includes
 * modals for the Embark flow (biome, challenge, map size, seed, and spell
 * selection) and the Royal Market (building and spell purchases).
 */
import * as Tooltip from '@rn-primitives/tooltip';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  getUnlockCost,
  purchaseBuildingUnlock,
  purchaseSpellUnlock,
  useMetaProgress,
} from '../db/meta';
import { BUILDINGS, type BuildingType, type SpellType } from '../engine/constants';
import { soundManager } from '../engine/SoundManager';
import { t } from '../i18n';

const BIOMES = [
  { id: 'kings-road', name: "King's Road", desc: 'Lush grass and dirt roads.' },
  { id: 'dark-forest', name: 'Dark Forest', desc: 'Dense, oppressive woods.' },
  { id: 'desert-wastes', name: 'Desert Wastes', desc: 'Barren and dry.' },
];

const CHALLENGES = [
  { id: 'pilgrim', name: 'Pilgrim', desc: 'Standard enemy hordes.' },
  { id: 'crusader', name: 'Crusader', desc: 'Heavier waves and sturdier foes.' },
];

const MAP_SIZES = [
  { id: 60, name: 'Small' },
  { id: 100, name: 'Medium' },
  { id: 140, name: 'Large' },
];

const SPELLS: Record<SpellType, { name: string; desc: string; icon: string }> = {
  smite: { name: 'Smite', desc: 'Call down holy fire to damage enemies.', icon: '⚡' },
  holy_nova: { name: 'Holy Nova', desc: 'A burst of energy that heals nearby allies.', icon: '✨' },
  zealous_haste: {
    name: 'Zealous Haste',
    desc: 'Double attack speed of allies for a short time.',
    icon: '🏃',
  },
  earthquake: { name: 'Earthquake', desc: 'Stun all enemies temporarily.', icon: '🌋' },
  chrono_shift: { name: 'Chrono Shift', desc: 'Freezes all enemies for 4 seconds.', icon: '❄️' },
  meteor_strike: { name: 'Meteor Strike', desc: 'Devastating area-of-effect damage.', icon: '☄️' },
  divine_shield: {
    name: 'Divine Shield',
    desc: 'Makes all allies invulnerable for a short time.',
    icon: '🛡️',
  },
};

export default function MainMenuScreen() {
  const router = useRouter();
  const { coins, hasActiveRun, settings, unlocks, spellUnlocks } = useMetaProgress();
  const [marketOpen, setMarketOpen] = useState(false);
  const [embarkOpen, setEmbarkOpen] = useState(false);
  const [selectedBiome, setSelectedBiome] = useState(BIOMES[0].id);
  const [selectedChallenge, setSelectedChallenge] = useState(CHALLENGES[0].id);
  const [selectedSpells, setSelectedSpells] = useState<string[]>(['smite']);
  const [selectedSize, setSelectedSize] = useState(100);
  const [seedInput, setSeedInput] = useState('');

  const marketItems = Object.entries(BUILDINGS) as [
    BuildingType,
    (typeof BUILDINGS)[BuildingType],
  ][];

  const toggleSpell = (spellId: string) => {
    if (selectedSpells.includes(spellId)) {
      if (selectedSpells.length > 1) {
        setSelectedSpells(selectedSpells.filter((s) => s !== spellId));
      }
    } else {
      if (selectedSpells.length < 2) {
        setSelectedSpells([...selectedSpells, spellId]);
      }
    }
  };

  return (
    <View className="flex-1 items-center justify-center overflow-hidden bg-[#1a120d] px-6">
      <View className="absolute inset-0 bg-[#120b08]" />
      <View className="absolute inset-x-0 top-0 h-64 bg-[#6b3f1d]/25" />
      <View className="absolute bottom-[-120px] left-[-40px] h-72 w-72 rounded-full bg-[#d4af37]/10" />
      <View className="absolute right-[-60px] top-20 h-80 w-80 rounded-full bg-[#8b1e1e]/10" />

      <View className="w-full max-w-4xl rounded-[28px] border border-[#6b4a2f] bg-[#241711]/95 px-6 py-8 shadow-2xl">
        <Text className="text-center text-xs font-semibold uppercase tracking-[5px] text-[#b98b52]">
          {t('app_subtitle')}
        </Text>
        <Text className="mt-3 text-center text-6xl font-bold text-[#ead7b0]">{t('app_title')}</Text>
        <Text className="mt-3 text-center text-base leading-6 text-[#d7c6af]">
          {t('app_tagline')}
        </Text>

        <View className="mt-8 rounded-[24px] border border-[#7f5b37] bg-[#e9d8be] px-6 py-5">
          <Text className="text-center text-xs font-bold uppercase tracking-[4px] text-[#6e4e31]">
            {t('treasury_title')}
          </Text>
          <Text className="mt-2 text-center text-5xl font-bold text-[#c38115]">{coins} 🪙</Text>
          <Text className="mt-1 text-center text-sm text-[#6e4e31]">
            Theme: {settings?.theme ?? 'holy-grail'} • Preferred speed:{' '}
            {settings?.preferredSpeed ?? 1}x
          </Text>
        </View>

        <View className="mt-8 flex-row flex-wrap justify-center gap-4">
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <TouchableOpacity
                onPress={() => {
                  soundManager.playUiClick();
                  setEmbarkOpen(true);
                }}
                className="rounded-2xl border border-[#b98b52] bg-[#5a371f] px-10 py-4"
                accessibilityRole="button"
                accessibilityLabel="Embark on a new run"
              >
                <Text className="text-2xl font-bold text-[#f6e6c7]">{t('btn_embark')}</Text>
              </TouchableOpacity>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                side="top"
                className="rounded-xl border border-[#6b4a2f] bg-[#2b1c14] px-3 py-2"
              >
                <Text className="text-sm text-[#f6e6c7]">{t('btn_embark_tooltip')}</Text>
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>

          {hasActiveRun ? (
            <TouchableOpacity
              onPress={() => {
                soundManager.playUiClick();
                router.push('/game?mode=resume');
              }}
              className="rounded-2xl border border-[#8b6b45] bg-[#3c2818] px-8 py-4"
              accessibilityRole="button"
              accessibilityLabel="Continue active run"
            >
              <Text className="text-xl font-bold text-[#e8d099]">{t('btn_continue_run')}</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            onPress={() => {
              soundManager.playUiClick();
              setMarketOpen(true);
            }}
            className="rounded-2xl border border-[#8b6b45] bg-[#2d2118] px-8 py-4"
            accessibilityRole="button"
            accessibilityLabel="Open Royal Market"
          >
            <Text className="text-xl font-bold text-[#e8d099]">{t('btn_royal_market')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              soundManager.playUiClick();
              router.push('/codex' as never);
            }}
            className="rounded-2xl border border-[#8b6b45] bg-[#2d2118] px-8 py-4"
            accessibilityRole="button"
            accessibilityLabel="Open Codex"
          >
            <Text className="text-xl font-bold text-[#e8d099]">{t('btn_codex')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/doctrine' as never)}
            className="rounded-2xl border border-[#8b6b45] bg-[#2d2118] px-8 py-4"
            accessibilityRole="button"
            accessibilityLabel="Open Doctrine skill tree"
          >
            <Text className="text-xl font-bold text-[#e8d099]">{t('btn_doctrine')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              soundManager.playUiClick();
              router.push('/history' as never);
            }}
            className="rounded-2xl border border-[#8b6b45] bg-[#2d2118] px-8 py-4"
            accessibilityRole="button"
            accessibilityLabel="View run history"
          >
            <Text className="text-xl font-bold text-[#e8d099]">History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/settings' as never)}
            className="rounded-2xl border border-[#8b6b45] bg-[#2d2118] px-8 py-4"
            accessibilityRole="button"
            accessibilityLabel="Open Settings"
          >
            <Text className="text-xl font-bold text-[#e8d099]">{t('btn_settings')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={embarkOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setEmbarkOpen(false)}
      >
        <View className="flex-1 items-center justify-center bg-[#0a0806]/90 px-4">
          <View className="w-full max-w-2xl rounded-[28px] border border-[#6b4a2f] bg-[#eadcc3] p-6">
            <Text className="text-3xl font-bold text-[#3e2723]">{t('embark_title')}</Text>
            <Text className="mt-2 text-sm text-[#6e4e31]">{t('embark_subtitle')}</Text>

            <Text className="mt-6 text-xl font-bold text-[#3e2723]">{t('embark_biome')}</Text>
            <View className="mt-2 flex-row gap-3">
              {BIOMES.map((b) => (
                <TouchableOpacity
                  key={b.id}
                  onPress={() => setSelectedBiome(b.id)}
                  className={`flex-1 rounded-xl border p-3 ${selectedBiome === b.id ? 'border-[#8b6b45] bg-[#cda97e]' : 'border-[#8a7c6c] bg-[#e1d0b7]'}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Select biome: ${b.name}`}
                  accessibilityState={{ selected: selectedBiome === b.id }}
                >
                  <Text className="font-bold text-[#3e2723]">{b.name}</Text>
                  <Text className="text-xs text-[#5c4033] mt-1">{b.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="mt-6 text-xl font-bold text-[#3e2723]">{t('embark_challenge')}</Text>
            <View className="mt-2 flex-row gap-3">
              {CHALLENGES.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setSelectedChallenge(c.id)}
                  className={`flex-1 rounded-xl border p-3 ${selectedChallenge === c.id ? 'border-[#8b6b45] bg-[#cda97e]' : 'border-[#8a7c6c] bg-[#e1d0b7]'}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Select challenge: ${c.name}`}
                  accessibilityState={{ selected: selectedChallenge === c.id }}
                >
                  <Text className="font-bold text-[#3e2723]">{c.name}</Text>
                  <Text className="text-xs text-[#5c4033] mt-1">{c.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View className="mt-6 flex-row gap-6">
              <View className="flex-1">
                <Text className="text-xl font-bold text-[#3e2723]">{t('embark_map_size')}</Text>
                <View className="mt-2 flex-row gap-3">
                  {MAP_SIZES.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      onPress={() => setSelectedSize(s.id)}
                      className={`flex-1 items-center justify-center rounded-xl border p-3 ${selectedSize === s.id ? 'border-[#8b6b45] bg-[#cda97e]' : 'border-[#8a7c6c] bg-[#e1d0b7]'}`}
                      accessibilityRole="button"
                      accessibilityLabel={`Map size: ${s.name}`}
                      accessibilityState={{ selected: selectedSize === s.id }}
                    >
                      <Text className="font-bold text-[#3e2723]">{s.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View className="flex-1">
                <Text className="text-xl font-bold text-[#3e2723]">{t('embark_seed')}</Text>
                <TextInput
                  value={seedInput}
                  onChangeText={setSeedInput}
                  placeholder={t('embark_seed_placeholder')}
                  placeholderTextColor="#8a7c6c"
                  className="mt-2 flex-1 rounded-xl border border-[#8a7c6c] bg-[#e1d0b7] px-4 py-3 font-bold text-[#3e2723]"
                />
              </View>
            </View>

            <Text className="mt-6 text-xl font-bold text-[#3e2723]">{t('embark_spells')}</Text>
            <View className="mt-2 flex-row flex-wrap gap-3">
              {(Object.keys(SPELLS) as SpellType[]).map((spellId) => {
                if (!spellUnlocks[spellId]) return null;
                const spell = SPELLS[spellId];
                const isSelected = selectedSpells.includes(spellId);
                return (
                  <TouchableOpacity
                    key={spellId}
                    onPress={() => toggleSpell(spellId)}
                    className={`rounded-xl border p-3 ${isSelected ? 'border-[#8b6b45] bg-[#cda97e]' : 'border-[#8a7c6c] bg-[#e1d0b7]'}`}
                    accessibilityRole="button"
                    accessibilityLabel={`${isSelected ? 'Deselect' : 'Select'} spell: ${spell.name}`}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text className="font-bold text-[#3e2723]">
                      {spell.icon} {spell.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View className="mt-8 flex-row justify-end gap-4">
              <TouchableOpacity
                onPress={() => setEmbarkOpen(false)}
                className="rounded-xl border border-[#a88a44] bg-transparent px-6 py-3"
                accessibilityRole="button"
                accessibilityLabel="Cancel embark"
              >
                <Text className="font-bold text-[#4a3b22]">{t('btn_cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setEmbarkOpen(false);
                  const seedParam = seedInput.trim()
                    ? `&seed=${encodeURIComponent(seedInput.trim())}`
                    : '';
                  router.push(
                    `/game?mode=fresh&biome=${selectedBiome}&challenge=${selectedChallenge}&spells=${selectedSpells.join(',')}&mapSize=${selectedSize}${seedParam}`,
                  );
                }}
                className="rounded-xl border border-[#a88a44] bg-[#4a3b22] px-8 py-3"
                accessibilityRole="button"
                accessibilityLabel="Start run"
              >
                <Text className="text-lg font-bold text-[#f7ebd0]">{t('btn_start_run')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={marketOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMarketOpen(false)}
      >
        <View className="flex-1 items-center justify-center bg-[#0a0806]/90 px-4">
          <View className="max-h-[90%] w-full max-w-5xl rounded-[28px] border border-[#6b4a2f] bg-[#eadcc3] p-6">
            <View className="mb-6 flex-row items-center justify-between border-b border-[#6e4e31] pb-4">
              <View>
                <Text className="text-3xl font-bold text-[#3e2723]">{t('market_title')}</Text>
                <Text className="text-sm text-[#6e4e31]">{t('market_subtitle')}</Text>
              </View>
              <Text className="text-2xl font-bold text-[#c38115]">{coins} 🪙</Text>
            </View>

            <ScrollView contentContainerClassName="gap-4 pb-4">
              <Text className="mt-2 text-2xl font-bold text-[#3e2723]">
                {t('market_structures')}
              </Text>
              {marketItems.map(([type, building]) => {
                const isUnlocked = unlocks[type];
                const unlockCost = getUnlockCost(type);
                const canAfford = coins >= unlockCost;

                return (
                  <View key={type} className="rounded-2xl border border-[#8a6a44] bg-[#f3e8d5] p-4">
                    <View className="flex-row items-start justify-between gap-4">
                      <View className="flex-1">
                        <Text className="text-2xl font-bold text-[#3e2723]">
                          {building.icon} {building.name}
                        </Text>
                        <Text className="mt-1 text-sm leading-5 text-[#6e4e31]">
                          {building.role}
                        </Text>
                        <Text className="mt-2 text-xs uppercase tracking-[2px] text-[#75512d]">
                          {building.stats}
                        </Text>
                      </View>

                      {isUnlocked ? (
                        <View className="rounded-xl border border-[#8b6d3b] bg-[#dcc8aa] px-4 py-3">
                          <Text className="font-bold text-[#5c4033]">{t('market_unlocked')}</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          disabled={!canAfford}
                          onPress={() => {
                            void (async () => {
                              await purchaseBuildingUnlock(type);
                            })();
                          }}
                          className={`rounded-xl border px-4 py-3 ${
                            canAfford
                              ? 'border-[#a88a44] bg-[#4a3b22]'
                              : 'border-[#8a7c6c] bg-[#8a7c6c]'
                          }`}
                          accessibilityRole="button"
                          accessibilityLabel={`Unlock ${building.name} for ${unlockCost} coins`}
                          accessibilityState={{ disabled: !canAfford }}
                        >
                          <Text className="font-bold text-[#f7ebd0]">{unlockCost} 🪙</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}

              <Text className="mt-4 text-2xl font-bold text-[#3e2723]">{t('market_spells')}</Text>
              {(Object.keys(SPELLS) as SpellType[]).map((type) => {
                const isUnlocked = spellUnlocks[type];
                const unlockCost = 200;
                const canAfford = coins >= unlockCost;
                const spell = SPELLS[type];

                return (
                  <View key={type} className="rounded-2xl border border-[#8a6a44] bg-[#f3e8d5] p-4">
                    <View className="flex-row items-start justify-between gap-4">
                      <View className="flex-1">
                        <Text className="text-2xl font-bold text-[#3e2723]">
                          {spell.icon} {spell.name}
                        </Text>
                        <Text className="mt-1 text-sm leading-5 text-[#6e4e31]">{spell.desc}</Text>
                      </View>

                      {isUnlocked ? (
                        <View className="rounded-xl border border-[#8b6d3b] bg-[#dcc8aa] px-4 py-3">
                          <Text className="font-bold text-[#5c4033]">{t('market_unlocked')}</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          disabled={!canAfford}
                          onPress={() => {
                            void (async () => {
                              await purchaseSpellUnlock(type);
                            })();
                          }}
                          className={`rounded-xl border px-4 py-3 ${
                            canAfford
                              ? 'border-[#a88a44] bg-[#4a3b22]'
                              : 'border-[#8a7c6c] bg-[#8a7c6c]'
                          }`}
                          accessibilityRole="button"
                          accessibilityLabel={`Unlock ${spell.name} spell for ${unlockCost} coins`}
                          accessibilityState={{ disabled: !canAfford }}
                        >
                          <Text className="font-bold text-[#f7ebd0]">{unlockCost} 🪙</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              onPress={() => {
                soundManager.playUiClick();
                setMarketOpen(false);
              }}
              className="self-center rounded-xl border border-[#a88a44] bg-[#4a3b22] px-8 py-3 mt-4"
              accessibilityRole="button"
              accessibilityLabel="Return to court"
            >
              <Text className="text-lg font-bold text-[#f7ebd0]">{t('btn_return_to_court')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
