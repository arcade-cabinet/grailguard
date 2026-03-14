/**
 * @module useRadialMenu
 *
 * Hook that manages the radial context menu state. Determines the correct
 * menu items to display based on terrain context (road proximity, existing
 * building, game phase) and player resources/unlocks.
 */
import type { Entity } from 'koota';
import { useCallback, useState } from 'react';
import { BUILDINGS, type BuildingType } from '../../engine/constants';
import {
  Building,
  GameSession,
  gameWorld,
  getBuildingUpgradeCosts,
  getRoadDistance,
  getSelectableEntityAtPosition,
  queueWorldCommand,
  snapPlacementPosition,
  Unit,
} from '../../engine/GameEngine';
import { soundManager } from '../../engine/SoundManager';
import type { RadialMenuItem } from './RadialMenu';

/** The context determined from where the player clicked. */
export type MenuContext =
  | { kind: 'none' }
  | { kind: 'nearRoad'; worldPos: { x: number; y: number; z: number } }
  | { kind: 'farFromRoad'; worldPos: { x: number; y: number; z: number } }
  | { kind: 'anyTerrain'; worldPos: { x: number; y: number; z: number } }
  | { kind: 'building'; entity: Entity; worldPos: { x: number; y: number; z: number } }
  | { kind: 'wall'; entity: Entity; worldPos: { x: number; y: number; z: number } }
  | { kind: 'defendPhase' };

/** State tracked by the radial menu hook. */
export interface RadialMenuState {
  /** Whether the menu is currently visible. */
  isOpen: boolean;
  /** Screen coordinates for the menu center. */
  screenPos: { x: number; y: number };
  /** The resolved context. */
  context: MenuContext;
  /** Menu items to display, computed from context. */
  items: RadialMenuItem[];
}

/** Buildings that require being near the road (distance <= 4). */
const NEAR_ROAD_BUILDINGS: BuildingType[] = ['wall'];

/** Buildings that require being far from road (distance >= 7). Spawners + turrets. */
const FAR_FROM_ROAD_BUILDINGS: BuildingType[] = [
  'hut',
  'range',
  'temple',
  'keep',
  'sentry',
  'obelisk',
  'catapult',
  'sorcerer',
];

/** Resource/logistics buildings that can be placed at any distance. */
const ANY_TERRAIN_BUILDINGS: BuildingType[] = [
  'lumber',
  'mine_ore',
  'mine_gem',
  'vault',
  'mint',
  'track',
];

/**
 * Formats a building's costs as a compact string like "50g 20w".
 */
function formatCost(type: BuildingType): string {
  const config = BUILDINGS[type];
  const parts: string[] = [];
  if (config.cost > 0) parts.push(`${config.cost}g`);
  if ((config.woodCost ?? 0) > 0) parts.push(`${config.woodCost}w`);
  if ((config.oreCost ?? 0) > 0) parts.push(`${config.oreCost}o`);
  if ((config.gemCost ?? 0) > 0) parts.push(`${config.gemCost}gem`);
  return parts.join(' ') || 'Free';
}

/**
 * Checks if the player can afford a building given the current session.
 */
function canAfford(
  type: BuildingType,
  session: NonNullable<ReturnType<typeof gameWorld.get<typeof GameSession>>>,
): boolean {
  const config = BUILDINGS[type];
  const woodCost = config.woodCost ?? 0;
  const oreCost = config.oreCost ?? 0;
  const gemCost = config.gemCost ?? 0;
  let effectiveWood = woodCost;
  if (type === 'track' && session.relics?.includes('iron_tracks')) effectiveWood = 0;
  return (
    session.gold >= config.cost &&
    session.wood >= effectiveWood &&
    session.ore >= oreCost &&
    session.gem >= gemCost
  );
}

/**
 * Creates menu items for building placement from a list of candidate types.
 */
function buildPlacementItems(
  candidates: BuildingType[],
  unlocked: Record<BuildingType, boolean>,
  session: NonNullable<ReturnType<typeof gameWorld.get<typeof GameSession>>>,
): RadialMenuItem[] {
  return candidates
    .filter((type) => unlocked[type])
    .map((type) => {
      const config = BUILDINGS[type];
      const affordable = canAfford(type, session);
      return {
        id: `build-${type}`,
        icon: config.icon,
        label: config.name,
        subLabel: formatCost(type),
        disabled: !affordable,
        onSelect: () => {
          soundManager.playUiClick();
          queueWorldCommand({ type: 'clearSelection' });
          queueWorldCommand({
            type: 'setPlacementPreview',
            buildingType: type,
            preview: null,
          });
        },
      };
    });
}

/**
 * Creates menu items for an existing building (upgrade, targeting, sell).
 */
