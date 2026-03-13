import type { Entity } from 'koota';
import type { BuildingType } from './constants';
import { GameSession, gameWorld, Position } from './GameEngine';

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

export function getActivePlacement(): BuildingType | null {
  const session = gameWorld.get(GameSession);
  if (!session?.activePlacement) return null;
  return session.activePlacement;
}

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