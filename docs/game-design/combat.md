---
title: "Combat & Units"
domain: game-design
audience: all-agents
reads-before: [../memory-bank/projectbrief.md]
last-updated: 2026-03-13
status: stable
summary: "Unit types, stats, combat mechanics, affixes, and pacing formulas"
---

# Combat & Units

## Unit Types

### Allied Units (spawned by buildings)

| Type | HP | Speed | DMG | Range | AtkSpd | Role |
|------|---:|------:|----:|------:|-------:|------|
| Wall | 600 | 0 | 0 | 0 | -- | Road blocker |
| Militia | 40 | 6.0 | 10 | 2.0 | 1.0s | Cheap melee |
| Archer | 20 | 5.0 | 15 | 15.0 | 1.5s | Ranged DPS |
| Cleric | 30 | 4.5 | -20 (heal) | 12.0 | 2.0s | Healer |
| Knight | 150 | 4.0 | 25 | 2.5 | 1.5s | Heavy tank |

### Enemy Units (spawned from wave budget)

| Type | HP | Speed | DMG | Range | AtkSpd | Budget Cost | Kill Reward |
|------|---:|------:|----:|------:|-------:|------------:|------------:|
| Goblin | 30 | 7.0 | 5 | 2.0 | 0.8s | 5 | 2g |
| Orc | 80 | 5.0 | 15 | 2.5 | 1.5s | 12 | 5g |
| Troll | 250 | 3.5 | 30 | 3.5 | 2.0s | 25 | 10g |
| Boss | 1200 | 2.5 | 50 | 4.0 | 3.0s | 150 | 50g |

Enemy stats scale per wave: `multiplier = 1 + wave * 0.15`.

## Enemy Affixes (Wave 6+, 20% chance)

| Affix | Effect |
|-------|--------|
| Armored | 50% physical damage reduction |
| Swift | 2x speed, 0.5x attack cooldown |
| Regenerating | +2 HP/sec passive regen |
| Ranged | Gains 15-range ranged attacks |
| Vampiric | Heals for 50% of damage dealt |
| Explosive | On death, deals 50 AoE damage to allies within 6 units |

## Wave Pacing

**Budget Formula:** `B(W) = floor(50 * 1.15^W + 2W^2)`
- Wave 1: ~57 budget (11 goblins)
- Wave 5: ~150 budget (1 boss)
- Wave 10: ~402 budget
- Wave 20: ~1608 budget

**Build Timer:** `T(W) = 30 + 10 * ln(W)` seconds

**Boss waves:** Every 5th wave includes a boss if budget allows.

**Wave completion:** When all enemies are dead and spawn queue is empty. Allied wave units are cleaned up, gold bonus awarded: `50 + wave * 10 + interest`.

**Victory:** Surviving wave 20 awards `wave * 25` coins.

## Combat Mechanics

- Units find nearest enemy within search range (8 melee, 25 ranged)
- Walls are priority targets for enemies at close range (<5 units)
- Healers target wounded allies instead of enemies
- Ranged units spawn projectiles that track targets
- Poison: DoT `poison * 0.2 * dt`, decays at `2/sec`
- Freeze: Stops all movement, decays at `1/sec`
- Slow: Applied by Sorcerer Tower projectiles, lasts 3 seconds
- Boss AoE: Damages all allies within 8 units on attack

## Planned Work

- [ ] Additional enemy types (flying, shield-bearer, summoner)
- [ ] Difficulty tiers affecting stat multipliers
- [ ] Boss ability variants per boss wave number
