/**
 * @module game
 *
 * Game screen for Grailguard. Bootstraps or resumes an ECS game world,
 * renders the 3D scene via R3F, overlays the HUD and floating-text layer,
 * and manages run persistence (autosave on phase transitions, periodic
 * snapshots during defend phase, and save-on-visibilitychange).
 * Handles pointer gestures for building placement and entity selection.
 */
import { useProgress } from '@react-three/drei';
import { useQuery, useTrait, WorldProvider } from 'koota/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { projectScreenPointToGround, projectWorldPointToScreen } from '../components/3d/Arena';
import { GestureOverlay } from '../components/3d/GestureOverlay';
import { getAllModelPaths } from '../components/3d/modelPaths';
import { getArenaRenderer } from '../components/3d/rendererSwitch';
import { DebugOverlay } from '../components/ui/DebugOverlay';
import { HUD } from '../components/ui/HUD';
import { RadialMenu } from '../components/ui/RadialMenu';
import { Tutorial } from '../components/ui/Tutorial';
import { useRadialMenu } from '../components/ui/useRadialMenu';
import {
  abandonActiveRun,
  bankRunRewards,
  discoverCodexEntry,
  loadActiveRunRecord,
  loadAutoResumeSetting,
  loadPreferredSpeed,
  markBrokenRunAndReset,
  saveActiveRunRecord,
  updatePreferredSpeed,
  useDoctrineNodes,
  useMetaProgress,
} from '../db/meta';
import { type AmbienceManager, createAmbienceManager } from '../engine/audio/ambienceManager';
import { audioBus } from '../engine/audio/audioBridge';
import { BUILDINGS, type BuildingType } from '../engine/constants';
import {
  AutosaveState,
  checkpointRun,
  createRunWorld,
  FloatingText,
  finalizeRun,
  GameSession,
  gameWorld,
  hydrateRunWorld,
  isPlacementValid,
  Position,
  queueWorldCommand,
  resetGameWorld,
  serializeRunWorld,
  snapPlacementPosition,
} from '../engine/GameEngine';
import {
  impactHeavy,
  impactLight,
  impactMedium,
  notificationSuccess,
  notificationWarning,
} from '../engine/haptics';
import { soundManager } from '../engine/SoundManager';
import { getActivePlacement, getPlacementPreview, getSelectedEntity } from '../engine/selectors';
import { t } from '../i18n';

function HapticsBridge({ hapticsEnabled }: { hapticsEnabled: boolean }) {
  useEffect(() => {
    const unsubs = [
      audioBus.on('building_placed', () => impactMedium(hapticsEnabled)),
      audioBus.on('boss_spawn', () => impactHeavy(hapticsEnabled)),
      audioBus.on('wave_complete', () => notificationSuccess(hapticsEnabled)),
      audioBus.on('game_over', () => notificationWarning(hapticsEnabled)),
      audioBus.on('spell_cast', () => impactLight(hapticsEnabled)),
    ];
    return () => {
      for (const unsub of unsubs) unsub();
    };
  }, [hapticsEnabled]);
  return null;
}

function AmbienceManagerBridge({ biome }: { biome: string }) {
  const managerRef = useRef<AmbienceManager | null>(null);

  useEffect(() => {
    const manager = createAmbienceManager(biome, audioBus);
    manager.start();
    managerRef.current = manager;
    return () => {
      manager.dispose();
      managerRef.current = null;
    };
  }, [biome]);

  return null;
}

function AccessibilityAnnouncementBridge() {
  const session = useTrait(gameWorld, GameSession);
  const prevPhaseRef = useRef<string>('');
  const prevGameOverRef = useRef(false);

  useEffect(() => {
    if (!session) return;

    // Announce phase changes via aria-live region
    if (session.phase !== prevPhaseRef.current) {
      prevPhaseRef.current = session.phase;
      const msg =
        session.phase === 'build'
          ? t('a11y_phase_build')
          : t('a11y_wave_start', {
              wave: session.wave,
              composition: session.announcement || 'Battle Phase',
            });
      announceToScreenReader(msg);
    }

    // Announce game over
    if (session.gameOver && !prevGameOverRef.current) {
      prevGameOverRef.current = true;
      const msg =
        session.announcement === 'Victory Achieved!'
          ? t('a11y_game_over_victory')
          : t('a11y_game_over_defeat');
      announceToScreenReader(msg);
    }
  }, [session?.phase, session?.gameOver, session?.announcement, session?.wave, session]);

  return null;
}

/** Announce a message to screen readers via a live region. */
function announceToScreenReader(message: string) {
  const el = document.getElementById('a11y-announcer');
  if (el) {
    el.textContent = message;
  }
}

