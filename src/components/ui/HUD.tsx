/**
 * @module HUD
 *
 * In-game heads-up display overlay for Grailguard. Renders the top status
 * panel (phase label, wave counter, grail health, resources), the bottom
 * toolbar (building placement, garrison list, spells, game-speed toggle),
 * the selected-entity detail card, and the relic-draft modal shown after
 * defeating a boss.
 */
import * as Popover from '@radix-ui/react-popover';
import * as Toolbar from '@radix-ui/react-toolbar';
import * as Tooltip from '@radix-ui/react-tooltip';
import type { Entity } from 'koota';
import { useQuery, useTrait } from 'koota/react';
import { useMetaProgress } from '../../db/meta';
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
import { t } from '../../i18n';

/** Returns high-contrast border styles when enabled. */
function highContrastStyle(enabled: boolean): React.CSSProperties {
  if (!enabled) return {};
  return { borderWidth: 2, borderColor: '#fff' };
}

/** Returns high-contrast text opacity when enabled. */
function highContrastTextStyle(enabled: boolean): React.CSSProperties {
  if (!enabled) return {};
  return { opacity: 1 };
}

function BuildingCard({
  entity,
  treasury,
  phase,
}: {
  entity: Entity;
  treasury: number;
  phase: string;
}) {
  const building = entity.get(Building);
  if (!building) return null;

  const config = BUILDINGS[building.type];
  const costs = getBuildingUpgradeCosts(entity);
  if (!costs) return null;

  const canUpgradeSpawn = building.levelSpawn < 5 && treasury >= costs.spawn.gold;
  const canUpgradeStats = building.levelStats < 5 && treasury >= costs.stats.gold;
  const isBuildPhase = phase === 'build';

  return (
    <div className="rounded-2xl border border-[#8a6a44] bg-[#f3e8d5] p-4">
      <h4 className="text-lg font-bold text-[#3e2723]">
        {config.icon} {config.name}
      </h4>
      {config.isTurret ? (
        <p className="mt-1 text-sm text-[#6e4e31]">
          Rate Lv {building.levelSpawn} &bull; Dmg Lv {building.levelStats}
        </p>
      ) : building.type !== 'lumber' ? (
        <p className="mt-1 text-sm text-[#6e4e31]">
          Spawn Lv {building.levelSpawn} &bull; Stats Lv {building.levelStats}
        </p>
      ) : (
        <p className="mt-1 text-sm text-[#6e4e31]">
          Speed Lv {building.levelSpawn} &bull; Output Lv {building.levelStats}
        </p>
      )}
      <p className="mt-1 text-xs uppercase tracking-[2px] text-[#75512d]">{config.stats}</p>

      {config.isTurret && (
        <div className="mt-2 flex flex-row gap-2">
          {(['first', 'strongest', 'weakest'] as const).map((tgt) => (
            <button
              type="button"
              key={tgt}
              onClick={() =>
                queueWorldCommand({
                  type: 'setTargeting',
                  entityId: entity.id() as number,
                  targeting: tgt,
                })
              }
              className={`flex-1 rounded border p-2 ${building.targeting === tgt ? 'border-[#3b82f6] bg-[#1e3a8a]' : 'border-[#8f6a43] bg-[#3a281d]'}`}
              aria-label={`Target ${tgt} enemy`}
              aria-pressed={building.targeting === tgt}
            >
              <span className="text-center text-xs font-bold uppercase text-[#f5e8cc]">{tgt}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-row gap-2">
        <button
          type="button"
          disabled={!canUpgradeSpawn}
          onClick={() => {
            soundManager.playUiClick();
            queueWorldCommand({ type: 'upgrade', entityId: entity.id(), branch: 'spawn' });
          }}
          className={`flex-1 rounded-xl border px-3 py-2 ${
            canUpgradeSpawn ? 'border-[#3f6b3d] bg-[#355b31]' : 'border-[#b8ab97] bg-[#d7ccba]'
          }`}
          aria-label={`Upgrade ${config.isTurret ? 'rate' : 'spawn'} for ${costs.spawn.gold} gold`}
          aria-disabled={!canUpgradeSpawn}
        >
          <span className="text-center font-bold text-[#f7ebd0]">
            {config.isTurret ? 'Rate' : 'Spawn'} {costs.spawn.gold}g
          </span>
        </button>
        <button
          type="button"
          disabled={!canUpgradeStats}
          onClick={() => {
            soundManager.playUiClick();
            queueWorldCommand({ type: 'upgrade', entityId: entity.id(), branch: 'stats' });
          }}
          className={`flex-1 rounded-xl border px-3 py-2 ${
            canUpgradeStats ? 'border-[#35627d] bg-[#22455c]' : 'border-[#b8ab97] bg-[#d7ccba]'
          }`}
          aria-label={`Upgrade ${config.isTurret ? 'damage' : 'stats'} for ${costs.stats.gold} gold`}
          aria-disabled={!canUpgradeStats}
        >
          <span className="text-center font-bold text-[#f7ebd0]">
            {config.isTurret ? 'Dmg' : 'Stats'} {costs.stats.gold}g
          </span>
        </button>
      </div>

      {isBuildPhase && (
        <button
          type="button"
          onClick={() => {
            soundManager.playUiClick();
            queueWorldCommand({ type: 'sellBuilding', entityId: entity.id() });
          }}
          className="mt-2 w-full rounded-xl border border-[#8b3026] bg-[#6d241c] px-3 py-2"
          aria-label={`Sell ${config.name} for ${costs.sell} gold`}
        >
          <span className="text-center font-bold text-[#f7ebd0]">
            Sell for {costs.sell}g {Math.floor((config.woodCost ?? 0) * 0.5)}w
          </span>
        </button>
      )}
    </div>
  );
}

function WallCard({ entity }: { entity: Entity }) {
  const unit = entity.get(Unit);
  if (!unit || unit.type !== 'wall') return null;

  return (
    <div className="rounded-2xl border border-[#8a6a44] bg-[#f3e8d5] p-4">
      <h4 className="text-lg font-bold text-[#3e2723]">{t('hud_barricade')}</h4>
      <p className="mt-1 text-sm text-[#6e4e31]">{t('hud_barricade_desc')}</p>
      <p className="mt-1 text-xs uppercase tracking-[2px] text-[#75512d]">
        HP {Math.ceil(unit.hp)} / {Math.ceil(unit.maxHp)}
      </p>
      <button
        type="button"
        onClick={() => queueWorldCommand({ type: 'sellWall', entityId: entity.id() })}
        className="mt-3 w-full rounded-xl border border-[#8b3026] bg-[#6d241c] px-3 py-2"
        aria-label="Scrap barricade for wood"
      >
        <span className="text-center font-bold text-[#f7ebd0]">
          Scrap for {Math.floor((BUILDINGS.wall.woodCost ?? 0) * 0.5)}w
        </span>
      </button>
    </div>
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
    <div className="flex-1">
      <div className="mb-2 flex flex-row items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[3px] text-[#e7d5b8]">
          {label}
        </span>
        <span className="text-sm font-semibold text-[#f8eed8]">
          {Math.ceil(value)}
          {suffix}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full border border-[#8c6a43] bg-[#2c1e17]">
        <div
          className="h-full rounded-full transition-[width] duration-200"
          style={{ width: `${percent}%`, backgroundColor: tint }}
        />
      </div>
    </div>
  );
}

/**
 * Primary in-game HUD component.
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
  const { settings: metaSettings } = useMetaProgress();
  const hc = metaSettings?.highContrast ?? false;

  if (!session) return null;

  const phaseLabel =
    session.phase === 'game_over'
      ? t('hud_phase_game_over')
      : session.phase === 'build'
        ? t('hud_phase_build')
        : t('hud_phase_battle');

  return (
    <Tooltip.Provider>
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between px-4 pb-5 pt-12">
        {session.screenFlash > 0 ? (
          <div
            className="pointer-events-none absolute inset-0"
            style={{ backgroundColor: session.screenFlashColor, opacity: session.screenFlash * 0.55 }}
          />
        ) : null}

        {session.bannerLife > 0 ? (
          <div className="pointer-events-none absolute left-0 right-0 top-28 flex justify-center">
            <div
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
                transform: `scale(${
                  0.92 +
                  Math.min(1, session.bannerLife / Math.max(0.01, session.bannerMaxLife)) * 0.08
                })`,
              }}
            >
              <p
                className={`text-center text-[11px] font-bold uppercase tracking-[4px] ${
                  session.bannerTone === 'danger' ? 'text-[#f3b2b2]' : 'text-[#d9c089]'
                }`}
              >
                {session.bannerTone === 'danger' ? t('hud_banner_danger') : t('hud_banner_decree')}
              </p>
              <p
                className={`mt-1 text-center text-2xl font-bold ${
                  session.bannerTone === 'danger' ? 'text-[#fff1f1]' : 'text-[#fff2d4]'
                }`}
              >
                {session.bannerText}
              </p>
            </div>
          </div>
        ) : null}

        <div className="pointer-events-auto rounded-[26px] border border-[#6b4a2f] bg-[#2b1b14]/80 px-4 py-4 backdrop-blur-md">
          <div className="flex flex-row items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[4px] text-[#b98b52]">
                {t('hud_sanctum_condition')}
              </p>
              <h2 className="mt-1 text-3xl font-bold text-[#f5e8cc]">{phaseLabel}</h2>
            </div>

            {session.phase === 'build' ? (
              <button
                type="button"
                onClick={() => queueWorldCommand({ type: 'skipBuildPhase' })}
                className="rounded-xl border border-[#b03d2e] bg-[#7a1f17] px-4 py-2"
                style={highContrastStyle(hc)}
                aria-label="Call wave early"
              >
                <span className="font-bold text-[#fff0ec]">{t('btn_call_wave')}</span>
              </button>
            ) : null}

            <div className="text-right">
              <p className="text-[11px] font-bold uppercase tracking-[3px] text-[#b98b52]">
                {t('hud_wave')}
              </p>
              <p className="text-4xl font-bold text-[#d4af37]">{session.wave}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-row gap-4">
            <MedievalProgress label={t('hud_grail')} value={session.health} max={20} tint="#dc2626" />
            <MedievalProgress
              label={session.phase === 'build' ? t('hud_council_time') : t('hud_spells')}
              value={
                session.phase === 'build'
                  ? session.buildTimeLeft
                  : Math.max(...Object.values(session.spellCooldowns), 0)
              }
              max={session.phase === 'build' ? 60 : 15}
              tint={session.phase === 'build' ? '#d4af37' : '#3b82f6'}
              suffix={session.phase === 'build' ? 's' : 's'}
            />
          </div>

          <div className="mt-4 flex flex-row items-center justify-between">
            <div>
              <p className="text-lg font-semibold text-[#f4e6ca]">
                {t('hud_bank_label')} {session.gold}g | {session.wood}w | {session.ore}o |{' '}
                {session.gem} | {Math.floor(session.faith)}f
              </p>
              {waveState && (
                <p className="text-xs font-bold text-[#8b5a2b]">
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
                    .join(' \u2022 ')}
                </p>
              )}
            </div>
            <p className="text-sm tracking-[2px] text-[#c7b08c]">{session.announcement}</p>
          </div>
        </div>

        <div className="pointer-events-auto flex flex-col gap-3">
          <Toolbar.Root className="rounded-[24px] border border-[#6b4a2f] bg-[#241711]/85 p-3 shadow-lg backdrop-blur-md">
            <div className="flex flex-row items-center justify-between gap-3">
              <Popover.Root>
                <Popover.Trigger asChild>
                  <Toolbar.Button
                    className="rounded-2xl border border-[#8f6a43] bg-[#4c321e] px-5 py-4"
                    style={highContrastStyle(hc)}
                    aria-label="Open building selection toychest"
                  >
                    <span className="text-lg font-bold text-[#f5e8cc]" style={highContrastTextStyle(hc)}>{t('hud_toychest')}</span>
                  </Toolbar.Button>
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Content
                    sideOffset={12}
                    className="z-50 rounded-[24px] border border-[#8c6a43] bg-[#ead9bc] p-4"
                  >
                    <h3 className="mb-3 text-lg font-bold text-[#3e2723]">
                      {t('hud_relics_of_defense')}
                    </h3>
                    <div className="flex max-h-80 flex-col gap-3 overflow-auto">
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
                                <button
                                  type="button"
                                  disabled={!affordable}
                                  onClick={() => onSelectPlacement(type)}
                                  className={`rounded-2xl border px-4 py-3 text-left ${
                                    activePlacement === type
                                      ? 'border-[#d4af37] bg-[#fff3db]'
                                      : affordable
                                        ? 'border-[#8c6a43] bg-[#f6ebd8]'
                                        : 'border-[#c6b59d] bg-[#eadcc9]'
                                  }`}
                                  aria-label={`Place ${building.name}, cost ${costLabel}`}
                                  aria-disabled={!affordable}
                                >
                                  <span className="text-base font-bold text-[#3e2723]">
                                    {building.icon} {building.name} &bull; {costLabel}
                                  </span>
                                  <span className="mt-1 block text-sm text-[#6e4e31]">{building.role}</span>
                                </button>
                              </Tooltip.Trigger>
                              <Tooltip.Portal>
                                <Tooltip.Content
                                  side="top"
                                  className="z-50 rounded-xl border border-[#6b4a2f] bg-[#2b1c14] px-3 py-2"
                                >
                                  <span className="text-sm text-[#f6e6c7]">{building.stats}</span>
                                </Tooltip.Content>
                              </Tooltip.Portal>
                            </Tooltip.Root>
                          );
                        })}
                    </div>
                  </Popover.Content>
                </Popover.Portal>
              </Popover.Root>

              <div className="flex flex-1 flex-row justify-end gap-3">
                <Popover.Root>
                  <Popover.Trigger asChild>
                    <Toolbar.Button
                      className="rounded-2xl border border-[#8f6a43] bg-[#4b2b1d] px-4 py-4"
                      aria-label={`Garrison, ${buildingEntities.length + wallEntities.length} structures`}
                    >
                      <span className="font-bold text-[#f5e8cc]">
                        {t('hud_garrison')} {buildingEntities.length + wallEntities.length}
                      </span>
                    </Toolbar.Button>
                  </Popover.Trigger>
                  <Popover.Portal>
                    <Popover.Content
                      sideOffset={12}
                      className="z-50 rounded-[24px] border border-[#8c6a43] bg-[#ead9bc] p-4"
                    >
                      <h3 className="mb-3 text-lg font-bold text-[#3e2723]">
                        {t('hud_built_defenses')}
                      </h3>
                      <div className="flex max-h-96 flex-col gap-3 overflow-auto">
                        {buildingEntities.length === 0 && wallEntities.length === 0 ? (
                          <p className="text-sm text-[#6e4e31]">{t('hud_no_structures')}</p>
                        ) : null}
                        {buildingEntities.map((entity) => (
                          <BuildingCard
                            key={entity.id()}
                            entity={entity}
                            treasury={session.gold}
                            phase={session.phase}
                          />
                        ))}
                        {wallEntities.map((entity) => (
                          <WallCard key={entity.id()} entity={entity} />
                        ))}
                      </div>
                    </Popover.Content>
                  </Popover.Portal>
                </Popover.Root>

                {session.activeSpells.map((spell) => {
                  const cd = session.spellCooldowns[spell] ?? 0;
                  const cost = spell === 'meteor_strike' ? 35 : spell === 'divine_shield' ? 40 : 25;
                  const spellName =
                    spell === 'smite'
                      ? t('spell_smite')
                      : spell === 'holy_nova'
                        ? t('spell_holy_nova')
                        : spell === 'zealous_haste'
                          ? t('spell_haste')
                          : spell === 'earthquake'
                            ? t('spell_quake')
                            : spell === 'meteor_strike'
                              ? t('spell_meteor')
                              : spell === 'divine_shield'
                                ? t('spell_shield')
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
                      onClick={() => queueWorldCommand({ type: 'castSpell', spellId: spell })}
                      className={`rounded-2xl border px-4 py-4 ${
                        cd === 0 &&
                        session.phase === 'defend' &&
                        !session.gameOver &&
                        session.faith >= cost
                          ? 'border-[#3b82f6] bg-[#1e3a8a]'
                          : 'border-[#475569] bg-[#334155]'
                      }`}
                      aria-label={`Cast ${spellName}${cd > 0 ? `, cooldown ${Math.ceil(cd)} seconds` : `, costs ${cost} faith`}`}
                    >
                      <span className="font-bold text-[#dcecff]">
                        {spellName} {cd > 0 ? `(${Math.ceil(cd)}s)` : `(${cost}f)`}
                      </span>
                    </Toolbar.Button>
                  );
                })}

                <Toolbar.Button
                  onClick={() => queueWorldCommand({ type: 'toggleGameSpeed' })}
                  className="rounded-2xl border border-[#8f6a43] bg-[#352418] px-4 py-4"
                  aria-label={`Game speed ${session.gameSpeed}x, tap to change`}
                >
                  <span className="font-bold text-[#f5e8cc]">{session.gameSpeed}x</span>
                </Toolbar.Button>

                {session.phase === 'build' && (
                  <Toolbar.Button
                    onClick={() => {
                      soundManager.playUiClick();
                      onCancelPlacement();
                    }}
                    className="rounded-2xl border border-[#8f6a43] bg-[#3a281d] px-4 py-4"
                    aria-label={
                      activePlacement
                        ? `Cancel placing ${BUILDINGS[activePlacement].name}`
                        : 'Cancel tool'
                    }
                  >
                    <span className="font-bold text-[#f5e8cc]">
                      {activePlacement
                        ? `Placing ${BUILDINGS[activePlacement].name}`
                        : t('btn_cancel_tool')}
                    </span>
                  </Toolbar.Button>
                )}

                <Toolbar.Button
                  onClick={() => {
                    soundManager.playUiClick();
                    onExit();
                  }}
                  className="rounded-2xl border border-[#7d5d3f] bg-[#1e1410] px-4 py-4"
                  style={highContrastStyle(hc)}
                  aria-label="Leave game and return to main menu"
                >
                  <span className="font-bold text-[#f5e8cc]">{t('btn_leave')}</span>
                </Toolbar.Button>
              </div>
            </div>
          </Toolbar.Root>

          {selectedEntity?.isAlive() && !session.gameOver ? (
            <div className="rounded-[24px] border border-[#8b6a44] bg-[#ead9bc]/90 px-4 py-4 shadow-lg backdrop-blur-sm">
              <div className="mb-3 flex flex-row items-center justify-between">
                <h3 className="text-lg font-bold text-[#3e2723]">{t('hud_selected_defense')}</h3>
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playUiClick();
                    onClearSelection();
                  }}
                  className="rounded-xl border border-[#8f6a43] bg-[#3a281d] px-3 py-2"
                  aria-label="Close selection panel"
                >
                  <span className="font-bold text-[#f5e8cc]">{t('btn_close')}</span>
                </button>
              </div>

              {selectedEntity.get(Building) ? (
                <BuildingCard entity={selectedEntity} treasury={session.gold} phase={session.phase} />
              ) : selectedEntity.get(Unit)?.type === 'wall' ? (
                <WallCard entity={selectedEntity} />
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Relic Draft Modal */}
        {session.pendingRelicDraft ? (
          <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-[#0a0806]/90 px-4">
            <div className="w-full max-w-2xl rounded-[28px] border border-[#d4af37] bg-[#241711] p-6 shadow-2xl">
              <h2 className="text-center text-3xl font-bold text-[#f0dfbe]">
                {t('relic_draft_title')}
              </h2>
              <p className="mt-2 text-center text-[#c7b08c]">{t('relic_draft_subtitle')}</p>
              <div className="mt-8 flex flex-row flex-wrap justify-center gap-4">
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
                  <button
                    type="button"
                    key={relic.id}
                    onClick={() => queueWorldCommand({ type: 'draftRelic', relicId: relic.id })}
                    className="w-[30%] rounded-xl border border-[#8a6a44] bg-[#3a281d] p-4"
                    aria-label={`Draft relic: ${relic.name}. ${relic.desc}`}
                  >
                    <span className="block text-center text-lg font-bold text-[#f5e8cc]">{relic.name}</span>
                    <span className="mt-2 block text-center text-sm text-[#b8ab97]">{relic.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Tooltip.Provider>
  );
}
