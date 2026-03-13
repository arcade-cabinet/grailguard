---
title: "Grailguard Active Context"
domain: status
audience: all-agents
reads-before: [projectbrief.md, systemPatterns.md, techContext.md]
last-updated: 2026-03-13
status: active
summary: "Current work focus, recent changes, active decisions, and next steps"
---

# Active Context

## Current Branch

`feat/poc-reset` -- Complete rewrite of the game engine and architecture.

## Recent Changes (This Branch)

The branch represents a ground-up rebuild from the original prototype:

1. **New ECS Engine** -- Replaced Zustand store with Koota ECS world (`GameEngine.ts`, ~2200 LOC)
2. **Yuka AI Integration** -- Enemy pathfinding via `FollowPathBehavior`, ally seek/separation behaviors
3. **SQLite Persistence** -- Full Drizzle ORM schema with 8 tables and 7 repository modules
4. **Factorio Logistics** -- Resource harvesting (lumber/ore/gem), minecart tracks, BFS path routing
5. **Production Expansion** -- 15 building types (was 5), turrets with targeting modes, resource economy
6. **Spell System** -- 7 spells with cooldowns, faith resource, relic modifiers
7. **Doctrine Skill Tree** -- Persistent passive bonuses purchased with coins
8. **Codex System** -- Auto-discovery encyclopedia for units and buildings
9. **Relic Draft** -- Every 5 waves, choose from 3 random relics for run-specific bonuses
10. **Algorithmic Terrain** -- Seeded procedural road generation via Catmull-Rom splines
11. **Sound Engine** -- Tone.js procedural audio (ambience, BGM, SFX per phase)
12. **Comprehensive Documentation Overhaul** -- 18 docs organized into 4 domain directories
13. **JSDoc Coverage** -- Added to all 31 source files (~137 blocks)
14. **Three-tier Agent Pointer Chain** -- CLAUDE.md -> AGENTS.md -> docs/
15. **Cline-style Memory Bank** -- 6 core files for persistent project context
16. **POC Material Audit** -- All POC materials (poc.html, GDD.md, ARCHITECTURE.md, Gemini-Conversation.md) audited, value extracted, and purged
17. **CodeRabbit Fixes** -- Fixed 5 broken auto-fix references
18. **PR Review Resolution** -- All 99/100 PR review threads resolved

## Active Decisions

- **Wave cap at 20** -- Victory condition; may expand in future
- **No Zustand** -- All runtime state in ECS; DB repos handle persistence
- **Snapshot serialization** -- Active runs saved as versioned JSON blobs, not decomposed tables
- **Grid snapping** -- Buildings snap to 5-unit grid for clean placement

## Next Steps

See `progress.md` for detailed status. Key priorities:

1. **Testing** -- Expand Jest coverage for engine systems, DB repos, and meta screens
2. **Visual Polish** -- Terrain materials, building/unit model variety, day/night cycle
3. **Balance Tuning** -- Wave budgets, building costs, upgrade scaling curves
4. **Mobile Optimization** -- Touch controls, instanced rendering for particles
5. **Content Expansion** -- Additional biomes, enemy types, buildings beyond wave 20