function CodexDiscoveryBridge() {
  const session = useTrait(gameWorld, GameSession);
  const discoveredRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!session?.discoveredCodex) return;

    for (const id of session.discoveredCodex) {
      if (!discoveredRef.current.has(id)) {
        discoveredRef.current.add(id);
        const category = Object.keys(BUILDINGS).includes(id) ? 'building' : 'unit';
        void discoverCodexEntry(id, category);
      }
    }
  }, [session?.discoveredCodex]);

  return null;
}

function FloatingTextLayer({ viewportSize }: { viewportSize: { width: number; height: number } }) {
  const floatingTexts = useQuery(FloatingText, Position);

  return (
    <div className="pointer-events-none absolute inset-0">
      {floatingTexts.map((entity) => {
        const floatingText = entity.get(FloatingText);
        const position = entity.get(Position);
        if (!floatingText || !position) return null;

        const projected = projectWorldPointToScreen(position, viewportSize);
        if (!projected?.visible) return null;

        return (
          <div
            key={entity.id()}
            className="absolute"
            style={{
              left: projected.x - 32,
              top: projected.y - 20,
              width: 64,
              textAlign: 'center',
              opacity: Math.max(0, floatingText.life),
            }}
          >
            <span
              style={{
                color: floatingText.color,
                fontSize: 20,
                fontWeight: 900,
                textShadow: '1px 1px 3px #000000',
              }}
            >
              {floatingText.text}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function LoadingOverlay({
  forceVisible = false,
  label = t('game_loading_default'),
}: {
  forceVisible?: boolean;
  label?: string;
}) {
  const { active, loaded, total, progress } = useProgress();
  const [hasObservedLoading, setHasObservedLoading] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    getAllModelPaths();
  }, []);

  useEffect(() => {
    if (active || total > 0) {
      setHasObservedLoading(true);
    }
  }, [active, total]);

  useEffect(() => {
    if (hasObservedLoading) {
      if (!active && total > 0 && loaded >= total) {
        setVisible(false);
      }
      return;
    }

    if (!active && total === 0) {
      const timer = setTimeout(() => setVisible(false), 250);
      return () => clearTimeout(timer);
    }
  }, [active, hasObservedLoading, loaded, total]);

  if (!visible && !forceVisible) return null;

  const progressLabel = total > 0 ? `${Math.round(progress)}%` : label;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0806]/95">
      <div className="h-14 w-14 animate-spin rounded-full border-4 border-[#d4af37]/20 border-t-[#d4af37]" />
      <h1 className="mt-6 text-5xl font-bold text-[#d4af37]">{t('app_title')}</h1>
      <p className="mt-2 text-lg text-[#d7c6af]">{t('game_loading_blessing')}</p>
      <p className="mt-3 text-sm font-semibold tracking-[2px] text-[#f7ebd0]">{progressLabel}</p>
    </div>
  );
}

function EndOfRunModal() {
  const session = useTrait(gameWorld, GameSession);
  const navigate = useNavigate();
  const [isBanking, setIsBanking] = useState(false);

  if (!session?.gameOver) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#0a0806]/95 px-6">
      <div className="w-full max-w-md rounded-[32px] border-2 border-[#8b3026] bg-[#2a100d] p-8 shadow-2xl">
        <h1 className="text-center text-5xl font-bold text-[#f2d6c9]">
          {session.announcement === 'Victory Achieved!'
            ? t('game_end_victory')
            : t('game_end_defeat')}
        </h1>

        <div className="mt-8 flex flex-col gap-4">
          <div className="flex flex-row justify-between border-b border-[#5a371f] pb-2">
            <span className="text-xl text-[#dfbfaf]">{t('game_end_wave_reached')}</span>
            <span className="text-xl font-bold text-[#f7ebd0]">{session.wave}</span>
          </div>
          <div className="flex flex-row justify-between border-b border-[#5a371f] pb-2">
            <span className="text-xl text-[#dfbfaf]">{t('game_end_total_kills')}</span>
            <span className="text-xl font-bold text-[#f7ebd0]">{session.totalKills}</span>
          </div>
          <div className="flex flex-row justify-between border-b border-[#5a371f] pb-2">
            <span className="text-xl text-[#dfbfaf]">{t('game_end_gold_earned')}</span>
            <span className="text-xl font-bold text-[#d4af37]">{session.earnedCoins} 🪙</span>
          </div>
        </div>

        <button
          type="button"
          disabled={isBanking}
          onClick={() => {
            setIsBanking(true);
            void bankRunRewards(finalizeRun('defeat')).then(() => {
              navigate('/', { replace: true });
            });
          }}
          className={`mt-10 w-full rounded-2xl border-2 border-[#b98b52] px-8 py-4 ${
            isBanking ? 'bg-[#3a2211]' : 'bg-[#5a371f]'
          }`}
          aria-label={isBanking ? 'Banking spoils' : 'Return to court'}
        >
          <span className="text-center text-2xl font-bold text-[#f7ebd0]">
            {isBanking ? t('game_end_banking') : t('btn_return_to_court')}
          </span>
        </button>
      </div>
    </div>
  );
}

function RunPersistenceBridge() {
  const session = useTrait(gameWorld, GameSession);
  const autosave = useTrait(gameWorld, AutosaveState);

  useEffect(() => {
    if (!session || !autosave?.dirty) return;

    const timer = setTimeout(() => {
      const snapshot = checkpointRun(autosave.reason);
      void saveActiveRunRecord({
        id: snapshot.session.runId,
        snapshotVersion: snapshot.version,
        snapshotJson: JSON.stringify(snapshot),
        phase: snapshot.session.phase,
        wave: snapshot.session.wave,
        biome: snapshot.session.biome,
        status: snapshot.session.gameOver ? 'game_over' : 'active',
      });
    }, 150);

    return () => clearTimeout(timer);
  }, [autosave?.dirty, autosave?.reason, session]);

  useEffect(() => {
    if (!session || session.phase !== 'defend') return;

    const interval = setInterval(() => {
      const snapshot = serializeRunWorld();
      void saveActiveRunRecord({
        id: snapshot.session.runId,
        snapshotVersion: snapshot.version,
        snapshotJson: JSON.stringify(snapshot),
        phase: snapshot.session.phase,
        wave: snapshot.session.wave,
        biome: snapshot.session.biome,
        status: snapshot.session.gameOver ? 'game_over' : 'active',
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [session]);

  // Save when page becomes hidden (replaces AppState listener)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const snapshot = serializeRunWorld();
        void saveActiveRunRecord({
          id: snapshot.session.runId,
          snapshotVersion: snapshot.version,
          snapshotJson: JSON.stringify(snapshot),
          phase: snapshot.session.phase,
          wave: snapshot.session.wave,
          biome: snapshot.session.biome,
          status: snapshot.session.gameOver ? 'game_over' : 'active',
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return null;
}

function GameContent({
  onCancelPlacement,
  onExit,
}: {
  onCancelPlacement: () => void;
  onExit: () => void;
}) {
  const session = useTrait(gameWorld, GameSession);
  const activePlacement = getActivePlacement();

  if (!session) return null;

  return (
    <HUD activePlacement={activePlacement} onCancelPlacement={onCancelPlacement} onExit={onExit} />
  );
}

export function GameScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const params = useMemo(
    () => ({
      mode: searchParams.get('mode') ?? undefined,
      biome: searchParams.get('biome') ?? undefined,
      challenge: searchParams.get('challenge') ?? undefined,
      spells: searchParams.get('spells') ?? undefined,
      mapSize: searchParams.get('mapSize') ?? undefined,
      seed: searchParams.get('seed') ?? undefined,
      governor: searchParams.get('governor') ?? undefined,
    }),
    [searchParams],
  );
  const { settings, unlocks } = useMetaProgress();
  const doctrineNodes = useDoctrineNodes();
  const [bootLabel, setBootLabel] = useState(t('game_loading_default'));
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const bootedRef = useRef(false);
  const _finalizingRef = useRef<Promise<void> | null>(null);

  const bootMode = useMemo(() => (params.mode === 'resume' ? 'resume' : 'fresh'), [params.mode]);

  useEffect(() => {
    void soundManager.init(settings?.soundEnabled ?? true, settings?.musicEnabled ?? true);
  }, [settings?.soundEnabled, settings?.musicEnabled]);

  // Play biome ambience when run starts
  useEffect(() => {
    if (!isBootstrapping) {
      soundManager.playAmbience(params.biome ?? 'kings-road');
    }
  }, [isBootstrapping, params.biome]);

  useEffect(() => {
    if (bootedRef.current) return;

    let cancelled = false;
    const bootstrap = async () => {
      setBootLabel(bootMode === 'resume' ? t('game_loading_resume') : t('game_loading_default'));
      const preferredSpeed = await loadPreferredSpeed();
      const savedRun = await loadActiveRunRecord();
      const autoResume = await loadAutoResumeSetting();
      const doctrines = doctrineNodes
        .filter((n) => n.level > 0)
        .map((n) => ({ nodeId: n.nodeId, level: n.level }));
      const spells = params.spells ? params.spells.split(',') : ['smite'];
      const biome = params.biome ?? 'kings-road';
      const difficulty = params.challenge ?? 'pilgrim';
      const mapSize = params.mapSize ? parseInt(params.mapSize, 10) : 100;
      const seed = params.seed;

      if (cancelled) return;

      try {
        if (bootMode === 'resume' && savedRun) {
          hydrateRunWorld(JSON.parse(savedRun.snapshotJson));
        } else if (bootMode === 'fresh') {
          if (savedRun) {
            await abandonActiveRun();
          }
          createRunWorld({
            preferredSpeed,
            doctrines,
            spells,
            biome,
            difficulty,
            mapSize,
            seed,
            governorEnabled: params.governor === '1',
            reducedFx: settings?.reducedFx ?? false,
          });
        } else {
          if (autoResume && savedRun) {
            hydrateRunWorld(JSON.parse(savedRun.snapshotJson));
          } else {
            createRunWorld({
              preferredSpeed,
              doctrines,
              spells,
              biome,
              difficulty,
              mapSize,
              seed,
              governorEnabled: params.governor === '1',
              reducedFx: settings?.reducedFx ?? false,
            });
          }
        }
        bootedRef.current = true;
      } catch {
        await markBrokenRunAndReset();
        resetGameWorld({ preferredSpeed });
        bootedRef.current = true;
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [
    bootMode,
    doctrineNodes,
    params.biome,
    params.challenge,
    params.mapSize,
    params.seed,
    params.spells,
    params.governor,
    settings?.reducedFx,
  ]);

  const handleExit = useCallback(async () => {
    const snapshot = serializeRunWorld();
    await saveActiveRunRecord({
      id: snapshot.session.runId,
      snapshotVersion: snapshot.version,
      snapshotJson: JSON.stringify(snapshot),
      phase: snapshot.session.phase,
      wave: snapshot.session.wave,
      biome: snapshot.session.biome,
      status: snapshot.session.gameOver ? 'game_over' : 'active',
    });

    await updatePreferredSpeed(
      gameWorld.get(GameSession)?.gameSpeed ?? settings?.preferredSpeed ?? 1,
    );
    navigate('/', { replace: true });
  }, [navigate, settings?.preferredSpeed]);

  const showTutorial = settings?.tutorialComplete === false;
  const [tutorialDismissed, setTutorialDismissed] = useState(false);

  return (
    <WorldProvider world={gameWorld}>
      {/* Accessibility live region for screen reader announcements */}
      <div id="a11y-announcer" className="sr-only" aria-live="assertive" aria-atomic="true" />
      {!isBootstrapping ? <RunPersistenceBridge /> : null}
      {!isBootstrapping ? <CodexDiscoveryBridge /> : null}
      {!isBootstrapping ? <AccessibilityAnnouncementBridge /> : null}
      {!isBootstrapping ? (
        <HapticsBridge hapticsEnabled={settings?.hapticsEnabled ?? true} />
      ) : null}
      {!isBootstrapping ? <AmbienceManagerBridge biome={params.biome ?? 'kings-road'} /> : null}
      <LiveGameView
        bootLabel={bootLabel}
        isBootstrapping={isBootstrapping}
        onExit={() => {
          void handleExit();
        }}
        unlocks={unlocks}
      />
      {!isBootstrapping && showTutorial && !tutorialDismissed ? (
        <Tutorial visible onDismiss={() => setTutorialDismissed(true)} />
      ) : null}
    </WorldProvider>
  );
}

function LiveGameView({
  bootLabel,
  isBootstrapping,
  onExit,
  unlocks,
}: {
  bootLabel: string;
  isBootstrapping: boolean;
  onExit: () => void;
  unlocks: Record<BuildingType, boolean>;
}) {
  useQuery(Position);
  const session = useTrait(gameWorld, GameSession);
  const activePlacement = getActivePlacement();
  const placementPreview = getPlacementPreview();
  const selectedEntity = getSelectedEntity();
  const [viewportSize, setViewportSize] = useState({ width: 1, height: 1 });
  const gestureStart = useRef({ x: 0, y: 0 });
  const ArenaRenderer = useMemo(() => getArenaRenderer(), []);
  const containerRef = useRef<HTMLDivElement>(null);
  const { state: radialState, openMenu, closeMenu } = useRadialMenu(unlocks);

  const clearPlacement = () => {
    queueWorldCommand({
      type: 'setPlacementPreview',
      buildingType: null,
      preview: null,
    });
  };

  const clearSelection = () => {
    queueWorldCommand({ type: 'clearSelection' });
  };

  const updatePreview = (clientX: number, clientY: number) => {
    if (!activePlacement || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;

    const ndcX = (localX / viewportSize.width) * 2 - 1;
    const ndcY = -((localY / viewportSize.height) * 2 - 1);
    const hit = projectScreenPointToGround(ndcX, ndcY);
    if (!hit) return;

    const snapped = snapPlacementPosition(hit);
    queueWorldCommand({
      type: 'setPlacementPreview',
      buildingType: activePlacement,
      preview: {
        ...snapped,
        valid: isPlacementValid(activePlacement, { x: snapped.x, z: snapped.z }),
      },
    });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    gestureStart.current = { x: e.clientX, y: e.clientY };
    if (session?.phase === 'build' && activePlacement) {
      updatePreview(e.clientX, e.clientY);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (activePlacement) {
      updatePreview(e.clientX, e.clientY);
    }
  };

  /**
   * Handles single-click interactions on the game canvas: building
   * placement confirmation and radial menu opening.
   *
   * Event propagation:
   *   Canvas -> this div (game handler) -> GestureOverlay div (gesture handler)
   *
   * Because this handler is on a child of the GestureOverlay, it fires
   * BEFORE the gesture handler via normal DOM bubbling. The GestureOverlay
   * never calls stopPropagation(), and only acts on multi-touch (2+ pointers),
   * so single clicks always reach this handler unimpeded.
   *
   * The raycast uses ray.intersectPlane(y=0) which works identically for
   * both perspective and orthographic cameras -- setFromCamera produces a
   * correct ray from NDC coordinates in either projection mode.
   */
  const handlePointerUp = (e: React.PointerEvent) => {
    // If placing a building, confirm or cancel placement
    if (activePlacement && placementPreview?.valid) {
      queueWorldCommand({
        type: 'build',
        buildingType: activePlacement,
        position: placementPreview,
      });
      clearSelection();
      clearPlacement();
      closeMenu();
      return;
    }

    if (activePlacement) {
      clearPlacement();
      return;
    }

    // Ignore drags
    const movement = Math.hypot(
      e.clientX - gestureStart.current.x,
      e.clientY - gestureStart.current.y,
    );
    if (movement > 10) return;

    // Raycast to ground
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;

    const ndcX = (localX / viewportSize.width) * 2 - 1;
    const ndcY = -((localY / viewportSize.height) * 2 - 1);
    const hit = projectScreenPointToGround(ndcX, ndcY);
    if (!hit) {
      clearSelection();
      closeMenu();
      return;
    }

    // Open radial menu at click position
    openMenu({ x: e.clientX, y: e.clientY }, hit);
  };

  const handleResize = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setViewportSize({ width: rect.width, height: rect.height });
    }
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  return (
    <div ref={containerRef} className="relative h-screen w-screen overflow-hidden">
      {/* Full-viewport 3D Canvas (position: absolute via rendererSwitch.web) */}
      <GestureOverlay>
        <div
          className="absolute inset-0"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <ArenaRenderer placementPreview={placementPreview} selectedEntity={selectedEntity} />
        </div>
      </GestureOverlay>

      {/* HUD overlay on top of Canvas */}
      <div className="pointer-events-none absolute inset-0">
        {activePlacement ? (
          <div className="pointer-events-auto absolute bottom-40 left-4 right-4 rounded-2xl border border-[#d4af37] bg-[#1f140f]/90 px-4 py-3">
            <p className="text-center text-sm font-semibold tracking-[2px] text-[#f7ebd0]">
              {t('game_placement_hint', { building: BUILDINGS[activePlacement].name })}
            </p>
            <p className="mt-1 text-center text-xs uppercase tracking-[2px] text-[#c9b18b]">
              {t('game_placement_rules')}
            </p>
          </div>
        ) : null}

        {!isBootstrapping ? (
          <div className="pointer-events-auto">
            <GameContent onCancelPlacement={clearPlacement} onExit={onExit} />
          </div>
        ) : null}

        {!isBootstrapping ? <FloatingTextLayer viewportSize={viewportSize} /> : null}
      </div>

      {/* Radial context menu overlay */}
      {radialState.isOpen ? (
        <RadialMenu
          items={radialState.items}
          position={radialState.screenPos}
          onClose={closeMenu}
        />
      ) : null}

      <LoadingOverlay forceVisible={isBootstrapping} label={bootLabel} />
      {!isBootstrapping ? <EndOfRunModal /> : null}
      {!isBootstrapping ? <DebugOverlay /> : null}
    </div>
  );
}
