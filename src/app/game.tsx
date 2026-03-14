/**
 * @module game
 *
 * Game screen for Grailguard. Bootstraps or resumes an ECS game world,
 * renders the R3F Canvas with the Arena scene, overlays the HUD and
 * floating-text layer, and manages run persistence (autosave on phase
 * transitions, periodic snapshots during defend phase, and save-on-background).
 * Handles touch/pan gestures for building placement and entity selection.
 */
import { useProgress } from '@react-three/drei';
import { Canvas } from '@react-three/fiber/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useTrait, WorldProvider } from 'koota/react';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  AppState,
  PanResponder,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Arena,
  projectScreenPointToGround,
  projectWorldPointToScreen,
} from '../components/3d/Arena';
import { getAllModelPaths } from '../components/3d/modelPaths';
import { HUD } from '../components/ui/HUD';
import { Tutorial } from '../components/ui/Tutorial';
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
import { BUILDINGS, type BuildingType } from '../engine/constants';
import {
  AutosaveState,
  checkpointRun,
  createRunWorld,
  FloatingText,
  finalizeRun,
  GameSession,
  gameWorld,
  getSelectableEntityAtPosition,
  hydrateRunWorld,
  isPlacementValid,
  Position,
  queueWorldCommand,
  resetGameWorld,
  serializeRunWorld,
  snapPlacementPosition,
} from '../engine/GameEngine';
import { soundManager } from '../engine/SoundManager';
import { getActivePlacement, getPlacementPreview, getSelectedEntity } from '../engine/selectors';
import { audioBus } from '../engine/audio/audioBridge';
import { createAmbienceManager, type AmbienceManager } from '../engine/audio/ambienceManager';
import { GestureOverlay } from '../components/3d/GestureOverlay';
import { DebugOverlay } from '../components/ui/DebugOverlay';
import { impactMedium, impactHeavy, impactLight, notificationSuccess, notificationWarning } from '../engine/haptics';
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
    return () => { for (const unsub of unsubs) unsub(); };
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

    // Announce phase changes
    if (session.phase !== prevPhaseRef.current) {
      prevPhaseRef.current = session.phase;
      if (session.phase === 'build') {
        AccessibilityInfo.announceForAccessibility(t('a11y_phase_build'));
      } else if (session.phase === 'defend') {
        const composition = session.announcement || 'Battle Phase';
        AccessibilityInfo.announceForAccessibility(
          t('a11y_wave_start', { wave: session.wave, composition }),
        );
      }
    }

    // Announce game over
    if (session.gameOver && !prevGameOverRef.current) {
      prevGameOverRef.current = true;
      if (session.announcement === 'Victory Achieved!') {
        AccessibilityInfo.announceForAccessibility(t('a11y_game_over_victory'));
      } else {
        AccessibilityInfo.announceForAccessibility(t('a11y_game_over_defeat'));
      }
    }
  }, [session?.phase, session?.gameOver, session?.announcement, session?.wave, session]);

  return null;
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
    <View className="absolute inset-0" pointerEvents="none">
      {floatingTexts.map((entity) => {
        const floatingText = entity.get(FloatingText);
        const position = entity.get(Position);
        if (!floatingText || !position) return null;

        const projected = projectWorldPointToScreen(position, viewportSize);
        if (!projected?.visible) return null;

        return (
          <View
            key={entity.id()}
            className="absolute"
            style={{
              left: projected.x - 32,
              top: projected.y - 20,
              width: 64,
              alignItems: 'center',
              opacity: Math.max(0, floatingText.life),
            }}
          >
            <Text
              style={{
                color: floatingText.color,
                fontSize: 20,
                fontWeight: '900',
                textShadowColor: '#000000',
                textShadowOffset: { width: 1, height: 1 },
                textShadowRadius: 3,
              }}
            >
              {floatingText.text}
            </Text>
          </View>
        );
      })}
    </View>
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
    <View className="absolute inset-0 items-center justify-center bg-[#0a0806]/95">
      <View className="h-14 w-14 rounded-full border-4 border-[#d4af37]/20 border-t-[#d4af37]" />
      <Text className="mt-6 text-5xl font-bold text-[#d4af37]">{t('app_title')}</Text>
      <Text className="mt-2 text-lg text-[#d7c6af]">{t('game_loading_blessing')}</Text>
      <Text className="mt-3 text-sm font-semibold tracking-[2px] text-[#f7ebd0]">
        {progressLabel}
      </Text>
    </View>
  );
}

