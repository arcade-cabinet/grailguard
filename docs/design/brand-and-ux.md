---
title: "Brand Identity & UX Design"
domain: design
audience: all-agents
reads-before: [../memory-bank/productContext.md]
last-updated: 2026-03-13
status: draft
summary: "Visual identity, player metaphors, UI component patterns, and brand language for Grailguard"
---

# Brand Identity & UX Design

## Core Metaphor: The Reliquary

Grailguard's central metaphor is **the reliquary** — a sacred container protecting holy artifacts. Everything in the game reinforces this:

- **The Grail** is the ultimate relic under siege
- **Buildings** are reliquary chambers — each one houses and protects something sacred
- **The Road** is the pilgrimage path — enemies aren't just attacking, they're *desecrating* a holy route
- **Waves** are increasingly desperate assaults on sanctified ground
- **Resources** (gold, wood, ore, gem, faith) represent the material and spiritual costs of protection
- **Doctrines** are sacred vows the player takes — permanent commitments that shape strategy
- **Relics** are miraculous gifts discovered between sieges — temporary grace

This metaphor should inform every UI decision: the game isn't a sterile strategy sim, it's a desperate, sacred defense.

## Visual Language

### Color Palette

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Sacred Gold | Warm amber | `#D4A574` | Coins, victory, holy effects, borders |
| Sanctuary White | Soft ivory | `#F5F0E8` | Grail glow, heal effects, faith UI |
| Blood Red | Deep crimson | `#8B2500` | Enemy health, danger banners, boss spawns |
| Forest Green | Muted sage | `#4A6741` | Allied health, wood, nature, prosperity |
| Stone Gray | Warm charcoal | `#3D3D3D` | Backgrounds, panels, inactive elements |
| Parchment | Aged cream | `#E8DCC8` | Text backgrounds, tooltips, codex entries |
| Royal Purple | Deep violet | `#4A2D6B` | Spell effects, faith resource, relic drafts |
| Iron Blue | Cold steel | `#4A5568` | Ore, metal buildings, turret UI |

### Typography Hierarchy

| Level | Font | Weight | Size | Usage |
|-------|------|--------|------|-------|
| Display | Cinzel (serif) | Bold | 28-36 | Wave announcements, game over, title screen |
| Heading | Cinzel (serif) | SemiBold | 18-24 | Section headers, modal titles, screen names |
| Body | Inter (sans) | Regular | 14-16 | Descriptions, tooltips, codex text |
| Data | JetBrains Mono | Medium | 12-14 | Resource counts, stats, timers, damage numbers |
| Label | Inter (sans) | SemiBold | 10-12 | Button text, tab labels, category headers |

### Iconography Style

- **Silhouette-based** with 2px stroke weight
- **Warm palette** — avoid cold blues/grays for game elements
- Buildings use **shield/heraldry shapes** as container frames
- Spells use **radiant/emanating shapes** (starburst, rings)
- Resources use **simple material symbols** (coin, plank, gem, ore chunk, prayer hands)

## UI Component Design System

### 1. Radial Context Menu (Building & Interaction)

**Metaphor:** A commander's seal — tap the battlefield and a ring of options radiates outward like a royal decree emanating from a signet stamp.

**Design pattern:** Radial menu appearing at the click/tap position on the 3D terrain. Items animate outward from center using spring physics with staggered timing (inspired by Kingdom Rush). Replaces the old bottom-docked Toychest toolbar with diegetic, context-aware interaction.

```
              ┌──┐
         ┌──┐ │🏹│ ┌──┐
         │⛪│ └──┘ │🏰│
         └──┘       └──┘
    ┌──┐      [.]      ┌──┐
    │🪵│   (center)    │🗼│
    └──┘               └──┘
         ┌──┐       ┌──┐
         │⛏│       │💎│
         └──┘ ┌──┐ └──┘
              │🛤│
              └──┘
```

**Context rules:**
- **Near road (distance <= 4):** Shows wall placement + resource/logistics buildings
- **Far from road (distance >= 7):** Shows spawner buildings + turrets + resource/logistics
- **Any terrain (4 < distance < 7):** Shows only resource/logistics buildings
- **Existing building:** Shows upgrade (spawn + stats), targeting mode (turrets), sell
- **Existing wall:** Shows scrap/sell
- **Defend phase:** No build menu (radial menu does not open)

