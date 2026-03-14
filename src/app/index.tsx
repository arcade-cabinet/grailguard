/**
 * @module index
 *
 * Main menu screen for Grailguard. Presents the title card, treasury
 * balance, and navigation to Embark (new run), Continue Run, Royal Market
 * (meta-progression unlocks), Codex, Doctrine, and Settings. Includes
 * modals for the Embark flow (biome, challenge, map size, seed, and spell
 * selection) and the Royal Market (building and spell purchases).
 */
import * as Tooltip from '@radix-ui/react-tooltip';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

export function MainMenu() {
  const navigate = useNavigate();
  const { coins, hasActiveRun, settings, unlocks, spellUnlocks } = useMetaProgress();
  const [marketOpen, setMarketOpen] = useState(false);
  const [embarkOpen, setEmbarkOpen] = useState(false);
  const [selectedBiome, setSelectedBiome] = useState(BIOMES[0].id);
  const [selectedChallenge, setSelectedChallenge] = useState(CHALLENGES[0].id);
  const [selectedSpells, setSelectedSpells] = useState<string[]>(['smite']);
  const [selectedSize, setSelectedSize] = useState(100);
  const [seedInput, setSeedInput] = useState('');
  const [governorEnabled, setGovernorEnabled] = useState(false);

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
    <Tooltip.Provider>
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#1a120d] px-6">
        <div className="absolute inset-0 bg-[#120b08]" />
        <div className="absolute inset-x-0 top-0 h-64 bg-[#6b3f1d]/25" />
        <div className="absolute bottom-[-120px] left-[-40px] h-72 w-72 rounded-full bg-[#d4af37]/10" />
        <div className="absolute right-[-60px] top-20 h-80 w-80 rounded-full bg-[#8b1e1e]/10" />

        <div className="relative z-10 w-full max-w-4xl rounded-[28px] border border-[#6b4a2f] bg-[#241711]/95 px-6 py-8 shadow-2xl">
          <p className="text-center text-xs font-semibold uppercase tracking-[5px] text-[#b98b52]">
            {t('app_subtitle')}
          </p>
          <h1 className="mt-3 text-center text-6xl font-bold text-[#ead7b0]">{t('app_title')}</h1>
          <p className="mt-3 text-center text-base leading-6 text-[#d7c6af]">
            {t('app_tagline')}
          </p>

          <div className="mt-8 rounded-[24px] border border-[#7f5b37] bg-[#e9d8be] px-6 py-5">
            <p className="text-center text-xs font-bold uppercase tracking-[4px] text-[#6e4e31]">
              {t('treasury_title')}
            </p>
            <p className="mt-2 text-center text-5xl font-bold text-[#c38115]">{coins} 🪙</p>
            <p className="mt-1 text-center text-sm text-[#6e4e31]">
              Theme: {settings?.theme ?? 'holy-grail'} &bull; Preferred speed:{' '}
              {settings?.preferredSpeed ?? 1}x
            </p>
          </div>

          <div className="mt-8 flex flex-row flex-wrap justify-center gap-4">
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playUiClick();
                    setEmbarkOpen(true);
                  }}
                  className="rounded-2xl border border-[#b98b52] bg-[#5a371f] px-10 py-4"
                  aria-label="Embark on a new run"
                >
                  <span className="text-2xl font-bold text-[#f6e6c7]">{t('btn_embark')}</span>
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  side="top"
                  className="rounded-xl border border-[#6b4a2f] bg-[#2b1c14] px-3 py-2"
                >
                  <span className="text-sm text-[#f6e6c7]">{t('btn_embark_tooltip')}</span>
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>

            {hasActiveRun ? (
              <button
                type="button"
                onClick={() => {
                  soundManager.playUiClick();
                  navigate('/game?mode=resume');
                }}
                className="rounded-2xl border border-[#8b6b45] bg-[#3c2818] px-8 py-4"
                aria-label="Continue active run"
              >
                <span className="text-xl font-bold text-[#e8d099]">{t('btn_continue_run')}</span>
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => {
                soundManager.playUiClick();
                setMarketOpen(true);
              }}
              className="rounded-2xl border border-[#8b6b45] bg-[#2d2118] px-8 py-4"
              aria-label="Open Royal Market"
            >
              <span className="text-xl font-bold text-[#e8d099]">{t('btn_royal_market')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playUiClick();
                navigate('/codex');
              }}
              className="rounded-2xl border border-[#8b6b45] bg-[#2d2118] px-8 py-4"
              aria-label="Open Codex"
            >
              <span className="text-xl font-bold text-[#e8d099]">{t('btn_codex')}</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/doctrine')}
              className="rounded-2xl border border-[#8b6b45] bg-[#2d2118] px-8 py-4"
              aria-label="Open Doctrine skill tree"
            >
              <span className="text-xl font-bold text-[#e8d099]">{t('btn_doctrine')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playUiClick();
                navigate('/history');
              }}
              className="rounded-2xl border border-[#8b6b45] bg-[#2d2118] px-8 py-4"
              aria-label="View run history"
            >
              <span className="text-xl font-bold text-[#e8d099]">History</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="rounded-2xl border border-[#8b6b45] bg-[#2d2118] px-8 py-4"
              aria-label="Open Settings"
            >
              <span className="text-xl font-bold text-[#e8d099]">{t('btn_settings')}</span>
            </button>
          </div>
        </div>

        {/* Embark Modal */}
        {embarkOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0806]/90 px-4">
            <div className="w-full max-w-2xl rounded-[28px] border border-[#6b4a2f] bg-[#eadcc3] p-6">
              <h2 className="text-3xl font-bold text-[#3e2723]">{t('embark_title')}</h2>
              <p className="mt-2 text-sm text-[#6e4e31]">{t('embark_subtitle')}</p>

              <h3 className="mt-6 text-xl font-bold text-[#3e2723]">{t('embark_biome')}</h3>
              <div className="mt-2 flex flex-row gap-3">
                {BIOMES.map((b) => (
                  <button
                    type="button"
                    key={b.id}
                    onClick={() => setSelectedBiome(b.id)}
                    className={`flex-1 rounded-xl border p-3 text-left ${selectedBiome === b.id ? 'border-[#8b6b45] bg-[#cda97e]' : 'border-[#8a7c6c] bg-[#e1d0b7]'}`}
                    aria-label={`Select biome: ${b.name}`}
                    aria-pressed={selectedBiome === b.id}
                  >
                    <span className="font-bold text-[#3e2723]">{b.name}</span>
                    <span className="mt-1 block text-xs text-[#5c4033]">{b.desc}</span>
                  </button>
                ))}
              </div>

              <h3 className="mt-6 text-xl font-bold text-[#3e2723]">{t('embark_challenge')}</h3>
              <div className="mt-2 flex flex-row gap-3">
                {CHALLENGES.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setSelectedChallenge(c.id)}
                    className={`flex-1 rounded-xl border p-3 text-left ${selectedChallenge === c.id ? 'border-[#8b6b45] bg-[#cda97e]' : 'border-[#8a7c6c] bg-[#e1d0b7]'}`}
                    aria-label={`Select challenge: ${c.name}`}
                    aria-pressed={selectedChallenge === c.id}
                  >
                    <span className="font-bold text-[#3e2723]">{c.name}</span>
                    <span className="mt-1 block text-xs text-[#5c4033]">{c.desc}</span>
                  </button>
                ))}
              </div>

              <div className="mt-6 flex flex-row gap-6">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-[#3e2723]">{t('embark_map_size')}</h3>
                  <div className="mt-2 flex flex-row gap-3">
                    {MAP_SIZES.map((s) => (
                      <button
                        type="button"
                        key={s.id}
                        onClick={() => setSelectedSize(s.id)}
                        className={`flex-1 items-center justify-center rounded-xl border p-3 text-center ${selectedSize === s.id ? 'border-[#8b6b45] bg-[#cda97e]' : 'border-[#8a7c6c] bg-[#e1d0b7]'}`}
                        aria-label={`Map size: ${s.name}`}
                        aria-pressed={selectedSize === s.id}
                      >
                        <span className="font-bold text-[#3e2723]">{s.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-[#3e2723]">{t('embark_seed')}</h3>
                  <input
                    type="text"
                    value={seedInput}
                    onChange={(e) => setSeedInput(e.target.value)}
                    placeholder={t('embark_seed_placeholder')}
                    className="mt-2 w-full rounded-xl border border-[#8a7c6c] bg-[#e1d0b7] px-4 py-3 font-bold text-[#3e2723] placeholder-[#8a7c6c]"
                  />
                </div>
              </div>

              <h3 className="mt-6 text-xl font-bold text-[#3e2723]">{t('embark_spells')}</h3>
              <div className="mt-2 flex flex-row flex-wrap gap-3">
                {(Object.keys(SPELLS) as SpellType[]).map((spellId) => {
                  if (!spellUnlocks[spellId]) return null;
                  const spell = SPELLS[spellId];
                  const isSelected = selectedSpells.includes(spellId);
                  return (
                    <button
                      type="button"
                      key={spellId}
                      onClick={() => toggleSpell(spellId)}
                      className={`rounded-xl border p-3 ${isSelected ? 'border-[#8b6b45] bg-[#cda97e]' : 'border-[#8a7c6c] bg-[#e1d0b7]'}`}
                      aria-label={`${isSelected ? 'Deselect' : 'Select'} spell: ${spell.name}`}
                      aria-pressed={isSelected}
                    >
                      <span className="font-bold text-[#3e2723]">
                        {spell.icon} {spell.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={() => setGovernorEnabled(!governorEnabled)}
                  className={`rounded-xl border p-3 ${governorEnabled ? 'border-[#8b6b45] bg-[#cda97e]' : 'border-[#8a7c6c] bg-[#e1d0b7]'}`}
                  role="switch"
                  aria-checked={governorEnabled}
                  aria-label="Enable AI Governor auto-play"
                >
                  <span className="font-bold text-[#3e2723]">{t('embark_governor')}</span>
                </button>
              </div>

              <div className="mt-8 flex flex-row justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setEmbarkOpen(false)}
                  className="rounded-xl border border-[#a88a44] bg-transparent px-6 py-3"
                  aria-label="Cancel embark"
                >
                  <span className="font-bold text-[#4a3b22]">{t('btn_cancel')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmbarkOpen(false);
                    const seedParam = seedInput.trim()
                      ? `&seed=${encodeURIComponent(seedInput.trim())}`
                      : '';
                    const governorParam = governorEnabled ? '&governor=1' : '';
                    navigate(
                      `/game?mode=fresh&biome=${selectedBiome}&challenge=${selectedChallenge}&spells=${selectedSpells.join(',')}&mapSize=${selectedSize}${seedParam}${governorParam}`,
                    );
                  }}
                  className="rounded-xl border border-[#a88a44] bg-[#4a3b22] px-8 py-3"
                  aria-label="Start run"
                >
                  <span className="text-lg font-bold text-[#f7ebd0]">{t('btn_start_run')}</span>
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Market Modal */}
        {marketOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0806]/90 px-4">
            <div className="max-h-[90%] w-full max-w-5xl overflow-auto rounded-[28px] border border-[#6b4a2f] bg-[#eadcc3] p-6">
              <div className="mb-6 flex flex-row items-center justify-between border-b border-[#6e4e31] pb-4">
                <div>
                  <h2 className="text-3xl font-bold text-[#3e2723]">{t('market_title')}</h2>
                  <p className="text-sm text-[#6e4e31]">{t('market_subtitle')}</p>
                </div>
                <span className="text-2xl font-bold text-[#c38115]">{coins} 🪙</span>
              </div>

              <div className="flex flex-col gap-4 pb-4">
                <h3 className="mt-2 text-2xl font-bold text-[#3e2723]">
                  {t('market_structures')}
                </h3>
                {marketItems.map(([type, building]) => {
                  const isUnlocked = unlocks[type];
                  const unlockCost = getUnlockCost(type);
                  const canAfford = coins >= unlockCost;

                  return (
                    <div key={type} className="rounded-2xl border border-[#8a6a44] bg-[#f3e8d5] p-4">
                      <div className="flex flex-row items-start justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="text-2xl font-bold text-[#3e2723]">
                            {building.icon} {building.name}
                          </h4>
                          <p className="mt-1 text-sm leading-5 text-[#6e4e31]">
                            {building.role}
                          </p>
                          <p className="mt-2 text-xs uppercase tracking-[2px] text-[#75512d]">
                            {building.stats}
                          </p>
                        </div>

                        {isUnlocked ? (
                          <div className="rounded-xl border border-[#8b6d3b] bg-[#dcc8aa] px-4 py-3">
                            <span className="font-bold text-[#5c4033]">{t('market_unlocked')}</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={!canAfford}
                            onClick={() => {
                              void (async () => {
                                await purchaseBuildingUnlock(type);
                              })();
                            }}
                            className={`rounded-xl border px-4 py-3 ${
                              canAfford
                                ? 'border-[#a88a44] bg-[#4a3b22]'
                                : 'border-[#8a7c6c] bg-[#8a7c6c]'
                            }`}
                            aria-label={`Unlock ${building.name} for ${unlockCost} coins`}
                            aria-disabled={!canAfford}
                          >
                            <span className="font-bold text-[#f7ebd0]">{unlockCost} 🪙</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                <h3 className="mt-4 text-2xl font-bold text-[#3e2723]">{t('market_spells')}</h3>
                {(Object.keys(SPELLS) as SpellType[]).map((type) => {
                  const isUnlocked = spellUnlocks[type];
                  const unlockCost = 200;
                  const canAfford = coins >= unlockCost;
                  const spell = SPELLS[type];

                  return (
                    <div key={type} className="rounded-2xl border border-[#8a6a44] bg-[#f3e8d5] p-4">
                      <div className="flex flex-row items-start justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="text-2xl font-bold text-[#3e2723]">
                            {spell.icon} {spell.name}
                          </h4>
                          <p className="mt-1 text-sm leading-5 text-[#6e4e31]">{spell.desc}</p>
                        </div>

                        {isUnlocked ? (
                          <div className="rounded-xl border border-[#8b6d3b] bg-[#dcc8aa] px-4 py-3">
                            <span className="font-bold text-[#5c4033]">{t('market_unlocked')}</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={!canAfford}
                            onClick={() => {
                              void (async () => {
                                await purchaseSpellUnlock(type);
                              })();
                            }}
                            className={`rounded-xl border px-4 py-3 ${
                              canAfford
                                ? 'border-[#a88a44] bg-[#4a3b22]'
                                : 'border-[#8a7c6c] bg-[#8a7c6c]'
                            }`}
                            aria-label={`Unlock ${spell.name} spell for ${unlockCost} coins`}
                            aria-disabled={!canAfford}
                          >
                            <span className="font-bold text-[#f7ebd0]">{unlockCost} 🪙</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => {
                  soundManager.playUiClick();
                  setMarketOpen(false);
                }}
                className="mx-auto mt-4 block rounded-xl border border-[#a88a44] bg-[#4a3b22] px-8 py-3"
                aria-label="Return to court"
              >
                <span className="text-lg font-bold text-[#f7ebd0]">{t('btn_return_to_court')}</span>
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </Tooltip.Provider>
  );
}