function EndOfRunModal() {
  const session = useTrait(gameWorld, GameSession);
  const router = useRouter();
  const [isBanking, setIsBanking] = useState(false);

  if (!session?.gameOver) return null;

  return (
    <View className="absolute inset-0 items-center justify-center bg-[#0a0806]/95 px-6">
      <View className="w-full max-w-md rounded-[32px] border-2 border-[#8b3026] bg-[#2a100d] p-8 shadow-2xl">
        <Text className="text-center text-5xl font-bold text-[#f2d6c9]">
          {session.announcement === 'Victory Achieved!'
            ? t('game_end_victory')
            : t('game_end_defeat')}
        </Text>

        <View className="mt-8 gap-4">
          <View className="flex-row justify-between border-b border-[#5a371f] pb-2">
            <Text className="text-xl text-[#dfbfaf]">{t('game_end_wave_reached')}</Text>
            <Text className="text-xl font-bold text-[#f7ebd0]">{session.wave}</Text>
          </View>
          <View className="flex-row justify-between border-b border-[#5a371f] pb-2">
            <Text className="text-xl text-[#dfbfaf]">{t('game_end_total_kills')}</Text>
            <Text className="text-xl font-bold text-[#f7ebd0]">{session.totalKills}</Text>
          </View>
          <View className="flex-row justify-between border-b border-[#5a371f] pb-2">
            <Text className="text-xl text-[#dfbfaf]">{t('game_end_gold_earned')}</Text>
            <Text className="text-xl font-bold text-[#d4af37]">{session.earnedCoins} 🪙</Text>
          </View>
        </View>

        <TouchableOpacity
          disabled={isBanking}
          onPress={() => {
            setIsBanking(true);
            void bankRunRewards(finalizeRun('defeat')).then(() => {
              router.replace('/');
            });
          }}
          className={`mt-10 rounded-2xl border-2 border-[#b98b52] px-8 py-4 ${
            isBanking ? 'bg-[#3a2211]' : 'bg-[#5a371f]'
          }`}
          accessibilityRole="button"
          accessibilityLabel={isBanking ? 'Banking spoils' : 'Return to court'}
        >
          <Text className="text-center text-2xl font-bold text-[#f7ebd0]">
            {isBanking ? t('game_end_banking') : t('btn_return_to_court')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
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

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
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
    });

    return () => subscription.remove();
  }, []);

  return null;
}

function GameContent({
  onCancelPlacement,
  onClearSelection,
  onExit,
  onSelectPlacement,
  unlocked,
}: {
  onCancelPlacement: () => void;
  onClearSelection: () => void;
  onExit: () => void;
  onSelectPlacement: (type: BuildingType) => void;
  unlocked: Record<BuildingType, boolean>;
}) {
  const session = useTrait(gameWorld, GameSession);
  const selectedEntity = getSelectedEntity();
  const activePlacement = getActivePlacement();

  if (!session) return null;

  return (
    <HUD
      activePlacement={activePlacement}
      onCancelPlacement={onCancelPlacement}
      onClearSelection={onClearSelection}
      onExit={onExit}
      onSelectPlacement={onSelectPlacement}
      selectedEntity={selectedEntity}
      unlocked={unlocked}
    />
  );
}

