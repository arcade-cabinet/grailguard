---
title: "Grailguard Project Brief"
domain: foundation
audience: all-agents
reads-before: []
last-updated: 2026-03-13
status: stable
summary: "Core requirements, vision, scope, and success criteria for Grailguard"
---

# Project Brief

**Grailguard** is a 2.5D auto-battler tower defense game built with Expo SDK 55, React Three Fiber, and Koota ECS. Players defend a Holy Grail by placing buildings along a winding road, spawning allied units to intercept waves of enemies.

## Vision

A vibrant, Kingdom Rush-inspired diorama where strategic base-building meets organic simulated combat. The game runs at 60 FPS on iOS, Android, and Web from a single codebase.

## Core Pillars

1. **Auto-Battler Tower Defense** -- Place spawner buildings and turrets; units fight autonomously
2. **Factorio-Style Logistics** -- Resource harvesting (wood, ore, gems) transported via minecart tracks
3. **Meta-Progression** -- Earn "Coin of the Realm" to permanently unlock buildings, spells, and doctrines
4. **Cross-Platform** -- Single Expo/React Native codebase targeting Web, iOS, and Android

## Scope

- 20 waves per run with polynomial difficulty scaling
- 15 building types (spawners, turrets, resource producers, logistics)
- 4 enemy types with 6 affix variants
- 7 spells, doctrine skill tree, relic draft system
- Codex discovery, run history, persistent player profile
- Procedural S-curve road generation with seeded PRNG
- Full save/resume with ECS snapshot serialization

## Success Criteria

- Locked 60 FPS on mobile devices
- Zero DOM manipulation (pure React Native + R3F)
- Clean separation: engine logic / persistence / rendering
- Deterministic save/load for reproducible gameplay
