import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as YUKA from 'yuka';
import { syncStoreToYuka, yukaEntities, yukaEntityManager } from '../../engine/ai/EntityManager';
import { PlayerGovernorBrain } from '../../engine/ai/PlayerGovernorBrain';
import { useGameStore } from '../../store/useGameStore';

export function GovernorController({ active }: { active: boolean }) {
  const governorRef = useRef<PlayerGovernorBrain | null>(null);

  useEffect(() => {
    if (active && !governorRef.current) {
      governorRef.current = new PlayerGovernorBrain();
      yukaEntityManager.add(governorRef.current);
    } else if (!active && governorRef.current) {
      yukaEntityManager.remove(governorRef.current);
      governorRef.current = null;
    }
  }, [active]);

  useFrame((_, rawDelta) => {
    if (!active) return;

    // Note: The CombatController handles yukaEntityManager.update(delta) during defend phase.
    // We should make sure Yuka advances during build phase too.
    const store = useGameStore.getState();
    if (store.phase === 'build') {
      const delta = Math.min(rawDelta, 0.05) * store.gameSpeed;
      yukaEntityManager.update(delta);
    }
  });

  return null;
}
