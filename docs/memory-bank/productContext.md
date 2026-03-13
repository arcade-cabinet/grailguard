---
title: "Grailguard Product Context"
domain: product
audience: all-agents
reads-before: [projectbrief.md]
last-updated: 2026-03-13
status: stable
summary: "Why Grailguard exists, target audience, UX goals, and session design"
---

# Product Context

## Why This Exists

Grailguard originated as a single-file HTML/Three.js prototype brainstormed via Gemini AI. The project explores what happens when you combine:

- **Auto-battler** unit spawning (not direct unit control)
- **Tower defense** placement strategy (road vs grass placement rules)
- **Factory logistics** resource chains (mine -> track -> mint/sanctuary)

The result is a deeper TD where economy management matters as much as combat placement.

## Target Audience

- Casual-to-mid-core strategy gamers
- Mobile-first (portrait and landscape), with full web support
- Sessions of 5-20 minutes per run

## UX Goals

- **Intuitive drag-and-drop placement** from the Toychest HUD
- **Clear visual feedback** -- floating damage numbers, particle bursts, screen flash on boss events
- **Readable at a glance** -- orthographic diorama camera, no perspective distortion
- **Progressive complexity** -- start with 2 buildings (wall + hut), unlock 13 more via meta-progression
- **Satisfying economy loop** -- watch minecarts shuttle resources along your track network

### Toychest Interaction
The bottom bezel is a horizontally scrollable "Toychest" panel. During build phase:
- Tap a building icon to enter placement mode
- Press-and-hold (or hover on web) reveals a parchment tooltip with name, role, DPS, and spawn rate
- Unaffordable buildings display at 50% opacity with grayscale filter
- Drag across the arena to see a placement ghost (green = valid, red = invalid)
- Placement snaps to a 5-unit grid

### Naming History
The project was originally conceived under the working title "King's Road" (referring to the enemy path). It was renamed to "Grailguard" to emphasize the defensive objective. References to "King's Road" in the codebase refer to the enemy path/road, not the project name.

## Session Flow

```
Main Menu (profile, unlocks, market, codex, doctrine, settings)
    |
    v
Start Run -> Build Phase (place buildings) -> Defend Phase (auto-battle)
    |                                              |
    v                                              v
Wave Complete -> Gold bonus + relic draft -> Next Build Phase
    |
    v (wave 20 or grail destroyed)
Game Over -> Bank rewards -> Return to Main Menu
```

## Key Screens

| Screen | Purpose |
|--------|---------|
| Main Menu (`index.tsx`) | Profile, treasury, start/resume run, market, settings |
| Game (`game.tsx`) | 3D arena + HUD overlay during active run |
| Codex (`codex.tsx`) | Discovered unit/building encyclopedia |
| Doctrine (`doctrine.tsx`) | Skill tree for permanent passive bonuses |
| Settings (`settings.tsx`) | Audio, FX, speed, haptics, camera preferences |

### UI Layout Approach (initial-release vs feat/poc-reset)

Initial-release used a **bezel-based UI layout** (`BezelLayout.tsx`) with dedicated HUD zones:
- **Top bezel:** Wave info, resources, game speed
- **Bottom bezel:** Toychest building selector (horizontally scrollable)
- **Side bezels:** Spell bar, selected building info
- **Modals:** `GameOverModal.tsx`, `MarketModal.tsx`, `UpgradeModal.tsx`

feat/poc-reset uses a React Native **overlay approach** with absolute-positioned View components layered over the 3D canvas. Both approaches work; the bezel pattern provides more structured layout management and may be worth revisiting for complex HUD states.
