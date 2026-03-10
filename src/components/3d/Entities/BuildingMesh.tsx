import { useMemo } from 'react';
import { type Building, CELL_SIZE, HALF_GRID } from '../../../engine/constants';
import { generateNoiseTexture } from '../../../engine/textureUtils';

interface BuildingMeshProps {
  building: Building;
}

const BUILDING_COLORS: Record<string, string> = {
  wall: '#775533',
  hut: '#aa7744',
  range: '#446633',
  temple: '#9988cc',
  keep: '#778866',
};

export function BuildingMesh({ building }: BuildingMeshProps) {
  const wx = building.gridX * CELL_SIZE - HALF_GRID + CELL_SIZE / 2;
  const wz = building.gridZ * CELL_SIZE - HALF_GRID + CELL_SIZE / 2;
  const color = BUILDING_COLORS[building.type] ?? '#888888';
  const stoneTex = useMemo(() => generateNoiseTexture('stone_col'), []);
  const woodTex = useMemo(() => generateNoiseTexture('wood_col'), []);

  const mat = (
    <meshStandardMaterial
      map={building.type === 'hut' || building.type === 'wall' ? woodTex : stoneTex}
      color={color}
      roughness={0.78}
    />
  );

  if (building.type === 'wall') {
    return (
      <mesh position={[wx, 1.1, wz]} castShadow receiveShadow>
        <boxGeometry args={[CELL_SIZE * 0.85, 2.2, CELL_SIZE * 0.32]} />
        {mat}
      </mesh>
    );
  }

  if (building.type === 'hut') {
    return (
      <group position={[wx, 0, wz]}>
        <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.4, 1.1, 1.4]} />
          {mat}
        </mesh>
        {/* Roof */}
        <mesh position={[0, 1.35, 0]} castShadow>
          <coneGeometry args={[1.05, 0.85, 4]} />
          <meshStandardMaterial color="#882222" roughness={0.9} />
        </mesh>
      </group>
    );
  }

  if (building.type === 'range') {
    return (
      <group position={[wx, 0, wz]}>
        <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.5, 1.5, 1.2]} />
          {mat}
        </mesh>
        {/* Parapet / battlement hint */}
        {([-0.5, 0.5] as number[]).map((ox) => (
          <mesh key={`parapet-${ox}`} position={[ox, 1.65, 0]} castShadow>
            <boxGeometry args={[0.35, 0.4, 0.25]} />
            {mat}
          </mesh>
        ))}
        {/* Flag */}
        <mesh position={[0, 2.1, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.9, 5]} />
          <meshStandardMaterial color="#555" />
        </mesh>
        <mesh position={[0.2, 2.45, 0]}>
          <planeGeometry args={[0.4, 0.25]} />
          <meshBasicMaterial color="#cc2222" side={2} />
        </mesh>
      </group>
    );
  }

  if (building.type === 'temple') {
    return (
      <group position={[wx, 0, wz]}>
        <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.85, 1.0, 1.8, 8]} />
          {mat}
        </mesh>
        {/* Dome */}
        <mesh position={[0, 2.0, 0]} castShadow>
          <sphereGeometry args={[0.75, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#bbaadd" roughness={0.4} metalness={0.3} />
        </mesh>
        {/* Cross/spire */}
        <mesh position={[0, 2.8, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.7, 5]} />
          <meshStandardMaterial color="#ddddff" metalness={0.7} roughness={0.2} />
        </mesh>
        <pointLight position={[0, 2.0, 0]} color="#aaaaff" intensity={0.8} distance={5} />
      </group>
    );
  }

  // keep
  return (
    <group position={[wx, 0, wz]}>
      {/* Main tower */}
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 3.0, 1.6]} />
        {mat}
      </mesh>
      {/* Corner turrets */}
      {(
        [
          [-0.72, -0.72],
          [0.72, -0.72],
          [-0.72, 0.72],
          [0.72, 0.72],
        ] as [number, number][]
      ).map(([ox, oz]) => (
        <mesh key={`turret-${ox}-${oz}`} position={[ox, 1.6, oz]} castShadow>
          <cylinderGeometry args={[0.22, 0.26, 3.2, 6]} />
          {mat}
        </mesh>
      ))}
      {/* Battlements */}
      {([-0.55, 0, 0.55] as number[]).map((ox) => (
        <mesh key={`battlement-${ox}`} position={[ox, 3.25, 0]} castShadow>
          <boxGeometry args={[0.28, 0.42, 1.65]} />
          {mat}
        </mesh>
      ))}
      {/* Banner */}
      <mesh position={[0, 3.85, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 1.0, 5]} />
        <meshStandardMaterial color="#444" />
      </mesh>
      <mesh position={[0.28, 4.2, 0]}>
        <planeGeometry args={[0.55, 0.35]} />
        <meshBasicMaterial color="#bb0000" side={2} />
      </mesh>
    </group>
  );
}