function buildBuildingItems(
  entity: Entity,
  session: NonNullable<ReturnType<typeof gameWorld.get<typeof GameSession>>>,
): RadialMenuItem[] {
  const building = entity.get(Building);
  if (!building) return [];

  const config = BUILDINGS[building.type];
  const costs = getBuildingUpgradeCosts(entity);
  if (!costs) return [];

  const items: RadialMenuItem[] = [];
  const isBuildPhase = session.phase === 'build';

  // Upgrade spawn
  if (building.levelSpawn < 5) {
    const canUpgrade = session.gold >= costs.spawn.gold;
    items.push({
      id: 'upgrade-spawn',
      icon: '\u2b06',
      label: config.isTurret ? 'Upgrade Rate' : 'Upgrade Spawn',
      subLabel: `${costs.spawn.gold}g`,
      disabled: !canUpgrade,
      onSelect: () => {
        soundManager.playUiClick();
        queueWorldCommand({ type: 'upgrade', entityId: entity.id(), branch: 'spawn' });
      },
    });
  }

  // Upgrade stats
  if (building.levelStats < 5) {
    const canUpgrade = session.gold >= costs.stats.gold;
    items.push({
      id: 'upgrade-stats',
      icon: '\u2b06',
      label: config.isTurret ? 'Upgrade Damage' : 'Upgrade Stats',
      subLabel: `${costs.stats.gold}g`,
      disabled: !canUpgrade,
      onSelect: () => {
        soundManager.playUiClick();
        queueWorldCommand({ type: 'upgrade', entityId: entity.id(), branch: 'stats' });
      },
    });
  }

  // Targeting (turrets only)
  if (config.isTurret) {
    for (const tgt of ['first', 'strongest', 'weakest'] as const) {
      items.push({
        id: `target-${tgt}`,
        icon: '\ud83c\udfaf',
        label: `Target: ${tgt.charAt(0).toUpperCase() + tgt.slice(1)}`,
        disabled: building.targeting === tgt,
        onSelect: () => {
          queueWorldCommand({
            type: 'setTargeting',
            entityId: entity.id() as number,
            targeting: tgt,
          });
        },
      });
    }
  }

  // Sell
  if (isBuildPhase) {
    const woodRefund = Math.floor((config.woodCost ?? 0) * 0.5);
    items.push({
      id: 'sell',
      icon: '\ud83d\udcb0',
      label: 'Sell',
      subLabel: `+${costs.sell}g${woodRefund > 0 ? ` +${woodRefund}w` : ''}`,
      disabled: false,
      onSelect: () => {
        soundManager.playUiClick();
        queueWorldCommand({ type: 'sellBuilding', entityId: entity.id() });
      },
    });
  }

  return items;
}

/**
 * Creates menu items for an existing wall (sell only).
 */
function buildWallItems(
  entity: Entity,
  session: NonNullable<ReturnType<typeof gameWorld.get<typeof GameSession>>>,
): RadialMenuItem[] {
  const unit = entity.get(Unit);
  if (!unit || unit.type !== 'wall') return [];

  const items: RadialMenuItem[] = [];
  const isBuildPhase = session.phase === 'build';

  if (isBuildPhase) {
    const woodRefund = Math.floor((BUILDINGS.wall.woodCost ?? 0) * 0.5);
    items.push({
      id: 'sell-wall',
      icon: '\ud83d\udcb0',
      label: 'Scrap Barricade',
      subLabel: `+${woodRefund}w`,
      disabled: false,
      onSelect: () => {
        soundManager.playUiClick();
        queueWorldCommand({ type: 'sellWall', entityId: entity.id() });
      },
    });
  }

  return items;
}

/**
 * Hook that manages the radial menu lifecycle.
 *
 * Returns state and handlers for opening/closing the menu based on
 * terrain clicks during the build phase.
 */
export function useRadialMenu(unlocked: Record<BuildingType, boolean>) {
  const [state, setState] = useState<RadialMenuState>({
    isOpen: false,
    screenPos: { x: 0, y: 0 },
    context: { kind: 'none' },
    items: [],
  });

  /**
   * Opens the radial menu at the given screen position for a world-space
   * click target. Determines context and builds appropriate items.
   */
  const openMenu = useCallback(
    (screenPos: { x: number; y: number }, worldPos: { x: number; y: number; z: number }) => {
      const session = gameWorld.get(GameSession);
      if (!session || session.gameOver) return;

      // During defend phase, no building menu
      if (session.phase === 'defend') {
        setState({
          isOpen: false,
          screenPos,
          context: { kind: 'defendPhase' },
          items: [],
        });
        return;
      }

      const snapped = snapPlacementPosition(worldPos);

      // Check for existing entity at this position
      const existingEntity = getSelectableEntityAtPosition({
        x: snapped.x,
        z: snapped.z,
      });

      if (existingEntity) {
        const building = existingEntity.get(Building);
        const unit = existingEntity.get(Unit);

        if (building) {
          const items = buildBuildingItems(existingEntity, session);
          setState({
            isOpen: items.length > 0,
            screenPos,
            context: { kind: 'building', entity: existingEntity, worldPos: snapped },
            items,
          });
          return;
        }

        if (unit?.type === 'wall') {
          const items = buildWallItems(existingEntity, session);
          setState({
            isOpen: items.length > 0,
            screenPos,
            context: { kind: 'wall', entity: existingEntity, worldPos: snapped },
            items,
          });
          return;
        }
      }

      // Empty terrain -- determine context based on road distance
      const roadDist = getRoadDistance({ x: snapped.x, z: snapped.z });
      const allItems: RadialMenuItem[] = [];

      // Near road (distance <= 4): walls
      if (roadDist <= 4) {
        allItems.push(...buildPlacementItems(NEAR_ROAD_BUILDINGS, unlocked, session));
      }

      // Far from road (distance >= 7): spawners + turrets
      if (roadDist >= 7) {
        allItems.push(...buildPlacementItems(FAR_FROM_ROAD_BUILDINGS, unlocked, session));
      }

      // Any terrain: resource/logistics
      allItems.push(...buildPlacementItems(ANY_TERRAIN_BUILDINGS, unlocked, session));

      const contextKind: MenuContext['kind'] =
        roadDist <= 4 ? 'nearRoad' : roadDist >= 7 ? 'farFromRoad' : 'anyTerrain';

      setState({
        isOpen: allItems.length > 0,
        screenPos,
        context: { kind: contextKind, worldPos: snapped } as MenuContext,
        items: allItems,
      });
    },
    [unlocked],
  );

  const closeMenu = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false, items: [] }));
  }, []);

  return { state, openMenu, closeMenu };
}
