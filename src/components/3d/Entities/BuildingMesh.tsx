import React, { useMemo } from 'react';
import { Building } from '../../../engine/constants';
import { CELL_SIZE, HALF_GRID } from '../../../engine/constants';
import { generateNoiseTexture } from '../../../engine/textureUtils';

interface BuildingMeshProps {
  building: Building;
}

const BUILDING_HEIGHT: Record<string, number> = {
  wall: 2.0,
  hut: 1.5,
  range: 2.0,
  temple: 2.5,
  keep: 3.5,
};

const BUILDING_COLORS: Record<string, string> = {
  wall: '#775533',
  hut: '#aa7744',
  range: '#556633',
  temple: '#aaaaff',
  keep: '#888866',
};

export function BuildingMesh({ building }: BuildingMeshProps) {
  const wx = building.gridX * CELL_SIZE - HALF_GRID + CELL_SIZE / 2;
  const wz = building.gridZ * CELL_SIZE - HALF_GRID + CELL_SIZE / 2;
  const height = BUILDING_HEIGHT[building.type] ?? 1.5;
  const color = BUILDING_COLORS[building.type] ?? '#888888';
  const stoneTex = useMemo(() => generateNoiseTexture('stone_col'), []);

  return (
    <mesh position={[wx, height / 2, wz]} castShadow receiveShadow>
      {building.type === 'wall' ? (
        <boxGeometry args={[CELL_SIZE * 0.8, height, CELL_SIZE * 0.3]} />
      ) : (
        <boxGeometry args={[CELL_SIZE * 0.7, height, CELL_SIZE * 0.7]} />
      )}
      <meshStandardMaterial map={stoneTex} color={color} roughness={0.75} />
    </mesh>
  );
}
