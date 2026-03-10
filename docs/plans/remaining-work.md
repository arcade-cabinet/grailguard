# GrailGuard — Remaining Work

> **Last updated**: 2026-03-10

This document tracks all outstanding work needed to complete GrailGuard. Items are ordered by priority and dependency.

---

## 🔴 Blockers — Must Do Before Push

### 1. Install Tone.js

```bash
pnpm add tone
```

The audio modules (`SoundManager.ts`, `AmbienceManager.ts`, `AudioBridge.ts`) are written but import `tone` which isn't in `package.json` yet.

### 2. Git LFS Setup

`.gitattributes` is already created. Run:

```bash
git lfs install
git lfs track "public/assets/**/*.glb"
git lfs track "public/assets/**/*.jpg"
git lfs track "public/assets/**/*.png"
```

### 3. Commit & Push

```bash
git add .
git commit -m "feat: PBR textures, HDRI skybox, Tone.js audio, comprehensive docs"
git push origin initial-release
```

### 4. PR Review Feedback

Use GitHub GraphQL to resolve review comments:

```bash
# List pending review threads
gh api graphql -f query='
  query {
    repository(owner: "OWNER", name: "arcade-cabinet") {
      pullRequest(number: PR_NUMBER) {
        reviewThreads(first: 50) {
          nodes { id isResolved comments(first: 1) { nodes { body } } }
        }
      }
    }
  }
'

# Resolve a thread
gh api graphql -f query='
  mutation { resolveReviewThread(input: { threadId: "THREAD_ID" }) { thread { isResolved } } }
'
```

---

## 🟡 Audio Wiring — Code Changes Needed

### Wire CombatController.tsx

Add per-event sound calls inside the `useFrame` combat loop:

| Location in CombatController | Sound to Add |
| --- | --- |
| Line ~155 (successful attack hit) | `playHitSound()` |
| Line ~157 (target killed, hp <= 0) | `playKillSound()` |
| Line ~141 (cleric heal) | `playHealSound()` |
| Line ~152 (boss AoE) | `playBossAoESound()` |
| Line ~228 (sanctuary breach) | `playBreachSound()` |

**Important**: These are async functions but called in a sync render loop. The `ensureContext()` check returns immediately after first user gesture. Tone.js handles scheduling internally.

### Wire game.tsx

```typescript
import { initAudioBridge, destroyAudioBridge } from '../engine/audio/AudioBridge';

// Inside the game screen component:
useEffect(() => {
  initAudioBridge();
  return () => destroyAudioBridge();
}, []);
```

### Wire Smite Button (HUD)

In whatever component handles the "Divine Smite" button press, add:

```typescript
import { playSmiteSound } from '../../engine/audio/SoundManager';
// Inside the smite handler:
playSmiteSound();
```

---

## 🟡 Advanced AI — Code Changes Needed

### Governor Brain Improvements

**File**: `src/engine/ai/PlayerGovernorBrain.ts`

1. **Threat-aware building**: Factor `wave` number into `GoalEvaluator` weights. Higher waves → prioritize Ranges over Huts.

2. **Income tracking**: Track gold income rate from Huts. When income exceeds threat, prioritize economy.

3. **Repair goal**: New `RepairGoalEvaluator` that targets damaged buildings (hp < maxHp) instead of building new ones.

4. **Rally/Smite goal**: New `SmiteGoalEvaluator` that triggers Divine Smite when enemy cluster density > threshold.

### Enemy AI Improvements

**File**: `src/engine/ai/EnemyBrain.ts`

1. **Evasion**: Add `EvadeBehavior` from Yuka that activates when an enemy is within Range tower's `attackRange`. Weight it lower than `SeekBehavior` so enemies still advance.

2. **Boss targeting**: Boss enemies override target selection to prioritize Huts (economic sabotage) via custom `Think` brain.

3. **Troll wall-skip**: Trolls ignore `TILE.BARRICADE` in pathfinding and move directly toward Sanctuary.

