import * as THREE from 'three';

// Simple mulberry32 PRNG
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

export function generateRoadPoints(seedStr: string, mapSize: number): THREE.Vector3[] {
  const seed = hashString(seedStr);
  const rand = mulberry32(seed);

  const points: THREE.Vector3[] = [];
  
  const halfSize = mapSize / 2;
  // Starting point (Edge of map)
  const startX = -halfSize * 0.9 + (rand() * (mapSize * 0.1) - (mapSize * 0.05));
  const startZ = halfSize * 0.9 + (rand() * (mapSize * 0.1) - (mapSize * 0.05));
  points.push(new THREE.Vector3(startX, 0.5, startZ));

  // Intermediate winding points
  const numMidPoints = 4 + Math.floor(rand() * 3); // 4 to 6 midpoints
  
  for (let i = 1; i <= numMidPoints; i++) {
    const t = i / (numMidPoints + 1); // 0.0 to 1.0 progress
    
    // Interpolate towards center
    const baseX = startX * (1 - t);
    const baseZ = startZ * (1 - t);
    
    // Add S-Curve winding offset perpendicular to the main vector
    const angle = t * Math.PI * 2 * (rand() > 0.5 ? 1 : -1);
    const offsetMag = (mapSize * 0.15) + rand() * (mapSize * 0.15);
    
    const x = baseX + Math.cos(angle) * offsetMag;
    const z = baseZ + Math.sin(angle) * offsetMag;
    
    points.push(new THREE.Vector3(x, 0.5, z));
  }

  // Sanctuary at 0,0
  points.push(new THREE.Vector3(0, 0.5, 0));

  return points;
}
