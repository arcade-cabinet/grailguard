import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import {
  playBossAoESound,
  playBreachSound,
  playHealSound,
  playHitSound,
  playKillSound,
} from '../../engine/audio/SoundManager';
import { stepCombatSimulation } from '../../engine/systems/CombatSystem';
import { useGameStore } from '../../store/useGameStore';
import { emitFloatingText } from './FloatingTextSystem';
import { emitCoins, emitParticles, emitSparks } from './ParticleSystem';

/**
 * Per-frame controller that advances the combat simulation while the game is in the 'defend' phase.
 *
 * Runs inside the render loop and delegates to the pure stepCombatSimulation function.
 */
export function CombatController() {
  const waveEndTimer = useRef(0);

  useFrame((_, rawDelta) => {
    const store = useGameStore.getState();

    // Always decay smite cooldown and camera shake
    if (store.divineSmiteCooldown > 0) {
      store.setDivineSmiteCooldown(Math.max(0, store.divineSmiteCooldown - rawDelta));
    }
    if (store.cameraShake > 0) {
      store.triggerCameraShake(Math.max(0, store.cameraShake - 0.025));
    }

    if (store.phase !== 'defend') return;

    // Cap delta to avoid physics tunneling at low frame-rates
    const delta = Math.min(rawDelta, 0.05) * store.gameSpeed;

    const result = stepCombatSimulation(
      delta,
      {
        units: store.units,
        buildings: store.buildings,
        pathCoords: store.pathCoords,
        grid: store.grid,
      },
      {
        onEnemyKilled: (mu) => {
          emitCoins([mu.position.x, 0.5, mu.position.z], 10);
          emitFloatingText([mu.position.x, 1.5, mu.position.z], mu.reward ?? 0);
        },
        onUnitDamaged: (tgt, damage) => {
          emitFloatingText([tgt.position.x, 1.5, tgt.position.z], damage);
          playHitSound();
          if (tgt.hp <= 0) {
            emitParticles([tgt.position.x, 0.5, tgt.position.z], '#ff4400', 6);
            playKillSound();
          }
        },
        onUnitHealed: (tgt, amount) => {
          emitFloatingText([tgt.position.x, 1.5, tgt.position.z], -amount);
          playHealSound();
        },
        onWallDamaged: (wall) => {
          emitSparks([wall.position.x, 1.0, wall.position.z], 6);
        },
        onBossAoE: (boss) => {
          playBossAoESound();
        },
        onBreach: (enemy) => {
          emitParticles([enemy.position.x, 0.5, enemy.position.z], '#ff0000', 12);
          playBreachSound();
          store.triggerCameraShake(0.5);
        },
        onRemoveBuilding: (buildingId) => {
          store.removeBuilding(buildingId);
        },
        onDropPotion: (pos) => {
          emitFloatingText([pos.x, 1.5, pos.z], -5);
          store.takeDamage(-5); // Heals 5 HP
        },
        onDropStar: (pos) => {
          emitFloatingText([pos.x, 1.5, pos.z], 999);
          store.setDivineSmiteCooldown(0); // Resets smite
        },
      },
    );

    // ── ONE atomic Zustand update for the entire frame ────────────────────
    store.batchSetUnits(
      result.newUnits,
      Object.keys(result.newUnits),
      result.goldDelta,
      result.healthDelta,
    );

    // ── Wave-end detection ────────────────────────────────────────────────
    if (!result.hasEnemies) {
      waveEndTimer.current += delta;
      if (waveEndTimer.current > 2.0) {
        waveEndTimer.current = 0;
        store.setPhase('build');
        const msg = `⚔ Wave ${store.wave} Complete!  +20g`;
        store.setAnnouncement(msg);
        setTimeout(() => useGameStore.getState().setAnnouncement(''), 3000);
      }
    } else {
      waveEndTimer.current = 0;
    }
  });

  return null;
}
