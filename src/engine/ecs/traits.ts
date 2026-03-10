import { trait } from 'koota';
import type { BuildingType, Faction, UnitType } from '../constants';

export const Position = trait({ x: 0, y: 0, z: 0 });

export const Velocity = trait({ x: 0, y: 0, z: 0 });

export const Health = trait({ current: 100, max: 100 });

export const Team = trait({ faction: 'ally' as Faction });

// Visual representation for the entity (which 3D model to load)
export const Model = trait({ name: 'knight' as string, scale: 1.0 });

// Indicates this entity is a building on the grid
export const Building = trait({ type: 'wall' as BuildingType, gridX: 0, gridZ: 0 });

// Indicates this entity is a mobile unit
export const Unit = trait({ type: 'militia' as UnitType });

// Combat stats
export const CombatStats = trait({ damage: 10, attackRange: 1.5, attackSpeed: 1.0, cooldown: 0 });

// For environment detailing (rocks, trees)
export const Scenery = trait({ type: 'tree' as 'tree' | 'rock' | 'crystal' });

// For specialized weapons (towers)
export const Weapon = trait({ type: 'turret' as 'turret' | 'cannon' | 'ballista' | 'catapult' });
