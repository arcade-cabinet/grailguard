/**
 * @module HUD
 *
 * In-game heads-up display overlay for Grailguard. Renders the top status
 * panel (phase label, wave counter, grail health, resources), the bottom
 * toolbar (building placement, garrison list, spells, game-speed toggle),
 * the selected-entity detail card, and the relic-draft modal shown after
 * defeating a boss.
 */
import * as Popover from '@rn-primitives/popover';
import * as Progress from '@rn-primitives/progress';
import * as Toolbar from '@rn-primitives/toolbar';
import * as Tooltip from '@rn-primitives/tooltip';
import type { Entity } from 'koota';
import { useQuery, useTrait } from 'koota/react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { BUILDINGS, type BuildingType } from '../../engine/constants';
import {
  Building,
  GameSession,
  gameWorld,
  getBuildingUpgradeCosts,
  queueWorldCommand,
  Unit,
  WaveState,
} from '../../engine/GameEngine';
import { soundManager } from '../../engine/SoundManager';

function BuildingCard({ entity, treasury }: { entity: Entity; treasury: number }) {
  const building = entity.get(Building);
  if (!building) return null;

  const config = BUILDINGS[building.type];
  const costs = getBuildingUpgradeCosts(entity);
  if (!costs) return null;

  const canUpgradeSpawn = building.levelSpawn < 5 && treasury >= costs.spawn.gold;
  const canUpgradeStats = building.levelStats < 5 && treasury >= costs.stats.gold;
  const canSell = true; // Always allow selling now

  return (
    <View className="rounded-2xl border border-[#8a6a44] bg-[#f3e8d5] p-4">
      <Text className="text-lg font-bold text-[#3e2723]">
        {config.icon} {config.name}
      </Text>
      {config.isTurret ? (
        <Text className="mt-1 text-sm text-[#6e4e31]">
          Rate Lv {building.levelSpawn} • Dmg Lv {building.levelStats}
        </Text>
      ) : building.type !== 'lumber' ? (
        <Text className="mt-1 text-sm text-[#6e4e31]">
          Spawn Lv {building.levelSpawn} • Stats Lv {building.levelStats}
        </Text>
      ) : (
        <Text className="mt-1 text-sm text-[#6e4e31]">
          Speed Lv {building.levelSpawn} • Output Lv {building.levelStats}
        </Text>
      )}
      <Text className="mt-1 text-xs uppercase tracking-[2px] text-[#75512d]">{config.stats}</Text>

      {config.isTurret && (
        <View className="mt-2 flex-row gap-2">
          {['first', 'strongest', 'weakest'].map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() =>
                queueWorldCommand({
                  type: 'setTargeting',
                  entityId: entity.id() as number,
                  targeting: t as 'first' | 'strongest' | 'weakest',
                })
              }
              className={`flex-1 rounded border p-2 ${building.targeting === t ? 'border-[#3b82f6] bg-[#1e3a8a]' : 'border-[#8f6a43] bg-[#3a281d]'}`}
            >
              <Text className="text-center text-xs font-bold text-[#f5e8cc] uppercase">{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View className="mt-3 flex-row gap-2">
        <TouchableOpacity
          disabled={!canUpgradeSpawn}
          onPress={() => {
            soundManager.playUiClick();
            queueWorldCommand({ type: 'upgrade', entityId: entity.id(), branch: 'spawn' });
          }}
          className={`flex-1 rounded-xl border px-3 py-2 ${
            canUpgradeSpawn ? 'border-[#3f6b3d] bg-[#355b31]' : 'border-[#b8ab97] bg-[#d7ccba]'
          }`}
        >
          <Text className="text-center font-bold text-[#f7ebd0]">
            {config.isTurret ? 'Rate' : 'Spawn'} {costs.spawn.gold}g
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={!canUpgradeStats}
          onPress={() => {
            soundManager.playUiClick();
            queueWorldCommand({ type: 'upgrade', entityId: entity.id(), branch: 'stats' });
          }}
          className={`flex-1 rounded-xl border px-3 py-2 ${
            canUpgradeStats ? 'border-[#35627d] bg-[#22455c]' : 'border-[#b8ab97] bg-[#d7ccba]'
          }`}
        >
          <Text className="text-center font-bold text-[#f7ebd0]">
            {config.isTurret ? 'Dmg' : 'Stats'} {costs.stats.gold}g
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        disabled={!canSell}
        onPress={() => queueWorldCommand({ type: 'sellBuilding', entityId: entity.id() })}
        className={`mt-2 rounded-xl border px-3 py-2 ${
          canSell ? 'border-[#8b3026] bg-[#6d241c]' : 'border-[#b8ab97] bg-[#d7ccba]'
        }`}
      >
        <Text className="text-center font-bold text-[#f7ebd0]">
          Sell for {costs.sell}g {Math.floor((config.woodCost ?? 0) * 0.5)}w
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function WallCard({ entity }: { entity: Entity }) {
  const unit = entity.get(Unit);
  if (!unit || unit.type !== 'wall') return null;

  return (
    <View className="rounded-2xl border border-[#8a6a44] bg-[#f3e8d5] p-4">
      <Text className="text-lg font-bold text-[#3e2723]">🚧 Barricade</Text>
      <Text className="mt-1 text-sm text-[#6e4e31]">
        Roadblock holding the line for your militia.
      </Text>
      <Text className="mt-1 text-xs uppercase tracking-[2px] text-[#75512d]">
        HP {Math.ceil(unit.hp)} / {Math.ceil(unit.maxHp)}
      </Text>
      <TouchableOpacity
        onPress={() => queueWorldCommand({ type: 'sellWall', entityId: entity.id() })}
        className={`mt-3 rounded-xl border px-3 py-2 border-[#8b3026] bg-[#6d241c]`}
      >
        <Text className="text-center font-bold text-[#f7ebd0]">
          Scrap for {Math.floor((BUILDINGS.wall.woodCost ?? 0) * 0.5)}w
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function MedievalProgress({
  label,
  value,
  max,
  tint,
  suffix = '',
}: {
  label: string;
  value: number;
  max: number;
  tint: string;
  suffix?: string;
}) {
  const percent = max === 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <View className="flex-1">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-[11px] font-bold uppercase tracking-[3px] text-[#e7d5b8]">
          {label}
        </Text>
        <Text className="text-sm font-semibold text-[#f8eed8]">
          {Math.ceil(value)}
          {suffix}
        </Text>
      </View>
      <Progress.Root
        value={percent}
        className="h-3 overflow-hidden rounded-full border border-[#8c6a43] bg-[#2c1e17]"
      >
        <Progress.Indicator
          className="h-full rounded-full"
          style={{ width: `${percent}%`, backgroundColor: tint }}
        />
      </Progress.Root>
    </View>
  );
}

/**
 * Primary in-game HUD component. Renders the full overlay on top of the 3D
 * canvas, including:
 * - Top panel: phase label, wave number, grail health bar, resource totals,
 *   build timer / spell cooldown bar, and a "Call Wave" button during build
 *   phase.
 * - Bottom toolbar: building placement popover ("Toychest"), garrison list,
 *   active spell buttons, game-speed toggle, and exit button.
 * - Selected entity detail card with upgrade/sell actions.
 * - Boss-defeat relic draft modal.
 * - Screen flash and announcement banner overlays.
 *
 * @param props.activePlacement - The building type currently being placed, or `null`.
 * @param props.onExit - Callback to leave the game and return to the main menu.
 * @param props.onCancelPlacement - Callback to cancel the current placement mode.
 * @param props.onClearSelection - Callback to deselect the currently selected entity.
 * @param props.onSelectPlacement - Callback invoked when the player picks a building to place.
 * @param props.selectedEntity - The currently selected entity, or `null`.
 * @param props.unlocked - Record indicating which building types the player has unlocked.
 */
export function HUD({
  activePlacement,
  onExit,
  onCancelPlacement,
  onClearSelection,
  onSelectPlacement,
  selectedEntity,
  unlocked,
}: {
  activePlacement: BuildingType | null;
  onExit: () => void;
  onCancelPlacement: () => void;
  onClearSelection: () => void;
  onSelectPlacement: (type: BuildingType) => void;
  selectedEntity: Entity | null;
  unlocked: Record<BuildingType, boolean>;
}) {
  const session = useTrait(gameWorld, GameSession);
  const waveState = useTrait(gameWorld, WaveState);
  const buildingEntities = useQuery(Building);
  const wallEntities = useQuery(Unit).filter((entity) => entity.get(Unit)?.type === 'wall');

  if (!session) return null;

  const phaseLabel =
    session.phase === 'game_over'
      ? 'Grail Lost'
      : session.phase === 'build'
        ? 'Build Phase'
        : 'Battle Phase';

  return (
    <View className="absolute inset-0 justify-between px-4 pb-5 pt-12" pointerEvents="box-none">
      {session.screenFlash > 0 ? (
        <View
          className="absolute inset-0"
          pointerEvents="none"
          style={{ backgroundColor: session.screenFlashColor, opacity: session.screenFlash * 0.55 }}
        />
      ) : null}

      {session.bannerLife > 0 ? (
        <View className="absolute left-0 right-0 top-28 items-center" pointerEvents="none">
          <View
            className={`min-w-[260px] rounded-[28px] border px-6 py-4 ${
              session.bannerTone === 'danger'
                ? 'border-[#d77a7a] bg-[#3a1212]/92'
                : 'border-[#d4af37] bg-[#2c2110]/92'
            }`}
            style={{
              opacity: Math.max(
                0,
                Math.min(1, session.bannerLife / Math.max(0.01, session.bannerMaxLife)),
              ),
              transform: [
                {
                  scale:
                    0.92 +
                    Math.min(1, session.bannerLife / Math.max(0.01, session.bannerMaxLife)) * 0.08,
                },
              ],
            }}
          >
            <Text
              className={`text-center text-[11px] font-bold uppercase tracking-[4px] ${
                session.bannerTone === 'danger' ? 'text-[#f3b2b2]' : 'text-[#d9c089]'
              }`}
            >
              {session.bannerTone === 'danger' ? 'Dire Omen' : 'Holy Decree'}
            </Text>
            <Text
              className={`mt-1 text-center text-2xl font-bold ${
                session.bannerTone === 'danger' ? 'text-[#fff1f1]' : 'text-[#fff2d4]'
              }`}
            >
              {session.bannerText}
            </Text>
          </View>
        </View>
      ) : null}

      <View className="rounded-[26px] border border-[#6b4a2f] bg-[#2b1b14]/95 px-4 py-4">
        <View className="flex-row items-center justify-between gap-4">
          <View className="flex-1">
            <Text className="text-[11px] font-bold uppercase tracking-[4px] text-[#b98b52]">
              Sanctum Condition
            </Text>
            <Text className="mt-1 text-3xl font-bold text-[#f5e8cc]">{phaseLabel}</Text>
          </View>

          {session.phase === 'build' ? (
            <TouchableOpacity
              onPress={() => queueWorldCommand({ type: 'skipBuildPhase' })}
              className="rounded-xl border border-[#b03d2e] bg-[#7a1f17] px-4 py-2"
            >
              <Text className="font-bold text-[#fff0ec]">Call Wave</Text>
            </TouchableOpacity>
          ) : null}

          <View className="items-end">
            <Text className="text-[11px] font-bold uppercase tracking-[3px] text-[#b98b52]">
              Wave
            </Text>
            <Text className="text-4xl font-bold text-[#d4af37]">{session.wave}</Text>
          </View>
        </View>

        <View className="mt-5 flex-row gap-4">
          <MedievalProgress label="Grail" value={session.health} max={20} tint="#dc2626" />
          <MedievalProgress
            label={session.phase === 'build' ? 'Council Time' : 'Spells'}
            value={
              session.phase === 'build'
                ? session.buildTimeLeft
                : Math.max(...Object.values(session.spellCooldowns), 0)
            }
            max={session.phase === 'build' ? 60 : 15}
            tint={session.phase === 'build' ? '#d4af37' : '#3b82f6'}
            suffix={session.phase === 'build' ? 's' : 's'}
          />
        </View>

        <View className="mt-4 flex-row items-center justify-between">
          <View>
            <Text className="text-lg font-semibold text-[#f4e6ca]">
              Bank: {session.gold}g | {session.wood}w | {session.ore}o | {session.gem}💎 |{' '}
              {Math.floor(session.faith)}f
            </Text>
            {waveState && (
              <Text className="text-xs font-bold text-[#8b5a2b]">
                {Object.entries(
                  waveState.spawnQueue.reduce(
                    (acc, curr) => {
                      acc[curr.type] = (acc[curr.type] || 0) + 1;
                      return acc;
                    },
                    {} as Record<string, number>,
                  ),
                )
                  .map(([type, count]) => `${type} x${count}`)
                  .join(' • ')}
              </Text>
            )}
          </View>
          <Text className="text-sm tracking-[2px] text-[#c7b08c]">{session.announcement}</Text>
        </View>
      </View>

      <View className="gap-3">
        <Toolbar.Root className="rounded-[24px] border border-[#6b4a2f] bg-[#241711]/95 p-3">
          <View className="flex-row items-center justify-between gap-3">
            <Popover.Root>
              <Popover.Trigger asChild>
                <Toolbar.Button className="rounded-2xl border border-[#8f6a43] bg-[#4c321e] px-5 py-4">
                  <Text className="text-lg font-bold text-[#f5e8cc]">Toychest</Text>
                </Toolbar.Button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Overlay className="absolute inset-0 bg-black/20" />
                <Popover.Content
                  sideOffset={12}
                  className="rounded-[24px] border border-[#8c6a43] bg-[#ead9bc] p-4"
                >
                  <Text className="mb-3 text-lg font-bold text-[#3e2723]">Relics of Defense</Text>
                  <ScrollView className="max-h-80" contentContainerClassName="gap-3">
                    {(Object.keys(BUILDINGS) as BuildingType[])
                      .filter((type) => unlocked[type])
                      .map((type) => {
                        const building = BUILDINGS[type];
                        const woodCost = building.woodCost ?? 0;
                        const oreCost = building.oreCost ?? 0;
                        const affordable =
                          session.gold >= building.cost &&
                          session.wood >= woodCost &&
                          session.ore >= oreCost;

                        const costLabel = [
                          building.cost > 0 ? `${building.cost}g` : null,
                          woodCost > 0 ? `${woodCost}w` : null,
                          oreCost > 0 ? `${oreCost}o` : null,
                        ]
                          .filter(Boolean)
                          .join(' ');

                        return (
                          <Tooltip.Root key={type}>
                            <Tooltip.Trigger asChild>
                              <TouchableOpacity
                                disabled={!affordable}
                                onPress={() => onSelectPlacement(type)}
                                className={`rounded-2xl border px-4 py-3 ${
                                  activePlacement === type
                                    ? 'border-[#d4af37] bg-[#fff3db]'
                                    : affordable
                                      ? 'border-[#8c6a43] bg-[#f6ebd8]'
                                      : 'border-[#c6b59d] bg-[#eadcc9]'
                                }`}
                              >
                                <Text className="text-base font-bold text-[#3e2723]">
                                  {building.icon} {building.name} • {costLabel}
                                </Text>
                                <Text className="mt-1 text-sm text-[#6e4e31]">{building.role}</Text>
                              </TouchableOpacity>
                            </Tooltip.Trigger>
                            <Tooltip.Portal>
                              <Tooltip.Content
                                side="top"
                                className="rounded-xl border border-[#6b4a2f] bg-[#2b1c14] px-3 py-2"
                              >
                                <Text className="text-sm text-[#f6e6c7]">{building.stats}</Text>
                              </Tooltip.Content>
                            </Tooltip.Portal>
                          </Tooltip.Root>
                        );
                      })}
                  </ScrollView>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>

            <View className="flex-1 flex-row justify-end gap-3">
              <Popover.Root>
                <Popover.Trigger asChild>
                  <Toolbar.Button className="rounded-2xl border border-[#8f6a43] bg-[#4b2b1d] px-4 py-4">
                    <Text className="font-bold text-[#f5e8cc]">
                      Garrison {buildingEntities.length + wallEntities.length}
                    </Text>
                  </Toolbar.Button>
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Overlay className="absolute inset-0 bg-black/20" />
                  <Popover.Content
                    sideOffset={12}
                    className="rounded-[24px] border border-[#8c6a43] bg-[#ead9bc] p-4"
                  >
                    <Text className="mb-3 text-lg font-bold text-[#3e2723]">Built Defenses</Text>
                    <ScrollView className="max-h-96" contentContainerClassName="gap-3">
                      {buildingEntities.length === 0 && wallEntities.length === 0 ? (
                        <Text className="text-sm text-[#6e4e31]">
                          No structures raised yet. Open the Toychest during build phase.
                        </Text>
                      ) : null}
                      {buildingEntities.map((entity) => (
                        <BuildingCard key={entity.id()} entity={entity} treasury={session.gold} />
                      ))}
                      {wallEntities.map((entity) => (
                        <WallCard key={entity.id()} entity={entity} />
                      ))}
                    </ScrollView>
                  </Popover.Content>
                </Popover.Portal>
              </Popover.Root>

              {session.activeSpells.map((spell) => {
                const cd = session.spellCooldowns[spell] ?? 0;
                const cost = spell === 'meteor_strike' ? 35 : spell === 'divine_shield' ? 40 : 25;
                const spellName =
                  spell === 'smite'
                    ? 'Smite'
                    : spell === 'holy_nova'
                      ? 'Holy Nova'
                      : spell === 'zealous_haste'
                        ? 'Haste'
                        : spell === 'earthquake'
                          ? 'Quake'
                          : spell === 'meteor_strike'
                            ? 'Meteor'
                            : spell === 'divine_shield'
                              ? 'Shield'
                              : spell;
                return (
                  <Toolbar.Button
                    key={spell}
                    disabled={
                      cd > 0 ||
                      session.phase === 'build' ||
                      session.gameOver ||
                      session.faith < cost
                    }
                    onPress={() => queueWorldCommand({ type: 'castSpell', spellId: spell })}
                    className={`rounded-2xl border px-4 py-4 ${
                      cd === 0 &&
                      session.phase === 'defend' &&
                      !session.gameOver &&
                      session.faith >= cost
                        ? 'border-[#3b82f6] bg-[#1e3a8a]'
                        : 'border-[#475569] bg-[#334155]'
                    }`}
                  >
                    <Text className="font-bold text-[#dcecff]">
                      {spellName} {cd > 0 ? `(${Math.ceil(cd)}s)` : `(${cost}f)`}
                    </Text>
                  </Toolbar.Button>
                );
              })}

              <Toolbar.Button
                onPress={() => queueWorldCommand({ type: 'toggleGameSpeed' })}
                className="rounded-2xl border border-[#8f6a43] bg-[#352418] px-4 py-4"
              >
                <Text className="font-bold text-[#f5e8cc]">{session.gameSpeed}x</Text>
              </Toolbar.Button>

              {session.phase === 'build' && (
                <Toolbar.Button
                  onPress={() => {
                    soundManager.playUiClick();
                    onCancelPlacement();
                  }}
                  className="rounded-2xl border border-[#8f6a43] bg-[#3a281d] px-4 py-4"
                >
                  <Text className="font-bold text-[#f5e8cc]">
                    {activePlacement ? `Placing ${BUILDINGS[activePlacement].name}` : 'Cancel Tool'}
                  </Text>
                </Toolbar.Button>
              )}

              <Toolbar.Button
                onPress={() => {
                  soundManager.playUiClick();
                  onExit();
                }}
                className="rounded-2xl border border-[#7d5d3f] bg-[#1e1410] px-4 py-4"
              >
                <Text className="font-bold text-[#f5e8cc]">Leave</Text>
              </Toolbar.Button>
            </View>
          </View>
        </Toolbar.Root>

        {selectedEntity?.isAlive() && !session.gameOver ? (
          <View className="rounded-[24px] border border-[#8b6a44] bg-[#ead9bc]/95 px-4 py-4">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-[#3e2723]">Selected Defense</Text>
              <TouchableOpacity
                onPress={() => {
                  soundManager.playUiClick();
                  onClearSelection();
                }}
                className="rounded-xl border border-[#8f6a43] bg-[#3a281d] px-3 py-2"
              >
                <Text className="font-bold text-[#f5e8cc]">Close</Text>
              </TouchableOpacity>
            </View>

            {selectedEntity.get(Building) ? (
              <BuildingCard entity={selectedEntity} treasury={session.gold} />
            ) : selectedEntity.get(Unit)?.type === 'wall' ? (
              <WallCard entity={selectedEntity} />
            ) : null}
          </View>
        ) : null}
      </View>

      <Modal visible={session.pendingRelicDraft} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-[#0a0806]/90 px-4">
          <View className="w-full max-w-2xl rounded-[28px] border border-[#d4af37] bg-[#241711] p-6 shadow-2xl">
            <Text className="text-center text-3xl font-bold text-[#f0dfbe]">Relic Draft</Text>
            <Text className="mt-2 text-center text-[#c7b08c]">
              The Boss is defeated. Choose a blessing for the trials ahead.
            </Text>
            <View className="mt-8 flex-row flex-wrap justify-center gap-4">
              {[
                {
                  id: 'venomous_fletching',
                  name: 'Venomous Fletching',
                  desc: 'Archers apply poison damage over time.',
                },
                {
                  id: 'martyrs_blood',
                  name: "Martyr's Blood",
                  desc: 'Dying allies heal surrounding units.',
                },
                {
                  id: 'golden_age',
                  name: 'Golden Age',
                  desc: 'Earn 5% interest on unspent gold per wave.',
                },
                {
                  id: 'crystal_lens',
                  name: 'Crystal Lens',
                  desc: 'Obelisks deal +50% damage but fire 20% slower.',
                },
                {
                  id: 'miners_lantern',
                  name: "Miner's Lantern",
                  desc: 'Resource carts move twice as fast.',
                },
                { id: 'iron_tracks', name: 'Iron Tracks', desc: 'Minecart tracks cost no wood.' },
                {
                  id: 'blessed_pickaxe',
                  name: 'Blessed Pickaxe',
                  desc: 'Gem mines extract 2 gems at a time.',
                },
                {
                  id: 'war_horn',
                  name: 'War Horn',
                  desc: 'Allied units spawn with immediate attacks ready.',
                },
              ].map((relic) => (
                <TouchableOpacity
                  key={relic.id}
                  onPress={() => queueWorldCommand({ type: 'draftRelic', relicId: relic.id })}
                  className="w-[30%] rounded-xl border border-[#8a6a44] bg-[#3a281d] p-4"
                >
                  <Text className="text-center text-lg font-bold text-[#f5e8cc]">{relic.name}</Text>
                  <Text className="mt-2 text-center text-sm text-[#b8ab97]">{relic.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