export default function GameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    mode?: string;
    biome?: string;
    challenge?: string;
    spells?: string;
    mapSize?: string;
    seed?: string;
  }>();
  const { settings, unlocks } = useMetaProgress();
  const doctrineNodes = useDoctrineNodes();
  const [bootLabel, setBootLabel] = useState(t('game_loading_default'));
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const bootedRef = useRef(false);
  const finalizingRef = useRef<Promise<void> | null>(null);

  const bootMode = useMemo(() => (params.mode === 'resume' ? 'resume' : 'fresh'), [params.mode]);

  useEffect(() => {
    void soundManager.init(settings?.soundEnabled ?? true, settings?.musicEnabled ?? true);
  }, [settings?.soundEnabled, settings?.musicEnabled]);

  // Fix 20: Play biome ambience when run starts
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
          createRunWorld({ preferredSpeed, doctrines, spells, biome, difficulty, mapSize, seed });
        } else {
          if (autoResume && savedRun) {
            hydrateRunWorld(JSON.parse(savedRun.snapshotJson));
          } else {
            createRunWorld({ preferredSpeed, doctrines, spells, biome, difficulty, mapSize, seed });
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
  ]);

  const handleExit = async () => {
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
    router.replace('/');
  };

  const showTutorial = settings?.tutorialComplete === false;
  const [tutorialDismissed, setTutorialDismissed] = useState(false);

  return (
    <WorldProvider world={gameWorld}>
      {!isBootstrapping ? <RunPersistenceBridge /> : null}
      {!isBootstrapping ? <CodexDiscoveryBridge /> : null}
      {!isBootstrapping ? <AccessibilityAnnouncementBridge /> : null}
      {!isBootstrapping ? <HapticsBridge hapticsEnabled={settings?.hapticsEnabled ?? true} /> : null}
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

  const updatePreview = (locationX: number, locationY: number) => {
    if (!activePlacement) return;

    const ndcX = (locationX / viewportSize.width) * 2 - 1;
    const ndcY = -((locationY / viewportSize.height) * 2 - 1);
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

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => session?.phase === 'build',
    onMoveShouldSetPanResponder: () => Boolean(activePlacement) && session?.phase === 'build',
    onPanResponderGrant: (event) => {
      gestureStart.current = {
        x: event.nativeEvent.locationX,
        y: event.nativeEvent.locationY,
      };
      if (activePlacement) {
        updatePreview(event.nativeEvent.locationX, event.nativeEvent.locationY);
      }
    },
    onPanResponderMove: (event) => {
      if (activePlacement) {
        updatePreview(event.nativeEvent.locationX, event.nativeEvent.locationY);
      }
    },
    onPanResponderRelease: (event) => {
      if (activePlacement && placementPreview?.valid) {
        queueWorldCommand({
          type: 'build',
          buildingType: activePlacement,
          position: placementPreview,
        });
        clearSelection();
        clearPlacement();
        return;
      }

      if (activePlacement) {
        clearPlacement();
        return;
      }

      const movement = Math.hypot(
        event.nativeEvent.locationX - gestureStart.current.x,
        event.nativeEvent.locationY - gestureStart.current.y,
      );
      if (movement > 10) return;

      const ndcX = (event.nativeEvent.locationX / viewportSize.width) * 2 - 1;
      const ndcY = -((event.nativeEvent.locationY / viewportSize.height) * 2 - 1);
      const hit = projectScreenPointToGround(ndcX, ndcY);
      if (!hit) {
        clearSelection();
        return;
      }

      const snapped = snapPlacementPosition(hit);
      const entity = getSelectableEntityAtPosition({ x: snapped.x, z: snapped.z });
      if (!entity) {
        clearSelection();
        return;
      }
      queueWorldCommand({ type: 'selectEntity', entityId: entity.id() });
    },
    onPanResponderTerminate: clearPlacement,
  });

  return (
    <View
      className="flex-1 bg-[#87CEEB]"
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setViewportSize({ width, height });
      }}
    >
      <GestureOverlay>
      <View {...panResponder.panHandlers} className="flex-1">
        <Canvas
          orthographic
          camera={{ position: [0, 100, 70], zoom: 1, near: 0.1, far: 1000 }}
          shadows
          style={{ flex: 1 }}
        >
          <Suspense fallback={null}>
            <Arena placementPreview={placementPreview} selectedEntity={selectedEntity} />
          </Suspense>
        </Canvas>

        {activePlacement ? (
          <View className="absolute bottom-40 left-4 right-4 rounded-2xl border border-[#d4af37] bg-[#1f140f]/90 px-4 py-3">
            <Text className="text-center text-sm font-semibold tracking-[2px] text-[#f7ebd0]">
              {t('game_placement_hint', { building: BUILDINGS[activePlacement].name })}
            </Text>
            <Text className="mt-1 text-center text-xs uppercase tracking-[2px] text-[#c9b18b]">
              {t('game_placement_rules')}
            </Text>
          </View>
        ) : null}
      </View>
      </GestureOverlay>

      {!isBootstrapping ? (
        <>
          <GameContent
            onCancelPlacement={clearPlacement}
            onClearSelection={clearSelection}
            onExit={onExit}
            onSelectPlacement={(type) => {
              clearSelection();
              queueWorldCommand({
                type: 'setPlacementPreview',
                buildingType: type,
                preview: null,
              });
            }}
            unlocked={unlocks}
          />
          <FloatingTextLayer viewportSize={viewportSize} />
        </>
      ) : null}

      <LoadingOverlay forceVisible={isBootstrapping} label={bootLabel} />
      {!isBootstrapping ? <EndOfRunModal /> : null}
      {!isBootstrapping ? <DebugOverlay /> : null}
    </View>
  );
}
