/**
 * @module selectors
 *
 * Lightweight ECS query helpers that read from the global {@link gameWorld}.
 * These are consumed by React UI components to derive read-only view-model
 * data without coupling directly to the Koota query API.
 */

import type { Entity } from 'koota';
import type { BuildingType } from './constants';
import { GameSession, gameWorld, Position } from './GameEngine';

/**
 * Returns the currently selected entity (building or wall) based on the
 * `selectedEntityId` stored in the {@link GameSession} singleton trait.
 *
 * @returns The selected {@link Entity}, or `null` if nothing is selected or
 *          the referenced entity no longer exists.
 */
export function getSelectedEntity(): Entity | null {
  const session = gameWorld.get(GameSession);
  if (!session || session.selectedEntityId < 0) return null;

  // Direct ID lookup is more efficient than iterating all entities
  const entity = gameWorld.entity(session.selectedEntityId);
  if (entity && entity.has(Position)) {
    return entity;
  }

  return null;
}

/**
 * Returns the {@link BuildingType} the player is currently attempting to
 * place, or `null` if no placement mode is active.
 *
 * @returns The active building type being placed, or `null`.
 */
export function getActivePlacement(): BuildingType | null {
  const session = gameWorld.get(GameSession);
  if (!session?.activePlacement) return null;
  return session.activePlacement;
}

/**
 * Returns the current placement preview state -- the snapped world position
 * and validity flag for the ghost building shown under the player's cursor.
 *
 * @returns An object with `{ x, y, z, valid }` if a placement is active,
 *          or `null` if no building type is selected for placement.
 */
export function getPlacementPreview(): {
  x: number;
  y: number;
  z: number;
  valid: boolean;
} | null {
  const session = gameWorld.get(GameSession);
  if (!session?.activePlacement) return null;

  return {
    x: session.placementX,
    y: session.placementY,
    z: session.placementZ,
    valid: session.placementValid,
  };
}