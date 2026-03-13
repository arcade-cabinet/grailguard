---
title: "Spells, Relics & Doctrines"
domain: game-design
audience: all-agents
reads-before: [../memory-bank/projectbrief.md]
last-updated: 2026-03-13
status: stable
summary: "Spell system, relic draft mechanic, and doctrine skill tree"
---

# Spells, Relics & Doctrines

## Spells

Spells cost Faith to cast and have cooldowns. Unlocked permanently via meta-progression coins.

| Spell | Faith Cost | Cooldown | Effect | Unlock Cost |
|-------|:----------:|:--------:|--------|:-----------:|
| Smite | 20 | 8s | Deal 200 damage to target enemy | Free |
| Holy Nova | 40 | 15s | Heal all allies for 50 HP | 100 |
| Zealous Haste | 30 | 20s | 2x game speed for 10 seconds | 150 |
| Earthquake | 60 | 25s | Deal 100 damage to all enemies, stun 2s | 200 |
| Chrono Shift | 50 | 30s | Reset all building cooldowns | 250 |
| Meteor Strike | 80 | 35s | Deal 500 damage in AoE at target | 300 |
| Divine Shield | 40 | 25s | All allies invulnerable for 5s | 350 |

Faith regenerates passively: `(health / 10) * dt` faith per second during defend phase.

## Relics (Run-Specific)

Every 5th wave, the player drafts 1 relic from 3 random options. Relics last for the current run only.

Known relics in the codebase:

| Relic | Effect |
|-------|--------|
| `war_horn` | Allied units start with 0 cooldown (attack immediately) |
| `golden_age` | Earn 5% interest on gold between waves |
| `crystal_lens` | Obelisk turrets deal 1.5x damage (but 1.2x cooldown) |
| `venomous_fletching` | Archer projectiles apply poison (10 stacks) |
| `iron_tracks` | Minecart tracks cost 0 wood |
| `blessed_pickaxe` | Gem mines produce 2 gems instead of 1 |
| `miners_lantern` | Resource carts move at 2x speed |

## Doctrines (Persistent Skill Tree)

Doctrine nodes are purchased with Coin of the Realm and provide permanent passive bonuses across all runs.

Known doctrine nodes:

| Node ID | Effect per Level |
|---------|-----------------|
| `iron_vanguard` | +10% HP for melee allies (per level) |
| `crown_tithe` | +50 starting gold (per level) |
| `faithward` | +25% starting health (per level) |

Doctrine levels persist in SQLite (`doctrine_nodes` table).

## Planned Work

- [ ] Full spell visual effects (earthquake screen shake, meteor particle shower)
- [ ] Expanded relic pool (20+ options)
- [ ] Full doctrine skill tree design (branches: military, economy, faith)
- [ ] Relic synergy system (certain combinations unlock bonus effects)
