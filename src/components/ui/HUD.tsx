/**
 * @module HUD
 *
 * In-game heads-up display overlay for Grailguard. Renders the top status
 * panel (phase label, wave counter, grail health, resources), the bottom
 * toolbar (spells, game-speed toggle, leave button, cancel placement),
 * and the relic-draft modal shown after defeating a boss.
 *
 * Resource counters animate with a scale pulse and color flash when values
 * change. Building placement and entity management are handled by the radial
 * context menu (RadialMenu + useRadialMenu), not by this component.
 */

import * as Toolbar from '@radix-ui/react-toolbar';
import { AnimatePresence, motion } from 'framer-motion';
import { useTrait } from 'koota/react';
import { useEffect, useRef, useState } from 'react';
import { useMetaProgress } from '../../db/meta';
import { BUILDINGS, type BuildingType } from '../../engine/constants';
import { GameSession, gameWorld, queueWorldCommand, WaveState } from '../../engine/GameEngine';
import { soundManager } from '../../engine/SoundManager';
import { t } from '../../i18n';
import { BannerOverlay } from './BannerOverlay';
import { ScreenFlash } from './ScreenFlash';

/** Returns high-contrast border styles when enabled. */
function highContrastStyle(enabled: boolean): React.CSSProperties {
  if (!enabled) return {};
  return { borderWidth: 2, borderColor: '#fff' };
}

/**
 * Animated resource counter that pulses (scale 1.0 -> 1.3 -> 1.0) and
 * flashes color when its value changes. Uses CSS transitions for smooth
 * 300ms animation without React state churn.
 */
function AnimatedResource({
  value,
  suffix,
  baseColor,
  flashColor,
}: {
  value: number;
  suffix: string;
  baseColor: string;
  flashColor: string;
}) {
  const prevRef = useRef(value);
  const [pulsing, setPulsing] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (prevRef.current !== value) {
      prevRef.current = value;
      setPulsing(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setPulsing(false), 300);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [value]);

  return (
    <span
      style={{
        display: 'inline-block',
        color: pulsing ? flashColor : baseColor,
        transform: pulsing ? 'scale(1.3)' : 'scale(1)',
        transition: 'transform 300ms ease-out, color 300ms ease-out',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {value}
      {suffix}
    </span>
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
 *
 * Building selection has been moved to the radial context menu.
 * The HUD now only shows: status panel, spell bar, game controls,
 * and the relic draft modal.
 */
export function HUD({
  activePlacement,
  onExit,
  onCancelPlacement,
}: {
  activePlacement: BuildingType | null;
  onExit: () => void;
  onCancelPlacement: () => void;
}) {
  const session = useTrait(gameWorld, GameSession);
  const waveState = useTrait(gameWorld, WaveState);
  const { settings: metaSettings } = useMetaProgress();
  const hc = metaSettings?.highContrast ?? false;
  const [selectedRelicId, setSelectedRelicId] = useState<string | null>(null);

  if (!session) return null;

  const phaseLabel =
    session.phase === 'game_over'
      ? t('hud_phase_game_over')
      : session.phase === 'build'
        ? t('hud_phase_build')
        : t('hud_phase_battle');

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between px-4 pb-5 pt-12">
      {/* Screen flash overlay (boss, spells, damage) */}
      <ScreenFlash color={session.screenFlashColor} intensity={session.screenFlash} />

      {/* Banner overlay (wave start, boss entrance, phase change) */}
      <BannerOverlay
        text={session.bannerText}
        tone={session.bannerTone}
        life={session.bannerLife}
        maxLife={session.bannerMaxLife}
      />

      {/* Top status panel */}
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

        {/* Animated resource counters */}
        <div className="mt-4 flex flex-row items-center justify-between">
          <div>
            <p className="text-lg font-semibold text-[#f4e6ca]">
              {t('hud_bank_label')}{' '}
              <AnimatedResource
                value={session.gold}
                suffix="g"
                baseColor="#f4e6ca"
                flashColor="#facc15"
              />
              {' | '}
              <AnimatedResource
                value={session.wood}
                suffix="w"
                baseColor="#f4e6ca"
                flashColor="#86efac"
              />
              {' | '}
              <AnimatedResource
                value={session.ore}
                suffix="o"
                baseColor="#f4e6ca"
                flashColor="#93c5fd"
              />
              {' | '}
              <AnimatedResource
                value={session.gem}
                suffix=""
                baseColor="#f4e6ca"
                flashColor="#c4b5fd"
              />
              {' | '}
              <AnimatedResource
                value={Math.floor(session.faith)}
                suffix="f"
                baseColor="#f4e6ca"
                flashColor="#fcd34d"
              />
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

      {/* Bottom toolbar: spells, game speed, cancel placement, leave */}
      <div className="pointer-events-auto flex flex-col gap-3">
        <Toolbar.Root className="rounded-[24px] border border-[#6b4a2f] bg-[#241711]/85 p-3 shadow-lg backdrop-blur-md">
          <div className="flex flex-row items-center justify-between gap-3">
            {/* Hint text for build phase */}
            {session.phase === 'build' && !activePlacement ? (
              <div className="flex-1 px-2">
                <span className="text-xs font-bold uppercase tracking-[2px] text-[#b98b52]">
                  {t('hud_tap_terrain_hint') ?? 'Tap terrain to build'}
                </span>
              </div>
            ) : null}

            <div className="flex flex-1 flex-row justify-end gap-3">
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

              {session.phase === 'build' && activePlacement && (
                <Toolbar.Button
                  onClick={() => {
                    soundManager.playUiClick();
                    onCancelPlacement();
                  }}
                  className="rounded-2xl border border-[#8f6a43] bg-[#3a281d] px-4 py-4"
                  aria-label={`Cancel placing ${BUILDINGS[activePlacement].name}`}
                >
                  <span className="font-bold text-[#f5e8cc]">
                    Placing {BUILDINGS[activePlacement].name}
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
      </div>

      {/* Relic Draft Modal with card selection animation */}
      <AnimatePresence>
        {session.pendingRelicDraft ? (
          <motion.div
            className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-[#0a0806]/90 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-2xl rounded-[28px] border border-[#d4af37] bg-[#241711] p-6 shadow-2xl"
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            >
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
                ].map((relic) => {
                  const isSelected = selectedRelicId === relic.id;
                  const isOther = selectedRelicId !== null && !isSelected;
                  return (
                    <motion.button
                      type="button"
                      key={relic.id}
                      onClick={() => {
                        setSelectedRelicId(relic.id);
                        setTimeout(() => {
                          queueWorldCommand({ type: 'draftRelic', relicId: relic.id });
                          setSelectedRelicId(null);
                        }, 400);
                      }}
                      className={`w-[30%] rounded-xl border p-4 transition-colors ${
                        isSelected
                          ? 'border-[#d4af37] bg-[#5a4020] shadow-[0_0_24px_rgba(212,175,55,0.5)]'
                          : 'border-[#8a6a44] bg-[#3a281d]'
                      }`}
                      animate={{
                        scale: isSelected ? 1.08 : isOther ? 0.92 : 1,
                        opacity: isOther ? 0.4 : 1,
                      }}
                      transition={{ duration: 0.3 }}
                      disabled={selectedRelicId !== null}
                      aria-label={`Draft relic: ${relic.name}. ${relic.desc}`}
                    >
                      <span className="block text-center text-lg font-bold text-[#f5e8cc]">
                        {relic.name}
                      </span>
                      <span className="mt-2 block text-center text-sm text-[#b8ab97]">
                        {relic.desc}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