**Behaviors:**
- Items: 56px circular buttons with 2px golden border, dark medieval background
- Open animation: spring physics (stiffness: 260, damping: 20), stagger 0.05s per item
- Tooltip: label + cost shown below each item on hover
- Unaffordable: 50% opacity, `aria-disabled`, non-interactive but visible
- Locked buildings: hidden entirely (not shown in menu)
- Dismiss: ESC key, click outside the ring, or select an item
- Menu clamped to viewport edges to prevent clipping
- Works with both mouse click and touch tap

**Files:**
- `src/components/ui/RadialMenu.tsx` — Presentational component (framer-motion)
- `src/components/ui/useRadialMenu.ts` — State/logic hook (context detection, item building)
- Integration in `src/app/game.tsx` via `LiveGameView`

### 2. Resource Bar (Top Bezel)

**Metaphor:** A medieval ledger strip — resources read left-to-right like an accounting scroll.

```
┌─────────────────────────────────────────────┐
│ ⚔ Wave 7    🪙 450  🪵 120  ⛏ 3  💎 1  ✝ 85  ❤ 18/20 │
└─────────────────────────────────────────────┘
```

**Design:**
- Dark parchment background (`#2A2318`) with 1px gold border bottom
- Each resource: icon + count in JetBrains Mono, separated by thin gold dividers
- Health bar: segmented (each segment = 1 HP), red fill drains from right
- Faith bar: purple gradient fill, subtle pulse animation when castable
- Wave counter: shield icon with wave number in bold Cinzel

**Animations:**
- Resource gain: count bounces up with +N floating text in green
- Resource spend: count dips down with -N in red
- Health loss: segment shatters with red particle burst
- Wave transition: shield icon rotates 360 degrees

### 3. Spell Bar (Side Bezel)

**Metaphor:** Prayer beads — circular icons strung vertically along the right edge.

```
    ┌──┐
    │⚡│ Smite (ready)
    ├──┤
    │🌟│ Holy Nova (5s cooldown)
    ├──┤
    │💨│ Zealous Haste (ready)
    ├──┤
    │🌍│ Earthquake (locked)
    └──┘
```

**Design:**
- Circular icons (40x40) with radial cooldown sweep (clock-wipe reveal)
- Ready state: golden border glow, subtle pulse
- On cooldown: grayscale with clockwise fill revealing color
- Insufficient faith: dim purple, faith cost shown
- Cast animation: icon explodes outward with radiant particles, then reforms

### 4. Wave Banner (Center Announcement)

**Metaphor:** A herald's proclamation — unfurls from the top like a medieval banner.

```
        ╔══════════════════════╗
        ║   ⚔ WAVE 7 ⚔       ║
        ║   "Raiding Force"    ║
        ╚══════════════════════╝
```

**Design:**
- Banner texture: dark red velvet with gold fringe (danger) or white silk with gold embroidery (holy)
- Text: Cinzel Display, centered, with ornamental sword dividers
- Animation: drops from top with slight swing/settle physics (spring animation)
- Duration: 2.5 seconds, fades upward
- Boss wave variant: larger banner, skull icon, screen flash red, camera shake

### 5. Game Over Modal

**Metaphor:** A battle aftermath report — parchment scroll with wax seal.

```
┌─────────────────────────────────────┐
│         [Wax Seal: Defeat]          │
│                                     │
│   The Grail Has Fallen              │
│   Wave 12 · 3m 42s · 47 kills      │
│                                     │
│   Coins Earned: 120 🪙              │
│   New Best: Wave 12 ⭐               │
│   Codex Entries: +3 📖              │
│                                     │
│   [Return to Sanctuary]             │
└─────────────────────────────────────┘
```

**Design:**
- Parchment background with torn/burned edges (defeat) or pristine edges with gold leaf (victory)
- Stats in two columns: left-aligned labels (Inter), right-aligned values (JetBrains Mono)
- Wax seal: red (defeat) or gold (victory), pressed with Grail sigil
- "New Best" highlight: golden glow behind the row
- Button: ornate with beveled gold border, "Return to Sanctuary" in Cinzel

### 6. Doctrine Skill Tree

**Metaphor:** An illuminated manuscript — doctrine nodes are illuminated letters in a sacred text.

**Design pattern:** Vertical tree with connecting vellum paths (inspired by headless-tree component). Each node is a circular medallion with inner icon.

```
        [Crown Tithe]
            |
    [Faithward]──[Iron Vanguard]
        |              |
  [Tax Collection]  [Masonry]
```

**Node states:**
- Locked: stone gray medallion, no glow
- Available: gold border pulse, "Purchase for X coins" tooltip
- Level 1-4: progressively brighter inner glow, level pips around edge
- Max level (5): radiant gold with emanating light rays

