import type { Entity } from 'koota';
import type { BuildingType } from './constants';
import { GameSession, gameWorld, Position } from './GameEngine';

export function getSelectedEntity(): Entity | null {
  const session = gameWorld.get(GameSession);
  if (!session || session.selectedEntityId < 0) return null;

  for (const entity of gameWorld.query(Position)) {
    if (entity.id() === session.selectedEntityId) {
      return entity;
    }
  }

  return null;
}

export function getActivePlacement(): BuildingType | null {
  const session = gameWorld.get(GameSession);
  if (!session?.activePlacement) return null;
  return session.activePlacement;
}

export function getPlacementPreview() {
  const session = gameWorld.get(GameSession);
  if (!session?.activePlacement) return null;

  return {
    x: session.placementX,
    y: session.placementY,
    z: session.placementZ,
    valid: session.placementValid,
  };
}
