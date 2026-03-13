---
title: "Game Design Document (Legacy)"
domain: game-design
audience: all-agents
reads-before: []
last-updated: 2026-03-13
status: legacy
summary: "LEGACY -- Original GDD. Superseded by docs/game-design/combat.md and buildings.md"
---

# Grailguard - Game Design Document (Legacy)

> **Note:** This is the original GDD kept for historical reference. The authoritative game design docs are now in `docs/game-design/`.

## Vision & Aesthetic

**Grailguard** is a 2.5D Auto-Battler Tower Defense game blending strategic base-building with organic, simulated unit combat.
- **Aesthetic:** "Kingdom Rush" style vibrant, lush environments.
- **Perspective:** Fixed, tilted Orthographic Diorama (2.5D Isometric projection). Zero perspective distortion, giving a true "game board" feel.
- **World bounds:** The world is a continuous, filled 500x500 plane that extends beyond the viewport, removing the "floating board" look in favor of a cohesive environment.
- **The Map:** A winding "S-Curve" dirt road generated via Catmull-Rom Splines, running through a dense, procedurally scattered forest of pine trees and rocks.

## Core Mechanics

### 1. Phased Combat Loop

The game toggles between two strict phases:
- **Build Phase:** Time stops. The player uses the "Toychest" HUD to drag and drop buildings and walls onto the field. A logarithmic countdown timer dictates how long the player has until the next wave.
- **Defend Phase:** The countdown ends (or is skipped), and the enemy wave spawns. Buildings begin producing allied units. Players cannot build during this phase, but they can cast spells.

### 2. The Toychest & Continuous Placement

- The bottom UI bezel is a horizontal ScrollView containing unlocked buildings.
- Press-and-hold reveals a tooltip describing the building's role, DPS, health, and spawn rates.
- **Placement Validation:** Dragging a building casts a ray onto the 3D plane. 
  - Walls **must** be placed on the road (`closestDist <= 4.0`).
  - Spawners **must** be placed on the grass (`closestDist >= 7.0`).
  - No buildings may overlap (`distance < 5.0`).

### 3. Pacing & Wave Budgeting

Enemy spawns are determined by a rigorous mathematical Point Budget, preventing pure randomness and ensuring a challenging polynomial difficulty curve.

**Wave Budget Formula:**
`B(W) = floor(50 * (1.15)^W + 2 * W^2)`
* `W` = Wave number. The budget buys enemies (e.g., Goblin=5, Orc=12, Troll=25, Boss=150).

**Build Timer Formula:**
`T(W) = 30 + 10 * ln(W)`
* Preparation time scales logarithmically so players have slightly more time in late-game waves, but not infinite time.

### 4. Meta-Progression (Coin of the Realm)

- Players earn "Coin of the Realm" after a game ends based on waves survived (`Earned = Wave * 10`).
- Coins are spent in the Market (Main Menu) to permanently unlock new building types.
- Unlocked state is persisted locally.

## Unit Roles & Interactions

Units are fully simulated in the Koota ECS runtime rather than grid-snapping.
- **Enemies:** Follow the S-Curve path toward the Holy Grail. They dynamically attack Barricades or any Allied units that block them.
- **Allies:** Spawn from their respective buildings. They organically pathfind towards the King's Road, intercepting enemies.
- **Movement:** Units follow continuous lane/path logic with local collision-aware spacing, avoiding unnatural clipping.