### 7. Relic Draft Modal

**Metaphor:** Opening a reliquary — three sacred objects revealed on velvet cushions.

```
┌─────────────────────────────────────────────┐
│           Choose Your Relic                  │
│                                             │
│  ┌───────┐   ┌───────┐   ┌───────┐        │
│  │  🏹   │   │  ⚒    │   │  📿   │        │
│  │Venomous│   │Miner's│   │War    │        │
│  │Fletch- │   │Lantern│   │Horn   │        │
│  │  ing   │   │       │   │       │        │
│  │        │   │       │   │       │        │
│  │Projecti│   │Cart   │   │All    │        │
│  │les add │   │speed  │   │units  │        │
│  │poison  │   │doubled│   │+15%   │        │
│  │        │   │       │   │damage │        │
│  └───────┘   └───────┘   └───────┘        │
└─────────────────────────────────────────────┘
```

**Design:**
- Three cards on dark velvet background
- Each card: parchment face with ornate border, icon at top, name in Cinzel, effect in Inter
- Hover: card lifts (translateY -8px), golden glow intensifies, border brightens
- Selection: chosen card floats to center, others fade, particle burst, card dissolves into player
- Cards enter with staggered reveal animation (left, center, right at 100ms intervals)

## Player Experience Metaphors

### Session Flow as Pilgrimage

Each run is a **pilgrimage to defend the Grail**:
1. **Preparation** (main menu) → The pilgrim readies at the sanctuary gates
2. **Fortification** (build phase) → Laying sacred defenses along the road
3. **Vigil** (defend phase) → Standing watch as desecrators approach
4. **Respite** (wave complete) → Brief peace, miraculous relic appears
5. **Escalation** (next wave) → The assault intensifies
6. **Aftermath** (game over) → Either the Grail endures or falls

### Emotional Arc

| Wave Range | Feeling | UI Reinforcement |
|-----------|---------|-----------------|
| 1-3 | Confidence | Bright lighting, calm BGM (80 BPM), green health |
| 4-8 | Growing tension | Dusk lighting, faster BGM, first boss encounter |
| 9-14 | Desperate defense | Night lighting, intense BGM (120 BPM), screen shakes |
| 15-19 | Last stand | Deep red ambient, percussion-heavy BGM, camera zoom tighter |
| 20 | Triumph/fall | Blinding gold flash (victory) or dramatic fade to red (defeat) |

### Naming Conventions

| Game Concept | Medieval Term | Why |
|-------------|--------------|-----|
| In-game currency | Gold | Universal, immediate understanding |
| Meta currency | Coin of the Realm | Elevates the meta-game, implies royal authority |
| Buildings | Structures | Neutral enough for walls, towers, and mines |
| Enemy waves | Assaults | More threatening than "waves" |
| Boss enemies | Champions | Implies a worthy adversary, not just a big monster |
| Spell cooldowns | Rituals recharging | Spells feel more sacred with ritual language |
| Health | Sanctuary Integrity | The Grail's protection barrier, not a generic health bar |
| Game over (loss) | "The Grail Has Fallen" | Dramatic, implies catastrophic failure |
| Game over (win) | "The Grail Endures" | Implies survival against odds, not easy victory |
| Build phase | Fortification | Active verb, implies urgency |
| Defend phase | The Vigil | Watchful, tense, sacred duty |
| Wave labels | Scout Party / Raiding Force / War Host | Military scale language |

## Animation Principles

1. **Weight:** UI elements have physical weight — banners swing, cards have momentum, buttons depress
2. **Material:** Parchment curls, metal clinks, stone grinds — animations suggest the material they're made from
3. **Sacred geometry:** Holy effects use radial symmetry (circles, starbursts). Enemy effects use chaotic/angular shapes
4. **Urgency cascade:** Animations get faster and more intense as waves progress — build phase is contemplative, wave 15+ is frenetic
5. **Spring physics:** All transitions use spring easing (mass: 0.75, stiffness: 100, damping: 10) — nothing linear, everything has life

## Sound Design Metaphors

| Event | Sound Metaphor | Implementation |
|-------|---------------|----------------|
| Building placed | Stone settling into mortar | Low thud + high "click" |
| Unit spawned | Gate opening | Metallic creak + footstep |
| Enemy killed | Armor collapse | Metallic shatter + brief chord |
| Boss spawn | Cathedral bell | Deep bell toll + bass rumble |
| Spell cast | Choir chord | Brief choral swell in spell's key |
| Wave complete | Victory fanfare | Brass + strings, 2 bars |
| Relic draft | Reliquary opening | Wooden creak + mystical shimmer |
| Gold earned | Coins tumbling | Multiple metallic tinkles |
| Build phase BGM | Contemplative lute | 80 BPM, minor key, arpeggiated |
| Defend phase BGM | Martial drums + strings | 120 BPM, driving rhythm, builds with wave |

