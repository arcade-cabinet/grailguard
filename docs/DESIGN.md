# GrailGuard — Game Design Document

## Concept

**GrailGuard** is a medieval tower-defense game where the player (or an AI Governor) builds structures to defend a sacred Sanctuary from waves of increasingly dangerous enemies.

**Genre**: Tower Defense / Strategy
**Perspective**: Isometric 3D
**Theme**: Medieval fantasy — knights, orcs, goblin hordes, sacred relics

---

## Core Loop

```
BUILD → WAVE → DEFEND → COLLECT → BUILD → ...
```

1. **Build Phase**: Spend gold to place buildings on the grid
2. **Wave Phase**: Enemy hordes spawn and march toward the Sanctuary
3. **Defend Phase**: Allied units auto-engage enemies; player can use Smite and Spells
4. **Collect Phase**: Earn gold from kills, collect physical coin/potion drops
5. **Repeat**: Each wave increases in difficulty and enemy quantity

---

## Economy & progression

| Resource | Source | Usage |
|---|---|---|
| **Gold** | Enemy kills, Coin drops | Build structures, Upgrades, Spells |
| **HP** (Sanctuary) | Starting: 20 | Lose when enemies reach Sanctuary |

### Building Costs & Types

Buildings are unlocked via the Market between sessions, and cost gold to build within a match. Towers can be tapped to **Upgrade** them during gameplay (+20% stats, +15% visual scale per level).

| Building | Function |
|---|---|
| **Wall** | Durable barricade (600 HP), blocks pathing |
| **Hut** | Generates militia every 3.5s |
| **Range** | Spawns archers every 4.5s |
| **Temple** | Spawns healers every 6.0s |
| **Keep** | Spawns elite knights every 8.0s |
| **Turret** | Basic automated defensive Tower (short range) |
| **Ballista**| High-damage piercing bolt Tower (medium range) |
| **Cannon**  | Heavy area-of-effect damage Tower |
| **Catapult**| Massive range and damage Siege engine |

---

## Units

### Allied Units

| Unit | HP | Speed | Damage | Range | Special |
|---|---|---|---|---|---|
| Militia | 40 | 2.5 | 10 | 0.8 | Cheap, fast |
| Archer | 20 | 2.0 | 15 | 5.5 | Long range |
| Cleric | 30 | 1.8 | -15 | 4.0 | Healer (negative damage = heal) |
| Knight | 150 | 1.5 | 25 | 1.0 | Tanky melee |

### Enemy Units

| Unit | HP | Speed | Damage | Range | Reward | Notes |
|---|---|---|---|---|---|---|
| Goblin | 30 | 3.0 | 5 | 0.8 | 5g | Fast swarm |
| Orc | 80 | 1.8 | 15 | 1.0 | 12g | Standard fighter |
| Troll | 250 | 1.2 | 30 | 1.5 | 25g | Heavy tank, skips Barricades |
| Boss | 1200 | 0.8 | 50 | 2.0 | 150g | Targets Huts explicitly |

> Enemy HP scales by `+15%` per wave (`HP_SCALE_PER_WAVE = 0.15`).
> Every 5th wave is a Boss Wave.

---

## Map & Routing

- **Grid**: 22×22 cells, each cell 2.5 units wide
- **Sanctuary**: Central protected area
- **Spawn points**: Edge of map, enemies march inward
- **Terrain**: Procedurally generated (grass, paths, scenery)
- **Pathing**: A* Pathfinding dynamically re-routes enemies when walls are placed.

### Drops & Pickups

Enemies have a chance to drop physical 3D items upon death:
- **Coins**: (100% chance, 10g) Bounces on the floor.
- **Potions**: (5% chance) Instantly restores 5 Sanctuary HP.
- **Stars**: (3% chance) Instantly resets the Divine Smite cooldown.

---

## AI Systems

### Enemy AI (Yuka)

Enemies use **Yuka Vehicles** with steering behaviors:
- **Separation**: Avoid overlapping with other enemies
- **Evade**: Actively dodge out of Range tower arcs
- **Path Following**: Dynamically follow A* coordinates

### Player Governor AI (Yuka GOAP)

The AI Governor uses **Goal-Oriented Action Planning**:
- **Build/Upgrade**: Threat-aware weighting (prioritizes economy early, ranges later)
- **Repair**: Identifies and heals damaged walls
- **Smite**: Dynamically triggers AoE when enemy density > threshold

---

## Player Abilities (Spells)

| Ability | Cost | Effect | Cooldown |
|---|---|---|---|
| **Smite** | Free | Deals 250 damage to all enemies | 15s |
| **Heal** | 150g | Restores 10 Sanctuary HP | None |
| **Freeze** | 100g | Freezes all enemies for 5 seconds | None |

---

## Visual & Audio Style

- **Graphics**: Real AmbientCG PBR materials mixed with 3DLowPoly `KayKit` and `TowerDefense` assets.
- **Environment**: Day/Night HDRI skybox transitions.
- **Particles**: Instanced physics pools for Sparks, Dust, and Coins.
- **Audio**: Pure Tone.js procedural synthesis (FM Synths for impacts, MetalSynths for kills).

---

## Win / Lose Conditions

- **Lose**: Sanctuary HP reaches 0
- **Win**: Survive 15 waves (triggers 'Victory' overlay, but gameplay can continue endlessly)