---

## 🟡 Day/Night HDRI Swap

**File**: `src/components/3d/Environment.tsx`

Currently the HDRI skybox is static (`day.jpg`). The day/night cycle only lerps directional light color/intensity.

### Plan

1. Preload all 3 HDRIs via `useTexture`:

```typescript
const [dayHdri, eveningHdri, nightHdri] = useTexture([
  '/assets/hdri/day.jpg',
  '/assets/hdri/evening.jpg',
  '/assets/hdri/night.jpg',
]);
```

2. In the `useFrame` loop, swap `scene.background` and `scene.environment` based on `_timeOfDay`:
   - 0.0–0.25: Day HDRI
   - 0.25–0.50: Crossfade to Evening HDRI (use opacity blending or snap)
   - 0.50–0.75: Night HDRI
   - 0.75–1.00: Crossfade to Day HDRI (dawn)

3. **Note**: THREE.js doesn't natively crossfade equirectangular textures. A simple snap-switch at stage boundaries is sufficient for game feel.

---

## 🟡 Game Flow Polish

### Victory / Defeat Screens

**File**: `src/store/useGameStore.ts` + new UI component

1. Add `gameOver: 'playing' | 'victory' | 'defeat'` to `GameState`.
2. In `CombatController.tsx`: when `health <= 0`, set `gameOver: 'defeat'`.
3. Add a victory condition (e.g., survive 15 waves) that sets `gameOver: 'victory'`.
4. Create `GameOverOverlay.tsx` component that shows win/lose screen with restart button.

### Restart Flow

The `resetGame()` action exists in Zustand. Wire it to the restart button:

```typescript
const resetGame = useGameStore((s) => s.resetGame);
<button onClick={resetGame}>Play Again</button>
```

---

## 🟢 Nice-to-Haves

### Visual Regression Testing

- Save baseline screenshots from Playwright E2E runs
- Compare new screenshots against baselines using `pixelmatch` or `@playwright/test`'s built-in snapshot comparison

### Building PBR Textures

The Bricks021 and Planks012 PBR sets are copied to `public/assets/materials/` but not yet wired into `BuildingMesh.tsx`. To use them:

```typescript
// In BuildingMesh.tsx
const [brickColor, brickNormal, brickRoughness] = useTexture([
  '/assets/materials/Bricks021/Color.jpg',
  '/assets/materials/Bricks021/NormalGL.jpg',
  '/assets/materials/Bricks021/Roughness.jpg',
]);

// Apply to wall models via meshStandardMaterial override
```

### Particle Effects Enhancement

- Add falling gold coin particles on enemy kill (currently just colored dots)
- Add construction dust particles when building is placed
- Add impact sparks when wall takes damage

---

## Summary Checklist

| Item | Status | Effort |
| --- | --- | --- |
| Install `tone` | ⏸ Blocked (terminal) | 1 min |
| Git LFS setup | ⏸ Blocked (terminal) | 5 min |
| Commit & push | ⏸ Blocked (terminal) | 2 min |
| PR review feedback | ⏸ Blocked (terminal) | 15 min |
| Wire audio → CombatController | 📝 Code ready, needs edit | 10 min |
| Wire audio → game.tsx | 📝 Code ready, needs edit | 2 min |
| Wire audio → smite button | 📝 Code ready, needs edit | 2 min |
| Governor threat-aware building | 📝 Designed | 30 min |
| Governor repair goal | 📝 Designed | 20 min |
| Enemy evasion behavior | 📝 Designed | 20 min |
| Boss targeting Huts | 📝 Designed | 15 min |
| Troll wall-skip | 📝 Designed | 15 min |
| Day/night HDRI swap | 📝 Designed | 15 min |
| Victory/defeat screens | 📝 Designed | 30 min |
| Building PBR textures | 📝 Assets ready | 20 min |
| Visual regression testing | 📝 Designed | 30 min |
