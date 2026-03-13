---
title: "Buildings & Economy"
domain: game-design
audience: all-agents
reads-before: [../memory-bank/projectbrief.md]
last-updated: 2026-03-13
status: stable
summary: "Building types, costs, resource economy, logistics, upgrades, and unlock progression"
---

# Buildings & Economy

## Building Types

### Spawner Buildings (placed on grass, roadDistance >= 7)

| Type | Gold | Wood | Unlock | Spawns | Spawn Time | Role |
|------|-----:|-----:|-------:|--------|:----------:|------|
| Militia Hut | 50 | 20 | Free | Militia | 3.5s | Cheap melee infantry |
| Archery Range | 100 | 50 | 50 | Archer | 4.5s | Ranged DPS |
| Cleric Temple | 150 | 50 | 150 | Cleric | 6.0s | Healer support |
| Knight Keep | 200 | 100 | 300 | Knight | 8.0s | Heavy tank |

### Turret Buildings (placed on grass, roadDistance >= 7)

| Type | Gold | Wood | Other | Unlock | DMG | AtkSpd | Range | Role |
|------|-----:|-----:|------:|-------:|----:|-------:|------:|------|
| Sentry Post | 0 | 100 | -- | 100 | 15 | 1.0s | 20 | Fast arrows |
| Arcane Obelisk | 150 | 50 | -- | 200 | 40 | 2.5s | 25 | Heavy magic |
| Catapult | 200 | 150 | -- | 300 | 80 | 4.0s | 30 | AoE splash (5 radius) |
| Sorcerer Tower | 150 | 50 | 5 gem | 250 | 10 | 1.5s | 20 | Slows enemies |

Turrets have targeting modes: `first` (furthest along path), `strongest` (highest HP), `weakest` (lowest HP).

### Resource Buildings (placed on grass)

| Type | Gold | Wood | Unlock | Output | Rate | Role |
|------|-----:|-----:|-------:|--------|:----:|------|
| Lumber Camp | 75 | 0 | 50 | +10 wood | /5s | Wood harvesting |
| Ore Mine | 100 | 50 | 100 | +1 ore | /5s | Ore extraction |
| Gem Mine | 200 | 100 | 250 | +1 gem | /10s | Gem extraction |
| Gold Vault | 300 | 200 | 400 | +10 gold | /10s | Passive gold |
| Royal Mint | 150 | 100 | 200 | 1 ore -> 15g | -- | Ore conversion |

### Infrastructure

| Type | Gold | Wood | Unlock | Role |
|------|-----:|-----:|-------:|------|
| Barricade (Wall) | 0 | 15 | Free | Blocks road, 600 HP |
| Minecart Track | 5 | 5 | Free | Resource transport path |

## Resource Economy

Four resources during a run:

| Resource | Starting | Sources | Sinks |
|----------|:--------:|---------|-------|
| Gold | 300 | Kill rewards, wave bonus, vault, mint | Building costs, upgrades |
| Wood | 50 | Lumber camps (via logistics) | Building costs |
| Ore | 0 | Ore mines (via logistics) | Mint conversion, building costs |
| Gem | 0 | Gem mines (via logistics) | Sorcerer tower cost |
| Faith | 100 | Passive regen (health/10 per sec) | Spell casting |

## Logistics System (Factorio-style)

Resource buildings (lumber, ore mine, gem mine) don't directly add resources. Instead:

1. Building produces a **ResourceCart** entity on its timer
2. Cart follows a **track path** found via BFS from the building to a valid sink
3. Valid sinks: Sanctuary (for wood/gem/ore), Royal Mint (for ore specifically)
4. Cart travels along track nodes at speed 5 (or 10 with Miner's Lantern relic)
5. On arrival, resources are deposited (wood: +10, ore: +1, gem: +1)
6. If no track path exists, building shows "No Track!" error

Track placement rules:
- Tracks cost 5 gold + 5 wood each
- Can be placed anywhere (no road distance restriction)
- Can overlap resource buildings and mints

## Placement Rules

All buildings snap to a **5-unit grid**. No overlapping is allowed except for resource buildings (mine_ore, mine_gem, lumber, mint) which can overlap with tracks.

| Building Category | Road Distance | Notes |
|-------------------|:--------------|-------|
| Walls (Barricade) | `roadDistance <= 4` | Must be near road to block it |
| Spawners | `roadDistance >= 7` | Away from road so units march in |
| Turrets | `roadDistance >= 7` | Away from road, uses ranged attacks |
| Tracks | No restriction | Can be placed anywhere |
| Resource Buildings | No restriction | Can overlap with tracks |

- **Sell value:** 50% of original building cost (gold and wood refunded)
- **Kill zone strategy:** Road curves create natural "kill zones" -- placing turrets on the inside of U-turns maximizes coverage since enemies spend more time in range

## Upgrades

Buildings have two upgrade branches, each with max level 5:

| Branch | Spawners | Turrets | Resource Buildings |
|--------|----------|---------|--------------------|
| **Spawn/Rate** | Spawn time * 0.8^(level-1) | Attack speed / 1.1^(level-1) | Production speed |
| **Stats** | Unit stats * 1.3^(level-1) | Damage * 1.1^(level-1) | Output amount |

Upgrade costs scale with building cost and level.

### Upgrade Cost Formula (from initial-release)

Initial-release used an explicit exponential formula for upgrade costs:
- **Cost per level:** `baseCost * 1.5^(level - 1)`
- Level 1→2: 1.5× base cost
- Level 2→3: 2.25× base cost
- Level 4→5: ~5.06× base cost

This creates meaningful cost pressure at higher levels, preventing "max everything" strategies. feat/poc-reset should adopt this or a similar explicit formula.

## Meta-Progression Unlocks

Buildings are unlocked permanently by spending "Coin of the Realm" in the Market:
- Coins earned: `wave * 10` on defeat, `wave * 25` on victory
- Default unlocked: Wall, Militia Hut, Minecart Track
- Everything else requires unlock purchase

## Planned Work

- [ ] Visual upgrade indicators on building meshes
- [x] Building sell/refund formula (50% of cost, documented in Placement Rules)
- [ ] Additional resource sink buildings