## Diegetic Interface Design

### Philosophy: Everything in the World

Inspired by Dead Space's suit-as-HUD and Kingdom Rush's contextual radial menus, Grailguard should minimize floating UI overlays and instead embed information INTO the 3D game world wherever possible.

| UI Diegesis Scale | Description | Grailguard Examples |
|-------------------|-------------|-------------------|
| **Fully Diegetic** | Exists in-world, characters can see it | Sanctuary damage cracks, resource piles, herald banner |
| **Spatial** | Attached to world objects, only player sees | Building radial menus, placement ghost, selection rings |
| **Meta** | Overlaid but themed to match world | Resource bar, wave counter, spell cooldowns |
| **Non-Diegetic** | Pure overlay (avoid) | Debug overlay only |

### 3D Resource Indicators (Fully Diegetic)

Replace the "Bank: 300g | 50w | 0o" text overlay with PHYSICAL resource piles visible on/around the sanctuary:

- **Gold:** A chest at the sanctuary base with visible coin pile. Size scales with gold amount (0-100: small pouch, 100-500: open chest, 500+: overflowing).
- **Wood:** A lumber pile next to the sanctuary. Logs stack higher with more wood.
- **Ore/Gem:** Crates/barrels near the mining side of the sanctuary.
- **Faith:** The grail itself glows brighter/dimmer based on faith level. At max faith, a visible aura radiates outward.

### Herald Banner (Fully Diegetic)

A physical banner/flag at the road entrance that shows wave information:
- During build phase: banner is DOWN (peaceful)
- When wave starts: banner RISES with the wave number
- Boss waves: banner is RED with skull sigil
- The banner can have wave labels ("Scout Party") written on cloth texture

### Hourglass Timer (Fully Diegetic)

A 3D hourglass model at the sanctuary that drains during the build phase:
- Sand flows from top to bottom
- When empty, the wave starts automatically
- Player can "break" the hourglass early (Call Wave) by clicking it
- The hourglass replaces the "Council Time: 20s" text overlay

### Ground Runes for Spells (Spatial)

Instead of spell buttons in the toolbar, place glowing rune circles on the ground around the sanctuary:
- Each unlocked spell has a rune position (N, S, E, W, NE, NW, SE)
- Active/ready runes glow gold; on-cooldown runes dim with a clockwise fill
- Tap a rune to cast the spell at a target location
- Runes pulse brighter when faith is sufficient

### Enemy Spawn Portal (Fully Diegetic)

At the road start (enemy spawn point):
- A dark, crackling portal or cave entrance
- Grows larger/more threatening as wave number increases
- During defend phase, enemies emerge FROM this portal
- During build phase, it's dormant but ominous

### Contextual Radial Menu (Spatial — IMPLEMENTED)

Already built as `RadialMenu.tsx` + `useRadialMenu.ts`:
- Appears at the clicked world position
- Context-aware: terrain type determines available options
- Building context: upgrade/sell/targeting
- Spring animation, DaisyUI themed

### Minimal Meta Overlay (What Remains as Traditional HUD)

Only these elements stay as traditional screen overlays:
- **Wave counter** (top-right corner, small)
- **Mini-map** (future — top-left corner)
- **Speed toggle** (bottom-right, small icon)
- **Leave button** (bottom-right, small icon)

Everything else should be in-world or contextual.

## Planned Work

- [x] Replace Toychest toolbar with radial context menu (RadialMenu + useRadialMenu)
- [x] DaisyUI medieval theme with custom Grailguard colors
- [x] HDRI sky (Alps Field) as quarter-dome backdrop
- [x] PBR terrain with tiled grass textures
- [x] Depth fog atmosphere
- [ ] 3D resource indicators on sanctuary (gold chest, wood pile, ore crates)
- [ ] Herald banner at road entrance (physical wave announcement)
- [ ] Hourglass timer model (replaces Council Time text)
- [ ] Ground runes for spell casting (replaces spell bar buttons)
- [ ] Enemy spawn portal at road start
- [ ] Implement wave banner with spring physics animation
- [ ] Create parchment-styled tooltip component
- [ ] Implement doctrine tree with illuminated manuscript nodes
- [ ] Design relic draft card reveal animation
