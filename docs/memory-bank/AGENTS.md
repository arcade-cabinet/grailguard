---
title: "Memory Bank Agent Protocols"
domain: agent-config
audience: all-agents
reads-before: []
last-updated: 2026-03-13
status: stable
summary: "How agents interact with the memory bank -- read/write protocols, update triggers"
---

# Memory Bank Protocols

The Memory Bank at `docs/memory-bank/` is the persistent link between agent sessions. Every agent's context resets between sessions -- this is the only way to carry forward project understanding.

## File Hierarchy

```
projectbrief.md ──┬──> productContext.md ──┐
                  ├──> systemPatterns.md ──┼──> activeContext.md ──> progress.md
                  └──> techContext.md ──────┘
```

Lower files build on higher files. `projectbrief.md` is the root of truth.

## On Session Start (MANDATORY)

1. Read `activeContext.md` and `progress.md` first (most volatile)
2. Read `systemPatterns.md` and `techContext.md` (architecture context)
3. Read `projectbrief.md` and `productContext.md` if unfamiliar with the project
4. Read `docs/AGENTS.md` for documentation navigation
5. Verify understanding against the codebase before making changes

## On Session End (MANDATORY)

1. Update `activeContext.md` with what was accomplished and next steps
2. Update `progress.md` if implementation status changed
3. Update other files only if architecture, tech stack, or project scope changed

## Trigger: "update memory bank"

When explicitly asked, review EVERY memory bank file. Focus especially on `activeContext.md` and `progress.md`.

## When to Create New Memory Files

Create files under `docs/memory-bank/` for:
- Complex feature deep-dives (e.g., `logistics-system.md`)
- Integration specifications
- Testing strategies for specific systems
